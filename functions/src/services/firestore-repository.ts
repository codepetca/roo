import {
  Teacher,
  Classroom,
  Assignment,
  Submission,
  Grade,
  StudentEnrollment,
  TeacherInput,
  ClassroomInput,
  AssignmentInput,
  SubmissionInput,
  GradeInput
} from '@shared/schemas/core';
import { db, getCurrentTimestamp, FieldValue } from '../config/firebase';
import * as admin from 'firebase-admin';

/**
 * Firestore Repository Service
 * Location: functions/src/services/firestore-repository.ts
 * 
 * Provides CRUD operations and complex queries for normalized entities.
 * Designed to be compatible with future Firebase DataConnect migration.
 */

/**
 * Remove undefined values from an object to prepare it for Firestore
 * Firestore doesn't accept undefined values, so we need to clean them
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned = {} as T;
  
  for (const key in obj) {
    const value = obj[key];
    
    if (value === undefined) {
      // Skip undefined values
      continue;
    } else if (
      value !== null && 
      typeof value === 'object' && 
      !Array.isArray(value) && 
      !isTimestampOrDate(value)
    ) {
      // Recursively clean nested objects (but not Dates or Firestore Timestamps)
      cleaned[key] = cleanForFirestore(value);
    } else if (Array.isArray(value)) {
      // Clean arrays (remove undefined elements)
      cleaned[key] = value.filter(item => item !== undefined).map(item => 
        (item !== null && typeof item === 'object' && !isTimestampOrDate(item)) 
          ? cleanForFirestore(item) 
          : item
      ) as any;
    } else {
      // Keep all other values (including null, which Firestore accepts)
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Check if a value is a Date or Firestore Timestamp
 */
function isTimestampOrDate(value: any): boolean {
  return value instanceof Date || 
         (value && typeof value.toDate === 'function' && typeof value.seconds === 'number');
}

export class FirestoreRepository {
  // Collection names
  private readonly collections = {
    teachers: 'teachers',
    classrooms: 'classrooms',
    assignments: 'assignments',
    submissions: 'submissions',
    grades: 'grades',
    enrollments: 'enrollments'
  };

  // ============================================
  // Teacher Operations
  // ============================================

  async createTeacher(input: TeacherInput): Promise<Teacher> {
    const teacherId = `teacher_${input.email.replace('@', '_at_').replace('.', '_')}`;
    const teacherRef = db.collection(this.collections.teachers).doc(teacherId);
    
    const teacher: Teacher = {
      ...input,
      id: teacherId,
      totalStudents: 0,
      totalClassrooms: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await teacherRef.set(cleanForFirestore({
      ...teacher,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    }));

    return teacher;
  }

  async getTeacherByEmail(email: string): Promise<Teacher | null> {
    const teacherId = `teacher_${email.replace('@', '_at_').replace('.', '_')}`;
    const teacherRef = db.collection(this.collections.teachers).doc(teacherId);
    const snapshot = await teacherRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as Teacher;
  }

  async updateTeacher(id: string, updates: Partial<Teacher>): Promise<void> {
    const teacherRef = db.collection(this.collections.teachers).doc(id);
    await teacherRef.update(cleanForFirestore({
      ...updates,
      updatedAt: getCurrentTimestamp()
    }));
  }

  // ============================================
  // Classroom Operations
  // ============================================

  async createClassroom(input: ClassroomInput): Promise<Classroom> {
    const classroomId = `classroom_${input.externalId}`;
    const classroomRef = db.collection(this.collections.classrooms).doc(classroomId);
    
    const classroom: Classroom = {
      ...input,
      id: classroomId,
      studentCount: 0,
      assignmentCount: 0,
      activeSubmissions: 0,
      ungradedSubmissions: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await classroomRef.set(cleanForFirestore({
      ...classroom,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    }));

    return classroom;
  }

  async getClassroom(id: string): Promise<Classroom | null> {
    const classroomRef = db.collection(this.collections.classrooms).doc(id);
    const snapshot = await classroomRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as Classroom;
  }

  async getClassroomsByTeacher(teacherId: string): Promise<Classroom[]> {
    const snapshot = await db.collection(this.collections.classrooms)
      .where('teacherId', '==', teacherId)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Classroom));
  }

  async updateClassroom(id: string, updates: Partial<Classroom>): Promise<void> {
    const classroomRef = db.collection(this.collections.classrooms).doc(id);
    await classroomRef.update(cleanForFirestore({
      ...updates,
      updatedAt: getCurrentTimestamp()
    }));
  }

  // ============================================
  // Assignment Operations
  // ============================================

