/**
 * Firestore service for managing grades and submissions
 * Location: functions/src/services/firestore.ts:1
 */

import { db, getCurrentTimestamp } from "../config/firebase";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions";

export interface GradeData {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  score: number;
  maxPoints: number;
  feedback: string;
  gradedBy: "ai" | "manual";
  gradedAt: admin.firestore.Timestamp;
  criteriaScores?: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
  metadata?: {
    submissionLength?: number;
    criteria?: string[];
    promptLength?: number;
    gradingDuration?: number;
    formId?: string;
    correctAnswers?: number;
    totalQuestions?: number;
    questionCount?: number;
    gradingMode?: string;
    isCodeAssignment?: boolean;
    questionGrades?: Array<{
      questionNumber: number;
      score: number;
      feedback: string;
      maxScore: number;
    }>;
  };
}

export interface SubmissionData {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentWork: string;
  submittedAt: admin.firestore.Timestamp;
  status: "pending" | "grading" | "graded" | "error";
  grade?: GradeData;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Service for managing grades in Firestore
 * Location: functions/src/services/firestore.ts:43
 */
export class FirestoreGradeService {
  
  /**
   * Save a grade to Firestore
   * Location: functions/src/services/firestore.ts:49
   */
  async saveGrade(gradeData: Omit<GradeData, "gradedAt">): Promise<string> {
    try {
      const grade: GradeData = {
        ...gradeData,
        gradedAt: getCurrentTimestamp() as admin.firestore.Timestamp
      };

      const gradeRef = await db.collection("grades").add(grade);
      
      // Update the submission status if submission exists
      try {
        await this.updateSubmissionStatus(gradeData.submissionId, "graded", gradeRef.id);
      } catch (error: unknown) {
        // If submission doesn't exist, that's okay - we'll just save the grade
        if ((error as { code?: number }).code !== 5) { // 5 = NOT_FOUND
          throw error;
        }
        logger.info("Submission not found, grade saved without updating submission status", { 
          submissionId: gradeData.submissionId,
          gradeId: gradeRef.id
        });
      }
      
      logger.info("Grade saved to Firestore", { 
        gradeId: gradeRef.id, 
        submissionId: gradeData.submissionId,
        score: gradeData.score 
      });
      
      return gradeRef.id;
    } catch (error) {
      logger.error("Error saving grade to Firestore", { 
        submissionId: gradeData.submissionId, 
        error 
      });
      throw error;
    }
  }

  /**
   * Get a grade by submission ID
   * Location: functions/src/services/firestore.ts:77
   */
  async getGradeBySubmissionId(submissionId: string): Promise<GradeData | null> {
    try {
      const gradesSnapshot = await db.collection("grades")
        .where("submissionId", "==", submissionId)
        .limit(1)
        .get();

      if (gradesSnapshot.empty) {
        return null;
      }

      const gradeDoc = gradesSnapshot.docs[0];
      return { ...gradeDoc.data(), id: gradeDoc.id } as GradeData & { id: string };
    } catch (error) {
      logger.error("Error fetching grade by submission ID", { submissionId, error });
      throw error;
    }
  }

  /**
   * Get all grades for an assignment
   * Location: functions/src/services/firestore.ts:97
   */
  async getGradesByAssignmentId(assignmentId: string): Promise<GradeData[]> {
    try {
      const gradesSnapshot = await db.collection("grades")
        .where("assignmentId", "==", assignmentId)
        .orderBy("gradedAt", "desc")
        .get();

      return gradesSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as (GradeData & { id: string })[];
    } catch (error) {
      logger.error("Error fetching grades by assignment ID", { assignmentId, error });
      throw error;
    }
  }

  /**
   * Save a submission to Firestore
   * Location: functions/src/services/firestore.ts:117
   */
  async saveSubmission(submissionData: Omit<SubmissionData, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
      const submission: Omit<SubmissionData, "id"> = {
        ...submissionData,
        createdAt: getCurrentTimestamp() as admin.firestore.Timestamp,
        updatedAt: getCurrentTimestamp() as admin.firestore.Timestamp
      };

      const submissionRef = await db.collection("submissions").add(submission);
      
      logger.info("Submission saved to Firestore", { 
        submissionId: submissionRef.id,
        assignmentId: submissionData.assignmentId,
        studentId: submissionData.studentId
      });
      
      return submissionRef.id;
    } catch (error) {
      logger.error("Error saving submission to Firestore", { submissionData, error });
      throw error;
    }
  }

  /**
   * Update submission status
   * Location: functions/src/services/firestore.ts:142
   */
  async updateSubmissionStatus(
    submissionId: string, 
    status: SubmissionData["status"], 
    gradeId?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: getCurrentTimestamp()
      };

      if (gradeId) {
        updateData.gradeId = gradeId;
      }

      await db.collection("submissions").doc(submissionId).update(updateData);
      
