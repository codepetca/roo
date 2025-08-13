/**
 * Shared Authentication Response Schemas
 * @module shared/schemas/auth-responses
 * @description Shared Zod schemas for auth endpoint responses used by both backend and frontend
 */

import { z } from 'zod';

/**
 * Response schema for /auth/send-passcode endpoint
 */
export const sendPasscodeResponseSchema = z.object({
  email: z.string().email(),
  sent: z.boolean(),
  message: z.string(),
  sentFrom: z.string().optional(),
  passcode: z.string().optional(), // Only in development mode
});

export type SendPasscodeResponse = z.infer<typeof sendPasscodeResponseSchema>;

/**
 * Response schema for /auth/verify-passcode endpoint
 */
export const verifyPasscodeResponseSchema = z.object({
  email: z.string().email(),
  valid: z.boolean(),
  firebaseToken: z.string().optional(), // Optional when requiresClientAuth is true
  requiresClientAuth: z.boolean().optional(), // When true, client should handle auth without token
  isNewUser: z.boolean(),
  userProfile: z.object({
    uid: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    role: z.string(),
  }),
});

export type VerifyPasscodeResponse = z.infer<typeof verifyPasscodeResponseSchema>;

/**
 * Response schema for /auth/reset-student endpoint
 */
export const resetStudentAuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  studentEmail: z.string().email(),
  resetBy: z.string(),
  resetAt: z.string(),
});

export type ResetStudentAuthResponse = z.infer<typeof resetStudentAuthResponseSchema>;

/**
 * Response schema for /auth/store-gmail-token endpoint
 */
export const storeGmailTokenResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  emailSendingEnabled: z.boolean(),
});

export type StoreGmailTokenResponse = z.infer<typeof storeGmailTokenResponseSchema>;