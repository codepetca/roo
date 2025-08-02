/**
 * Rate Limiter - API rate limiting for AI services
 * @module functions/src/services/ai/rate-limiter
 * @size ~60 lines (extracted from 402-line gemini.ts)
 * @exports RateLimiter, RATE_LIMIT
 * @dependencies none (pure logic)
 * @patterns In-memory rate limiting, sliding window algorithm
 */

// Rate limiting configuration
export const RATE_LIMIT = {
  maxRequests: 15,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * In-memory rate limiter using sliding window algorithm
 * Note: Consider using Redis in production for distributed environments
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if a request can be made for the given key
   * @param key - Unique identifier for rate limiting (e.g., "grading:assignmentId")
   */
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

  /**
   * Get the number of remaining requests for the given key
   * @param key - Unique identifier for rate limiting
   */
  getRemainingRequests(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < RATE_LIMIT.windowMs
    );
    return Math.max(0, RATE_LIMIT.maxRequests - validRequests.length);
  }

  /**
   * Clear all rate limiting data (useful for testing)
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Get current request count for a key (useful for monitoring)
   */
  getCurrentRequestCount(key: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < RATE_LIMIT.windowMs
    );
    return validRequests.length;
  }
}

// Singleton instance for the application
export const rateLimiter = new RateLimiter();