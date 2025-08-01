/**
 * Webhook endpoints for external service integration
 * Location: functions/src/routes/webhooks.ts
 */

import { Request, Response } from "express";
import { logger } from "firebase-functions";
import { createClassroomSyncService } from "../services/classroom-sync";

/**
 * Webhook for classroom sync from AppScript
 * Location: functions/src/routes/webhooks.ts:12
 * Route: POST /webhooks/classroom-sync
 */
export async function handleClassroomSyncWebhook(req: Request, res: Response): Promise<Response> {
  try {
    // Validate API key
    const apiKey = req.headers['x-api-key'] as string;
    if (!validateApiKey(apiKey)) {
      logger.warn("Webhook called with invalid API key", {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      
      return res.status(401).json({
        success: false,
        error: "Invalid API key"
      });
    }

    // Extract request data
    const { spreadsheetId, teacherId } = req.body;

    // Validate required parameters
    if (!spreadsheetId) {
      return res.status(400).json({
        success: false,
        error: "spreadsheetId is required"
      });
    }

    // Determine teacher ID - from request or derive from API key
    const actualTeacherId = teacherId || getTeacherIdFromApiKey(apiKey);
    if (!actualTeacherId) {
      return res.status(400).json({
        success: false,
        error: "Could not determine teacher ID"
      });
    }

    logger.info("Webhook classroom sync initiated", {
      teacherId: actualTeacherId,
      spreadsheetId,
      source: "appscript-webhook",
      timestamp: new Date().toISOString()
    });

    // Perform the sync using existing service
    const syncService = createClassroomSyncService();
    const result = await syncService.syncClassroomsFromSheets(actualTeacherId, spreadsheetId);

    // Log the results
    logger.info("Webhook classroom sync completed", {
      teacherId: actualTeacherId,
      spreadsheetId,
      success: result.success,
      classroomsCreated: result.classroomsCreated,
      classroomsUpdated: result.classroomsUpdated,
      studentsCreated: result.studentsCreated,
      studentsUpdated: result.studentsUpdated,
      errorCount: result.errors.length
    });

    // Return success response
    if (result.success) {
      return res.status(200).json({
        success: true,
        data: {
          classroomsCreated: result.classroomsCreated,
          classroomsUpdated: result.classroomsUpdated,
          studentsCreated: result.studentsCreated,
          studentsUpdated: result.studentsUpdated,
          totalErrors: result.errors.length
        },
        message: `Successfully synced ${result.classroomsCreated + result.classroomsUpdated} classrooms and ${result.studentsCreated + result.studentsUpdated} students`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Partial success with errors
      return res.status(207).json({ // 207 Multi-Status
        success: false,
        data: {
          classroomsCreated: result.classroomsCreated,
          classroomsUpdated: result.classroomsUpdated,
          studentsCreated: result.studentsCreated,
          studentsUpdated: result.studentsUpdated,
          errors: result.errors
        },
        error: "Sync completed with some errors. Check the errors array for details.",
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    logger.error("Webhook classroom sync failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      error: "Internal server error during classroom sync",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get webhook status and configuration
 * Location: functions/src/routes/webhooks.ts:115
 * Route: GET /webhooks/status
 */
export async function getWebhookStatus(req: Request, res: Response): Promise<Response> {
  try {
    // Validate API key for status endpoint too
    const apiKey = req.headers['x-api-key'] as string;
    if (!validateApiKey(apiKey)) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        webhookVersion: "1.0.0",
        availableEndpoints: [
          "POST /webhooks/classroom-sync - Sync classrooms from Google Sheets",
          "GET /webhooks/status - Get webhook status"
        ],
        authentication: "API Key required in X-API-Key header",
        lastUpdated: "2025-07-31"
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error("Webhook status check failed", error);
    return res.status(500).json({
      success: false,
      error: "Failed to get webhook status"
    });
  }
}

/**
 * Validate API key
 * Location: functions/src/routes/webhooks.ts:155
 */
function validateApiKey(apiKey: string): boolean {
  if (!apiKey) {
    return false;
  }

  // Get valid API keys from environment or config
  const validApiKeys = getValidApiKeys();
  
  return validApiKeys.includes(apiKey);
}

/**
 * Get valid API keys from environment/config
 * Location: functions/src/routes/webhooks.ts:169
 */
function getValidApiKeys(): string[] {
  // For now, use environment variable
  // In production, this could be from Firestore, Secret Manager, etc.
  const envApiKeys = process.env.WEBHOOK_API_KEYS;
  
  if (envApiKeys) {
    return envApiKeys.split(',').map(key => key.trim());
  }

  // Fallback - use stable development keys
  // In production, this should be set via environment variables
  const defaultKeys = [
    "roo-webhook-dev-stable123456",     // Individual teacher testing
    "roo-board-integration-stable456"  // Board web app integration
  ];
  
  logger.warn("Using hardcoded API keys for development", { 
    keyCount: defaultKeys.length,
    note: "Set WEBHOOK_API_KEYS environment variable for production"
  });
  
  return defaultKeys;
}

/**
 * Map API key to teacher ID
 * Location: functions/src/routes/webhooks.ts:193
 */
function getTeacherIdFromApiKey(apiKey: string): string | null {
  // For now, we'll need to determine teacher ID from the API call context
  // In a more sophisticated setup, we could:
  // 1. Store API key -> teacher ID mapping in Firestore
  // 2. Encode teacher ID in the API key itself
  // 3. Look up based on the Google service account used
  
  // For initial implementation, return null and require teacherId in request
  return null;
}

/**
 * Rate limiting check (placeholder for future implementation)
 * Location: functions/src/routes/webhooks.ts:207
 */
function checkRateLimit(apiKey: string, ip: string): boolean {
  // TODO: Implement rate limiting
  // Could use Redis, Firestore, or in-memory cache
  // For now, allow all requests
  return true;
}

/**
 * Log webhook usage for monitoring
 * Location: functions/src/routes/webhooks.ts:217
 */
function logWebhookUsage(apiKey: string, endpoint: string, success: boolean, duration: number): void {
  logger.info("Webhook usage", {
    apiKeyHash: hashApiKey(apiKey), // Don't log full API key
    endpoint,
    success,
    duration,
    timestamp: new Date().toISOString()
  });
}

/**
 * Hash API key for logging (don't log full key)
 * Location: functions/src/routes/webhooks.ts:230
 */
function hashApiKey(apiKey: string): string {
  // Simple hash for logging - don't expose full API key in logs
  return apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
}