/**
 * AI Services - Main exports for AI grading functionality (REFACTORED)
 * @module functions/src/services/ai
 * @size ~30 lines (was 402 lines in gemini.ts - successful split!)
 * @exports createGeminiService, GeminiService, types, prompts, rateLimiter
 * @dependencies @google/generative-ai, ./grading-service, ./types, ./prompts, ./rate-limiter
 * @patterns Factory pattern, clean exports, backward compatibility
 * @refactoring Split into: rate-limiter.ts + prompts.ts + types.ts + grading-service.ts
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiService } from "./grading-service";

// Re-export everything for backward compatibility
export { GeminiService } from "./grading-service";
export { rateLimiter, RateLimiter, RATE_LIMIT } from "./rate-limiter";
export { GRADING_PROMPTS } from "./prompts";
export type { 
  GradingRequest, 
  GradingResponse, 
  QuizGradingRequest, 
  QuizGradingResponse 
} from "./types";

/**
 * Factory function to create a Gemini service instance
 * @param apiKey - Google AI API key
 */
export const createGeminiService = (apiKey: string): GeminiService => {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  return new GeminiService(model);
};