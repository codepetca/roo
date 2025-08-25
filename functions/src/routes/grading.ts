import { Request, Response } from "express";
import { z } from "zod";
import { 
  testGradingRequestSchema,
  gradeQuizTestSchema,
  gradeQuizRequestSchema,
  gradeCodeRequestSchema
} from "../schemas";
import { AssignmentClassification } from "../../shared/schemas/core";
import { handleRouteError, validateData, sendApiResponse } from "../middleware/validation";

// Schema for Grade All request
const gradeAllRequestSchema = z.object({
  assignmentId: z.string().min(1, "Assignment ID is required")
});

/**
 * Derive classification from legacy assignment data
 * Used when assignment.classification is not available
 */
function deriveClassificationFromAssignment(assignment: any): AssignmentClassification {
  // Default classification
  let platform: AssignmentClassification['platform'] = 'google_classroom';
  let contentType: AssignmentClassification['contentType'] = 'text';
  let gradingApproach: AssignmentClassification['gradingApproach'] = 'ai_analysis';
  
  // Derive from legacy type field
  if (assignment.type === 'coding') {
    platform = 'google_form';
    contentType = 'code';
    gradingApproach = 'generous_code';
  } else if (assignment.type === 'quiz') {
    platform = 'google_form';
    contentType = assignment.workType === 'MULTIPLE_CHOICE_QUESTION' ? 'choice' : 'short_answer';
    gradingApproach = contentType === 'choice' ? 'auto_grade' : 'standard_quiz';
  } else if (assignment.type === 'written') {
    platform = 'google_docs';
    contentType = 'text';
    gradingApproach = 'essay_rubric';
  }
  
  return {
    platform,
    contentType,
    gradingApproach,
    tags: [assignment.type || 'unknown', 'legacy_derived'],
    confidence: 0.7 // Lower confidence for derived classification
  };
}

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
 * Grade all ungraded submissions for a specific assignment with AI feedback
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
    
    console.log(`🤖 Starting Smart Grade All for assignment: ${validatedData.assignmentId}`);
    
    // Get ALL submissions for this assignment (including already graded ones)
    const allSubmissions = await repository.getAllSubmissionsByAssignment(
      validatedData.assignmentId
    );
    
    console.log(`📝 Found ${allSubmissions.length} total submissions`);
    
    if (allSubmissions.length === 0) {
      return sendApiResponse(res, {
        totalSubmissions: 0,
        gradedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: []
      }, true, "No submissions found for this assignment");
    }

    // Smart filtering: determine which submissions need grading
    const submissionsToGrade = [];
    const skippedSubmissions = [];
    
    for (const submission of allSubmissions) {
      // Always grade if never graded before
      if (submission.status === "submitted" || submission.status === "draft") {
        submissionsToGrade.push(submission);
        console.log(`📝 Will grade: ${submission.studentName} (never graded)`);
        continue;
      }
      
      // For already graded submissions, check if content has changed
      if (submission.status === "graded") {
        try {
          // Get the latest grade for this submission
          const grades = await repository.getGradesByClassroom(submission.classroomId);
          const submissionGrade = grades.find(g => g.submissionId === submission.id);
          
          if (!submissionGrade) {
            // No grade found but status says graded - treat as ungraded
            submissionsToGrade.push(submission);
            console.log(`📝 Will grade: ${submission.studentName} (grade missing)`);
            continue;
          }
          
          // Compare timestamps: if submission updated after grade, re-grade
          const submissionUpdated = new Date(submission.updatedAt);
          const gradeCreated = new Date(submissionGrade.gradedAt);
          
          if (submissionUpdated > gradeCreated) {
            submissionsToGrade.push(submission);
            console.log(`📝 Will re-grade: ${submission.studentName} (content changed since last grade)`);
          } else {
            skippedSubmissions.push(submission);
            console.log(`⏭️ Skipping: ${submission.studentName} (no changes since last grade)`);
          }
        } catch (error) {
          // If we can't determine grade status, err on the side of grading
          submissionsToGrade.push(submission);
          console.log(`📝 Will grade: ${submission.studentName} (error checking grade status)`);
        }
      } else {
        // Unknown status - grade it
        submissionsToGrade.push(submission);
        console.log(`📝 Will grade: ${submission.studentName} (unknown status: ${submission.status})`);
      }
    }
    
    console.log(`🎯 Smart filtering result: ${submissionsToGrade.length} to grade, ${skippedSubmissions.length} skipped`);
    
    if (submissionsToGrade.length === 0) {
      return sendApiResponse(res, {
        totalSubmissions: allSubmissions.length,
        gradedCount: 0,
        failedCount: 0,
        skippedCount: skippedSubmissions.length,
        results: []
      }, true, `All ${allSubmissions.length} submissions are already up-to-date`);
    }
    
    // Continue with the submissions that need grading
    const submissions = submissionsToGrade;
    
    // Get assignment data for grading context
    const assignment = await repository.getAssignment(validatedData.assignmentId);
    if (!assignment) {
      return sendApiResponse(res, null, false, `Assignment not found: ${validatedData.assignmentId}`);
    }
    
    // Process submissions in batches to respect rate limits
    // Reduce batch size for better rate limit management
    const BATCH_SIZE = 3;
    const successful: any[] = [];
    const failed: any[] = [];
    
    // Add small delay between batches to avoid overwhelming the API
    const BATCH_DELAY_MS = 2000; // 2 seconds between batches
    
    for (let i = 0; i < submissions.length; i += BATCH_SIZE) {
      const batch = submissions.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(submissions.length/BATCH_SIZE)}`);
      
      // Add delay between batches (except for first batch)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
      
      // Process batch in parallel
      const batchPromises = batch.map(async (submission) => {
        // Retry logic for API failures
        const MAX_RETRIES = 2;
        const RETRY_DELAY_MS = 1000; // 1 second between retries
        
        for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
          try {
            // Get submission text from the correct field (FIX: Use extractedContent.text)
            const submissionText = submission.extractedContent?.text || submission.content || '';
            
            // Check if this is a Google Forms submission that failed to extract
            // Note: assignment might have materials from snapshot data (not in DTO type)
            const assignmentData = assignment as any;
            const isGoogleForm = assignmentData?.materials?.forms && assignmentData.materials.forms.length > 0;
            const hasExtractionErrors = submission.extractedContent?.metadata?.extractionErrors?.length > 0;
            
            if (isGoogleForm && (!submissionText || submissionText.trim() === '') && hasExtractionErrors) {
              console.log(`⚠️ Google Forms submission with extraction errors: ${submission.studentName}`);
              // Return a specific response for failed form extraction
              return {
                submissionId: submission.id,
                score: 0,
                maxScore: assignment.maxScore || 100,
                feedback: "This is a Google Forms submission that could not be processed. The form responses may not be accessible or the form extraction failed. Please check the form permissions and try re-importing the classroom data.",
                gradeId: 'pending_form_extraction',
                error: 'Form extraction failed'
              };
            }
            
            // Smart grading strategy selection using new classification system
            const classification = assignment.classification || deriveClassificationFromAssignment(assignment);
            
            // Runtime content analysis - detect code in submission
            const codePatterns = [
              /function\s+\w+\s*\(/,    // function declarations
              /\bmove\(\)/,              // Karel commands  
              /\bturnLeft\(\)/,
              /\bfor\s*\(/,              // loops
              /\bwhile\s*\(/,
              /\bif\s*\(/,               // conditionals
              /console\.\w+/,           // console methods
              /\{[\s\S]*\}/              // code blocks
            ];
            const hasCodeInSubmission = codePatterns.some(pattern => pattern.test(submissionText));
            
            // Override grading approach if we detect code
            let finalGradingApproach = classification.gradingApproach;
            if (hasCodeInSubmission && classification.contentType !== 'code') {
              finalGradingApproach = 'generous_code';
            }
            
            // Select prompt template based on final grading approach
            const { GRADING_PROMPTS } = await import("../services/gemini");
            const promptTemplateMap: Record<string, string> = {
              'generous_code': GRADING_PROMPTS.generousCode,
              'standard_quiz': GRADING_PROMPTS.quizQuestion || GRADING_PROMPTS.default,
              'essay_rubric': GRADING_PROMPTS.essay || GRADING_PROMPTS.default,
              'ai_analysis': GRADING_PROMPTS.default,
              'auto_grade': GRADING_PROMPTS.default,
              'manual': GRADING_PROMPTS.default
            };
            const promptTemplate = promptTemplateMap[finalGradingApproach] || GRADING_PROMPTS.default;
            
            // Select criteria based on content type
            const criteriaMap: Record<string, string[]> = {
              'code': ["Understanding", "Logic", "Implementation"],
              'choice': ["Accuracy"],
              'short_answer': ["Accuracy", "Completeness", "Understanding"],
              'text': ["Content", "Organization", "Analysis"],
              'mixed': ["Technical Accuracy", "Explanation", "Implementation"],
              'mathematical': ["Correctness", "Method", "Explanation"]
            };
            const criteria = criteriaMap[classification.contentType] || ["Content", "Quality", "Completeness"];
            
            // Prepare grading request
            const gradingRequest = {
              submissionId: submission.id,
              assignmentId: submission.assignmentId,
              title: assignment.title || assignment.name || 'Assignment',
              description: assignment.description || '',
              maxPoints: assignment.maxScore || 100,
              criteria,
              submission: submissionText || 'No content provided',
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
                isCodeAssignment: finalGradingApproach === 'generous_code'
              }
            });
            
            return {
              submissionId: submission.id,
              gradeId,
              score: gradingResult.score,
              maxScore: assignment.maxScore || 100,
              feedback: gradingResult.feedback,
              attempt
            };
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`❌ Attempt ${attempt}/${MAX_RETRIES + 1} failed for submission ${submission.id}:`, errorMessage);
            
            // Check if this is a retryable error
            const isRetryable = errorMessage.includes('Rate limit exceeded') || 
                               errorMessage.includes('API key expired') ||
                               errorMessage.includes('500') ||
                               errorMessage.includes('timeout');
            
            // If this is the last attempt or not retryable, return the error
            if (attempt > MAX_RETRIES || !isRetryable) {
              return {
                submissionId: submission.id,
                error: errorMessage,
                attempts: attempt
              };
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          }
        }
        
        // This should never be reached, but just in case
        return {
          submissionId: submission.id,
          error: 'Maximum retries exceeded'
        };
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
    
    console.log(`✅ Smart Grade All completed: ${successful.length} successful, ${failed.length} failed, ${skippedSubmissions.length} skipped`);
    
    sendApiResponse(res, {
      totalSubmissions: allSubmissions.length,
      gradedCount: successful.length,
      failedCount: failed.length,
      skippedCount: skippedSubmissions.length,
      results: successful,
      failures: failed.length > 0 ? failed : undefined
    }, true, `Smart Grade All completed: ${successful.length} graded, ${skippedSubmissions.length} skipped (${allSubmissions.length} total)`);
    
  } catch (error) {
    handleRouteError(error, req, res);
  }
}