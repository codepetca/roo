/**
 * Store Gmail Access Token API Endpoint
 * Location: functions/src/routes/auth/store-gmail-token.ts
 * 
 * Stores the Google OAuth access token for Gmail sending
 * Called after successful Google sign-in to enable email features
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { z } from "zod";
import { getUserFromRequest, handleRouteError } from "../../middleware/validation";
import { db } from "../../config/firebase";
import * as admin from "firebase-admin";

const storeGmailTokenSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.number().optional() // Unix timestamp
});

/**
 * Store Gmail access token for authenticated teacher
 * POST /api/auth/store-gmail-token
 */
export async function storeGmailToken(req: Request, res: Response): Promise<Response> {
  try {
    logger.info("Storing Gmail access token", { method: req.method });
    
    // Validate request body
    const validatedInput = storeGmailTokenSchema.parse(req.body);
    
    // Get authenticated user
    const user = await getUserFromRequest(req);
    
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ 
        success: false, 
        error: "Only teachers can store Gmail tokens" 
      });
    }
    
    // Update user profile with Gmail access token
    const updateData: any = {
      gmailAccessToken: validatedInput.accessToken,
      gmailTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Store expiration if provided
    if (validatedInput.expiresAt) {
      updateData.gmailTokenExpiresAt = new Date(validatedInput.expiresAt * 1000);
    }
    
    // Update Firestore document
    await db.collection("users").doc(user.uid).update(updateData);
    
    logger.info("Gmail access token stored successfully", {
      userId: user.uid,
      email: user.email,
      hasExpiration: !!validatedInput.expiresAt
    });
    
    return res.status(200).json({
      success: true,
      data: {
        message: "Gmail access token stored successfully",
        emailSendingEnabled: true
      }
    });
    
  } catch (error) {
    return handleRouteError(error, req, res);
  }
}