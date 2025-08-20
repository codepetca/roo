/**
 * Rate Limiter - API rate limiting for AI services
 * @module functions/src/services/ai/rate-limiter
 * @size ~60 lines (extracted from 402-line gemini.ts)
 * @exports RateLimiter, RATE_LIMIT
 * @dependencies none (pure logic)
 * @patterns In-memory rate limiting, sliding window algorithm
 */

// Rate limiting configuration for Gemini 2.0 Flash-Lite
// Based on official Google documentation: https://ai.google.dev/gemini-api/docs/rate-limits
export const GEMINI_RATE_LIMITS = {
  // Free Tier
  FREE: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  // Tier 1 (billing enabled)
  TIER_1: {
    maxRequests: 3600, // 90% of 4,000 RPM for safety margin
    windowMs: 60 * 1000,
  },
  // Tier 2 ($250+ spend)
  TIER_2: {
    maxRequests: 9000, // 90% of 10,000 RPM for safety margin  
    windowMs: 60 * 1000,
  },
  // Tier 3 ($1,000+ spend)
  TIER_3: {
    maxRequests: 27000, // 90% of 30,000 RPM for safety margin
    windowMs: 60 * 1000,
  }
};

// Default rate limit (assumes Tier 1 - billing enabled)
export const RATE_LIMIT = GEMINI_RATE_LIMITS.TIER_1;

/**
 * Detect billing tier based on environment and configuration
 * In production, this could check actual Google Cloud billing API
 */
export function detectBillingTier(): keyof typeof GEMINI_RATE_LIMITS {
  // Check if we're in production with billing enabled
  const isProduction = process.env.NODE_ENV === 'production';
  const hasBilling = process.env.GOOGLE_CLOUD_PROJECT !== undefined;
  
  if (!isProduction || !hasBilling) {
    return 'FREE';
  }
  
  // In production, default to TIER_1 (billing enabled)
  // TODO: Could enhance this to check actual spending levels
  return 'TIER_1';
}

/**
 * Get appropriate rate limits based on billing tier
 */
export function getRateLimitsForTier() {
  const tier = detectBillingTier();
  return GEMINI_RATE_LIMITS[tier];
}

/**
 * In-memory rate limiter using sliding window algorithm
 * Note: Consider using Redis in production for distributed environments
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private currentLimits = getRateLimitsForTier();

  /**
   * Check if a request can be made for the given key
   * @param key - Unique identifier for rate limiting (e.g., "grading:assignmentId")
   */
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Refresh limits in case billing tier changed
    this.currentLimits = getRateLimitsForTier();
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.currentLimits.windowMs
    );
    
    if (validRequests.length >= this.currentLimits.maxRequests) {
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
    this.currentLimits = getRateLimitsForTier();
    
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.currentLimits.windowMs
    );
    return Math.max(0, this.currentLimits.maxRequests - validRequests.length);
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
    this.currentLimits = getRateLimitsForTier();
    
    const validRequests = userRequests.filter(
      timestamp => now - timestamp < this.currentLimits.windowMs
    );
    return validRequests.length;
  }

  /**
   * Get current rate limit configuration
   */
  getCurrentLimits() {
    return getRateLimitsForTier();
  }

  /**
   * Get current billing tier
   */
  getBillingTier() {
    return detectBillingTier();
  }
}

// Singleton instance for the application
export const rateLimiter = new RateLimiter();