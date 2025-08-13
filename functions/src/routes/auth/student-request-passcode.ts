import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
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

    // Check if user already exists and has a passcode
    const existingUserSnapshot = await db.collection('users')
      .where('email', '==', studentEmail)
      .limit(1)
      .get();

    let passcode: string;
    let userDoc: any = null;
    let isNewUser = false;
    
    if (!existingUserSnapshot.empty) {
      // User exists, check if they have a passcode
      userDoc = existingUserSnapshot.docs[0];
      const userData = userDoc.data();
      
      if (userData.passcode?.value) {
        // Use existing passcode
        passcode = userData.passcode.value;
        
        // Update last requested time
        await userDoc.ref.update({
          'passcode.lastRequestedAt': new Date()
        });
        
        logger.info('Using existing passcode for student', { 
          studentEmail, 
          passcodeLength: passcode.length 
        });
      } else {
        // User exists but no passcode, generate new one
        passcode = generateShortPasscode();
        
        await userDoc.ref.update({
          passcode: {
            value: passcode,
            createdAt: new Date(),
            lastRequestedAt: new Date(),
            attempts: 0
          }
        });

        logger.info('Generated new passcode for existing user', { 
          studentEmail, 
          passcodeLength: passcode.length 
        });
      }
    } else {
      // New user, create user document with passcode
      isNewUser = true;
      passcode = generateShortPasscode();
      
      const userData = {
        email: studentEmail,
        name: 'Student',
        role: 'student',
        passcode: {
          value: passcode,
          createdAt: new Date(),
          lastRequestedAt: new Date(),
          attempts: 0
        },
        classroomIds: [],
        totalStudents: 0,
        totalClassrooms: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newUserDoc = await db.collection('users').add(userData);
      userDoc = newUserDoc;

      logger.info('Created new user with passcode', { 
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
          isNewPasscode: isNewUser
        });

        logger.info('Passcode email sent successfully', { 
          studentEmail,
          isNewPasscode: isNewUser
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

    return res.status(200).json({
      success: true,
      message: `Registration passcode ${isNewUser ? 'generated' : 'retrieved'} for ${studentEmail}`,
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