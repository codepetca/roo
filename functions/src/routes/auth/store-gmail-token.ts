/**
 * Store Gmail OAuth Token Route
 * Location: functions/src/routes/auth/store-gmail-token.ts
 */

import { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';

const storeTokenSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().optional()
});

export async function storeGmailToken(req: Request, res: Response) {
  try {
    // Require authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to store Gmail token'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authentication token'
      });
    }

    // Validate request body
    const validation = storeTokenSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.issues
      });
    }

    const { accessToken, expiresAt } = validation.data;

    // Store Gmail token in user profile
    const db = getFirestore();
    const userRef = db.collection('users').doc(decodedToken.uid);
    
    const updateData: any = {
      gmailAccessToken: accessToken,
      gmailTokenUpdatedAt: new Date(),
      updatedAt: new Date()
    };

    if (expiresAt) {
      updateData.gmailTokenExpiresAt = new Date(expiresAt);
    }

    await userRef.update(updateData);

    console.log(`Gmail token stored for user: ${decodedToken.email}`);

    return res.status(200).json({
      success: true,
      message: 'Gmail access token stored successfully',
      emailSendingEnabled: true
    });

  } catch (error) {
    console.error('Store Gmail token error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to store Gmail token'
    });
  }
}