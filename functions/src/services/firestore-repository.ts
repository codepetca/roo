import {
  Classroom,
  Assignment,
  Submission,
  Grade,
  StudentEnrollment,
  ClassroomInput,
  AssignmentInput,
  SubmissionInput,
  GradeInput
} from "@shared/schemas/core";
import { db, getCurrentTimestamp, FieldValue } from "../config/firebase";
import * as admin from "firebase-admin";

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
      typeof value === "object" && 
      !Array.isArray(value) && 
      !isTimestampOrDate(value)
    ) {
      // Recursively clean nested objects (but not Dates or Firestore Timestamps)
      cleaned[key] = cleanForFirestore(value);
    } else if (Array.isArray(value)) {
      // Clean arrays (remove undefined elements)
      cleaned[key] = value.filter(item => item !== undefined).map(item => 
        (item !== null && typeof item === "object" && !isTimestampOrDate(item)) 
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
         (value && typeof value.toDate === "function" && typeof value.seconds === "number");
}

/**
 * Serialize Firestore timestamps to ISO strings for API responses
 * This ensures consistent timestamp format across Admin SDK (backend) and Web SDK (frontend)
 */
export function serializeTimestamps<T extends Record<string, any>>(doc: T): T {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }

  const serialized = { ...doc };

  for (const key in serialized) {
    const value = serialized[key] as any;
    
    // Check for Date objects
    if (value instanceof Date) {
      serialized[key] = value.toISOString() as any;
    }
    // Check if it's an empty object that should be a timestamp (common Firestore issue)
    else if (value && typeof value === 'object' && Object.keys(value).length === 0 && 
             (key === 'createdAt' || key === 'updatedAt' || key === 'gradedAt' || key === 'submittedAt' || key === 'dueDate')) {
      // Empty timestamp object - use current time as fallback
      console.warn(`Empty timestamp object found for ${key}, using fallback`);
      serialized[key] = new Date().toISOString() as any;
    }
    // Check for Firestore Timestamp by structure (Admin SDK format)
    else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      serialized[key] = new Date((value as any).seconds * 1000).toISOString() as any;
    }
    // Check for Firestore Timestamp by structure (Web SDK format)  
    else if (value && typeof value === 'object' && '_seconds' in value && '_nanoseconds' in value) {
      serialized[key] = new Date((value as any)._seconds * 1000).toISOString() as any;
    }
    // Check if it has toDate method (Firestore Timestamp with methods preserved)
    else if (value && typeof value === 'object' && typeof (value as any).toDate === "function") {
      serialized[key] = (value as any).toDate().toISOString() as any;
    }
    // Recursively handle arrays
    else if (Array.isArray(value)) {
      serialized[key] = value.map(item => 
        (item && typeof item === "object") ? serializeTimestamps(item) : item
      ) as any;
    }
    // Recursively handle nested objects (but not timestamps)
    else if (value && typeof value === "object" && 
             !('seconds' in value) && !('_seconds' in value)) {
      serialized[key] = serializeTimestamps(value) as any;
    }
  }

  return serialized;
}

export class FirestoreRepository {
  // Collection names
  private readonly collections = {
    users: "users",
    classrooms: "classrooms",
    assignments: "assignments",
    submissions: "submissions",
    grades: "grades",
    enrollments: "enrollments"
  };

  // ============================================
  // User Operations (replacing Teacher operations)
  // ============================================

  async getUserByEmail(email: string): Promise<any | null> {
    const snapshot = await db.collection(this.collections.users)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { ...doc.data(), id: doc.id };
  }

  async getUserById(userId: string): Promise<any | null> {
    const doc = await db.collection(this.collections.users).doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }

