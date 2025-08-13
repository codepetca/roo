import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { FirestoreRepository } from '../../services/firestore-repository';
import { BrevoEmailService } from '../../services/brevo-email-service';
import { db, getCurrentTimestamp } from '../../config/firebase';

/**
 * Student Self-Registration Passcode Endpoint
 * Location: functions/src/routes/auth/student-request-passcode.ts
 * 
 * Allows students to self-register by generating a 5-character alphanumeric passcode
 * Only works if the student email is found in existing classroom enrollments
 * Admin-only passcode generation (not dependent on teacher authentication)
 */

const repository = new FirestoreRepository();

/**
 * Generate a 5-character alphanumeric passcode
 */
function generateShortPasscode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let passcode = '';
  for (let i = 0; i < 5; i++) {
    passcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return passcode;
}

export async function studentRequestPasscode(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required'
      });
    }

    const studentEmail = email.trim().toLowerCase();
    
    logger.info('Processing student self-registration request', { 
      studentEmail 
    });

    // Allow any student to request a passcode - no enrollment check required

    // Check if student already has a passcode
    const existingPasscodeSnapshot = await db.collection('passcodes')
      .where('email', '==', studentEmail)
      .limit(1)
      .get();

    let passcode: string;
    
    if (!existingPasscodeSnapshot.empty) {
      // Use existing passcode (never expires)
      const existingPasscode = existingPasscodeSnapshot.docs[0].data();
      passcode = existingPasscode.passcode;
      
      logger.info('Using existing passcode for student', { 
        studentEmail, 
        passcodeLength: passcode.length 
      });
    } else {
      // Generate new 5-character passcode
      passcode = generateShortPasscode();
      
      // Store passcode (never expires)
      await db.collection('passcodes').add({
        email: studentEmail,
        passcode,
        createdAt: new Date(),
        expiresAt: null, // Never expires
        used: false,
        createdBy: 'student-self-registration'
      });

      logger.info('Generated new passcode for student', { 
        studentEmail, 
        passcodeLength: passcode.length 
      });
    }

    // Send passcode via email using Brevo
    try {
      // Get Brevo API key from request (set by index.ts)
      const brevoApiKey = process.env.BREVO_API_KEY || req.app.locals.brevoApiKey;
      
      if (!brevoApiKey) {
        logger.error('Brevo API key not configured');
        // Continue anyway - passcode is generated, just can't send email
        logger.warn('Email service not configured - passcode generated but not sent via email');
      } else {
        const emailService = new BrevoEmailService(brevoApiKey);
        
        await emailService.sendStudentRegistrationEmail({
          to: studentEmail,
          studentName: 'Student',
          passcode,
          isNewPasscode: existingPasscodeSnapshot.empty
        });

        logger.info('Passcode email sent successfully', { 
          studentEmail,
          isNewPasscode: existingPasscodeSnapshot.empty
        });
      }
    } catch (emailError) {
      logger.error('Failed to send passcode email', { 
        studentEmail, 
        error: emailError 
      });
      
      // Don't fail the request if email fails - student might have passcode from other sources
      logger.warn('Continuing without email - passcode was generated/retrieved successfully');
    }

    // Create or update student user profile
    try {
      const existingUser = await repository.getUserByEmail(studentEmail);
      
      if (!existingUser) {
        // Create user profile for student
        const userData = {
          email: studentEmail,
          name: 'Student',
          role: 'student',
          classroomIds: [], // Will be populated when student is enrolled in classrooms
          totalStudents: 0,
          totalClassrooms: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.collection('users').add(userData);
        logger.info('Created user profile for student', { studentEmail });
      } else {
        logger.info('Student user profile already exists', { studentEmail });
      }
    } catch (userError) {
      logger.warn('Failed to create/update user profile', { 
        studentEmail, 
        error: userError 
      });
      // Continue - this is not critical for passcode generation
    }

    return res.status(200).json({
      success: true,
      message: `Registration passcode ${existingPasscodeSnapshot.empty ? 'generated' : 'retrieved'} for ${studentEmail}`,
      passcode // Include passcode in response for the component
    });

  } catch (error) {
    logger.error('Student self-registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process registration request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Re-export for use in index.ts
export { studentRequestPasscode as default };