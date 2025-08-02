/**
 * Authentication Routes - Firebase Auth integration (REFACTORED)
 * @module functions/src/routes/auth
 * @size 15 lines (was 760 lines - successfully split!)
 * @exports All authentication functionality from modular structure
 * @dependencies ./auth/index (signup + session + passcode)
 * @patterns Clean re-export, backward compatibility maintained
 * @refactoring Split into: auth/signup.ts + auth/session.ts + auth/passcode.ts + auth/index.ts
 */

// Re-export everything from the new modular auth structure
export * from './auth/index';