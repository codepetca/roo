/**
 * Grading Service - Main AI grading logic using Gemini 1.5 Flash
 * @module functions/src/services/ai/grading-service
 * @size ~200 lines (extracted from 402-line gemini.ts)
 * @exports GeminiService
 * @dependencies GenerativeModel, ./rate-limiter, ./prompts, ./types, firebase-functions
 * @patterns AI service integration, error handling, rate limiting, generous grading
 */

import { GenerativeModel } from "@google/generative-ai";
import { logger } from "firebase-functions";
import { rateLimiter, RATE_LIMIT } from "./rate-limiter";
import { GRADING_PROMPTS } from "./prompts";
import { GradingRequest, GradingResponse, QuizGradingRequest, QuizGradingResponse } from "./types";

export class GeminiService {
  constructor(private model: GenerativeModel) {}

  /**
   * Grade a single assignment submission using AI
   */
  async gradeSubmission(request: GradingRequest): Promise<GradingResponse> {
    const rateLimitKey = `grading:${request.assignmentId}`;
    
    // Check rate limit
    if (!rateLimiter.canMakeRequest(rateLimitKey)) {
      const remaining = rateLimiter.getRemainingRequests(rateLimitKey);
      throw new Error(
        "Rate limit exceeded. Please wait before grading more submissions. " +
        `Remaining requests: ${remaining}/${RATE_LIMIT.maxRequests} per minute.`
      );
    }

    // Handle empty or minimal submissions before calling AI
    if (!request.submission || 
        request.submission.trim() === '' || 
        request.submission.trim() === 'No content provided') {
      
      logger.info("Empty submission detected, returning default response", {
        submissionId: request.submissionId,
        assignmentId: request.assignmentId
      });
      
      return {
        score: 0,
        feedback: "No submission content was found. This may be a Google Form that hasn't been properly extracted yet, or the student may not have submitted any content.",
        criteriaScores: request.criteria.map(criterion => ({
          name: criterion,
          score: 0,
          maxScore: Math.floor(request.maxPoints / request.criteria.length),
          feedback: "No content available for evaluation"
        }))
      };
    }

    try {
      // Build the prompt
      const criteriaList = request.criteria.join("\n- ");
      const basePrompt = request.promptTemplate || GRADING_PROMPTS.default;
      
      const prompt = basePrompt
        .replace("{criteria}", criteriaList)
        .replace("{title}", request.title)
        .replace("{description}", request.description)
        .replace("{maxPoints}", request.maxPoints.toString())
        .replace("{submission}", request.submission);

      logger.info("Grading submission with Gemini", {
        submissionId: request.submissionId,
        promptLength: prompt.length,
      });

      // Call Gemini API
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON response with better error handling and fallback
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error("No JSON found in Gemini response, creating fallback response", {
          submissionId: request.submissionId,
          responseText: text.substring(0, 500) + (text.length > 500 ? '...' : ''),
          promptLength: prompt.length
        });
        
        // Create fallback JSON response when AI doesn't return proper JSON
        const fallbackResult: GradingResponse = {
          score: 0,
          feedback: `AI grading failed to return proper JSON format. Raw response: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}". Please review this submission manually.`,
          criteriaScores: request.criteria.map((criterion, index) => ({
            name: criterion,
            score: 0,
            maxScore: Math.floor(request.maxPoints / request.criteria.length),
            feedback: "Could not evaluate due to AI response format issue"
          }))
        };
        
        return fallbackResult;
      }

      // Clean the JSON to handle common AI formatting issues
      const cleanJson = (jsonString: string): string => {
        return jsonString
          // Remove trailing commas before closing brackets/braces
          .replace(/,(\s*[}\]])/g, '$1')
          // Fix any double commas
          .replace(/,,/g, ',')
          // Remove any trailing comma at the end before final brace
          .replace(/,(\s*)}/g, '$1}')
          // Clean up any malformed nested trailing commas
          .replace(/,(\s*),/g, ',');
      };

      let gradingResult: GradingResponse;
      try {
        const cleanedJson = cleanJson(jsonMatch[0]);
        logger.info("JSON cleaning applied", {
          submissionId: request.submissionId,
          originalLength: jsonMatch[0].length,
          cleanedLength: cleanedJson.length,
          hadTrailingCommas: jsonMatch[0] !== cleanedJson
        });
        
        gradingResult = JSON.parse(cleanedJson) as GradingResponse;
      } catch (parseError) {
        const cleanedJson = cleanJson(jsonMatch[0]);
        logger.error("Failed to parse JSON from Gemini response, creating fallback", {
          submissionId: request.submissionId,
          originalJson: jsonMatch[0].substring(0, 500),
          cleanedJson: cleanedJson.substring(0, 500),
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          fullResponse: text.substring(0, 1000) + (text.length > 1000 ? '...' : '')
        });
        
        // Create fallback response for malformed JSON
        const fallbackResult: GradingResponse = {
          score: 0,
          feedback: `AI returned malformed JSON. Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}. Raw JSON: "${jsonMatch[0].substring(0, 200)}${jsonMatch[0].length > 200 ? '...' : ''}". Please review this submission manually.`,
          criteriaScores: request.criteria.map((criterion, index) => ({
            name: criterion,
            score: 0,
            maxScore: Math.floor(request.maxPoints / request.criteria.length),
            feedback: "Could not evaluate due to malformed AI response"
          }))
        };
        
        return fallbackResult;
      }

      // Validate response
      if (
        typeof gradingResult.score !== "number" ||
        !gradingResult.feedback ||
        !Array.isArray(gradingResult.criteriaScores)
      ) {
        throw new Error("Invalid grading response structure");
      }

      // Ensure score is within bounds
      gradingResult.score = Math.max(0, Math.min(request.maxPoints, gradingResult.score));

      logger.info("Grading completed", {
        submissionId: request.submissionId,
        score: gradingResult.score,
      });

      return gradingResult;
    } catch (error) {
      logger.error("Gemini grading error", error);
      throw error;
    }
  }

  /**
   * Grade a quiz with multiple questions using optimized bulk AI grading
   */
  async gradeQuiz(request: QuizGradingRequest): Promise<QuizGradingResponse> {
    const rateLimitKey = `quiz:${request.formId}`;
    
    if (!rateLimiter.canMakeRequest(rateLimitKey)) {
      const remaining = rateLimiter.getRemainingRequests(rateLimitKey);
      throw new Error(
        `Rate limit exceeded. Remaining requests: ${remaining}/${RATE_LIMIT.maxRequests} per minute.`
      );
    }

    const questionGrades = [];
    let totalScore = 0;

    // Separate multiple choice from AI-graded questions
    const multipleChoiceQuestions = [];
    const aiGradedQuestions = [];

    for (const question of request.answerKey.questions) {
      const studentAnswer = request.studentAnswers[question.questionNumber] || "";
      
      if (question.questionType === "MULTIPLE_CHOICE") {
        multipleChoiceQuestions.push({ question, studentAnswer });
      } else {
        aiGradedQuestions.push({ question, studentAnswer });
      }
    }

    // Process multiple choice questions instantly
    for (const { question, studentAnswer } of multipleChoiceQuestions) {
      const isCorrect = studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      const score = isCorrect ? question.points : 0;
      
      questionGrades.push({
        questionNumber: question.questionNumber,
        score,
        feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${question.correctAnswer}`,
        maxScore: question.points
      });
      
      totalScore += score;
    }

    // Process all AI-graded questions in a single bulk call
    if (aiGradedQuestions.length > 0) {
      try {
        const bulkPrompt = this.buildBulkQuizGradingPrompt(aiGradedQuestions);
        const result = await this.model.generateContent(bulkPrompt);
        const response = await result.response;
        const text = response.text();
        
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const bulkResults = JSON.parse(jsonMatch[0]);
          
          // Process results for each AI-graded question
          for (const { question } of aiGradedQuestions) {
            const gradingResult = bulkResults.results?.[question.questionNumber];
            
            if (gradingResult) {
              const score = Math.max(0, Math.min(question.points, gradingResult.score || 0));
              
              questionGrades.push({
                questionNumber: question.questionNumber,
                score,
                feedback: gradingResult.feedback || "No feedback provided",
                maxScore: question.points
              });
              
              totalScore += score;
            } else {
              // Fallback for missing results
              const studentAnswer = request.studentAnswers[question.questionNumber] || "";
              const score = studentAnswer.trim() ? Math.floor(question.points * 0.7) : 0;
              questionGrades.push({
                questionNumber: question.questionNumber,
                score,
                feedback: "Bulk grading result missing, partial credit given",
                maxScore: question.points
              });
              totalScore += score;
            }
          }
        } else {
          // Fallback: individual processing for parse errors
          logger.warn('Bulk quiz grading failed to parse, falling back to individual grading');
          return this.fallbackToIndividualGrading(request);
        }
      } catch (error) {
        logger.error('Bulk quiz grading failed, falling back to individual grading', error);
        return this.fallbackToIndividualGrading(request);
      }
    }

    logger.info("Quiz grading completed", {
      submissionId: request.submissionId,
      totalScore,
      maxScore: request.answerKey.totalPoints
    });

    return { totalScore, questionGrades };
  }

  /**
   * Build a grading prompt for a single quiz question
   */
  private buildQuestionGradingPrompt(question: any, studentAnswer: string): string {
    // Detect if this is likely a code question
    const isCodeQuestion = question.questionText.toLowerCase().includes("code") || 
                          question.questionText.toLowerCase().includes("program") ||
                          question.questionText.toLowerCase().includes("karel") ||
                          studentAnswer.includes("{") || studentAnswer.includes("}");

    // Use generous grading for code questions or when explicitly specified
    if (question.gradingStrictness === "generous" || isCodeQuestion) {
      return GRADING_PROMPTS.quizQuestion
        .replace("{questionText}", question.questionText)
        .replace("{studentAnswer}", studentAnswer)
        .replace("{correctAnswer}", question.correctAnswer)
        .replace("{maxPoints}", question.points.toString())
        .replace("Be fair but encouraging", "GENEROUS GRADING MODE: Focus on understanding and logic over syntax");
    }

    // Use strict grading when explicitly specified
    if (question.gradingStrictness === "strict") {
      return GRADING_PROMPTS.quizQuestion
        .replace("{questionText}", question.questionText)
        .replace("{studentAnswer}", studentAnswer)
        .replace("{correctAnswer}", question.correctAnswer)
        .replace("{maxPoints}", question.points.toString())
        .replace("Be fair but encouraging", "STRICT GRADING MODE: Accuracy and precision are important");
    }

    return GRADING_PROMPTS.quizQuestion
      .replace("{questionText}", question.questionText)
      .replace("{studentAnswer}", studentAnswer)
      .replace("{correctAnswer}", question.correctAnswer)
      .replace("{maxPoints}", question.points.toString());
  }

  /**
   * Build bulk grading prompt for multiple quiz questions
   */
  private buildBulkQuizGradingPrompt(questionData: Array<{question: any, studentAnswer: string}>): string {
    const questionsSection = questionData.map(({question, studentAnswer}, index) => {
      const questionNumber = question.questionNumber;
      
      // Detect if this is likely a code question for generous grading
      const isCodeQuestion = question.questionText.toLowerCase().includes("code") || 
                            question.questionText.toLowerCase().includes("program") ||
                            question.questionText.toLowerCase().includes("karel") ||
                            studentAnswer.includes("{") || studentAnswer.includes("}");

      const gradingMode = question.gradingStrictness === "generous" || isCodeQuestion 
        ? "GENEROUS GRADING MODE: Focus on understanding and logic over syntax"
        : question.gradingStrictness === "strict" 
        ? "STRICT GRADING MODE: Accuracy and precision are important"
        : "BALANCED GRADING MODE: Be fair but encouraging";

      return `
QUESTION ${questionNumber}:
Text: ${question.questionText}
Student Answer: "${studentAnswer}"
Correct Answer: ${question.correctAnswer}
Max Points: ${question.points}
Grading Mode: ${gradingMode}
`;
    }).join('\n');

    return `You are grading a quiz with multiple questions. Grade ALL questions and return results as a single JSON object.

${questionsSection}

Return your response as a JSON object in this exact format:
{
  "results": {
    "1": { "score": number, "feedback": "string" },
    "2": { "score": number, "feedback": "string" },
    ...
  }
}

For each question:
- Assign a score between 0 and the max points
- Provide specific, constructive feedback
- Follow the specified grading mode for each question
- Be generous with partial credit for code questions
- Focus on understanding over perfect syntax for programming questions`;
  }

  /**
   * Fallback to individual question grading when bulk grading fails
   */
  private async fallbackToIndividualGrading(request: QuizGradingRequest): Promise<QuizGradingResponse> {
    logger.warn('Using fallback individual grading for quiz', {
      submissionId: request.submissionId,
      questionCount: request.answerKey.questions.length
    });

    const questionGrades = [];
    let totalScore = 0;

    for (const question of request.answerKey.questions) {
      const studentAnswer = request.studentAnswers[question.questionNumber] || "";
      
      if (question.questionType === "MULTIPLE_CHOICE") {
        const isCorrect = studentAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
        const score = isCorrect ? question.points : 0;
        
        questionGrades.push({
          questionNumber: question.questionNumber,
          score,
          feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer is: ${question.correctAnswer}`,
          maxScore: question.points
        });
        
        totalScore += score;
      } else {
        try {
          const questionPrompt = this.buildQuestionGradingPrompt(question, studentAnswer);
          const result = await this.model.generateContent(questionPrompt);
          const response = await result.response;
          const text = response.text();
          
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const gradingResult = JSON.parse(jsonMatch[0]);
            const score = Math.max(0, Math.min(question.points, gradingResult.score || 0));
            
            questionGrades.push({
              questionNumber: question.questionNumber,
              score,
              feedback: gradingResult.feedback || "No feedback provided",
              maxScore: question.points
            });
            
            totalScore += score;
          } else {
            // Final fallback for unparseable responses
            const score = studentAnswer.trim() ? Math.floor(question.points * 0.5) : 0;
            questionGrades.push({
              questionNumber: question.questionNumber,
              score,
              feedback: "AI grading failed, partial credit given based on response presence",
              maxScore: question.points
            });
            totalScore += score;
          }
        } catch (error) {
          logger.error('Individual question grading failed', {
            questionNumber: question.questionNumber,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Emergency fallback
          const score = studentAnswer.trim() ? Math.floor(question.points * 0.3) : 0;
          questionGrades.push({
            questionNumber: question.questionNumber,
            score,
            feedback: "Grading error occurred, minimal credit given",
            maxScore: question.points
          });
          totalScore += score;
        }
      }
    }

    return { totalScore, questionGrades };
  }

  /**
   * Test connection to Gemini API
   */
  async testConnection(): Promise<boolean> {
    try {
      const prompt = "Respond with exactly 'Hello, Roo!' if you can read this.";
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info("Gemini test response", { response: text });
      return text.includes("Hello, Roo!");
    } catch (error) {
      logger.error("Gemini connection test failed", error);
      return false;
    }
  }
}