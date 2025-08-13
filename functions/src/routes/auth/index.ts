/**
 * Authentication Routes - Main exports (REFACTORED)
 * @module functions/src/routes/auth  
 * @size ~20 lines (was 760 lines - successful split!)
 * @exports All authentication handlers from modular structure
 * @dependencies ./signup, ./session, ./passcode
 * @patterns Clean re-export, backward compatibility maintained
 * @refactoring Split into: signup.ts + session.ts + passcode.ts
 */

// NOTE: User registration now handled by Firebase Auth SDK + createProfileForExistingUser callable function
// signup.ts deleted - functionality replaced with unified callable function

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

// Teacher profile setup (for testing and onboarding)
export {
  setupTeacherProfile
} from "./setup-teacher-profile";

// Gmail token storage (for email sending) - DEPRECATED
export {
  storeGmailToken
} from "./store-gmail-token";

// New Firebase-based passcode endpoints
export {
  storePasscode
} from "./store-passcode";

export {
  sendPasscodeFirebase
} from "./send-passcode-firebase";

// New simple Brevo-based passcode endpoint
export {
  generateAndSendPasscode
} from "./generate-and-send-passcode";