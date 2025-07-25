import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { logger } from "firebase-functions";

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 15,
  windowMs: 60 * 1000, // 1 minute
};

// In-memory rate limiter (consider using Redis in production)
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < RATE_LIMIT.windowMs
    );
    
    if (validRequests.length >= RATE_LIMIT.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < RATE_LIMIT.windowMs
    );
    return Math.max(0, RATE_LIMIT.maxRequests - validRequests.length);
  }
}

const rateLimiter = new RateLimiter();

// Gemini service factory
export const createGeminiService = (apiKey: string) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return new GeminiService(genAI.getGenerativeModel({ model: "gemini-1.5-flash" }));
};

// Grading prompt templates
export const GRADING_PROMPTS = {
  default: `You are an experienced teacher grading student assignments. 
Please evaluate the following submission based on these criteria:
{criteria}

Assignment Title: {title}
Assignment Description: {description}
Maximum Points: {maxPoints}

Student Submission:
{submission}

Please provide:
1. A score out of {maxPoints} points
2. Detailed feedback for each criterion
3. Overall feedback and suggestions for improvement

Format your response as JSON with this structure:
{
  "score": number,
  "feedback": "overall feedback text",
  "criteriaScores": [
    {
      "name": "criterion name",
      "score": number,
      "maxScore": number,
      "feedback": "specific feedback"
    }
  ]
}`,

  essay: `You are grading an essay. Focus on:
- Thesis clarity and argument strength
- Evidence and examples
- Organization and flow
- Grammar and style
- Conclusion effectiveness

{basePrompt}`,

  code: `You are grading a programming assignment. Focus on:
- Code correctness and functionality
- Code style and readability
- Problem-solving approach
- Edge case handling
- Documentation and comments

{basePrompt}`,

  generousCode: `You are grading handwritten code from a student quiz/assignment. This is GENEROUS GRADING for coding questions.

CRITICAL GRADING PHILOSOPHY:
- This is handwritten code without IDE assistance - be VERY generous
- Missing semicolons, brackets, small typos: NO significant penalty (max -1 point total)
- If logic is correct and student understands the concept: give 85-100% of points
- Focus on: Does the student understand the programming concept?
- Only penalize heavily (more than 20%) for: completely wrong approach, fundamental misunderstanding
- Syntax perfection is NOT expected in handwritten code
- Encourage students - emphasize what they did right

You are grading: {title}
Description: {description}
Maximum Points: {maxPoints}

Evaluation Criteria (be generous):
{criteria}

Student's handwritten code submission:
{submission}

REMEMBER: If the logic/approach is correct, give 85-100% even with syntax errors. Only major conceptual errors should result in low scores.

Format your response as JSON:
{
  "score": number,
  "feedback": "encouraging feedback focusing on what they did well, mention syntax is minor issue",
  "criteriaScores": [
    {
      "name": "criterion name", 
      "score": number,
      "maxScore": number,
      "feedback": "positive feedback emphasizing conceptual understanding"
    }
  ]
}`,
};

export interface GradingRequest {
  submissionId: string;
  assignmentId: string;
  title: string;
  description: string;
  maxPoints: number;
  criteria: string[];
  submission: string;
  promptTemplate?: string;
}

export interface QuizGradingRequest {
  submissionId: string;
  formId: string;
  studentAnswers: { [questionNumber: number]: string };
  answerKey: {
    formId: string;
    assignmentTitle: string;
    courseId: string;
    questions: Array<{
      questionNumber: number;
      questionText: string;
      questionType: string;
      points: number;
      correctAnswer: string;
      answerExplanation: string;
      gradingStrictness: "strict" | "standard" | "generous";
    }>;
    totalPoints: number;
  };
}

export interface GradingResponse {
  score: number;
  feedback: string;
  criteriaScores: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
}

export class GeminiService {
  constructor(private model: GenerativeModel) {}

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

  async gradeQuiz(request: QuizGradingRequest): Promise<{ totalScore: number; questionGrades: Array<{ questionNumber: number; score: number; feedback: string; maxScore: number }> }> {
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

  private buildQuestionGradingPrompt(question: { 
    questionText: string; 
    gradingStrictness?: string; 
    points: number; 
    correctAnswer?: string; 
    questionType?: string;
    answerExplanation?: string;
  }, studentAnswer: string): string {
    const isCodeQuestion = question.questionText.toLowerCase().includes("code") || 
                          question.questionText.toLowerCase().includes("program") ||
                          question.questionText.toLowerCase().includes("karel") ||
                          studentAnswer.includes("{") || studentAnswer.includes("}");

    let strictnessInstructions = "";
    if (question.gradingStrictness === "generous" || isCodeQuestion) {
      strictnessInstructions = `GENEROUS GRADING MODE:
- Focus on understanding and logic over syntax
- Minor typos, missing semicolons, bracket errors should not heavily penalize
- If student shows they understand the concept, give most/all points
- Only penalize for fundamental misunderstanding`;
    } else if (question.gradingStrictness === "strict") {
      strictnessInstructions = `STRICT GRADING MODE:
- Accuracy and precision are important
- Syntax and format matter
- Partial credit for partially correct answers`;
    } else {
      strictnessInstructions = `STANDARD GRADING MODE:
- Balance between accuracy and understanding
- Some flexibility for minor errors
- Reasonable partial credit`;
    }

    return `You are grading a quiz question. ${strictnessInstructions}

Question: ${question.questionText}
Correct Answer: ${question.correctAnswer}
${question.answerExplanation ? `Explanation: ${question.answerExplanation}` : ""}
Points Possible: ${question.points}

Student's Answer:
${studentAnswer}

Please grade this answer and provide feedback. Return JSON format:
{
  "score": number (0 to ${question.points}),
  "feedback": "specific feedback about their answer"
}`;
  }

  async testConnection(): Promise<boolean> {
    try {
      const prompt = "Say \"Hello, Roo!\" if you can read this.";
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

// Service instance will be created with API key in the function