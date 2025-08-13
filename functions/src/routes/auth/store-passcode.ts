/**
 * Store Passcode Endpoint
 * Location: functions/src/routes/auth/store-passcode.ts
 * 
 * Stores a generated passcode for student authentication
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { createFirebaseEmailService } from '../../services/firebase-email-service';

// Request schema
const storePasscodeRequestSchema = z.object({
  email: z.string().email(),
  passcode: z.string().length(6),
  expiresAt: z.string().datetime()
});

// Response schema
const storePasscodeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export type StorePasscodeRequest = z.infer<typeof storePasscodeRequestSchema>;
export type StorePasscodeResponse = z.infer<typeof storePasscodeResponseSchema>;

/**
 * Store a passcode for student authentication
 */
export async function storePasscode(req: Request, res: Response) {
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
    const validationResult = storePasscodeRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      logger.error('Invalid store passcode request', { 
        errors: validationResult.error.errors 
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { email, passcode, expiresAt } = validationResult.data;

    logger.info('Storing passcode for student', { 
      studentEmail: email,
      teacherId: user.uid,
      teacherEmail: user.email
    });

    // Store the passcode
    const emailService = createFirebaseEmailService();
    await emailService.storePasscode(
      email,
      passcode,
      new Date(expiresAt),
      user.uid
    );

    const response: StorePasscodeResponse = {
      success: true,
      message: 'Passcode stored successfully'
    };

    // Wrap in ApiResponse format expected by frontend
    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error: any) {
    logger.error('Store passcode error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to store passcode'
    });
  }
}