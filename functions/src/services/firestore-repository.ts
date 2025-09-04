import {
  Classroom,
  Assignment,
  Submission,
  Grade,
  StudentEnrollment,
  ClassroomInput,
  AssignmentInput,
  SubmissionInput,
  GradeInput,
  dashboardUserSchema,
  classroomSchema,
  assignmentSchema,
  submissionSchema,
  gradeSchema,
  studentEnrollmentSchema
} from "@shared/schemas/core";
import { 
  safeNormalizeWithSchema,
  normalizeTimestamps,
  cleanUndefinedValues,
  removeEmptyKeys
} from "@shared/utils/normalization";
import { db, getCurrentTimestamp, FieldValue } from "../config/firebase";
import * as admin from "firebase-admin";
import { z } from "zod";
import * as zlib from "zlib";
import { ClassroomSnapshot } from "@shared/schemas/classroom-snapshot";
import { normalizeSnapshotForComparison, createStableJsonString } from "@shared/utils/snapshot-normalization";

/**
 * Firestore Repository Service
 * Location: functions/src/services/firestore-repository.ts
 * 
 * Provides CRUD operations and complex queries for normalized entities.
 * Designed to be compatible with future Firebase DataConnect migration.
 */

/**
 * Clean an object for Firestore compatibility
 * - Removes undefined values (Firestore doesn't accept them)
 * - Removes empty string keys (Firestore FieldPath validation rejects them)
 * @param obj - Object to clean
 * @returns Object ready for Firestore
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  // First remove undefined values
  const withoutUndefined = cleanUndefinedValues(obj);
  
  // Then remove empty string keys
  const cleaned = removeEmptyKeys(withoutUndefined);
  
  return cleaned as T;
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

  // First normalize timestamps to Date objects
  const normalized = normalizeTimestamps(doc);
  
  // Then convert all Date objects to ISO strings
  const serialized = { ...normalized };

  for (const key in serialized) {
    const value = serialized[key] as any;
    
    // Convert Date objects to ISO strings
    if (value instanceof Date) {
      serialized[key] = value.toISOString() as any;
    }
    // Handle empty timestamp objects (common Firestore issue)
    else if (value && typeof value === 'object' && Object.keys(value).length === 0 && 
             (key === 'createdAt' || key === 'updatedAt' || key === 'gradedAt' || key === 'submittedAt' || key === 'dueDate')) {
      // Empty timestamp object - use current time as fallback
      console.warn(`Empty timestamp object found for ${key}, using fallback`);
      serialized[key] = new Date().toISOString() as any;
    }
    // Recursively handle arrays
    else if (Array.isArray(value)) {
      serialized[key] = value.map(item => 
        (item && typeof item === "object") ? serializeTimestamps(item) : item
      ) as any;
    }
    // Recursively handle nested objects
    else if (value && typeof value === "object") {
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
    enrollments: "enrollments",
    teacherImports: "teacher_imports"
  };

  // ============================================
  // Composite ID Helpers for Scoped Google IDs
  // ============================================
  
  /**
   * Generate composite document ID for assignments
   * Format: {googleCourseId}_{googleCourseWorkId}
   */
  private generateAssignmentDocumentId(googleCourseId: string, googleCourseWorkId: string): string {
    return `${googleCourseId}_${googleCourseWorkId}`;
  }
  
  /**
   * Generate composite document ID for submissions
   * Format: {googleCourseId}_{googleCourseWorkId}_{googleSubmissionId}
   */
  private generateSubmissionDocumentId(googleCourseId: string, googleCourseWorkId: string, googleSubmissionId: string): string {
    return `${googleCourseId}_${googleCourseWorkId}_${googleSubmissionId}`;
  }
  
  /**
   * Generate composite document ID for enrollments
   * Format: {googleCourseId}_{googleUserId}
   */
  private generateEnrollmentDocumentId(googleCourseId: string, googleUserId: string): string {
    return `${googleCourseId}_${googleUserId}`;
  }

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
    const rawData = doc.data();
    if (!rawData) {
      return null;
    }

    // Use schema-driven normalization to ensure all expected fields exist
    try {
      return safeNormalizeWithSchema(normalizeTimestamps(rawData), dashboardUserSchema, doc.id);
    } catch (error) {
      console.error("FirestoreRepository: getUserByEmail normalization failed:", {
        email,
        error: error instanceof Error ? error.message : error,
        rawData
      });
      // Fallback to basic normalization with ID
      return serializeTimestamps({ ...rawData, id: doc.id }) as any;
    }
  }

  async getUserById(userId: string): Promise<any | null> {
    const doc = await db.collection(this.collections.users).doc(userId).get();
    
    if (!doc.exists) {
      return null;
    }

    const rawData = doc.data();
    if (!rawData) {
      return null;
    }

    // Use schema-driven normalization to ensure all expected fields exist
    try {
      return safeNormalizeWithSchema(normalizeTimestamps(rawData), dashboardUserSchema, doc.id);
    } catch (error) {
      console.error("FirestoreRepository: getUserById normalization failed:", {
        userId,
        error: error instanceof Error ? error.message : error,
        rawData
      });
      // Fallback to basic normalization with ID
      return serializeTimestamps({ ...rawData, id: doc.id }) as any;
    }
  }

  async updateUser(userId: string, updates: Record<string, any>): Promise<void> {
    await db.collection(this.collections.users).doc(userId).update({
      ...updates,
      updatedAt: getCurrentTimestamp()
    });
  }

  // ============================================
  // Google ID-based Operations (New)
  // ============================================

  /**
   * Get user by Google User ID (direct document access)
   * @param googleUserId - Google User ID from Classroom API
   * @returns User document or null
   */
  async getUserByGoogleId(googleUserId: string): Promise<any | null> {
    const doc = await db.collection(this.collections.users).doc(googleUserId).get();
    
    if (!doc.exists) {
      return null;
    }

    const rawData = doc.data();
    if (!rawData) {
      return null;
    }

    try {
      return safeNormalizeWithSchema(normalizeTimestamps(rawData), dashboardUserSchema, doc.id);
    } catch (error) {
      console.error("FirestoreRepository: getUserByGoogleId normalization failed:", {
        googleUserId,
        error: error instanceof Error ? error.message : error,
        rawData
      });
      return serializeTimestamps({ ...rawData, id: doc.id }) as any;
    }
  }

  /**
   * Get classroom by Google Course ID (direct document access)
   * @param googleCourseId - Google Course ID from Classroom API
   * @returns Classroom document or null
   */
  async getClassroomByGoogleId(googleCourseId: string): Promise<Classroom | null> {
    const doc = await db.collection(this.collections.classrooms).doc(googleCourseId).get();
    
    if (!doc.exists) {
      return null;
    }

    const rawData = doc.data();
    if (!rawData) {
      return null;
    }

    try {
      const normalizedTimestamps = normalizeTimestamps(rawData);
      return safeNormalizeWithSchema(normalizedTimestamps, classroomSchema, doc.id) as any;
    } catch (error) {
      console.error("FirestoreRepository: getClassroomByGoogleId normalization failed:", {
        googleCourseId,
        error: error instanceof Error ? error.message : error,
        rawData
      });
      return serializeTimestamps({ ...rawData, id: doc.id }) as any;
    }
  }

  /**
   * Get classrooms by Google Owner ID (indexed query)
   * @param googleOwnerId - Google User ID of course owner
   * @returns Array of classroom documents
   */
  async getClassroomsByGoogleOwnerId(googleOwnerId: string): Promise<Classroom[]> {
    const snapshot = await db.collection(this.collections.classrooms)
      .where("googleOwnerId", "==", googleOwnerId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const rawData = doc.data();
      try {
        return safeNormalizeWithSchema(normalizeTimestamps(rawData), classroomSchema, doc.id) as any;
      } catch (error) {
        console.error("FirestoreRepository: getClassroomsByGoogleOwnerId normalization failed:", {
          googleOwnerId,
          docId: doc.id,
          error: error instanceof Error ? error.message : error
        });
        return serializeTimestamps({ ...rawData, id: doc.id }) as any;
      }
    }) as any;
  }

  /**
   * Get assignment by Google CourseWork ID (direct document access with composite ID)
   * @param googleCourseId - Google Course ID from Classroom API
   * @param googleCourseWorkId - Google CourseWork ID from Classroom API (scoped to course)
   * @returns Assignment document or null
   */
  async getAssignmentByGoogleId(googleCourseId: string, googleCourseWorkId: string): Promise<Assignment | null> {
    const compositeId = this.generateAssignmentDocumentId(googleCourseId, googleCourseWorkId);
    const doc = await db.collection(this.collections.assignments).doc(compositeId).get();
    
    if (!doc.exists) {
      return null;
    }

    const rawData = doc.data();
    if (!rawData) {
      return null;
    }

    try {
      return safeNormalizeWithSchema(normalizeTimestamps(rawData), assignmentSchema, doc.id) as any;
    } catch (error) {
      console.error("FirestoreRepository: getAssignmentByGoogleId normalization failed:", {
        googleCourseWorkId,
        error: error instanceof Error ? error.message : error,
        rawData
      });
      return serializeTimestamps({ ...rawData, id: doc.id }) as any;
    }
  }

  /**
   * Get assignments by Google Course ID (indexed query)
   * @param googleCourseId - Google Course ID
   * @returns Array of assignment documents
   */
  async getAssignmentsByGoogleCourseId(googleCourseId: string): Promise<Assignment[]> {
    const snapshot = await db.collection(this.collections.assignments)
      .where("googleCourseId", "==", googleCourseId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const rawData = doc.data();
      try {
        return safeNormalizeWithSchema(normalizeTimestamps(rawData), assignmentSchema, doc.id) as any;
      } catch (error) {
        console.error("FirestoreRepository: getAssignmentsByGoogleCourseId normalization failed:", {
          googleCourseId,
          docId: doc.id,
          error: error instanceof Error ? error.message : error
        });
        return serializeTimestamps({ ...rawData, id: doc.id }) as any;
      }
    }) as any;
  }

  /**
   * Get submission by Google Submission ID (direct document access)
   * @param googleSubmissionId - Google Submission ID from Classroom API
   * @returns Submission document or null
   */
  async getSubmissionByGoogleId(googleSubmissionId: string): Promise<Submission | null> {
    const doc = await db.collection(this.collections.submissions).doc(googleSubmissionId).get();
    
    if (!doc.exists) {
      return null;
    }

    const rawData = doc.data();
    if (!rawData) {
      return null;
    }

    try {
      return safeNormalizeWithSchema(normalizeTimestamps(rawData), submissionSchema, doc.id) as any;
    } catch (error) {
      console.error("FirestoreRepository: getSubmissionByGoogleId normalization failed:", {
        googleSubmissionId,
        error: error instanceof Error ? error.message : error,
        rawData
      });
      return serializeTimestamps({ ...rawData, id: doc.id }) as any;
    }
  }

  /**
   * Get submissions by Google User ID (indexed query)
   * @param googleUserId - Google User ID of student
   * @returns Array of submission documents
   */
  async getSubmissionsByGoogleUserId(googleUserId: string): Promise<Submission[]> {
    const snapshot = await db.collection(this.collections.submissions)
      .where("googleUserId", "==", googleUserId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const rawData = doc.data();
      try {
        return safeNormalizeWithSchema(normalizeTimestamps(rawData), submissionSchema, doc.id) as any;
      } catch (error) {
        console.error("FirestoreRepository: getSubmissionsByGoogleUserId normalization failed:", {
          googleUserId,
          docId: doc.id,
          error: error instanceof Error ? error.message : error
        });
        return serializeTimestamps({ ...rawData, id: doc.id }) as any;
      }
    }) as any;
  }

  /**
   * Get submissions by Google CourseWork ID (indexed query)
   * @param googleCourseWorkId - Google CourseWork ID
   * @returns Array of submission documents
   */
  async getSubmissionsByGoogleCourseWorkId(googleCourseWorkId: string): Promise<Submission[]> {
    const snapshot = await db.collection(this.collections.submissions)
      .where("googleCourseWorkId", "==", googleCourseWorkId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const rawData = doc.data();
      try {
        return safeNormalizeWithSchema(normalizeTimestamps(rawData), submissionSchema, doc.id) as any;
      } catch (error) {
        console.error("FirestoreRepository: getSubmissionsByGoogleCourseWorkId normalization failed:", {
          googleCourseWorkId,
          docId: doc.id,
          error: error instanceof Error ? error.message : error
        });
        return serializeTimestamps({ ...rawData, id: doc.id }) as any;
      }
    }) as any;
  }

  /**
   * Get student enrollment by composite ID (courseId_userId)
   * @param googleCourseId - Google Course ID
   * @param googleUserId - Google User ID
   * @returns StudentEnrollment document or null
   */
  async getEnrollmentByGoogleIds(googleCourseId: string, googleUserId: string): Promise<StudentEnrollment | null> {
    const docId = `${googleCourseId}_${googleUserId}`;
    const doc = await db.collection(this.collections.enrollments).doc(docId).get();
    
    if (!doc.exists) {
      return null;
    }

    const rawData = doc.data();
    if (!rawData) {
      return null;
    }

    try {
      return safeNormalizeWithSchema(normalizeTimestamps(rawData), studentEnrollmentSchema, doc.id) as any;
    } catch (error) {
      console.error("FirestoreRepository: getEnrollmentByGoogleIds normalization failed:", {
        googleCourseId,
        googleUserId,
        error: error instanceof Error ? error.message : error,
        rawData
      });
      return serializeTimestamps({ ...rawData, id: doc.id }) as any;
    }
  }

  /**
   * Get enrollments by Google Course ID (indexed query)
   * @param googleCourseId - Google Course ID
   * @returns Array of StudentEnrollment documents
   */
  async getEnrollmentsByGoogleCourseId(googleCourseId: string): Promise<StudentEnrollment[]> {
    const snapshot = await db.collection(this.collections.enrollments)
      .where("googleCourseId", "==", googleCourseId)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => {
      const rawData = doc.data();
      try {
        return safeNormalizeWithSchema(normalizeTimestamps(rawData), studentEnrollmentSchema, doc.id) as any;
      } catch (error) {
        console.error("FirestoreRepository: getEnrollmentsByGoogleCourseId normalization failed:", {
          googleCourseId,
          docId: doc.id,
          error: error instanceof Error ? error.message : error
        });
        return serializeTimestamps({ ...rawData, id: doc.id }) as any;
      }
    }) as any;
  }

  // ============================================
  // Google ID-based Creation Methods
  // ============================================

  /**
   * Create or update user with Google User ID as document ID
   * @param googleUserId - Google User ID (becomes document ID)
   * @param userData - User data
   * @returns Created/updated user
   */
  async createUserWithGoogleId(googleUserId: string, userData: any): Promise<any> {
    const userRef = db.collection(this.collections.users).doc(googleUserId);
    
    const user = {
      ...userData,
      googleUserId,
      id: googleUserId,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await userRef.set(cleanForFirestore(user), { merge: true });
    return serializeTimestamps(user);
  }

  /**
   * Create or update classroom with Google Course ID as document ID
   * @param googleCourseId - Google Course ID (becomes document ID)
   * @param classroomData - Classroom data
   * @returns Created/updated classroom
   */
  async createClassroomWithGoogleId(googleCourseId: string, classroomData: any): Promise<Classroom> {
    const classroomRef = db.collection(this.collections.classrooms).doc(googleCourseId);
    
    const classroom = {
      ...classroomData,
      googleCourseId,
      id: googleCourseId,
      studentCount: classroomData.studentCount || 0,
      assignmentCount: classroomData.assignmentCount || 0,
      activeSubmissions: classroomData.activeSubmissions || 0,
      ungradedSubmissions: classroomData.ungradedSubmissions || 0,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await classroomRef.set(cleanForFirestore(classroom), { merge: true });
    return serializeTimestamps(classroom);
  }

  /**
   * Create or update assignment with Google CourseWork ID as document ID
   * @param googleCourseWorkId - Google CourseWork ID (becomes document ID)
   * @param assignmentData - Assignment data
   * @returns Created/updated assignment
   */
  async createAssignmentWithGoogleId(googleCourseWorkId: string, assignmentData: any): Promise<Assignment> {
    const assignmentRef = db.collection(this.collections.assignments).doc(googleCourseWorkId);
    
    const assignment = {
      ...assignmentData,
      googleCourseWorkId,
      id: googleCourseWorkId,
      submissionCount: assignmentData.submissionCount || 0,
      gradedCount: assignmentData.gradedCount || 0,
      pendingCount: assignmentData.pendingCount || 0,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await assignmentRef.set(cleanForFirestore(assignment), { merge: true });
    return serializeTimestamps(assignment);
  }

  /**
   * Create or update submission with Google Submission ID as document ID
   * @param googleSubmissionId - Google Submission ID (becomes document ID)
   * @param submissionData - Submission data
   * @returns Created/updated submission
   */
  async createSubmissionWithGoogleId(googleCourseId: string, googleCourseWorkId: string, googleSubmissionId: string, submissionData: any): Promise<Submission> {
    const compositeId = this.generateSubmissionDocumentId(googleCourseId, googleCourseWorkId, googleSubmissionId);
    const submissionRef = db.collection(this.collections.submissions).doc(compositeId);
    
    const submission = {
      ...submissionData,
      googleSubmissionId,
      id: compositeId,
      version: submissionData.version || 1,
      isLatest: submissionData.isLatest !== undefined ? submissionData.isLatest : true,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await submissionRef.set(cleanForFirestore(submission), { merge: true });
    return serializeTimestamps(submission);
  }

  /**
   * Create or update student enrollment with composite ID
   * @param googleCourseId - Google Course ID
   * @param googleUserId - Google User ID
   * @param enrollmentData - Enrollment data
   * @returns Created/updated enrollment
   */
  async createEnrollmentWithGoogleIds(googleCourseId: string, googleUserId: string, enrollmentData: any): Promise<StudentEnrollment> {
    const docId = `${googleCourseId}_${googleUserId}`;
    const enrollmentRef = db.collection(this.collections.enrollments).doc(docId);
    
    const enrollment = {
      ...enrollmentData,
      googleCourseId,
      googleUserId,
      id: docId,
      submissionCount: enrollmentData.submissionCount || 0,
      gradedSubmissionCount: enrollmentData.gradedSubmissionCount || 0,
      status: enrollmentData.status || 'active',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    await enrollmentRef.set(cleanForFirestore(enrollment), { merge: true });
    return serializeTimestamps(enrollment);
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
    const classroomId = `classroom_${input.googleCourseId}`;
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
    
    console.log("FirestoreRepository: getClassroomsByTeacher debug", {
      userEmail,
      user: user ? { id: user.id, email: user.email, schoolEmail: user.schoolEmail } : null
    });
    
    // Try both school email and personal email to find classrooms
    const emailsToTry = [];
    if (user?.schoolEmail) {
      emailsToTry.push(user.schoolEmail);
    }
    emailsToTry.push(userEmail);
    
    let allClassrooms: Classroom[] = [];
    
    for (const email of emailsToTry) {
      console.log(`Trying to find classrooms for email: ${email}`);
      
      const snapshot = await db.collection(this.collections.classrooms)
        .where("teacherId", "==", email)
        .get();

      const classrooms = snapshot.docs.map(doc => {
        const classroom = { ...doc.data(), id: doc.id } as Classroom;
        return serializeTimestamps(classroom);
      });
      
      console.log(`Found ${classrooms.length} classrooms for ${email}`);
      
      if (classrooms.length > 0) {
        allClassrooms.push(...classrooms);
      }
    }
    
    // Remove duplicates based on classroom ID
    const uniqueClassrooms = allClassrooms.filter((classroom, index, self) => 
      index === self.findIndex(c => c.id === classroom.id)
    );

    console.log("FirestoreRepository: getClassroomsByTeacher final results", {
      emailsChecked: emailsToTry,
      totalFound: uniqueClassrooms.length,
      classroomIds: uniqueClassrooms.map(c => ({ id: c.id, name: c.name, teacherId: c.teacherId }))
    });

    return uniqueClassrooms;
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
    const assignmentId = `${input.classroomId}_assignment_${input.googleCourseWorkId}`;
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
      .get();

    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as StudentEnrollment))
      .sort((a, b) => a.name.localeCompare(b.name));
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
    if (items.length === 0) {
      console.log(`[BATCH CREATE] No items to create for collection ${collectionName}`);
      return;
    }
    
    console.log(`[BATCH CREATE] Starting batch creation for collection ${collectionName} with ${items.length} items`);
    
    // Process in chunks of 500 (Firestore batch limit)
    const chunks = this.chunkArray(items, 500);
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`[BATCH CREATE] Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} items`);
      
      const batch = db.batch();
      
      for (const item of chunk) {
        try {
          const cleaned = cleanForFirestore({
            ...item,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          });
          
          // cleanForFirestore now handles empty key removal universally
          
          const docRef = db.collection(collectionName).doc(item.id);
          batch.set(docRef, cleaned);
          
          if (collectionName === 'submissions') {
            console.log(`[BATCH CREATE] Adding submission to batch: ${item.id} (student: ${(item as any).studentName})`);
          }
        } catch (error) {
          console.error(`[BATCH CREATE] Failed to prepare item ${item.id} for batch:`, error);
          if (collectionName === 'submissions') {
            console.error(`[BATCH CREATE] Raw item data:`, JSON.stringify(item, null, 2));
          }
          throw error;
        }
      }
      
      try {
        console.log(`[BATCH CREATE] Committing batch for chunk ${chunkIndex + 1}/${chunks.length}`);
        await batch.commit();
        console.log(`[BATCH CREATE] Successfully committed chunk ${chunkIndex + 1}/${chunks.length} for collection ${collectionName}`);
      } catch (error) {
        console.error(`[BATCH CREATE] Failed to commit batch for collection ${collectionName}, chunk ${chunkIndex + 1}:`, error);
        throw error;
      }
    }
    
    console.log(`[BATCH CREATE] Successfully created ${items.length} items in collection ${collectionName}`);
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


  /**
   * Get ALL submissions for an assignment (including already graded ones)
   * Used for smart Grade All functionality that can re-grade changed submissions
   */
  async getAllSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    const query = db.collection(this.collections.submissions)
      .where("assignmentId", "==", assignmentId)
      .where("isLatest", "==", true);

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

  // ============================================
  // Teacher Import Snapshot Operations
  // ============================================

  /**
   * Save a compressed normalized snapshot for a teacher
   * Used for import difference detection to avoid false positives
   */
  async saveCompressedSnapshot(teacherId: string, snapshot: ClassroomSnapshot): Promise<void> {
    try {
      // Normalize snapshot to remove volatile timestamps
      const normalized = normalizeSnapshotForComparison(snapshot);
      
      // Create stable JSON string and compress
      const jsonString = createStableJsonString(normalized);
      const originalSize = Buffer.byteLength(jsonString, 'utf8');
      const compressed = zlib.gzipSync(jsonString);
      const compressedSize = compressed.length;
      
      // Get teacher email for reference
      const teacher = await this.getUserById(teacherId);
      const teacherEmail = teacher?.email || 'unknown';
      
      // Save to dedicated teacher_imports collection
      const importData = {
        teacherId,
        teacherEmail,
        compressedSnapshot: compressed.toString('base64'),
        originalSize,
        compressedSize,
        compressionRatio: Number(((originalSize - compressedSize) / originalSize).toFixed(3)),
        lastImportedAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp()
      };
      
      await db.collection(this.collections.teacherImports)
        .doc(teacherId)
        .set(cleanForFirestore(importData));
        
      console.log(`Compressed snapshot saved for teacher ${teacherEmail}: ${originalSize} -> ${compressedSize} bytes (${importData.compressionRatio * 100}% savings)`);
    } catch (error) {
      console.error('Failed to save compressed snapshot:', error);
      throw new Error(`Failed to save compressed snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get and decompress a teacher's last imported snapshot
   * Returns the normalized snapshot for comparison, or null if not found
   */
  async getCompressedSnapshot(teacherId: string): Promise<ClassroomSnapshot | null> {
    try {
      const doc = await db.collection(this.collections.teacherImports)
        .doc(teacherId)
        .get();
        
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      if (!data?.compressedSnapshot) {
        return null;
      }
      
      // Decompress the stored snapshot
      const compressedBuffer = Buffer.from(data.compressedSnapshot, 'base64');
      const decompressed = zlib.gunzipSync(compressedBuffer);
      const jsonString = decompressed.toString('utf8');
      
      return JSON.parse(jsonString) as ClassroomSnapshot;
    } catch (error) {
      console.error('Failed to get compressed snapshot:', error);
      // Return null instead of throwing to allow graceful fallback
      return null;
    }
  }

  /**
   * Get teacher import metadata without decompressing the snapshot
   * Useful for debugging and monitoring storage usage
   */
  async getImportMetadata(teacherId: string): Promise<{
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    lastImportedAt: Date;
  } | null> {
    try {
      const doc = await db.collection(this.collections.teacherImports)
        .doc(teacherId)
        .get();
        
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      if (!data) {
        return null;
      }
      
      return {
        originalSize: data.originalSize || 0,
        compressedSize: data.compressedSize || 0,
        compressionRatio: data.compressionRatio || 0,
        lastImportedAt: data.lastImportedAt?.toDate() || new Date()
      };
    } catch (error) {
      console.error('Failed to get import metadata:', error);
      return null;
    }
  }
}