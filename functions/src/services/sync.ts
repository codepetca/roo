/**
 * Sync service for importing Google Sheets data to Firestore
 * Location: functions/src/services/sync.ts:1
 */

import { logger } from "firebase-functions";
import { db, getCurrentTimestamp } from "../config/firebase";
import { createSheetsService } from "./sheets";
import { sheetAssignmentToDomain, sheetSubmissionToDomain } from "../schemas/transformers";
import { assignmentDomainSchema, submissionDomainSchema } from "../schemas/domain";
import type { AssignmentDomain, SubmissionDomain } from "../schemas/domain";

export interface SyncResult {
  assignmentsProcessed: number;
  submissionsProcessed: number;
  errors: string[];
  success: boolean;
}

/**
 * Service for syncing Google Sheets data to Firestore
 * Location: functions/src/services/sync.ts:19
 */
export class SyncService {
  
  /**
   * Sync all assignments from Google Sheets to Firestore
   * Location: functions/src/services/sync.ts:25
   */
  async syncAssignmentsToFirestore(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      logger.info("Starting assignment sync from Sheets to Firestore");
      
      const sheetsService = await createSheetsService();
      const sheetAssignments = await sheetsService.getAssignments();
      
      logger.info(`Found ${sheetAssignments.length} assignments in Google Sheets`);

      for (const sheetAssignment of sheetAssignments) {
        try {
          // Transform sheet assignment to domain object
          const domainAssignment = sheetAssignmentToDomain(
            sheetAssignment, 
            "default-classroom" // TODO: Use proper classroom ID
          );

          // Add timestamps
          const assignmentWithTimestamps: AssignmentDomain = {
            ...domainAssignment,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          } as AssignmentDomain;

          // Validate the domain object
          const validatedAssignment = assignmentDomainSchema.parse(assignmentWithTimestamps);

          // Check if assignment already exists
          const existingAssignmentQuery = await db.collection("assignments")
            .where("title", "==", validatedAssignment.title)
            .limit(1)
            .get();

          if (existingAssignmentQuery.empty) {
            // Create new assignment
            const docRef = await db.collection("assignments").add(validatedAssignment);
            logger.info(`Created assignment: ${validatedAssignment.title}`, { 
              assignmentId: docRef.id 
            });
            count++;
          } else {
            // Update existing assignment
            const existingDoc = existingAssignmentQuery.docs[0];
            const updateData = {
              ...validatedAssignment,
              updatedAt: getCurrentTimestamp(),
              createdAt: existingDoc.data().createdAt // Preserve original creation time
            };
            
            await existingDoc.ref.update(updateData);
            logger.info(`Updated assignment: ${validatedAssignment.title}`, { 
              assignmentId: existingDoc.id 
            });
            count++;
          }
        } catch (assignmentError) {
          const errorMsg = `Error processing assignment "${sheetAssignment.title}": ${assignmentError instanceof Error ? assignmentError.message : "Unknown error"}`;
          logger.error(errorMsg, { assignmentId: sheetAssignment.id, error: assignmentError });
          errors.push(errorMsg);
        }
      }

      logger.info(`Assignment sync completed: ${count} processed, ${errors.length} errors`);
      return { count, errors };
    } catch (error) {
      const errorMsg = `Failed to sync assignments: ${error instanceof Error ? error.message : "Unknown error"}`;
      logger.error(errorMsg, { error });
      errors.push(errorMsg);
      return { count, errors };
    }
  }

  /**
   * Sync all submissions from Google Sheets to Firestore
   * Location: functions/src/services/sync.ts:85
   */
  async syncSubmissionsToFirestore(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      logger.info("Starting submission sync from Sheets to Firestore");
      
      const sheetsService = await createSheetsService();
      const sheetSubmissions = await sheetsService.getAllSubmissions();
      
      logger.info(`Found ${sheetSubmissions.length} submissions in Google Sheets`);

      for (const sheetSubmission of sheetSubmissions) {
        try {
          // Transform sheet submission to domain object
          const domainSubmission = sheetSubmissionToDomain(sheetSubmission);

          // Find the corresponding assignment in Firestore
          const assignmentQuery = await db.collection("assignments")
            .where("title", "==", sheetSubmission.assignmentTitle)
            .limit(1)
            .get();

          if (assignmentQuery.empty) {
            const errorMsg = `Assignment not found in Firestore for submission: ${sheetSubmission.assignmentTitle}`;
            logger.warn(errorMsg, { submissionId: sheetSubmission.id });
            errors.push(errorMsg);
            continue;
          }

          const assignmentDoc = assignmentQuery.docs[0];
          const assignmentId = assignmentDoc.id;

          // Update submission with correct assignment ID
          const submissionWithTimestamps: SubmissionDomain = {
            ...domainSubmission,
            id: sheetSubmission.id,
            assignmentId: assignmentId, // Use Firestore assignment ID
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
          } as SubmissionDomain;

          // Validate the domain object
          const validatedSubmission = submissionDomainSchema.parse(submissionWithTimestamps);

          // Check if submission already exists
          const existingSubmissionDoc = await db.collection("submissions")
            .doc(sheetSubmission.id)
            .get();

          if (!existingSubmissionDoc.exists) {
            // Create new submission
            await db.collection("submissions").doc(sheetSubmission.id).set(validatedSubmission);
            logger.info(`Created submission: ${sheetSubmission.id}`, { 
              assignmentTitle: sheetSubmission.assignmentTitle,
              studentEmail: sheetSubmission.studentEmail
            });
            count++;
          } else {
            // Update existing submission
            const updateData = {
              ...validatedSubmission,
              updatedAt: getCurrentTimestamp(),
              createdAt: existingSubmissionDoc.data()?.createdAt || getCurrentTimestamp()
            };
            
            await existingSubmissionDoc.ref.update(updateData);
            logger.info(`Updated submission: ${sheetSubmission.id}`, { 
              assignmentTitle: sheetSubmission.assignmentTitle,
              studentEmail: sheetSubmission.studentEmail
            });
            count++;
          }
        } catch (submissionError) {
          const errorMsg = `Error processing submission "${sheetSubmission.id}": ${submissionError instanceof Error ? submissionError.message : "Unknown error"}`;
          logger.error(errorMsg, { submissionId: sheetSubmission.id, error: submissionError });
          errors.push(errorMsg);
        }
      }

      logger.info(`Submission sync completed: ${count} processed, ${errors.length} errors`);
      return { count, errors };
    } catch (error) {
      const errorMsg = `Failed to sync submissions: ${error instanceof Error ? error.message : "Unknown error"}`;
      logger.error(errorMsg, { error });
      errors.push(errorMsg);
      return { count, errors };
    }
  }

  /**
   * Sync both assignments and submissions from Google Sheets to Firestore
   * Location: functions/src/services/sync.ts:169
   */
  async syncAllData(): Promise<SyncResult> {
    logger.info("Starting full sync from Google Sheets to Firestore");
    
    const allErrors: string[] = [];
    let totalAssignments = 0;
    let totalSubmissions = 0;

    try {
      // First sync assignments (submissions depend on assignments existing)
      const assignmentResult = await this.syncAssignmentsToFirestore();
      totalAssignments = assignmentResult.count;
      allErrors.push(...assignmentResult.errors);

      // Then sync submissions
      const submissionResult = await this.syncSubmissionsToFirestore();
      totalSubmissions = submissionResult.count;
      allErrors.push(...submissionResult.errors);

      const success = allErrors.length === 0;
      
      logger.info("Full sync completed", {
        assignmentsProcessed: totalAssignments,
        submissionsProcessed: totalSubmissions,
        errors: allErrors.length,
        success
      });

      return {
        assignmentsProcessed: totalAssignments,
        submissionsProcessed: totalSubmissions,
        errors: allErrors,
        success
      };
    } catch (error) {
      const errorMsg = `Full sync failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      logger.error(errorMsg, { error });
      allErrors.push(errorMsg);
      
      return {
        assignmentsProcessed: totalAssignments,
        submissionsProcessed: totalSubmissions,
        errors: allErrors,
        success: false
      };
    }
  }
}

/**
 * Create and return a SyncService instance
 * Location: functions/src/services/sync.ts:211
 */
export function createSyncService(): SyncService {
  return new SyncService();
}