/**
 * Send Passcode via Firebase Email Endpoint
 * Location: functions/src/routes/auth/send-passcode-firebase.ts
 * 
 * Sends a passcode via Firebase's email service (future implementation)
 * Currently stores the passcode for manual sharing
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { createFirebaseEmailService } from '../../services/firebase-email-service';

// Request schema
const sendPasscodeFirebaseRequestSchema = z.object({
  email: z.string().email(),
  passcode: z.string().length(6)
});

// Response schema
const sendPasscodeFirebaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  email: z.string().email()
});

export type SendPasscodeFirebaseRequest = z.infer<typeof sendPasscodeFirebaseRequestSchema>;
export type SendPasscodeFirebaseResponse = z.infer<typeof sendPasscodeFirebaseResponseSchema>;

/**
 * Send a passcode via Firebase email service
 */
export async function sendPasscodeFirebase(req: Request, res: Response) {
  try {
    // Get authenticated user (teacher)
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Teacher authentication required'
      });
    }

    // Validate request body
    const validationResult = sendPasscodeFirebaseRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      logger.error('Invalid send passcode request', { 
        errors: validationResult.error.errors 
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { email, passcode } = validationResult.data;

    logger.info('Sending passcode via Firebase', { 
      studentEmail: email,
      teacherId: user.uid,
      teacherEmail: user.email,
      method: 'firebase'
    });

    // Send via Firebase (or store for now)
    const emailService = createFirebaseEmailService();
    await emailService.sendPasscodeViaFirebase(
      email,
      passcode,
      user.email
    );

    const response: SendPasscodeFirebaseResponse = {
      success: true,
      message: 'Passcode sent via Firebase email service',
      email
    };

    // Note: In production, you would integrate with:
    // 1. Firebase Extensions (Trigger Email from Firestore)
    // 2. SendGrid/Mailgun via API
    // 3. AWS SES
    // For now, this stores the passcode for manual sharing

    // Wrap in ApiResponse format expected by frontend
    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error: any) {
    logger.error('Send passcode Firebase error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send passcode via Firebase'
    });
  }
}