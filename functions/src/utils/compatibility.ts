/**
 * Node.js compatibility utilities for Firebase Functions
 * Location: functions/src/utils/compatibility.ts:1
 */

/**
 * Ensure URLSearchParams is available in the global scope
 * This fixes the ERR_INVALID_THIS error that can occur with some googleapis versions
 */
export function ensureURLSearchParamsCompatibility(): void {
  if (typeof globalThis !== 'undefined' && !globalThis.URLSearchParams) {
    // Import Node.js URLSearchParams if not available globally
    const { URLSearchParams } = require('url');
    globalThis.URLSearchParams = URLSearchParams;
  }
  
  if (typeof global !== 'undefined' && !global.URLSearchParams) {
    const { URLSearchParams } = require('url');
    global.URLSearchParams = URLSearchParams;
  }
}

/**
 * Initialize all compatibility fixes
 */
export function initializeCompatibility(): void {
  ensureURLSearchParamsCompatibility();
}