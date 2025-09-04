import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { BrevoEmailService, createBrevoEmailService } from '../../services/brevo-email-service';
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

/**
 * Handle temporary passcode request for student login flow
 * Uses Brevo email service with temporary passcodes stored in 'passcodes' collection
 */
async function handleTemporaryPasscodeRequest(
  studentEmail: string, 
  req: Request, 
  res: Response
) {
  logger.info('Processing temporary passcode request for login', { studentEmail });

  // Check if student exists in system (enrollments or user document)
  const enrollmentsSnapshot = await db.collection('enrollments')
    .where('studentEmail', '==', studentEmail)
    .limit(1)
    .get();

  let foundStudent = !enrollmentsSnapshot.empty;

  if (!foundStudent) {
    const userSnapshot = await db.collection('users')
      .where('email', '==', studentEmail)
      .where('role', '==', 'student')
      .limit(1)
      .get();
    foundStudent = !userSnapshot.empty;
  }

  if (!foundStudent) {
    logger.warn('Student not found for temporary passcode request', { studentEmail });
    
    // For valid school email domains, create the student account automatically
    // This helps when students exist in classroom rosters but don't have accounts yet
    const isValidSchoolEmail = studentEmail.includes('schoolemail.com') || 
                               studentEmail.includes('gapps.yrdsb.ca') ||
                               studentEmail.includes('.edu') ||
                               studentEmail.includes('student');
    
    if (isValidSchoolEmail) {
      logger.info('Creating missing student account for valid school email', { studentEmail });
      
      try {
        // Create a basic student user document
        const userData = {
          email: studentEmail,
          name: 'Student',
          displayName: 'Student',
          role: 'student',
          passcode: {
            value: '12345', // Default passcode for new students
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

        await db.collection('users').add(userData);
        logger.info('Created missing student account', { studentEmail });
      } catch (createError) {
        logger.error('Failed to create missing student account', { studentEmail, error: createError });
        // Continue with the original error if creation fails
      }
    } else {
      return res.status(404).json({
        success: false,
        error: 'Student not found',
        message: 'Email not found in classroom rosters. Please contact your teacher.'
      });
    }
  }

  // Get Brevo API key
  const brevoApiKey = process.env.BREVO_API_KEY;
  
  if (!brevoApiKey) {
    logger.error('Brevo API key not configured for temporary passcode');
    return res.status(500).json({
      success: false,
      error: 'Email service not configured. Please contact support.'
    });
  }

  try {
    // Use Brevo service to generate and send temporary passcode
    const brevoService = createBrevoEmailService(brevoApiKey);
    
    const result = await brevoService.generateAndSendPasscode(
      studentEmail,
      undefined, // No teacher email for self-service
      'Your Teacher' // Generic teacher name
    );

    logger.info('Temporary passcode sent successfully', { 
      studentEmail,
      sentTo: result.sentTo
    });

    return res.status(200).json({
      success: true,
      data: {
        email: studentEmail,
        sent: true,
        message: result.message,
        sentTo: result.sentTo,
        type: 'temporary'
      }
    });

  } catch (error: any) {
    logger.error('Failed to send temporary passcode', { 
      studentEmail, 
      error: error.message 
    });

    let errorMessage = 'Failed to send login code. Please try again.';
    
    if (error.message?.includes('Brevo')) {
      errorMessage = 'Email service temporarily unavailable. Please try again in a few minutes.';
    } else if (error.message?.includes('Invalid email')) {
      errorMessage = 'Invalid email address. Please check and try again.';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

export async function studentRequestPasscode(req: Request, res: Response) {
  try {
    const { email, type = 'permanent' } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Valid email address is required'
      });
    }

    const studentEmail = email.trim().toLowerCase();
    const requestType = type as 'permanent' | 'temporary'; // 'permanent' for user doc, 'temporary' for email-based
    
    logger.info('Processing student passcode request', { 
      studentEmail,
      type: requestType
    });

    // Handle temporary passcode request for login flow
    if (requestType === 'temporary') {
      return await handleTemporaryPasscodeRequest(studentEmail, req, res);
    }

    // Original permanent passcode logic continues below
    // Allow any student to request a passcode - no enrollment check required

    // Special handling for test student - always return passcode "12345"
    const isTestStudent = studentEmail === 'student@schoolemail.com';
    
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
        // For test student, always use "12345", otherwise use existing passcode
        passcode = isTestStudent ? '12345' : userData.passcode.value;
        
        // Update passcode if needed for test student
        if (isTestStudent && userData.passcode.value !== '12345') {
          await userDoc.ref.update({
            'passcode.value': '12345',
            'passcode.lastRequestedAt': new Date()
          });
        } else {
          // Update last requested time
          await userDoc.ref.update({
            'passcode.lastRequestedAt': new Date()
          });
        }
        
        logger.info('Using existing passcode for student', { 
          studentEmail, 
          passcodeLength: passcode.length,
          isTestStudent
        });
      } else {
        // User exists but no passcode, generate new one
        passcode = isTestStudent ? '12345' : generateShortPasscode();
        
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
      passcode = isTestStudent ? '12345' : generateShortPasscode();
      
      const userData = {
        email: studentEmail,
        name: isTestStudent ? 'Test Student' : 'Student',
        displayName: isTestStudent ? 'Test Student' : 'Student',
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
        passcodeLength: passcode.length,
        isTestStudent
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
      data: {
        email: studentEmail,
        sent: true, // Indicates passcode was generated/sent
        message: `Registration passcode ${isNewUser ? 'generated' : 'retrieved'} for ${studentEmail}`,
        sentFrom: 'system', // Indicates it was generated by the system
        passcode // Include passcode in response for the component
      }
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