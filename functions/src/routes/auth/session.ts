/**
 * Session Management - User authentication and session handling
 * @module functions/src/routes/auth/session
 * @size ~80 lines (extracted from 760-line auth.ts)
 * @exports getCurrentUser  
 * @dependencies firebase-admin/auth, firebase-admin/firestore
 * @patterns Token verification, user profile retrieval, error handling
 */

import { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

/**
 * Get current authenticated user information
 * GET /api/auth/current-user
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Unauthorized",
        message: "No valid authorization token provided"
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const auth = getAuth();
    
    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    const db = getFirestore();
    
    // Get user profile from Firestore
    const profileDoc = await db.collection("users").doc(decodedToken.uid).get();
    
    if (!profileDoc.exists) {
      res.status(404).json({
        error: "Profile not found",
        message: "User profile not found. Please complete signup."
      });
      return;
    }

    const profile = profileDoc.data();
    
    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: profile?.displayName || decodedToken.name,
      role: profile?.role || decodedToken.role || "student",
      emailVerified: decodedToken.email_verified,
      photoURL: profile?.photoURL || decodedToken.picture
    });

    logger.info("Current user retrieved successfully", {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: profile?.role
    });

  } catch (error: any) {
    logger.error("Get current user error", { error: error.message, stack: error.stack });
    
    if (error.code === "auth/id-token-expired") {
      res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please log in again."
      });
      return;
    }

    if (error.code === "auth/id-token-revoked") {
      res.status(401).json({
        error: "Token revoked",
        message: "Your session has been revoked. Please log in again."
      });
      return;
    }

    if (error.code === "auth/invalid-id-token") {
      res.status(401).json({
        error: "Invalid token",
        message: "Invalid authentication token provided."
      });
      return;
    }

    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token"
    });
  }
}