    return { ...doc.data(), id: doc.id };
  }

  async updateUser(userId: string, updates: Record<string, any>): Promise<void> {
    await db.collection(this.collections.users).doc(userId).update({
      ...updates,
      updatedAt: getCurrentTimestamp()
    });
  }

  // Deprecated teacher methods - redirecting to users collection
  async createTeacher(input: any): Promise<any> {
    // Teachers are now created through user registration
    throw new Error("createTeacher is deprecated. Use user registration flow instead.");
  }

  async getTeacherByEmail(email: string): Promise<any | null> {
    // Redirect to getUserByEmail
    return this.getUserByEmail(email);
  }

  async updateTeacher(id: string, updates: any): Promise<void> {
    // Redirect to updateUser
    return this.updateUser(id, updates);
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

    const classroom = { ...snapshot.data(), id: snapshot.id } as Classroom;
    return serializeTimestamps(classroom);
  }

  async getClassroomsByTeacher(userEmail: string): Promise<Classroom[]> {
    // Get user to check for schoolEmail
    const user = await this.getUserByEmail(userEmail);
    
    // Prefer schoolEmail if available, otherwise use personal email
    const teacherEmail = user?.schoolEmail || userEmail;
    
    console.log("FirestoreRepository: getClassroomsByTeacher debug", {
      userEmail,
      user: user ? { id: user.id, email: user.email, schoolEmail: user.schoolEmail } : null,
      teacherEmail,
      queryField: "teacherEmail"
    });
    
    // Query classrooms by the appropriate email
    const snapshot = await db.collection(this.collections.classrooms)
      .where("teacherEmail", "==", teacherEmail)
      .orderBy("updatedAt", "desc")
      .get();

    const classrooms = snapshot.docs.map(doc => {
      const classroom = { ...doc.data(), id: doc.id } as Classroom;
      return serializeTimestamps(classroom);
    });

    console.log("FirestoreRepository: getClassroomsByTeacher results", {
      teacherEmail,
      queryResultCount: classrooms.length,
      classroomIds: classrooms.map(c => ({ id: c.id, name: c.name, teacherId: c.teacherId }))
    });

    return classrooms;
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

    const assignment = { ...snapshot.data(), id: snapshot.id } as Assignment;
    return serializeTimestamps(assignment);
  }

  async getAssignmentsByClassroom(classroomId: string): Promise<Assignment[]> {
    const snapshot = await db.collection(this.collections.assignments)
      .where("classroomId", "==", classroomId)
      .orderBy("dueDate", "asc")
      .get();

    return snapshot.docs.map(doc => {
      const assignment = { ...doc.data(), id: doc.id } as Assignment;
      return serializeTimestamps(assignment);
    });
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
      .where("assignmentId", "==", assignmentId);

    if (onlyLatest) {
      query = query.where("isLatest", "==", true);
    }

    const snapshot = await query.orderBy("submittedAt", "desc").get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
  }

  async getSubmissionsByStudent(
    studentId: string,
    classroomId?: string
  ): Promise<Submission[]> {
    let query = db.collection(this.collections.submissions)
      .where("studentId", "==", studentId)
      .where("isLatest", "==", true);

    if (classroomId) {
      query = query.where("classroomId", "==", classroomId);
    }

    const snapshot = await query.orderBy("submittedAt", "desc").get();
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
      .where("classroomId", "==", classroomId)
      .where("isLatest", "==", true)
      .orderBy("gradedAt", "desc")
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
      .where("classroomId", "==", classroomId)
      .where("status", "==", "active")
      .orderBy("name", "asc")
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as StudentEnrollment));
  }

  async getEnrollmentsByStudent(studentId: string): Promise<StudentEnrollment[]> {
    const snapshot = await db.collection(this.collections.enrollments)
      .where("studentId", "==", studentId)
      .where("status", "==", "active")
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
    await this.updateEnrollment(id, { status: "removed" });
  }

  // ============================================
  // Batch Operations
  // ============================================

  /**
   * Chunk array into batches of specified size (Firestore limit is 500)
   */
  private chunkArray<T>(array: T[], chunkSize: number = 500): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async batchCreate<T extends { id: string }>(
    collectionName: string,
    items: T[]
  ): Promise<void> {
    if (items.length === 0) return;
    
    // Process in chunks of 500 (Firestore batch limit)
    const chunks = this.chunkArray(items, 500);
    
    for (const chunk of chunks) {
      const batch = db.batch();
      
      for (const item of chunk) {
        const docRef = db.collection(collectionName).doc(item.id);
        batch.set(docRef, cleanForFirestore({
          ...item,
          createdAt: getCurrentTimestamp(),
          updatedAt: getCurrentTimestamp()
        }));
      }
      
      await batch.commit();
    }
  }

  async batchUpdate<T extends { id: string }>(
    collectionName: string,
    updates: Array<{ id: string; data: Partial<T> }>
  ): Promise<void> {
    if (updates.length === 0) return;
    
    // Process in chunks of 500 (Firestore batch limit)
    const chunks = this.chunkArray(updates, 500);
    
    for (const chunk of chunks) {
      const batch = db.batch();
      
      for (const update of chunk) {
        const docRef = db.collection(collectionName).doc(update.id);
        batch.update(docRef, cleanForFirestore({
          ...update.data,
          updatedAt: getCurrentTimestamp()
        }));
      }
      
      await batch.commit();
    }
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
      .where("status", "in", ["submitted", "draft"])
      .where("isLatest", "==", true);

    if (classroomId) {
      query = query.where("classroomId", "==", classroomId);
    }

    const snapshot = await query.orderBy("submittedAt", "asc").get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
  }

  async getRecentActivity(
    classroomId: string,
    limitCount: number = 10
  ): Promise<Array<Submission | Grade>> {
    // Get recent submissions
    const submissionsSnapshot = await db.collection(this.collections.submissions)
      .where("classroomId", "==", classroomId)
      .where("isLatest", "==", true)
      .orderBy("submittedAt", "desc")
      .limit(limitCount)
      .get();

    // Get recent grades
    const gradesSnapshot = await db.collection(this.collections.grades)
      .where("classroomId", "==", classroomId)
      .where("isLatest", "==", true)
      .orderBy("gradedAt", "desc")
      .limit(limitCount)
      .get();

    const submissions = submissionsSnapshot.docs.map(doc => {
      const submission = { 
        ...doc.data(), 
        id: doc.id,
        type: "submission" 
      } as Submission & { type: string };
      return serializeTimestamps(submission);
    });

    const grades = gradesSnapshot.docs.map(doc => {
      const grade = { 
        ...doc.data(), 
        id: doc.id,
        type: "grade"
      } as Grade & { type: string };
      return serializeTimestamps(grade);
    });

    // Combine and sort by timestamp
    const combined = [...submissions, ...grades].sort((a, b) => {
      const aTime = "submittedAt" in a 
        ? (a as Submission).submittedAt 
        : (a as Grade).gradedAt;
      const bTime = "submittedAt" in b 
        ? (b as Submission).submittedAt 
        : (b as Grade).gradedAt;
      
      // Convert to Date objects handling both Date and Firestore Timestamp types
      const getDateFromTimestamp = (timestamp: any): Date => {
        if (timestamp instanceof Date) {
          return timestamp;
        }
        if (timestamp && typeof timestamp.toDate === 'function') {
          return timestamp.toDate();
        }
        if (timestamp && timestamp._seconds !== undefined) {
          // Handle raw Firestore timestamp format
          return new Date(timestamp._seconds * 1000);
        }
        // Fallback to current time if timestamp is invalid
        return new Date();
      };
      
      const aDate = getDateFromTimestamp(aTime);
      const bDate = getDateFromTimestamp(bTime);
      
      return bDate.getTime() - aDate.getTime();
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
      s.status === "submitted" && !grades.find(g => g.submissionId === s.id)
    ).length;

    // Update classroom counts
    await this.updateClassroom(classroomId, {
      studentCount: enrollments.length,
      assignmentCount: assignments.length,
      activeSubmissions: submissions.length,
      ungradedSubmissions: ungradedCount
    });
  }

  // ============================================
  // Student Dashboard Operations
  // ============================================

  /**
   * Get grades for a specific student across all classrooms
   */
  async getGradesByStudent(studentId: string): Promise<Grade[]> {
    const snapshot = await db.collection(this.collections.grades)
      .where("studentId", "==", studentId)
      .where("isLatest", "==", true)
      .orderBy("gradedAt", "desc")
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Grade));
  }

  /**
   * Get grades for a specific student in a specific classroom
   */
  async getGradesByStudentAndClassroom(studentId: string, classroomId: string): Promise<Grade[]> {
    const snapshot = await db.collection(this.collections.grades)
      .where("studentId", "==", studentId)
      .where("classroomId", "==", classroomId)
      .where("isLatest", "==", true)
      .orderBy("gradedAt", "desc")
      .get();

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Grade));
  }

  /**
   * Get recent activity for a student across all their classrooms
   */
  async getStudentRecentActivity(studentId: string, limit: number = 10): Promise<Array<Submission | Grade>> {
    // Get recent submissions
    const submissionSnapshot = await db.collection(this.collections.submissions)
      .where("studentId", "==", studentId)
      .where("isLatest", "==", true)
      .orderBy("submittedAt", "desc")
      .limit(limit)
      .get();

    // Get recent grades  
    const gradeSnapshot = await db.collection(this.collections.grades)
      .where("studentId", "==", studentId)
      .where("isLatest", "==", true)
      .orderBy("gradedAt", "desc")
      .limit(limit)
      .get();

    const submissions = submissionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
    const grades = gradeSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Grade));

    // Combine and sort by timestamp
    const combined = [
      ...submissions.map(s => ({ ...s, timestamp: s.submittedAt, type: 'submission' as const })),
      ...grades.map(g => ({ ...g, timestamp: g.gradedAt, type: 'grade' as const }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
     .slice(0, limit);

    return combined;
  }
}