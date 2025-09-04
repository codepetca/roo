import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { db } from '../../config/firebase';
import { getAuth } from 'firebase-admin/auth';

/**
 * Student Passcode Verification Endpoint
 * Location: functions/src/routes/auth/verify-passcode.ts
 * 
 * Verifies a 5-character alphanumeric passcode for student authentication
 * Creates Firebase Auth user and profile if passcode is valid
 */

interface VerifyPasscodeRequest {
  email: string;
  passcode: string;
}

interface VerifyPasscodeResponse {
  success: boolean;
  data?: {
    email: string;
    valid: boolean;
    isNewUser: boolean;
    userProfile: {
      uid: string;
      email: string;
      role: string;
      displayName: string;
    };
    firebaseToken?: string;
    requiresClientAuth?: boolean;
  };
  error?: string;
  message?: string;
}

export async function verifyPasscode(req: Request, res: Response): Promise<void> {
  try {
    const { email, passcode }: VerifyPasscodeRequest = req.body;

    // Validate input
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation error: email is required'
      });
      return;
    }

    if (!passcode || typeof passcode !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Validation error: passcode is required'
      });
      return;
    }

    // Validate passcode format (5 alphanumeric characters)
    if (!/^[A-Z0-9]{5}$/.test(passcode)) {
      res.status(400).json({
        success: false,
        error: 'Validation error: passcode must be 5 alphanumeric characters'
      });
      return;
    }

    const studentEmail = email.trim().toLowerCase();
    
    logger.info('Processing passcode verification request', { 
      studentEmail,
      passcodeLength: passcode.length
    });

    // Find user with matching email
    const userSnapshot = await db.collection('users')
      .where('email', '==', studentEmail)
      .limit(1)
      .get();

    if (userSnapshot.empty) {
      res.status(400).json({
        success: false,
        error: 'Invalid passcode',
        message: 'No user found with this email'
      });
      return;
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    let passcodeValid = false;
    let isFromBrevoSystem = false;

    // First, try to verify against user document passcode (permanent student codes)
    if (userData.passcode?.value && userData.passcode.value === passcode) {
      passcodeValid = true;
      logger.info('Passcode verified against user document', { studentEmail });
    } else {
      // Fallback: Check the passcodes collection (email-based temporary codes)
      logger.info('Checking passcodes collection for temporary code', { studentEmail });
      
      const passcodeDoc = await db.collection('passcodes').doc(studentEmail).get();
      
      if (passcodeDoc.exists) {
        const passcodeData = passcodeDoc.data()!;
        const now = new Date();
        const expiresAt = passcodeData.expiresAt.toDate();

        // Check if passcode matches, hasn't expired, and hasn't been used
        if (passcodeData.passcode === passcode && 
            expiresAt > now && 
            !passcodeData.used) {
          
          passcodeValid = true;
          isFromBrevoSystem = true;
          
          // Mark the temporary passcode as used
          await passcodeDoc.ref.update({ used: true, usedAt: now });
          
          logger.info('Passcode verified against Brevo passcodes collection', { 
            studentEmail, 
            expiresAt: expiresAt.toISOString()
          });
        } else {
          logger.warn('Passcode validation failed in passcodes collection', { 
            studentEmail, 
            expired: expiresAt <= now,
            used: passcodeData.used,
            matches: passcodeData.passcode === passcode
          });
        }
      }
    }

    if (!passcodeValid) {
      // For user document passcodes, increment attempt counter
      if (userData.passcode?.value) {
        await userDoc.ref.update({
          'passcode.attempts': (userData.passcode.attempts || 0) + 1
        });
      }

      res.status(400).json({
        success: false,
        error: 'Invalid passcode',
        message: userData.passcode?.value ? 'The passcode is incorrect' : 'No passcode found for this user'
      });
      return;
    }

    // Passcode is correct - now create or get Firebase Auth user
    const adminAuth = getAuth();
    let firebaseUser;
    let isNewUser = false;

    try {
      // Try to get existing user
      firebaseUser = await adminAuth.getUserByEmail(studentEmail);
      logger.info('Found existing Firebase Auth user', { uid: firebaseUser.uid, email: studentEmail });
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        // Create new Firebase Auth user
        firebaseUser = await adminAuth.createUser({
          email: studentEmail,
          displayName: userData.name || 'Student'
        });
        isNewUser = true;
        logger.info('Created new Firebase Auth user', { uid: firebaseUser.uid, email: studentEmail });
      } else {
        throw error;
      }
    }

    // Update the user document with Firebase Auth UID
    const updateData: any = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || userData.name || 'Student',
      isActive: true,
      lastLogin: new Date(),
      updatedAt: new Date()
    };

    // For test student, preserve the passcode for repeated testing
    const isTestStudent = studentEmail === 'student@schoolemail.com';
    if (!isTestStudent) {
      // Clear the passcode after successful verification (normal behavior)
      updateData.passcode = null;
    }
    // For test student, keep passcode intact for repeated login testing

    await userDoc.ref.update(updateData);

    // Set custom claims for role-based access
    await adminAuth.setCustomUserClaims(firebaseUser.uid, { 
      role: userData.role || 'student'
    });

    // Generate Firebase custom token for authentication
    let firebaseToken: string | undefined;
    try {
      firebaseToken = await adminAuth.createCustomToken(firebaseUser.uid, {
        role: userData.role || 'student',
        email: studentEmail
      });
      logger.info('Created Firebase custom token for student', { 
        uid: firebaseUser.uid,
        email: studentEmail
      });
    } catch (tokenError) {
      logger.error('Failed to create custom token', tokenError);
      // Continue without token - client can fall back to other auth methods
    }

    // Create user profile response
    const userProfile = {
      uid: firebaseUser.uid,
      email: studentEmail,
      role: userData.role || 'student',
      displayName: firebaseUser.displayName || userData.name || 'Student'
    };

    logger.info('Passcode verification successful', { 
      studentEmail,
      uid: firebaseUser.uid,
      isNewUser,
      hasToken: !!firebaseToken
    });

    // Return success response with Firebase token
    const response: VerifyPasscodeResponse = {
      success: true,
      data: {
        email: studentEmail,
        valid: true,
        isNewUser,
        userProfile,
        firebaseToken, // Provide token for immediate authentication
        requiresClientAuth: !firebaseToken // Only require client auth if token generation failed
      }
    };

    res.status(200).json(response);

  } catch (error) {
    logger.error('Passcode verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Re-export for use in index.ts
export { verifyPasscode as default };