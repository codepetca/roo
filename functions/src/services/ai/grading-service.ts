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

      // Parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Invalid response format from AI");
      }

      const gradingResult = JSON.parse(jsonMatch[0]) as GradingResponse;

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
   * Grade a quiz with multiple questions using mixed AI and rule-based grading
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

    for (const question of request.answerKey.questions) {
      const studentAnswer = request.studentAnswers[question.questionNumber] || "";
      
      // For multiple choice, do exact matching
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
        // For text/code questions, use AI grading with appropriate strictness
        const prompt = this.buildQuestionGradingPrompt(question, studentAnswer);
        
        try {
          const result = await this.model.generateContent(prompt);
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
            // Fallback: give partial credit for non-empty answers
            const score = studentAnswer.trim() ? Math.floor(question.points * 0.5) : 0;
            questionGrades.push({
              questionNumber: question.questionNumber,
              score,
              feedback: "Could not parse AI response, partial credit given for attempt",
              maxScore: question.points
            });
            totalScore += score;
          }
        } catch (error) {
          logger.error(`Error grading question ${question.questionNumber}`, error);
          // Give partial credit for attempts
          const score = studentAnswer.trim() ? Math.floor(question.points * 0.5) : 0;
          questionGrades.push({
            questionNumber: question.questionNumber,
            score,
            feedback: "Grading error occurred, partial credit given for attempt",
            maxScore: question.points
          });
          totalScore += score;
        }
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
        .replace("Be fair but encouraging", "Use GENEROUS grading - focus on understanding over perfect syntax");
    }

    return GRADING_PROMPTS.quizQuestion
      .replace("{questionText}", question.questionText)
      .replace("{studentAnswer}", studentAnswer)
      .replace("{correctAnswer}", question.correctAnswer)
      .replace("{maxPoints}", question.points.toString());
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