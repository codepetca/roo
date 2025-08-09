/**
 * Authentication Routes - Main exports (REFACTORED)
 * @module functions/src/routes/auth  
 * @size ~20 lines (was 760 lines - successful split!)
 * @exports All authentication handlers from modular structure
 * @dependencies ./signup, ./session, ./passcode
 * @patterns Clean re-export, backward compatibility maintained
 * @refactoring Split into: signup.ts + session.ts + passcode.ts
 */

// User registration and profile management
export {
  signup,
  createOrUpdateProfile
} from "./signup";

// Session and user information
export {
  getCurrentUser
} from "./session";

// Student passcode authentication
export {
  sendPasscode,
  verifyPasscode,
  resetStudentAuth
} from "./passcode";

// User deletion (for testing)
export {
  deleteUser
} from "./delete";