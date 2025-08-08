/**
 * Data Extractor - Extract classroom and student data from Google Sheets submissions
 * @module functions/src/services/sync/data-extractor
 * @size ~90 lines (extracted from 474-line classroom-sync.ts)
 * @exports extractClassroomsAndStudents
 * @dependencies firebase-functions, ../schemas/source
 * @patterns Data transformation, validation, extraction logic
 */

import { logger } from "firebase-functions";
import { type SheetSubmission } from "@shared/schemas/source";
import { ExtractedClassroom, ExtractedStudent } from "./types";

/**
 * Extract classroom and student data from sheet submissions
 * @param submissions - Array of sheet submission data
 * @returns Extracted classrooms and students as Maps for efficient lookup
 */
export function extractClassroomsAndStudents(submissions: SheetSubmission[]): {
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
          studentLastName,
        });
        continue;
      }

      // Extract classroom data
      if (!classrooms.has(courseId)) {
        // Generate a readable classroom name from course ID and first assignment
        const classroomName = `${courseId}${assignmentTitle ? ` - ${assignmentTitle.split(" ")[0]}` : ""}`;

        classrooms.set(courseId, {
          courseCode: courseId,
          name: classroomName,
          studentEmails: [],
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
          courseIds: [],
        });
      }

      const student = students.get(studentEmail)!;
      if (!student.courseIds.includes(courseId)) {
        student.courseIds.push(courseId);
      }
    } catch (error) {
      logger.error("Error processing submission during extraction", {
        submissionId: submission.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Extraction completed", {
    classroomsFound: classrooms.size,
    studentsFound: students.size,
  });

  return { classrooms, students };
}
