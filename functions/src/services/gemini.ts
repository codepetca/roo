/**
 * Gemini AI Service - AI grading functionality (REFACTORED)
 * @module functions/src/services/gemini
 * @size 15 lines (was 402 lines - successfully split!)
 * @exports All AI grading functionality from modular structure
 * @dependencies ./ai/index (rate-limiter + prompts + types + grading-service)
 * @patterns Clean re-export, backward compatibility maintained
 * @refactoring Split into: ai/rate-limiter.ts + ai/prompts.ts + ai/types.ts + ai/grading-service.ts + ai/index.ts
 */

// Re-export everything from the new modular AI structure
export * from "./ai/index";