  async createAssignment(input: AssignmentInput): Promise<Assignment> {
    const assignmentId = `${input.classroomId}_assignment_${input.externalId}`;
    const assignmentRef = db.collection(this.collections.assignments).doc(assignmentId);
    
    const assignment: Assignment = {
      ...input,
      id: assignmentId,
      submissionCount: 0,
      gradedCount: 0,
      pendingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await assignmentRef.set(cleanForFirestore({
      ...assignment,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    }));

    return assignment;
  }

  async getAssignment(id: string): Promise<Assignment | null> {
    const assignmentRef = db.collection(this.collections.assignments).doc(id);
    const snapshot = await assignmentRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as Assignment;
  }

  async getAssignmentsByClassroom(classroomId: string): Promise<Assignment[]> {
    const snapshot = await db.collection(this.collections.assignments)
      .where('classroomId', '==', classroomId)
      .orderBy('dueDate', 'asc')
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Assignment));
  }

  async updateAssignment(id: string, updates: Partial<Assignment>): Promise<void> {
    const assignmentRef = db.collection(this.collections.assignments).doc(id);
    await assignmentRef.update(cleanForFirestore({
      ...updates,
      updatedAt: getCurrentTimestamp()
    }));
  }

  // ============================================
  // Submission Operations
  // ============================================

  async createSubmission(input: SubmissionInput): Promise<Submission> {
    const submissionId = `${input.classroomId}_${input.assignmentId}_${input.studentId}`;
    const submissionRef = db.collection(this.collections.submissions).doc(submissionId);
    
    const submission: Submission = {
      ...input,
      id: submissionId,
      version: 1,
      isLatest: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await submissionRef.set(cleanForFirestore({
      ...submission,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    }));

    return submission;
  }

  async getSubmission(id: string): Promise<Submission | null> {
    const submissionRef = db.collection(this.collections.submissions).doc(id);
    const snapshot = await submissionRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as Submission;
  }

  async getSubmissionsByAssignment(
    assignmentId: string,
    onlyLatest: boolean = true
  ): Promise<Submission[]> {
    let query = db.collection(this.collections.submissions)
      .where('assignmentId', '==', assignmentId);

    if (onlyLatest) {
      query = query.where('isLatest', '==', true);
    }

    const snapshot = await query.orderBy('submittedAt', 'desc').get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
  }

  async getSubmissionsByStudent(
    studentId: string,
    classroomId?: string
  ): Promise<Submission[]> {
    let query = db.collection(this.collections.submissions)
      .where('studentId', '==', studentId)
      .where('isLatest', '==', true);

    if (classroomId) {
      query = query.where('classroomId', '==', classroomId);
    }

    const snapshot = await query.orderBy('submittedAt', 'desc').get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
  }

  async updateSubmission(id: string, updates: Partial<Submission>): Promise<void> {
    const submissionRef = db.collection(this.collections.submissions).doc(id);
    await submissionRef.update(cleanForFirestore({
      ...updates,
      updatedAt: getCurrentTimestamp()
    }));
  }

  async createSubmissionVersion(
    existingSubmission: Submission,
    updates: Partial<SubmissionInput>
  ): Promise<Submission> {
    return await db.runTransaction(async (transaction) => {
      // Mark existing as not latest
      const existingRef = db.collection(this.collections.submissions).doc(existingSubmission.id);
      transaction.update(existingRef, cleanForFirestore({
        isLatest: false,
        updatedAt: getCurrentTimestamp()
      }));

      // Create new version
      const newVersion = existingSubmission.version + 1;
      const newId = `${existingSubmission.id}_v${newVersion}`;
      const newRef = db.collection(this.collections.submissions).doc(newId);
      
      const newSubmission: Submission = {
        ...existingSubmission,
        ...updates,
        id: newId,
        version: newVersion,
        previousVersionId: existingSubmission.id,
        isLatest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      transaction.set(newRef, cleanForFirestore({
        ...newSubmission,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
      }));

      return newSubmission;
    });
  }

  // ============================================
  // Grade Operations
  // ============================================

  async createGrade(input: GradeInput): Promise<Grade> {
    const gradeId = `${input.submissionId}_grade_v1`;
    const gradeRef = db.collection(this.collections.grades).doc(gradeId);
    
    const grade: Grade = {
      ...input,
      id: gradeId,
      version: 1,
      isLatest: true,
      percentage: Math.round((input.score / input.maxScore) * 100),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await gradeRef.set(cleanForFirestore({
      ...grade,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    }));

    return grade;
  }

  async getGrade(id: string): Promise<Grade | null> {
    const gradeRef = db.collection(this.collections.grades).doc(id);
    const snapshot = await gradeRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as Grade;
  }

  async getGradesByClassroom(classroomId: string): Promise<Grade[]> {
    const snapshot = await db.collection(this.collections.grades)
      .where('classroomId', '==', classroomId)
      .where('isLatest', '==', true)
      .orderBy('gradedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Grade));
  }

  async updateGrade(id: string, updates: Partial<Grade>): Promise<void> {
    const gradeRef = db.collection(this.collections.grades).doc(id);
    await gradeRef.update(cleanForFirestore({
      ...updates,
      updatedAt: getCurrentTimestamp()
    }));
  }

  // ============================================
  // Student Enrollment Operations
  // ============================================

  async createEnrollment(enrollment: StudentEnrollment): Promise<StudentEnrollment> {
    const enrollmentRef = db.collection(this.collections.enrollments).doc(enrollment.id);
    
    await enrollmentRef.set(cleanForFirestore({
      ...enrollment,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    }));

    return enrollment;
  }

  async getEnrollment(id: string): Promise<StudentEnrollment | null> {
    const enrollmentRef = db.collection(this.collections.enrollments).doc(id);
    const snapshot = await enrollmentRef.get();

    if (!snapshot.exists) {
      return null;
    }

    return { ...snapshot.data(), id: snapshot.id } as StudentEnrollment;
  }

  async getEnrollmentsByClassroom(classroomId: string): Promise<StudentEnrollment[]> {
    const snapshot = await db.collection(this.collections.enrollments)
      .where('classroomId', '==', classroomId)
      .where('status', '==', 'active')
      .orderBy('name', 'asc')
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StudentEnrollment));
  }

  async getEnrollmentsByStudent(studentId: string): Promise<StudentEnrollment[]> {
    const snapshot = await db.collection(this.collections.enrollments)
      .where('studentId', '==', studentId)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StudentEnrollment));
  }

  async updateEnrollment(id: string, updates: Partial<StudentEnrollment>): Promise<void> {
    const enrollmentRef = db.collection(this.collections.enrollments).doc(id);
    await enrollmentRef.update(cleanForFirestore({
      ...updates,
      updatedAt: getCurrentTimestamp()
    }));
  }

  async archiveEnrollment(id: string): Promise<void> {
    await this.updateEnrollment(id, { status: 'removed' });
  }

  // ============================================
  // Batch Operations
  // ============================================

  async batchCreate<T extends { id: string }>(
    collectionName: string,
    items: T[]
  ): Promise<void> {
    const batch = db.batch();
    
    for (const item of items) {
      const docRef = db.collection(collectionName).doc(item.id);
      batch.set(docRef, cleanForFirestore({
        ...item,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
      }));
    }

    await batch.commit();
  }

  async batchUpdate<T extends { id: string }>(
    collectionName: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<void> {
    const batch = db.batch();
    
    for (const update of updates) {
      const docRef = db.collection(collectionName).doc(update.id);
      batch.update(docRef, cleanForFirestore({
        ...update.data,
        updatedAt: getCurrentTimestamp()
      }));
    }

    await batch.commit();
  }

  async batchDelete(collectionName: string, ids: string[]): Promise<void> {
    const batch = db.batch();
    
    for (const id of ids) {
      const docRef = db.collection(collectionName).doc(id);
      batch.delete(docRef);
    }

    await batch.commit();
  }

  // ============================================
  // Complex Queries
  // ============================================

  async getUngradedSubmissions(classroomId?: string): Promise<Submission[]> {
    let query = db.collection(this.collections.submissions)
      .where('status', 'in', ['submitted', 'draft'])
      .where('isLatest', '==', true);

    if (classroomId) {
      query = query.where('classroomId', '==', classroomId);
    }

    const snapshot = await query.orderBy('submittedAt', 'asc').get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
  }

  async getRecentActivity(
    classroomId: string,
    limitCount: number = 10
  ): Promise<Array<Submission | Grade>> {
    // Get recent submissions
    const submissionsSnapshot = await db.collection(this.collections.submissions)
      .where('classroomId', '==', classroomId)
      .where('isLatest', '==', true)
      .orderBy('submittedAt', 'desc')
      .limit(limitCount)
      .get();

    // Get recent grades
    const gradesSnapshot = await db.collection(this.collections.grades)
      .where('classroomId', '==', classroomId)
      .where('isLatest', '==', true)
      .orderBy('gradedAt', 'desc')
      .limit(limitCount)
      .get();

    const submissions = submissionsSnapshot.docs.map(doc => ({ 
      ...doc.data(), 
      id: doc.id,
      type: 'submission' 
    } as Submission & { type: string }));

    const grades = gradesSnapshot.docs.map(doc => ({ 
      ...doc.data(), 
      id: doc.id,
      type: 'grade'
    } as Grade & { type: string }));

    // Combine and sort by timestamp
    const combined = [...submissions, ...grades].sort((a, b) => {
      const aTime = 'submittedAt' in a 
        ? (a as Submission).submittedAt 
        : (a as Grade).gradedAt;
      const bTime = 'submittedAt' in b 
        ? (b as Submission).submittedAt 
        : (b as Grade).gradedAt;
      return bTime.getTime() - aTime.getTime();
    });

    return combined.slice(0, limitCount);
  }

  async updateCounts(classroomId: string): Promise<void> {
    // Get all counts
    const [assignments, enrollments, submissions, grades] = await Promise.all([
      this.getAssignmentsByClassroom(classroomId),
      this.getEnrollmentsByClassroom(classroomId),
      this.getSubmissionsByAssignment(classroomId),
      this.getGradesByClassroom(classroomId)
    ]);

    const ungradedCount = submissions.filter(s => 
      s.status === 'submitted' && !grades.find(g => g.submissionId === s.id)
    ).length;

    // Update classroom counts
    await this.updateClassroom(classroomId, {
      studentCount: enrollments.length,
      assignmentCount: assignments.length,
      activeSubmissions: submissions.length,
      ungradedSubmissions: ungradedCount
    });
  }
}