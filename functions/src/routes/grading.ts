import { Request, Response } from "express";
import { z } from "zod";
import { testGradingSchema } from "../schemas";
import { handleRouteError } from "../middleware/validation";

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
      maxPoints: validatedData.maxPoints,
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
 * Grade a quiz submission using answer key from Google Sheets
 * Location: functions/src/routes/grading.ts:48
 * Route: POST /grade-quiz
 */
export async function gradeQuiz(req: Request, res: Response) {
  try {
    const validatedData = z.object({
      submissionId: z.string().min(1),
      formId: z.string().min(1),
      studentAnswers: z.record(z.string(), z.string()) // questionNumber -> answer
    }).parse(req.body);

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

    // Update the grade in sheets
    await sheetsService.updateGrade(validatedData.submissionId, gradingResult.totalScore);

    res.json({
      success: true,
      grading: gradingResult,
      answerKey: {
        totalPoints: answerKey.totalPoints,
        questionCount: answerKey.questions.length
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
    const validatedData = z.object({
      submissionId: z.string().min(1),
      submissionText: z.string().min(1),
      assignmentTitle: z.string().min(1),
      assignmentDescription: z.string().optional().default(""),
      maxPoints: z.number().min(1).default(100),
      isCodeAssignment: z.boolean().default(false),
      gradingStrictness: z.enum(["strict", "standard", "generous"]).default("generous")
    }).parse(req.body);

    const { createGeminiService } = await import("../services/gemini");
    const { createSheetsService } = await import("../services/sheets");
    
    const geminiApiKey = req.app.locals.geminiApiKey;
    const geminiService = createGeminiService(geminiApiKey);
    const sheetsService = await createSheetsService();

    // Choose appropriate prompt template
    const { GRADING_PROMPTS } = await import("../services/gemini");
    let promptTemplate = GRADING_PROMPTS.default;
    if (validatedData.isCodeAssignment || validatedData.gradingStrictness === "generous") {
      promptTemplate = GRADING_PROMPTS.generousCode;
    }

    // Prepare grading request
    const gradingRequest = {
      submissionId: validatedData.submissionId,
      assignmentId: "manual-grading",
      title: validatedData.assignmentTitle,
      description: validatedData.assignmentDescription,
      maxPoints: validatedData.maxPoints,
      criteria: ["Understanding", "Logic", "Implementation"],
      submission: validatedData.submissionText,
      promptTemplate
    };

    const result = await geminiService.gradeSubmission(gradingRequest);
    
    // Update grade in sheets
    await sheetsService.updateGrade(validatedData.submissionId, result.score);

    res.json({
      success: true,
      grading: result,
      metadata: {
        gradingMode: validatedData.gradingStrictness,
        isCodeAssignment: validatedData.isCodeAssignment
      }
    });

  } catch (error) {
    handleRouteError(error, req, res);
  }
}