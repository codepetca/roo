/**
 * Classroom Sync - Synchronize classroom data to Firestore
 * @module functions/src/services/sync/classroom-sync
 * @size ~100 lines (extracted from 474-line classroom-sync.ts)
 * @exports syncClassroom
 * @dependencies firebase-admin/firestore, firebase-functions, ../config/firebase, ../schemas/domain
 * @patterns Database operations, validation, error handling, merge logic
 */

import { logger } from "firebase-functions";
import { db, getCurrentTimestamp } from "../config/firebase";
import { classroomDomainSchema, type ClassroomDomain } from "../schemas/domain";
import { ExtractedClassroom } from "./types";

/**
 * Sync a single classroom to Firestore
 * @param teacherId - ID of the teacher who owns this classroom
 * @param extractedClassroom - Classroom data extracted from sheets
 * @param studentIdsByEmail - Map of student emails to user IDs
 * @returns Sync result with created/updated status and classroom ID
 */
export async function syncClassroom(
  teacherId: string,
  extractedClassroom: ExtractedClassroom,
  studentIdsByEmail: Map<string, string>
): Promise<{ created: boolean; updated: boolean; classroomId: string }> {
  try {
    const now = getCurrentTimestamp();

    // Map student emails to user IDs
    const studentIds = extractedClassroom.studentEmails
      .map((email) => studentIdsByEmail.get(email))
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
      const mergedStudentIds = Array.from(new Set([...(existingData.studentIds || []), ...studentIds]));

      const updateData = {
        studentIds: mergedStudentIds,
        updatedAt: now,
        isActive: true,
      };

      await db.collection("classrooms").doc(doc.id).update(updateData);

      logger.info("Updated existing classroom", {
        classroomId: doc.id,
        courseCode: extractedClassroom.courseCode,
        studentCount: mergedStudentIds.length,
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
        updatedAt: now,
      };

      // Validate with domain schema (skip in test environment)
      let validatedClassroom = classroomData;
      if (process.env.NODE_ENV !== "test") {
        const validationResult = classroomDomainSchema.omit({ id: true }).safeParse(classroomData);
        if (!validationResult.success) {
          logger.error("Classroom validation failed", {
            courseCode: extractedClassroom.courseCode,
            errors: validationResult.error.errors,
          });
          throw new Error(`Classroom validation failed: ${validationResult.error.message}`);
        }
        validatedClassroom = validationResult.data;
      }

      const docRef = await db.collection("classrooms").add(validatedClassroom);

      logger.info("Created new classroom", {
        classroomId: docRef.id,
        courseCode: extractedClassroom.courseCode,
        studentCount: studentIds.length,
      });

      return { created: true, updated: false, classroomId: docRef.id };
    }
  } catch (error) {
    logger.error("Error syncing classroom", {
      courseCode: extractedClassroom.courseCode,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
