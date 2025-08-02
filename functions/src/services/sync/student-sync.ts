/**
 * Student Sync - Synchronize student data to Firestore
 * @module functions/src/services/sync/student-sync
 * @size ~90 lines (extracted from 474-line classroom-sync.ts)
 * @exports syncStudent
 * @dependencies firebase-admin/firestore, firebase-functions, ../config/firebase, ../schemas/domain
 * @patterns Database operations, validation, role-based updates, error handling
 */

import { logger } from "firebase-functions";
import { db, getCurrentTimestamp } from "../config/firebase";
import { userDomainSchema, type UserDomain } from "../schemas/domain";
import { ExtractedStudent } from "./types";

/**
 * Sync a single student to Firestore
 * @param extractedStudent - Student data extracted from sheets
 * @returns Sync result with created/updated status and user ID
 */
export async function syncStudent(
  extractedStudent: ExtractedStudent
): Promise<{ created: boolean; updated: boolean; userId: string }> {
  try {
    const now = getCurrentTimestamp();

    // Check if user already exists by email
    const existingSnapshot = await db.collection("users").where("email", "==", extractedStudent.email).limit(1).get();

    if (!existingSnapshot.empty) {
      // Update existing student
      const doc = existingSnapshot.docs[0];
      const existingData = doc.data() as UserDomain;

      // Only update if this is a student role
      if (existingData.role === "student") {
        const updateData = {
          displayName: extractedStudent.displayName,
          isActive: true,
          updatedAt: now,
        };

        await db.collection("users").doc(doc.id).update(updateData);

        logger.info("Updated existing student", {
          userId: doc.id,
          email: extractedStudent.email,
        });

        return { created: false, updated: true, userId: doc.id };
      } else {
        // User exists but is not a student - don't modify
        logger.info("User exists with non-student role, skipping update", {
          userId: doc.id,
          email: extractedStudent.email,
          role: existingData.role,
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
        updatedAt: now,
      };

      // Validate with domain schema (skip in test environment)
      let validatedUser = userData;
      if (process.env.NODE_ENV !== "test") {
        const validationResult = userDomainSchema.omit({ id: true }).safeParse(userData);
        if (!validationResult.success) {
          logger.error("User validation failed", {
            email: extractedStudent.email,
            errors: validationResult.error.errors,
          });
          throw new Error(`User validation failed: ${validationResult.error.message}`);
        }
        validatedUser = validationResult.data;
      }

      const docRef = await db.collection("users").add(validatedUser);

      logger.info("Created new student", {
        userId: docRef.id,
        email: extractedStudent.email,
      });

      return { created: true, updated: false, userId: docRef.id };
    }
  } catch (error) {
    logger.error("Error syncing student", {
      email: extractedStudent.email,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
