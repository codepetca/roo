import { Request, Response } from "express";
import { 
  testGradingSchema,
  gradeQuizTestSchema,
  gradeQuizSchema,
  gradeCodeSchema 
} from "../schemas";
import { handleRouteError, validateData } from "../middleware/validation";

/**
 * Test AI grading with sample text (development endpoint)
 * Location: functions/src/routes/grading.ts:9
 * Route: POST /test-grading
 */
export async function testGrading(req: Request, res: Response) {
  try {
    const validatedData = testGradingSchema.parse(req.body);
    
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
      criteria: validatedData.criteria,
      submission: validatedData.text,
      promptTemplate: promptTemplate
    };

    const { createGeminiService } = await import("../services/gemini");
    const geminiApiKey = req.app.locals.geminiApiKey;
    const geminiService = createGeminiService(geminiApiKey);
    const result = await geminiService.gradeSubmission(gradingRequest);
    
    res.json({
      success: true,
      grading: result,
      metadata: {
        submissionLength: validatedData.text.length,
        criteria: validatedData.criteria,
        maxPoints: validatedData.maxPoints
      }
    });
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
    
    const sheetsService = await createSheetsService();
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

    // Grade the quiz
    const gradingResult = await geminiService.gradeQuiz({
      submissionId: validatedData.submissionId,
      formId: validatedData.formId,
      studentAnswers,
      answerKey
    });

    // TEST MODE: Skip sheet update to avoid authentication issues
    res.json({
      success: true,
      grading: gradingResult,
      answerKey: {
        totalPoints: answerKey.totalPoints,
        questionCount: answerKey.questions.length
      },
      testMode: true,
      note: "Grade calculated but not saved to sheets (test mode)"
    });

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
    const validatedData = validateData(gradeQuizSchema, req.body);

    const { createSheetsService } = await import("../services/sheets");
    const { createGeminiService } = await import("../services/gemini");
    const { createFirestoreGradeService } = await import("../services/firestore");
    
    const sheetsService = await createSheetsService();
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

    // Grade the quiz
    const gradingResult = await geminiService.gradeQuiz({
      submissionId: validatedData.submissionId,
      formId: validatedData.formId,
      studentAnswers,
      answerKey
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

    res.json({
      success: true,
      gradeId,
      grading: gradingResult,
      answerKey: {
        totalPoints: answerKey.totalPoints,
        questionCount: answerKey.questions.length
      },
      metadata: {
        savedToFirestore: true
      }
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}

/**
 * Grade a single coding assignment with generous mode
 * Location: functions/src/routes/grading.ts:95
 * Route: POST /grade-code
 */
export async function gradeCode(req: Request, res: Response) {
  try {
    const validatedData = validateData(gradeCodeSchema, req.body);

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

    res.json({
      success: true,
      gradeId,
      grading: result,
      metadata: {
        gradingMode: validatedData.gradingStrictness,
        isCodeAssignment: validatedData.isCodeAssignment,
        savedToFirestore: true
      }
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}