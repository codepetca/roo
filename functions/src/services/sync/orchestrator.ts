/**
 * Sync Orchestrator - Main synchronization service that coordinates the entire sync process
 * @module functions/src/services/sync/orchestrator
 * @size ~90 lines (extracted from 474-line classroom-sync.ts)
 * @exports syncClassroomsFromSheets
 * @dependencies firebase-functions, ../sheets, all sync modules
 * @patterns Service orchestration, error handling, result aggregation
 */

import { logger } from "firebase-functions";
import { OverallSyncResult } from "./types";
import { extractClassroomsAndStudents } from "./data-extractor";
import { syncStudent } from "./student-sync";
import { syncClassroom } from "./classroom-sync";
import { updateStudentClassroomAssociations } from "./association-sync";

/**
 * Main sync function - orchestrates the entire sync process
 * @param teacherId - ID of the teacher performing the sync
 * @param spreadsheetId - Google Sheets spreadsheet ID to sync from
 * @returns Sync result with counts and any errors
 */
export async function syncClassroomsFromSheets(teacherId: string, spreadsheetId: string): Promise<OverallSyncResult> {
  const result: OverallSyncResult = {
    success: false,
    classroomsCreated: 0,
    classroomsUpdated: 0,
    studentsCreated: 0,
    studentsUpdated: 0,
    errors: [],
  };

  try {
    logger.info("Starting classroom sync from Google Sheets", { teacherId, spreadsheetId });

    // Step 1: Read submissions from Google Sheets
    logger.info("Creating Sheets service for spreadsheet", { spreadsheetId });

    const { createSheetsService } = await import("../sheets");
    const sheetsService = await createSheetsService(spreadsheetId);

    logger.info("Sheets service created, fetching submissions");

    const submissions = await sheetsService.getAllSubmissions();
    if (submissions.length === 0) {
      logger.info("No submissions found in spreadsheet");
      result.success = true;
      return result;
    }

    // Step 2: Extract classroom and student data
    const { classrooms, students } = extractClassroomsAndStudents(submissions);

    // Step 3: Sync students first (needed for classroom student IDs)
    const studentIdsByEmail = new Map<string, string>();

    for (const [email, student] of students) {
      try {
        const syncResult = await syncStudent(student);
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
        const syncResult = await syncClassroom(teacherId, classroom, studentIdsByEmail);
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
      await updateStudentClassroomAssociations(classroomIdsByCourseCode);
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
      errorCount: result.errors.length,
    });

    return result;
  } catch (error) {
    const errorMsg = `Classroom sync failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    logger.error(errorMsg, { teacherId, spreadsheetId });
    return result;
  }
}
