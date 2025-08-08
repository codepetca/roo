import { 
  Grade, 
  GradeInput, 
  Submission 
} from '@shared/schemas/core';
import { StableIdGenerator, calculatePercentage } from '@shared/schemas/transformers';
import { db, getCurrentTimestamp } from '../config/firebase';
import * as admin from 'firebase-admin';

/**
 * Grade Versioning Service
 * Location: functions/src/services/grade-versioning.ts
 * 
 * Manages grade history and versioning to preserve grading work
 * across snapshot updates. Implements protection for manual grades
 * and conflict resolution between AI and manual grading.
 */

export interface GradeVersion {
  grade: Grade;
  version: number;
  timestamp: Date;
  reason: string;
}

export interface GradeConflict {
  submissionId: string;
  existingGrade: Grade;
  newGrade: GradeInput;
  resolution: 'keep_existing' | 'use_new' | 'create_version';
  reason: string;
}

/**
 * Service for managing grade versions and history
 */
export class GradeVersioningService {
  private readonly gradesCollection = 'grades';
  private readonly gradeHistoryCollection = 'gradeHistory';

  /**
   * Get all grade versions for a specific submission
   */
  async getGradeHistory(submissionId: string): Promise<GradeVersion[]> {
    const snapshot = await db.collection(this.gradeHistoryCollection)
      .where('submissionId', '==', submissionId)
      .orderBy('version', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        grade: { ...data, id: doc.id } as Grade,
        version: data.version,
        timestamp: data.gradedAt.toDate(),
        reason: data.versionReason || 'Grade update'
      };
    });
  }

  /**
   * Get the latest grade for a submission
   */
  async getLatestGrade(submissionId: string): Promise<Grade | null> {
    const snapshot = await db.collection(this.gradesCollection)
      .where('submissionId', '==', submissionId)
      .where('isLatest', '==', true)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { ...doc.data(), id: doc.id } as Grade;
  }

  /**
   * Get all latest grades for multiple submissions
   */
  async getLatestGrades(submissionIds: string[]): Promise<Map<string, Grade>> {
    if (submissionIds.length === 0) {
      return new Map();
    }

    const grades = new Map<string, Grade>();
    
    // Firestore has a limit of 10 for 'in' queries, so batch them
    const batches = [];
    for (let i = 0; i < submissionIds.length; i += 10) {
      batches.push(submissionIds.slice(i, i + 10));
    }

    for (const batch of batches) {
      const snapshot = await db.collection(this.gradesCollection)
        .where('submissionId', 'in', batch)
        .where('isLatest', '==', true)
        .get();
      snapshot.docs.forEach(doc => {
        const grade = { ...doc.data(), id: doc.id } as Grade;
        grades.set(grade.submissionId, grade);
      });
    }

    return grades;
  }

  /**
   * Create a new grade version
   */
  async createGradeVersion(
    gradeInput: GradeInput,
    submission: Submission,
    reason: string = 'New grade'
  ): Promise<Grade> {
    const batch = db.batch();
    
    // Get existing latest grade if any
    const existingGrade = await this.getLatestGrade(submission.id);
    
    let version = 1;
    let previousGradeId: string | undefined;

    if (existingGrade) {
      version = existingGrade.version + 1;
      previousGradeId = existingGrade.id;

      // Mark existing grade as not latest
      const existingRef = db.collection(this.gradesCollection).doc(existingGrade.id);
      batch.update(existingRef, {
        isLatest: false,
        updatedAt: getCurrentTimestamp()
      });

      // Archive existing grade to history
      const historyRef = db.collection(this.gradeHistoryCollection).doc(existingGrade.id);
      batch.set(historyRef, {
        ...existingGrade,
        versionReason: 'Superseded by new version',
        archivedAt: getCurrentTimestamp()
      });
    }

    // Create new grade
    const gradeId = StableIdGenerator.grade(submission.id, version);
    const gradeRef = db.collection(this.gradesCollection).doc(gradeId);
    
    const newGrade: Grade = {
      ...gradeInput,
      id: gradeId,
      version,
      isLatest: true,
      percentage: calculatePercentage(gradeInput.score, gradeInput.maxScore),
      submissionVersionGraded: submission.version,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    batch.set(gradeRef, {
      ...newGrade,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      versionReason: reason,
      previousGradeId
    });

    // Update submission with grade reference
    const submissionRef = db.collection('submissions').doc(submission.id);
    batch.update(submissionRef, {
      gradeId: gradeId,
      status: 'graded',
      updatedAt: getCurrentTimestamp()
    });

    await batch.commit();
    return newGrade;
  }

  /**
   * Resolve conflicts between existing and new grades
   */
  resolveGradeConflict(
    existingGrade: Grade,
    newGradeInput: GradeInput
  ): GradeConflict {
    // Rule 1: Never overwrite locked grades
    if (existingGrade.isLocked) {
      return {
        submissionId: existingGrade.submissionId,
        existingGrade,
        newGrade: newGradeInput,
        resolution: 'keep_existing',
        reason: `Grade is locked: ${existingGrade.lockedReason || 'Manual grade protection'}`
      };
    }

    // Rule 2: Manual grades take precedence over AI grades
    if (existingGrade.gradedBy === 'manual' && newGradeInput.gradedBy === 'ai') {
      return {
        submissionId: existingGrade.submissionId,
        existingGrade,
        newGrade: newGradeInput,
        resolution: 'keep_existing',
        reason: 'Manual grades take precedence over AI grades'
      };
    }

    // Rule 3: If grades are identical, keep existing
    if (
      existingGrade.score === newGradeInput.score &&
      existingGrade.maxScore === newGradeInput.maxScore &&
      existingGrade.feedback === newGradeInput.feedback
    ) {
      return {
        submissionId: existingGrade.submissionId,
        existingGrade,
        newGrade: newGradeInput,
        resolution: 'keep_existing',
        reason: 'Grades are identical'
      };
    }

    // Rule 4: Create new version for significant changes
    return {
      submissionId: existingGrade.submissionId,
      existingGrade,
      newGrade: newGradeInput,
      resolution: 'create_version',
      reason: 'Grade has changed - creating new version'
    };
  }

  /**
   * Batch process grade updates with conflict resolution
   */
  async batchProcessGrades(
    gradeInputs: Array<{ gradeInput: GradeInput; submission: Submission }>
  ): Promise<{
    created: Grade[];
    updated: Grade[];
    conflicts: GradeConflict[];
  }> {
    const submissionIds = gradeInputs.map(g => g.submission.id);
    const existingGrades = await this.getLatestGrades(submissionIds);

    const created: Grade[] = [];
    const updated: Grade[] = [];
    const conflicts: GradeConflict[] = [];

    for (const { gradeInput, submission } of gradeInputs) {
      const existingGrade = existingGrades.get(submission.id);

      if (!existingGrade) {
        // No existing grade, create new one
        const newGrade = await this.createGradeVersion(
          gradeInput,
          submission,
          'Initial grade'
        );
        created.push(newGrade);
      } else {
        // Resolve conflict
        const conflict = this.resolveGradeConflict(existingGrade, gradeInput);
        conflicts.push(conflict);

        if (conflict.resolution === 'create_version') {
          const newGrade = await this.createGradeVersion(
            gradeInput,
            submission,
            conflict.reason
          );
          updated.push(newGrade);
        }
      }
    }

    return { created, updated, conflicts };
  }

  /**
   * Lock a grade to prevent it from being overwritten
   */
  async lockGrade(gradeId: string, reason: string): Promise<void> {
    const gradeRef = db.collection(this.gradesCollection).doc(gradeId);
    await gradeRef.update({
      isLocked: true,
      lockedReason: reason,
      lockedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    });
  }

  /**
   * Unlock a grade to allow updates
   */
  async unlockGrade(gradeId: string): Promise<void> {
    const gradeRef = db.collection(this.gradesCollection).doc(gradeId);
    await gradeRef.update({
      isLocked: false,
      lockedReason: null,
      lockedAt: null,
      updatedAt: getCurrentTimestamp()
    });
  }

  /**
   * Get grade statistics for a classroom
   */
  async getClassroomGradeStats(classroomId: string): Promise<{
    totalGrades: number;
    averageScore: number;
    lockedGrades: number;
    aiGrades: number;
    manualGrades: number;
  }> {
    const snapshot = await db.collection(this.gradesCollection)
      .where('classroomId', '==', classroomId)
      .where('isLatest', '==', true)
      .get();
    const grades = snapshot.docs.map(doc => doc.data() as Grade);

    if (grades.length === 0) {
      return {
        totalGrades: 0,
        averageScore: 0,
        lockedGrades: 0,
        aiGrades: 0,
        manualGrades: 0
      };
    }

    const totalScore = grades.reduce((sum, g) => sum + g.percentage, 0);
    const lockedGrades = grades.filter(g => g.isLocked).length;
    const aiGrades = grades.filter(g => g.gradedBy === 'ai').length;
    const manualGrades = grades.filter(g => g.gradedBy === 'manual').length;

    return {
      totalGrades: grades.length,
      averageScore: Math.round(totalScore / grades.length),
      lockedGrades,
      aiGrades,
      manualGrades
    };
  }

  /**
   * Rollback to a previous grade version
   */
  async rollbackGrade(
    submissionId: string,
    targetVersion: number,
    reason: string
  ): Promise<Grade> {
    const history = await this.getGradeHistory(submissionId);
    const targetGrade = history.find(h => h.version === targetVersion);

    if (!targetGrade) {
      throw new Error(`Grade version ${targetVersion} not found for submission ${submissionId}`);
    }

    // Create new version based on target grade
    const rollbackInput: GradeInput = {
      submissionId: targetGrade.grade.submissionId,
      assignmentId: targetGrade.grade.assignmentId,
      studentId: targetGrade.grade.studentId,
      classroomId: targetGrade.grade.classroomId,
      score: targetGrade.grade.score,
      maxScore: targetGrade.grade.maxScore,
      feedback: targetGrade.grade.feedback,
      privateComments: targetGrade.grade.privateComments,
      rubricScores: targetGrade.grade.rubricScores,
      gradedAt: new Date(),
      gradedBy: 'manual',
      gradingMethod: targetGrade.grade.gradingMethod,
      submissionVersionGraded: targetGrade.grade.submissionVersionGraded,
      submissionContentSnapshot: targetGrade.grade.submissionContentSnapshot,
      isLocked: true,
      lockedReason: `Rolled back to version ${targetVersion}: ${reason}`,
      aiGradingInfo: undefined
    };

    const submission = await this.getSubmissionById(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    return await this.createGradeVersion(
      rollbackInput,
      submission,
      `Rollback to v${targetVersion}: ${reason}`
    );
  }

  /**
   * Helper to get submission by ID
   */
  private async getSubmissionById(submissionId: string): Promise<Submission | null> {
    const submissionRef = db.collection('submissions').doc(submissionId);
    const snapshot = await submissionRef.get();
    
    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as Submission;
  }
}