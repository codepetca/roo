/**
 * Shared Normalization Utilities
 * Location: functions/shared/utils/normalization.ts
 * 
 * Provides consistent data normalization across frontend and backend
 * Handles Firestore's undefined field limitation and schema-driven defaults
 */

import { z } from "zod";

/**
 * Normalize data using Zod schema to ensure all expected fields exist
 * This solves the Firestore undefined values problem by adding missing fields
 * @param rawData - Raw data from Firestore (may have missing fields)
 * @param schema - Zod schema defining expected structure
 * @param docId - Optional document ID to add to the data
 * @returns Normalized data with all schema fields present
 */
export function normalizeWithSchema<T>(rawData: any, schema: z.ZodSchema<T>, docId?: string): T {
  if (!rawData) {
    throw new Error("Cannot normalize null or undefined document data");
  }

  // Add document ID if provided
  const dataWithId = docId ? { ...rawData, id: docId } : rawData;
  
  // Get schema shape to understand expected fields
  const schemaShape = (schema as any)._def?.shape?.();
  const normalized: any = { ...dataWithId };
  
  // For each field in the schema, ensure it exists in the normalized data
  if (schemaShape) {
    for (const [fieldName, fieldSchema] of Object.entries(schemaShape)) {
      if (!(fieldName in normalized)) {
        // Field is missing from Firestore data - add appropriate default
        const fieldDef = (fieldSchema as any)._def;
        
        if (fieldDef.typeName === 'ZodOptional') {
          // Optional fields get undefined
          normalized[fieldName] = undefined;
        } else if (fieldDef.typeName === 'ZodDefault') {
          // Fields with defaults get their default value
          normalized[fieldName] = fieldDef.defaultValue();
        } else if (fieldDef.typeName === 'ZodArray') {
          // Array fields get empty array if not specified as optional
          normalized[fieldName] = [];
        } else if (fieldDef.typeName === 'ZodNumber') {
          // Number fields get 0 if not specified as optional
          normalized[fieldName] = 0;
        } else if (fieldDef.typeName === 'ZodBoolean') {
          // Boolean fields get false if not specified as optional
          normalized[fieldName] = false;
        } else if (fieldDef.typeName === 'ZodString') {
          // String fields get empty string if not specified as optional
          normalized[fieldName] = "";
        } else if (fieldDef.typeName === 'ZodNull') {
          // Null fields get null
          normalized[fieldName] = null;
        }
        // Note: We don't set defaults for required complex objects - let schema validation catch these
      }
    }
  }
  
  // Validate and transform the normalized data through the schema
  try {
    return schema.parse(normalized);
  } catch (error) {
    console.error("Schema normalization failed:", {
      error: error instanceof Error ? error.message : error,
      rawData,
      normalized,
      schemaName: schema.constructor.name
    });
    throw error;
  }
}

/**
 * Safely normalize data with error handling
 * @param rawData - Raw data to normalize
 * @param schema - Zod schema for validation
 * @param docId - Optional document ID
 * @param fallbackData - Optional fallback data if normalization fails
 * @returns Normalized data or fallback on error
 */
export function safeNormalizeWithSchema<T>(
  rawData: any, 
  schema: z.ZodSchema<T>, 
  docId?: string,
  fallbackData?: T
): T | null {
  try {
    return normalizeWithSchema(rawData, schema, docId);
  } catch (error) {
    console.warn("Safe normalization failed, using fallback:", {
      error: error instanceof Error ? error.message : error,
      rawData,
      docId,
      hasFallback: !!fallbackData
    });
    return fallbackData || null;
  }
}

/**
 * Check if a value appears to be a Firestore timestamp
 * @param value - Value to check
 * @returns True if value looks like a timestamp
 */
export function isFirestoreTimestamp(value: any): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  // Check for different timestamp formats
  return (
    // Admin SDK format
    ('seconds' in value && 'nanoseconds' in value) ||
    // Web SDK format  
    ('_seconds' in value && '_nanoseconds' in value) ||
    // Timestamp with methods
    (typeof value.toDate === 'function' && typeof value.seconds === 'number')
  );
}

/**
 * Convert Firestore timestamp to Date object
 * @param timestamp - Firestore timestamp in any format
 * @returns Date object or null if invalid
 */
export function timestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (isFirestoreTimestamp(timestamp)) {
    // Handle Admin SDK format
    if ('seconds' in timestamp && 'nanoseconds' in timestamp) {
      return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    }
    
    // Handle Web SDK format
    if ('_seconds' in timestamp && '_nanoseconds' in timestamp) {
      return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
    }
    
    // Handle Timestamp with toDate method
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
  }
  
  // Try parsing as string
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

/**
 * Normalize all timestamp fields in an object
 * @param obj - Object that may contain timestamps
 * @returns Object with timestamps converted to Date objects
 */
export function normalizeTimestamps<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeTimestamps(item)) as T;
  }
  
  const normalized: any = {};
  
  for (const [key, value] of Object.entries(obj as any)) {
    if (isFirestoreTimestamp(value)) {
      const date = timestampToDate(value);
      normalized[key] = date || value; // Keep original if conversion fails
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively normalize nested objects (but not arrays handled above)
      normalized[key] = normalizeTimestamps(value);
    } else {
      normalized[key] = value;
    }
  }
  
  return normalized as T;
}

/**
 * Remove undefined values from an object to prepare for Firestore
 * Firestore doesn't accept undefined values, so we need to clean them
 * @param obj - Object to clean
 * @returns Object without undefined values
 */
export function cleanUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      // Skip undefined values entirely
      continue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recursively clean nested objects (but not arrays, dates, or null)
      const cleanedNested = cleanUndefinedValues(value);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else if (Array.isArray(value)) {
      // Clean arrays (remove undefined elements)
      const cleanedArray = value
        .filter(item => item !== undefined)
        .map(item => 
          (item !== null && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date))
            ? cleanUndefinedValues(item)
            : item
        );
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      }
    } else {
      // Keep all other values (including null, which Firestore accepts)
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Remove empty string keys from an object recursively
 * This ensures compatibility with Firestore which rejects empty string field names
 * @param obj - Object to clean
 * @returns Object with empty string keys removed
 */
export function removeEmptyKeys<T>(obj: T): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
    return obj;
  }
  
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip empty string keys - these are invalid in Firestore
    if (key === '' || key == null) {
      console.warn(`Removing invalid Firestore field name: "${key}"`);
      continue;
    }
    
    // Recursively clean nested objects
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = removeEmptyKeys(value);
    } else if (Array.isArray(value)) {
      // Clean array elements that are objects
      result[key] = value.map(item => 
        (item && typeof item === 'object' && !Array.isArray(item) && !(item instanceof Date))
          ? removeEmptyKeys(item)
          : item
      );
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Type guard to check if an error is a Zod validation error
 * @param error - Error to check
 * @returns True if error is ZodError
 */
export function isZodError(error: any): error is z.ZodError {
  return error instanceof z.ZodError;
}

/**
 * Format Zod validation errors for logging
 * @param error - Zod validation error
 * @returns Formatted error message
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map(issue => `Field "${issue.path.join('.')}" ${issue.message}`)
    .join(', ');
}