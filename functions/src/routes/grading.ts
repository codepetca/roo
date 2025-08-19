import { Request, Response } from "express";
import { z } from "zod";
import { 
  testGradingRequestSchema,
  gradeQuizTestSchema,
  gradeQuizRequestSchema,
  gradeCodeRequestSchema
} from "../schemas";
import { handleRouteError, validateData, sendApiResponse } from "../middleware/validation";

// Schema for Grade All request
const gradeAllRequestSchema = z.object({
  classroomId: z.string().min(1, "Classroom ID is required"),
  assignmentIds: z.array(z.string()).optional()
});

/**
 * Test AI grading with sample text (development endpoint)
 * Location: functions/src/routes/grading.ts:9
 * Route: POST /test-grading
 */
export async function testGrading(req: Request, res: Response) {
  try {
    const validatedData = validateData(testGradingRequestSchema, req.body);
    
    // Import prompts and choose appropriate template
    const { GRADING_PROMPTS } = await import("../services/gemini");
    const isCodeSubmission = validatedData.text.toLowerCase().includes("function") || 
                            validatedData.text.toLowerCase().includes("karel") ||
                            validatedData.text.includes("{") || validatedData.text.includes("}");
    
    const promptTemplate = validatedData.promptTemplate || 
                          (isCodeSubmission ? GRADING_PROMPTS.generousCode : GRADING_PROMPTS.default);

    const gradingRequest = {
      submissionId: "test-submission",
      assignmentId: "test-assignment",
      title: "Test Assignment - Karel Code",
      description: "This is a test assignment for generous AI grading of Karel code",
      maxPoints: validatedData.maxPoints || 100,
      criteria: validatedData.criteria || ["Content", "Grammar", "Structure"],
      submission: validatedData.text,
      promptTemplate: promptTemplate
    };

    const { createGeminiService } = await import("../services/gemini");
    const geminiApiKey = req.app.locals.geminiApiKey;
    const geminiService = createGeminiService(geminiApiKey);
    const result = await geminiService.gradeSubmission(gradingRequest);
    
    // Validate response using schema
    const responseData = {
      grading: result,
      metadata: {
        submissionLength: validatedData.text.length,
        criteria: validatedData.criteria,
        maxPoints: validatedData.maxPoints
      }
    };
    
    sendApiResponse(res, responseData, true, "Test grading completed successfully");
  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Grade a quiz submission using answer key from Google Sheets (test mode - no sheet updates)
 * Location: functions/src/routes/grading.ts:48
 * Route: POST /grade-quiz-test
 */
export async function gradeQuizTest(req: Request, res: Response) {
  try {
    const validatedData = validateData(gradeQuizTestSchema, req.body);

    const { createSheetsService } = await import("../services/sheets");
    const { createGeminiService } = await import("../services/gemini");
    const { getDefaultSpreadsheetId } = await import("../config/teachers");
    
    // Get the default spreadsheet ID (for now use the first configured teacher)
    const spreadsheetId = await getDefaultSpreadsheetId();
    if (!spreadsheetId) {
      return res.status(500).json({
        success: false,
        error: "No teacher sheets configured. Please set up at least one teacher sheet first."
      });
    }
    
    const sheetsService = await createSheetsService(spreadsheetId);
    const geminiApiKey = req.app.locals.geminiApiKey;
    const geminiService = createGeminiService(geminiApiKey);

    // Get answer key
    const answerKey = await sheetsService.getAnswerKey(validatedData.formId);
    if (!answerKey) {
      res.status(404).json({
        success: false,
        error: "Answer key not found for this form"
      });
      return;
    }

    // Convert string keys to numbers for student answers
    const studentAnswers: { [questionNumber: number]: string } = {};
    Object.entries(validatedData.studentAnswers).forEach(([key, value]) => {
      studentAnswers[parseInt(key)] = value as string;
    });

    // Grade the quiz (answerKey is guaranteed to exist due to check above)
    // Type assertion: answerKey from sheets service should match the expected interface
    const gradingResult = await geminiService.gradeQuiz({
      submissionId: validatedData.submissionId,
      formId: validatedData.formId,
      studentAnswers,
      answerKey: answerKey as any // Type assertion to bypass optional field issues
    });

    // TEST MODE: Skip sheet update to avoid authentication issues
    sendApiResponse(res, {
      grading: gradingResult,
      answerKey: {
        totalPoints: answerKey.totalPoints,
        questionCount: answerKey.questions.length
      },
      testMode: true,
      note: "Grade calculated but not saved to sheets (test mode)"
    }, true, "Quiz grading test completed successfully");

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Grade a quiz submission using answer key from Google Sheets
 * Location: functions/src/routes/grading.ts:98
 * Route: POST /grade-quiz
 */
export async function gradeQuiz(req: Request, res: Response) {
  try {
    const validatedData = validateData(gradeQuizRequestSchema, req.body);

    const { createSheetsService } = await import("../services/sheets");
    const { createGeminiService } = await import("../services/gemini");
    const { createFirestoreGradeService } = await import("../services/firestore");
    const { getDefaultSpreadsheetId } = await import("../config/teachers");
    
    // Get the default spreadsheet ID
    const spreadsheetId = await getDefaultSpreadsheetId();
    if (!spreadsheetId) {
      return res.status(500).json({
        success: false,
        error: "No teacher sheets configured. Please set up at least one teacher sheet first."
      });
    }
    
    const sheetsService = await createSheetsService(spreadsheetId);
    const geminiApiKey = req.app.locals.geminiApiKey;
    const geminiService = createGeminiService(geminiApiKey);
    const firestoreService = createFirestoreGradeService();

    // Get answer key from Sheets (this remains for now)
    const answerKey = await sheetsService.getAnswerKey(validatedData.formId);
    if (!answerKey) {
      res.status(404).json({
        success: false,
        error: "Answer key not found for this form"
      });
      return;
    }

    // Convert string keys to numbers for student answers
    const studentAnswers: { [questionNumber: number]: string } = {};
    Object.entries(validatedData.studentAnswers).forEach(([key, value]) => {
      studentAnswers[parseInt(key)] = value as string;
    });

    // Grade the quiz (answerKey is guaranteed to exist due to check above)
    // Type assertion: answerKey from sheets service should match the expected interface
    const gradingResult = await geminiService.gradeQuiz({
      submissionId: validatedData.submissionId,
      formId: validatedData.formId,
      studentAnswers,
      answerKey: answerKey as any // Type assertion to bypass optional field issues
    });

    // Save grade to Firestore instead of updating Sheets
    const gradeId = await firestoreService.saveGrade({
      submissionId: validatedData.submissionId,
      assignmentId: validatedData.assignmentId,
      studentId: validatedData.studentId,
      studentName: validatedData.studentName,
      score: gradingResult.totalScore,
      maxPoints: answerKey.totalPoints,
      feedback: `Quiz graded automatically. Score: ${gradingResult.totalScore}/${answerKey.totalPoints}`,
      gradedBy: "ai",
      metadata: {
        formId: validatedData.formId,
        questionCount: answerKey.questions.length,
        totalQuestions: answerKey.questions.length,
        questionGrades: gradingResult.questionGrades
      }
    });

    sendApiResponse(res, {
      gradeId,
      grading: gradingResult
    }, true, "Quiz graded successfully");

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Grade a single assignment (any type) with AI feedback
 * Location: functions/src/routes/grading.ts:95
 * Route: POST /grade-assignment
 */
export async function gradeCode(req: Request, res: Response) {
  try {
    const validatedData = validateData(gradeCodeRequestSchema, req.body);

    const { createGeminiService } = await import("../services/gemini");
    const { createFirestoreGradeService } = await import("../services/firestore");
    
    const geminiApiKey = req.app.locals.geminiApiKey;
    const geminiService = createGeminiService(geminiApiKey);
    const firestoreService = createFirestoreGradeService();

    // Choose appropriate prompt template
    const { GRADING_PROMPTS } = await import("../services/gemini");
    let promptTemplate = GRADING_PROMPTS.default;
    if (validatedData.isCodeAssignment || validatedData.gradingStrictness === "generous") {
      promptTemplate = GRADING_PROMPTS.generousCode;
    }

    // Prepare grading request
    const gradingRequest = {
      submissionId: validatedData.submissionId,
      assignmentId: validatedData.assignmentId,
      title: validatedData.assignmentTitle,
      description: validatedData.assignmentDescription || "",
      maxPoints: validatedData.maxPoints || 100,
      criteria: ["Understanding", "Logic", "Implementation"],
      submission: validatedData.submissionText,
      promptTemplate
    };

    const result = await geminiService.gradeSubmission(gradingRequest);
    
    // Save grade to Firestore instead of Sheets
    const gradeId = await firestoreService.saveGrade({
      submissionId: validatedData.submissionId,
      assignmentId: validatedData.assignmentId,
      studentId: validatedData.studentId,
      studentName: validatedData.studentName,
      score: result.score,
      maxPoints: validatedData.maxPoints || 100,
      feedback: result.feedback,
      gradedBy: "ai",
      criteriaScores: result.criteriaScores,
      metadata: {
        submissionLength: validatedData.submissionText.length,
        criteria: gradingRequest.criteria,
        gradingMode: validatedData.gradingStrictness,
        isCodeAssignment: validatedData.isCodeAssignment
      }
    });

    sendApiResponse(res, {
      gradeId,
      grading: result
    }, true, "Code assignment graded successfully");

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Grade all ungraded assignments in a classroom with AI feedback
 * Location: functions/src/routes/grading.ts:275
 * Route: POST /grade-all-assignments
 */
export async function gradeAllAssignments(req: Request, res: Response) {
  try {
    const validatedData = validateData(gradeAllRequestSchema, req.body);
    
    const { FirestoreRepository } = await import("../services/firestore-repository");
    const { createGeminiService } = await import("../services/gemini");
    const { createFirestoreGradeService } = await import("../services/firestore");
    
    const repository = new FirestoreRepository();
    const geminiApiKey = req.app.locals.geminiApiKey;
    const geminiService = createGeminiService(geminiApiKey);
    const firestoreService = createFirestoreGradeService();
    
    console.log(`🤖 Starting Grade All for classroom: ${validatedData.classroomId}`);
    
    // Get all ungraded submissions for this classroom
    const submissions = await repository.getUngradedSubmissions(
      validatedData.classroomId
    );
    
    console.log(`📝 Found ${submissions.length} ungraded submissions`);
    
    if (submissions.length === 0) {
      return sendApiResponse(res, {
        totalSubmissions: 0,
        gradedCount: 0,
        failedCount: 0,
        results: []
      }, true, "No ungraded submissions found");
    }
    
    // Get assignments data for grading context
    const assignmentIds = [...new Set(submissions.map(s => s.assignmentId))];
    const assignments = await Promise.all(
      assignmentIds.map(id => repository.getAssignment(id))
    );
    const assignmentMap = assignments.reduce((map, assignment) => {
      if (assignment) map[assignment.id] = assignment;
      return map;
    }, {} as Record<string, any>);
    
    // Process submissions in batches to respect rate limits
    const BATCH_SIZE = 5;
    const successful: any[] = [];
    const failed: any[] = [];
    
    for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
      const batch = submissions.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(submissions.length/BATCH_SIZE)}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (submission) => {
        try {
          const assignment = assignmentMap[submission.assignmentId];
          if (!assignment) {
            throw new Error(`Assignment not found: ${submission.assignmentId}`);
          }
          
          // Determine if this is a code assignment
          const isCodeAssignment = assignment.type === 'coding' || assignment.isQuiz === false;
          
          // Use appropriate prompt template
          const { GRADING_PROMPTS } = await import("../services/gemini");
          const promptTemplate = isCodeAssignment ? GRADING_PROMPTS.generousCode : GRADING_PROMPTS.default;
          
          // Prepare grading request
          const gradingRequest = {
            submissionId: submission.id,
            assignmentId: submission.assignmentId,
            title: assignment.title || assignment.name || 'Assignment',
            description: assignment.description || '',
            maxPoints: assignment.maxScore || 100,
            criteria: isCodeAssignment ? ["Understanding", "Logic", "Implementation"] : ["Content", "Organization", "Analysis"],
            submission: submission.content || 'No content provided',
            promptTemplate
          };
          
          // Grade with AI
          const gradingResult = await geminiService.gradeSubmission(gradingRequest);
          
          // Save grade to Firestore
          const gradeId = await firestoreService.saveGrade({
            submissionId: submission.id,
            assignmentId: submission.assignmentId,
            studentId: submission.studentId,
            studentName: submission.studentName,
            score: gradingResult.score,
            maxPoints: assignment.maxScore || 100,
            feedback: gradingResult.feedback,
            gradedBy: "ai",
            criteriaScores: gradingResult.criteriaScores,
            metadata: {
              gradingMode: 'bulk',
              isCodeAssignment
            }
          });
          
          return {
            submissionId: submission.id,
            gradeId,
            score: gradingResult.score,
            maxScore: assignment.maxScore || 100,
            feedback: gradingResult.feedback
          };
          
        } catch (error) {
          console.error(`❌ Failed to grade submission ${submission.id}:`, error);
          return {
            submissionId: submission.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Categorize results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && !result.value.error) {
          successful.push(result.value);
        } else {
          failed.push({
            submissionId: result.status === 'fulfilled' ? result.value.submissionId : 'unknown',
            error: result.status === 'fulfilled' ? result.value.error : 'Promise rejected'
          });
        }
      });
      
      // Small delay between batches to be nice to the AI service
      if (i + BATCH_SIZE < submissions.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ Grade All completed: ${successful.length} successful, ${failed.length} failed`);
    
    sendApiResponse(res, {
      totalSubmissions: submissions.length,
      gradedCount: successful.length,
      failedCount: failed.length,
      results: successful,
      failures: failed.length > 0 ? failed : undefined
    }, true, `Graded ${successful.length} of ${submissions.length} submissions successfully`);
    
  } catch (error) {
    handleRouteError(error, req, res);
  }
}