import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from 'firebase-functions';

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
  return new GeminiService(genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }));
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
  constructor(private model: any) {}

  async gradeSubmission(request: GradingRequest): Promise<GradingResponse> {
    const rateLimitKey = `grading:${request.assignmentId}`;
    
    // Check rate limit
    if (!rateLimiter.canMakeRequest(rateLimitKey)) {
      const remaining = rateLimiter.getRemainingRequests(rateLimitKey);
      throw new Error(
        `Rate limit exceeded. Please wait before grading more submissions. ` +
        `Remaining requests: ${remaining}/${RATE_LIMIT.maxRequests} per minute.`
      );
    }

    try {
      // Build the prompt
      const criteriaList = request.criteria.join('\n- ');
      const basePrompt = request.promptTemplate || GRADING_PROMPTS.default;
      
      const prompt = basePrompt
        .replace('{criteria}', criteriaList)
        .replace('{title}', request.title)
        .replace('{description}', request.description)
        .replace('{maxPoints}', request.maxPoints.toString())
        .replace('{submission}', request.submission);

      logger.info('Grading submission with Gemini', {
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
        throw new Error('Invalid response format from AI');
      }

      const gradingResult = JSON.parse(jsonMatch[0]) as GradingResponse;

      // Validate response
      if (
        typeof gradingResult.score !== 'number' ||
        !gradingResult.feedback ||
        !Array.isArray(gradingResult.criteriaScores)
      ) {
        throw new Error('Invalid grading response structure');
      }

      // Ensure score is within bounds
      gradingResult.score = Math.max(0, Math.min(request.maxPoints, gradingResult.score));

      logger.info('Grading completed', {
        submissionId: request.submissionId,
        score: gradingResult.score,
      });

      return gradingResult;
    } catch (error) {
      logger.error('Gemini grading error', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const prompt = 'Say "Hello, Roo!" if you can read this.';
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info('Gemini test response', { response: text });
      return text.includes('Hello, Roo!');
    } catch (error) {
      logger.error('Gemini connection test failed', error);
      return false;
    }
  }
}

// Service instance will be created with API key in the function