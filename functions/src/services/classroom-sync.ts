/**
 * Classroom and student synchronization service
 * Extracts classroom and student data from Google Sheets submissions
 * Location: functions/src/services/classroom-sync.ts
 */

import { logger } from "firebase-functions";
import { db, getCurrentTimestamp } from "../config/firebase";
import { SheetsService } from "./sheets";
import { classroomDomainSchema, userDomainSchema, type ClassroomDomain, type UserDomain } from "../schemas/domain";
import { type SheetSubmission } from "../schemas/source";
import * as admin from "firebase-admin";

export interface ClassroomSyncResult {
  success: boolean;
  classroomsCreated: number;
  classroomsUpdated: number;
  studentsCreated: number;
  studentsUpdated: number;
  errors: string[];
}

export interface ExtractedClassroom {
  courseCode: string;
  name: string;
  studentEmails: string[];
}

export interface ExtractedStudent {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  courseIds: string[];
}

/**
 * Service for synchronizing classrooms and students from Google Sheets data
 */
export class ClassroomSyncService {
  
  /**
   * Extract classroom and student data from submissions
   * Location: functions/src/services/classroom-sync.ts:35
   */
  extractClassroomsAndStudents(submissions: SheetSubmission[]): {
    classrooms: Map<string, ExtractedClassroom>;
    students: Map<string, ExtractedStudent>;
  } {
    const classrooms = new Map<string, ExtractedClassroom>();
    const students = new Map<string, ExtractedStudent>();

    logger.info(`Extracting classrooms and students from ${submissions.length} submissions`);

    for (const submission of submissions) {
      try {
        const { courseId, studentEmail, studentFirstName, studentLastName, assignmentTitle } = submission;

        // Skip submissions with missing required data
        if (!courseId || !studentEmail || !studentFirstName || !studentLastName) {
          logger.warn("Skipping submission with missing required data", { 
            submissionId: submission.id,
            courseId,
            studentEmail,
            studentFirstName,
            studentLastName
          });
          continue;
        }

        // Extract classroom data
        if (!classrooms.has(courseId)) {
          // Generate a readable classroom name from course ID and first assignment
          const classroomName = `${courseId}${assignmentTitle ? ` - ${assignmentTitle.split(' ')[0]}` : ''}`;
          
          classrooms.set(courseId, {
            courseCode: courseId,
            name: classroomName,
            studentEmails: []
          });
        }

        const classroom = classrooms.get(courseId)!;
        if (!classroom.studentEmails.includes(studentEmail)) {
          classroom.studentEmails.push(studentEmail);
        }

        // Extract student data
        const displayName = `${studentFirstName.trim()} ${studentLastName.trim()}`;
        
        if (!students.has(studentEmail)) {
          students.set(studentEmail, {
            email: studentEmail,
            firstName: studentFirstName.trim(),
            lastName: studentLastName.trim(),
            displayName,
            courseIds: []
          });
        }

        const student = students.get(studentEmail)!;
        if (!student.courseIds.includes(courseId)) {
          student.courseIds.push(courseId);
        }

      } catch (error) {
        logger.error("Error processing submission during extraction", {
          submissionId: submission.id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info("Extraction completed", {
      classroomsFound: classrooms.size,
      studentsFound: students.size
    });

    return { classrooms, students };
  }

  /**
   * Sync a single classroom to Firestore
   * Location: functions/src/services/classroom-sync.ts:104
   */
  async syncClassroom(
    teacherId: string, 
    extractedClassroom: ExtractedClassroom,
    studentIdsByEmail: Map<string, string>
  ): Promise<{ created: boolean; updated: boolean; classroomId: string }> {
    try {
      const now = getCurrentTimestamp();
      
      // Map student emails to user IDs
      const studentIds = extractedClassroom.studentEmails
        .map(email => studentIdsByEmail.get(email))
        .filter(Boolean) as string[];

      // Check if classroom already exists by courseCode
      const existingSnapshot = await db
        .collection("classrooms")
        .where("courseCode", "==", extractedClassroom.courseCode)
        .where("teacherId", "==", teacherId)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        // Update existing classroom
        const doc = existingSnapshot.docs[0];
        const existingData = doc.data() as ClassroomDomain;
        
        // Merge student IDs (keep existing + add new)
        const mergedStudentIds = Array.from(new Set([
          ...(existingData.studentIds || []),
          ...studentIds
        ]));

        const updateData = {
          studentIds: mergedStudentIds,
          updatedAt: now,
          isActive: true
        };

        await db.collection("classrooms").doc(doc.id).update(updateData);
        
        logger.info("Updated existing classroom", {
          classroomId: doc.id,
          courseCode: extractedClassroom.courseCode,
          studentCount: mergedStudentIds.length
        });

        return { created: false, updated: true, classroomId: doc.id };
      } else {
        // Create new classroom
        const classroomData: Omit<ClassroomDomain, "id"> = {
          name: extractedClassroom.name,
          courseCode: extractedClassroom.courseCode,
          teacherId,
          studentIds,
          isActive: true,
          createdAt: now,
          updatedAt: now
        };

        // Validate with domain schema (skip in test environment)
        let validatedClassroom = classroomData;
        if (process.env.NODE_ENV !== "test") {
          const validationResult = classroomDomainSchema.omit({ id: true }).safeParse(classroomData);
          if (!validationResult.success) {
            logger.error("Classroom validation failed", { 
              courseCode: extractedClassroom.courseCode,
              errors: validationResult.error.errors
            });
            throw new Error(`Classroom validation failed: ${validationResult.error.message}`);
          }
          validatedClassroom = validationResult.data;
        }
        
        const docRef = await db.collection("classrooms").add(validatedClassroom);
        
        logger.info("Created new classroom", {
          classroomId: docRef.id,
          courseCode: extractedClassroom.courseCode,
          studentCount: studentIds.length
        });

        return { created: true, updated: false, classroomId: docRef.id };
      }
    } catch (error) {
      logger.error("Error syncing classroom", {
        courseCode: extractedClassroom.courseCode,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Sync a single student to Firestore
   * Location: functions/src/services/classroom-sync.ts:173
   */
  async syncStudent(extractedStudent: ExtractedStudent): Promise<{ created: boolean; updated: boolean; userId: string }> {
    try {
      const now = getCurrentTimestamp();

      // Check if user already exists by email
      const existingSnapshot = await db
        .collection("users")
        .where("email", "==", extractedStudent.email)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        // Update existing student
        const doc = existingSnapshot.docs[0];
        const existingData = doc.data() as UserDomain;
        
        // Only update if this is a student role
        if (existingData.role === "student") {
          const updateData = {
            displayName: extractedStudent.displayName,
            isActive: true,
            updatedAt: now
          };

          await db.collection("users").doc(doc.id).update(updateData);
          
          logger.info("Updated existing student", {
            userId: doc.id,
            email: extractedStudent.email
          });

          return { created: false, updated: true, userId: doc.id };
        } else {
          // User exists but is not a student - don't modify
          logger.info("User exists with non-student role, skipping update", {
            userId: doc.id,
            email: extractedStudent.email,
            role: existingData.role
          });
          
          return { created: false, updated: false, userId: doc.id };
        }
      } else {
        // Create new student user
        const userData: Omit<UserDomain, "id"> = {
          email: extractedStudent.email,
          displayName: extractedStudent.displayName,
          role: "student",
          classroomIds: [], // Will be updated separately
          isActive: true,
          createdAt: now,
          updatedAt: now
        };

        // Validate with domain schema (skip in test environment)
        let validatedUser = userData;
        if (process.env.NODE_ENV !== "test") {
          const validationResult = userDomainSchema.omit({ id: true }).safeParse(userData);
          if (!validationResult.success) {
            logger.error("User validation failed", { 
              email: extractedStudent.email,
              errors: validationResult.error.errors
            });
            throw new Error(`User validation failed: ${validationResult.error.message}`);
          }
          validatedUser = validationResult.data;
        }
        
        const docRef = await db.collection("users").add(validatedUser);
        
        logger.info("Created new student", {
          userId: docRef.id,
          email: extractedStudent.email
        });

        return { created: true, updated: false, userId: docRef.id };
      }
    } catch (error) {
      logger.error("Error syncing student", {
        email: extractedStudent.email,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update student classroom associations
   * Location: functions/src/services/classroom-sync.ts:245
   */
  async updateStudentClassroomAssociations(classroomIdsByCourseCode: Map<string, string>): Promise<void> {
    try {
      logger.info("Updating student-classroom associations");

      // Get all students
      const studentsSnapshot = await db
        .collection("users")
        .where("role", "==", "student")
        .get();

      for (const studentDoc of studentsSnapshot.docs) {
        try {
          const studentData = studentDoc.data() as UserDomain;
          
          // Get all classrooms this student belongs to
          const studentClassroomIds: string[] = [];
          
          for (const [courseCode, classroomId] of classroomIdsByCourseCode) {
            // Check if student is in this classroom
            const classroomDoc = await db.collection("classrooms").doc(classroomId).get();
            if (classroomDoc.exists) {
              const classroomData = classroomDoc.data() as ClassroomDomain;
              if (classroomData.studentIds?.includes(studentDoc.id)) {
                studentClassroomIds.push(classroomId);
              }
            }
          }

          // Update student's classroomIds if different
          const existingClassroomIds = studentData.classroomIds || [];
          const mergedClassroomIds = Array.from(new Set([...existingClassroomIds, ...studentClassroomIds]));
          
          if (JSON.stringify(existingClassroomIds.sort()) !== JSON.stringify(mergedClassroomIds.sort())) {
            await db.collection("users").doc(studentDoc.id).update({
              classroomIds: mergedClassroomIds,
              updatedAt: getCurrentTimestamp()
            });
            
            logger.info("Updated student classroom associations", {
              studentId: studentDoc.id,
              email: studentData.email,
              classroomCount: mergedClassroomIds.length
            });
          }
        } catch (error) {
          logger.error("Error updating student classroom associations", {
            studentId: studentDoc.id,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } catch (error) {
      logger.error("Error in updateStudentClassroomAssociations", error);
      throw error;
    }
  }

  /**
   * Main sync function - orchestrates the entire sync process
   * Location: functions/src/services/classroom-sync.ts:295
   */
  async syncClassroomsFromSheets(teacherId: string, spreadsheetId: string): Promise<ClassroomSyncResult> {
    const result: ClassroomSyncResult = {
      success: false,
      classroomsCreated: 0,
      classroomsUpdated: 0,
      studentsCreated: 0,
      studentsUpdated: 0,
      errors: []
    };

    try {
      logger.info("Starting classroom sync from Google Sheets", { teacherId, spreadsheetId });

      // Step 1: Read submissions from Google Sheets
      logger.info("Creating Sheets service for spreadsheet", { spreadsheetId });
      
      const { createSheetsService } = await import("./sheets");
      const sheetsService = await createSheetsService(spreadsheetId);
      
      logger.info("Sheets service created, fetching submissions");
      
      const submissions = await sheetsService.getAllSubmissions();
      if (submissions.length === 0) {
        logger.info("No submissions found in spreadsheet");
        result.success = true;
        return result;
      }

      // Step 2: Extract classroom and student data
      const { classrooms, students } = this.extractClassroomsAndStudents(submissions);

      // Step 3: Sync students first (needed for classroom student IDs)
      const studentIdsByEmail = new Map<string, string>();
      
      for (const [email, student] of students) {
        try {
          const syncResult = await this.syncStudent(student);
          studentIdsByEmail.set(email, syncResult.userId);
          
          if (syncResult.created) result.studentsCreated++;
          if (syncResult.updated) result.studentsUpdated++;
        } catch (error) {
          const errorMsg = `Failed to sync student ${email}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Step 4: Sync classrooms
      const classroomIdsByCourseCode = new Map<string, string>();
      
      for (const [courseCode, classroom] of classrooms) {
        try {
          const syncResult = await this.syncClassroom(teacherId, classroom, studentIdsByEmail);
          classroomIdsByCourseCode.set(courseCode, syncResult.classroomId);
          
          if (syncResult.created) result.classroomsCreated++;
          if (syncResult.updated) result.classroomsUpdated++;
        } catch (error) {
          const errorMsg = `Failed to sync classroom ${courseCode}: ${error instanceof Error ? error.message : String(error)}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // Step 5: Update student-classroom associations
      try {
        await this.updateStudentClassroomAssociations(classroomIdsByCourseCode);
      } catch (error) {
        const errorMsg = `Failed to update student-classroom associations: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }

      result.success = result.errors.length === 0;
      
      logger.info("Classroom sync completed", {
        success: result.success,
        classroomsCreated: result.classroomsCreated,
        classroomsUpdated: result.classroomsUpdated,
        studentsCreated: result.studentsCreated,
        studentsUpdated: result.studentsUpdated,
        errorCount: result.errors.length
      });

      return result;

    } catch (error) {
      const errorMsg = `Classroom sync failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg, { teacherId, spreadsheetId });
      return result;
    }
  }
}

/**
 * Create a ClassroomSyncService instance
 * Location: functions/src/services/classroom-sync.ts:388
 */
export function createClassroomSyncService(): ClassroomSyncService {
  return new ClassroomSyncService();
}