/**
 * User Deletion - Remove test users for E2E testing
 * @module functions/src/routes/auth/delete
 * @exports deleteUser
 * @dependencies firebase-admin/auth, firebase-admin/firestore
 * @patterns User deletion, cleanup
 */

import { Request, Response } from "express";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

/**
 * Delete a user account (for testing purposes only)
 * DELETE /api/auth/user/:uid
 * 
 * IMPORTANT: This endpoint should be protected in production!
 * Only allow deletion of test accounts (e.g., emails ending with @test.roo.app)
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      res.status(400).json({
        error: "Bad request",
        message: "User ID is required"
      });
      return;
    }

    const auth = getAuth();
    const db = getFirestore();

    // Get user to check if it's a test account
    try {
      const userRecord = await auth.getUser(uid);
      
      // SAFETY CHECK: Only allow deletion of test accounts
      if (!userRecord.email?.includes('@test.roo.app') && !userRecord.email?.includes('.test.')) {
        logger.warn("Attempted to delete non-test user", { uid, email: userRecord.email });
        res.status(403).json({
          error: "Forbidden",
          message: "Only test accounts can be deleted via this endpoint"
        });
        return;
      }

      // Delete user profile from Firestore
      await db.collection("users").doc(uid).delete();
      logger.info("Deleted user profile from Firestore", { uid });

      // Delete user from Firebase Auth
      await auth.deleteUser(uid);
      logger.info("Deleted user from Firebase Auth", { uid, email: userRecord.email });

      // Also clean up any related data (classrooms, assignments, etc.)
      // For now, just log - expand as needed
      logger.info("TODO: Clean up related user data", { uid });

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
        uid
      });

    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        res.status(404).json({
          error: "User not found",
          message: "No user found with this ID"
        });
        return;
      }
      throw error;
    }

  } catch (error: any) {
    logger.error("Delete user error", { error: error.message, stack: error.stack });
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete user"
    });
  }
}