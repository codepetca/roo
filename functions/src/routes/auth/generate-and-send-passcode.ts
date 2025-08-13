/**
 * Generate and Send Passcode Endpoint (Simple Version)
 * Location: functions/src/routes/auth/generate-and-send-passcode.ts
 * 
 * Single endpoint that generates, stores, and sends passcode via Brevo
 * Replaces the complex multi-step process with one secure backend call
 */

import { Request, Response } from 'express';
import { logger } from 'firebase-functions';
import { z } from 'zod';
import { createBrevoEmailService } from '../../services/brevo-email-service';
import { getUserFromRequest } from '../../middleware/validation';

// Request schema
const generateAndSendPasscodeRequestSchema = z.object({
  email: z.string().email()
});

// Response schema
const generateAndSendPasscodeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  sentTo: z.string().email()
});

export type GenerateAndSendPasscodeRequest = z.infer<typeof generateAndSendPasscodeRequestSchema>;
export type GenerateAndSendPasscodeResponse = z.infer<typeof generateAndSendPasscodeResponseSchema>;

/**
 * Generate passcode and send via Brevo email service
 * This is the single, simple endpoint that does everything
 */
export async function generateAndSendPasscode(req: Request, res: Response) {
  try {
    // Get authenticated user (teacher) using the same pattern as other working endpoints
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Teacher authentication required'
      });
    }

    if (user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can send student passcodes'
      });
    }

    // Validate request body
    const validationResult = generateAndSendPasscodeRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      logger.error('Invalid generate and send passcode request', { 
        errors: validationResult.error.errors 
      });
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const { email: studentEmail } = validationResult.data;

    logger.info('Generating and sending passcode', { 
      studentEmail,
      teacherId: user.uid,
      teacherEmail: user.email,
      teacherName: user.displayName
    });

    // Get Brevo API key from environment/secrets
    const brevoApiKey = process.env.BREVO_API_KEY || req.app.locals.brevoApiKey;
    
    if (!brevoApiKey) {
      logger.error('Brevo API key not configured');
      return res.status(500).json({
        success: false,
        error: 'Email service not configured. Please contact support.'
      });
    }

    // Create Brevo service and generate/send passcode
    const brevoService = createBrevoEmailService(brevoApiKey);
    
    const result = await brevoService.generateAndSendPasscode(
      studentEmail,
      user.email,
      user.displayName || 'Your Teacher'
    );

    const response: GenerateAndSendPasscodeResponse = {
      success: true,
      message: `Login code sent to ${studentEmail}`,
      sentTo: studentEmail
    };

    // Wrap in ApiResponse format expected by frontend
    res.status(200).json({
      success: true,
      data: response
    });

  } catch (error: any) {
    logger.error('Generate and send passcode error:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to send login code. Please try again.';
    
    if (error.message?.includes('Brevo')) {
      errorMessage = 'Email service temporarily unavailable. Please try again in a few minutes.';
    } else if (error.message?.includes('Invalid email')) {
      errorMessage = 'Invalid email address. Please check and try again.';
    } else if (error.message?.includes('store')) {
      errorMessage = 'Failed to generate login code. Please try again.';
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}