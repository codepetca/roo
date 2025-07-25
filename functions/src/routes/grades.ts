/**
 * Grade management routes for Firestore
 * Location: functions/src/routes/grades.ts:1
 */

import { Request, Response } from "express";
import { z } from "zod";
import * as admin from "firebase-admin";
import { createFirestoreGradeService } from "../services/firestore";
import { handleRouteError } from "../middleware/validation";

/**
 * Get all grades for an assignment
 * Location: functions/src/routes/grades.ts:12
 * Route: GET /grades/assignment/:assignmentId
 */
export async function getGradesByAssignment(req: Request, res: Response) {
  try {
    const assignmentId = req.params.assignmentId;
    if (!assignmentId) {
      res.status(400).json({
        success: false,
        error: "Assignment ID is required"
      });
      return;
    }

    const firestoreService = createFirestoreGradeService();
    const grades = await firestoreService.getGradesByAssignmentId(assignmentId);

    res.json({
      success: true,
      assignmentId,
      count: grades.length,
      grades
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Get a specific grade by submission ID
 * Location: functions/src/routes/grades.ts:39
 * Route: GET /grades/submission/:submissionId
 */
export async function getGradeBySubmission(req: Request, res: Response) {
  try {
    const submissionId = req.params.submissionId;
    if (!submissionId) {
      res.status(400).json({
        success: false,
        error: "Submission ID is required"
      });
      return;
    }

    const firestoreService = createFirestoreGradeService();
    const grade = await firestoreService.getGradeBySubmissionId(submissionId);

    if (!grade) {
      res.status(404).json({
        success: false,
        error: "Grade not found for this submission"
      });
      return;
    }

    res.json({
      success: true,
      submissionId,
      grade
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Get all ungraded submissions
 * Location: functions/src/routes/grades.ts:73
 * Route: GET /grades/ungraded
 */
export async function getUngradedSubmissions(req: Request, res: Response) {
  try {
    const firestoreService = createFirestoreGradeService();
    const submissions = await firestoreService.getUngradedSubmissions();

    res.json({
      success: true,
      count: submissions.length,
      submissions
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Save a submission to Firestore
 * Location: functions/src/routes/grades.ts:93
 * Route: POST /submissions
 */
export async function createSubmission(req: Request, res: Response) {
  try {
    const validatedData = z.object({
      assignmentId: z.string().min(1),
      studentId: z.string().min(1),
      studentName: z.string().min(1),
      studentEmail: z.string().email(),
      submissionText: z.string().min(1),
      submittedAt: z.string().datetime().optional(),
      status: z.enum(["pending", "grading", "graded", "error"]).default("pending")
    }).parse(req.body);

    const firestoreService = createFirestoreGradeService();
    
    const submissionData = {
      ...validatedData,
      submittedAt: validatedData.submittedAt 
        ? new Date(validatedData.submittedAt) as unknown as admin.firestore.Timestamp
        : new Date() as unknown as admin.firestore.Timestamp
    };

    const submissionId = await firestoreService.saveSubmission(submissionData);

    res.json({
      success: true,
      submissionId,
      message: "Submission saved to Firestore"
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Get all submissions for an assignment
 * Location: functions/src/routes/grades.ts:127
 * Route: GET /submissions/assignment/:assignmentId
 */
export async function getSubmissionsByAssignment(req: Request, res: Response) {
  try {
    const assignmentId = req.params.assignmentId;
    if (!assignmentId) {
      res.status(400).json({
        success: false,
        error: "Assignment ID is required"
      });
      return;
    }

    const firestoreService = createFirestoreGradeService();
    const submissions = await firestoreService.getSubmissionsByAssignmentId(assignmentId);

    res.json({
      success: true,
      assignmentId,
      count: submissions.length,
      submissions
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Get a specific submission by ID
 * Location: functions/src/routes/grades.ts:154
 * Route: GET /submissions/:submissionId
 */
export async function getSubmissionById(req: Request, res: Response) {
  try {
    const submissionId = req.params.submissionId;
    if (!submissionId) {
      res.status(400).json({
        success: false,
        error: "Submission ID is required"
      });
      return;
    }

    const firestoreService = createFirestoreGradeService();
    const submission = await firestoreService.getSubmissionById(submissionId);

    if (!submission) {
      res.status(404).json({
        success: false,
        error: "Submission not found"
      });
      return;
    }

    res.json({
      success: true,
      submission
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Update submission status
 * Location: functions/src/routes/grades.ts:185
 * Route: PATCH /submissions/:submissionId/status
 */
export async function updateSubmissionStatus(req: Request, res: Response) {
  try {
    const submissionId = req.params.submissionId;
    const validatedData = z.object({
      status: z.enum(["pending", "grading", "graded", "error"]),
      gradeId: z.string().optional()
    }).parse(req.body);

    if (!submissionId) {
      res.status(400).json({
        success: false,
        error: "Submission ID is required"
      });
      return;
    }

    const firestoreService = createFirestoreGradeService();
    await firestoreService.updateSubmissionStatus(
      submissionId, 
      validatedData.status, 
      validatedData.gradeId
    );

    res.json({
      success: true,
      submissionId,
      status: validatedData.status,
      message: "Submission status updated"
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}