      logger.info("Submission status updated", { submissionId, status, gradeId });
    } catch (error) {
      logger.error("Error updating submission status", { submissionId, status, error });
      throw error;
    }
  }

  /**
   * Get submission by ID
   * Location: functions/src/services/firestore.ts:167
   */
  async getSubmissionById(submissionId: string): Promise<SubmissionData | null> {
    try {
      const submissionDoc = await db.collection("submissions").doc(submissionId).get();
      
      if (!submissionDoc.exists) {
        return null;
      }

      return { 
        id: submissionDoc.id, 
        ...submissionDoc.data() 
      } as SubmissionData;
    } catch (error) {
      logger.error("Error fetching submission by ID", { submissionId, error });
      throw error;
    }
  }

  /**
   * Get all submissions for an assignment
   * Location: functions/src/services/firestore.ts:186
   */
  async getSubmissionsByAssignmentId(assignmentId: string): Promise<SubmissionData[]> {
    try {
      const submissionsSnapshot = await db.collection("submissions")
        .where("assignmentId", "==", assignmentId)
        .orderBy("submittedAt", "desc")
        .get();

      // Extract submissions data with proper typing
      const submissions = submissionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });

      // Get all gradeIds from submissions that have them
      const gradeIds = submissions
        .map(sub => (sub as any).gradeId as string)
        .filter(Boolean);

      logger.info("Grade IDs to fetch", {
        assignmentId,
        gradeIds: gradeIds.slice(0, 10), // Show first 10 for debugging
        totalGradeIds: gradeIds.length,
        sampleSubmissionData: submissions.slice(0, 2).map(s => ({
          id: s.id,
          gradeId: (s as any).gradeId,
          status: (s as any).status
        }))
      });

      // If there are grades to fetch, batch fetch them
      if (gradeIds.length > 0) {
        // Firestore 'in' queries are limited to 10 items, so we need to batch
        const gradeMap = new Map<string, any>();
        
        // Process in chunks of 10
        for (let i = 0; i < gradeIds.length; i += 10) {
          const batch = gradeIds.slice(i, i + 10);
          logger.info("Fetching grades batch", {
            assignmentId,
            batch,
            batchSize: batch.length
          });
          
          // Try without isLatest filter first to see if grades exist at all
          const gradesSnapshot = await db.collection("grades")
            .where(admin.firestore.FieldPath.documentId(), "in", batch)
            .get();
          
          logger.info("Grades query result", {
            assignmentId,
            requestedIds: batch,
            foundCount: gradesSnapshot.docs.length,
            foundIds: gradesSnapshot.docs.map(doc => doc.id)
          });
          
          // Add to map with data transformation for compatibility
          gradesSnapshot.docs.forEach(doc => {
            const gradeData = doc.data();
            
            // Transform grade data to match expected schema
            const transformedGrade = {
              id: doc.id,
              ...gradeData,
              // Handle maxPoints vs maxScore compatibility
              maxScore: gradeData.maxScore || gradeData.maxPoints || 100,
              // Calculate percentage if missing
              percentage: gradeData.percentage || 
                         (gradeData.score && (gradeData.maxScore || gradeData.maxPoints)) 
                           ? Math.round((gradeData.score / (gradeData.maxScore || gradeData.maxPoints)) * 100)
                           : 0,
              // Add missing required fields with defaults
              classroomId: gradeData.classroomId || gradeData.assignmentId?.split('_assignment_')[0] || '',
              submissionVersionGraded: gradeData.submissionVersionGraded || 1
            };
            
            gradeMap.set(doc.id, transformedGrade);
          });
        }

        // Populate grade data on submissions
        const result = submissions.map(sub => ({
          ...sub,
          grade: (sub as any).gradeId ? gradeMap.get((sub as any).gradeId as string) : undefined
        })) as SubmissionData[];
        
        // Debug logging
        logger.info("Submissions with grades populated", {
          assignmentId,
          submissionsTotal: result.length,
          submissionsWithGradeId: result.filter(s => (s as any).gradeId).length,
          submissionsWithGrade: result.filter(s => s.grade).length,
          gradeMapSize: gradeMap.size,
          sampleGrade: result.find(s => s.grade)?.grade
        });
        
        return result;
      }

      // No grades to fetch, return submissions as-is
      return submissions as SubmissionData[];
    } catch (error) {
      logger.error("Error fetching submissions by assignment ID", { assignmentId, error });
      throw error;
    }
  }

  /**
   * Get ungraded submissions
   * Location: functions/src/services/firestore.ts:206
   */
  async getUngradedSubmissions(): Promise<SubmissionData[]> {
    try {
      const submissionsSnapshot = await db.collection("submissions")
        .where("status", "in", ["pending", "grading"])
        .orderBy("submittedAt", "asc")
        .get();

      return submissionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SubmissionData[];
    } catch (error) {
      logger.error("Error fetching ungraded submissions", { error });
      throw error;
    }
  }
}

/**
 * Create and return a FirestoreGradeService instance
 * Location: functions/src/services/firestore.ts:228
 */
export function createFirestoreGradeService(): FirestoreGradeService {
  return new FirestoreGradeService();
}