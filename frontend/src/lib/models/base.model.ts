/**
 * Base Model Class for Domain Entities
 * Provides validation, population, and reactive state management
 * Location: frontend/src/lib/models/base.model.ts
 */

import { z } from 'zod';

/**
 * Abstract base class for all domain models
 * Enforces validation and provides common functionality
 */
export abstract class BaseModel<TSchema extends z.ZodType = z.ZodType> {
  // Base fields that all models have
  id = $state<string>('');
  createdAt = $state<Date>(new Date());
  updatedAt = $state<Date>(new Date());

  /**
   * The Zod schema for this model
   * Must be implemented by subclasses
   */
  protected abstract schema: TSchema;

  /**
   * Validate and create a model instance from raw data
   * @param data - Raw data from Firestore or API
   * @returns Validated model instance
   */
  static fromData<T extends BaseModel>(this: new () => T, data: unknown): T {
    const instance = new this();
    instance.populate(data);
    return instance;
  }

  /**
   * Populate this model with validated data
   * @param data - Raw data to validate and populate
   */
  populate(data: unknown): void {
    try {
      // Validate with Zod schema
      const validated = this.schema.parse(data);
      
      // Handle timestamp conversion
      const processed = this.processTimestamps(validated);
      
      // Assign validated data to reactive state
      Object.assign(this, processed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Model validation failed:', error.errors);
        throw new Error(`Invalid ${this.constructor.name} data: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Process timestamps from various formats to Date objects
   * Handles Firestore timestamps, ISO strings, and serialized formats
   */
  protected processTimestamps(data: any): any {
    const processed = { ...data };

    // Convert timestamp fields
    const timestampFields = ['createdAt', 'updatedAt', 'dueDate', 'submittedAt', 'gradedAt'];
    
    timestampFields.forEach(field => {
      if (field in processed) {
        processed[field] = this.convertToDate(processed[field]);
      }
    });

    return processed;
  }

  /**
   * Convert various timestamp formats to Date
   */
  protected convertToDate(value: any): Date {
    // Already a Date
    if (value instanceof Date) {
      return value;
    }

    // ISO string
    if (typeof value === 'string') {
      return new Date(value);
    }

    // Firestore Timestamp format { _seconds, _nanoseconds }
    if (value && typeof value === 'object' && '_seconds' in value) {
      return new Date(value._seconds * 1000);
    }

    // Firestore Admin SDK format { seconds, nanoseconds }
    if (value && typeof value === 'object' && 'seconds' in value) {
      return new Date(value.seconds * 1000);
    }

    // Firestore Timestamp with toDate method
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }

    // Fallback to current date
    console.warn('Unknown timestamp format:', value);
    return new Date();
  }

  /**
   * Update specific fields on this model
   * @param updates - Partial updates to apply
   */
  update(updates: Partial<z.infer<TSchema>>): void {
    // Validate partial updates
    const partialSchema = this.schema.partial();
    const validated = partialSchema.parse(updates);
    const processed = this.processTimestamps(validated);
    
    // Apply updates to reactive state
    Object.assign(this, processed);
    
    // Update timestamp
    this.updatedAt = new Date();
  }

  /**
   * Convert model to plain object for API/Firestore
   */
  toPlainObject(): z.infer<TSchema> {
    const data: any = {};
    
    // Get all enumerable properties
    Object.keys(this).forEach(key => {
      const value = (this as any)[key];
      
      // Skip functions and undefined
      if (typeof value !== 'function' && value !== undefined) {
        // Convert Dates to ISO strings for serialization
        if (value instanceof Date) {
          data[key] = value.toISOString();
        } else {
          data[key] = value;
        }
      }
    });

    return data;
  }

  /**
   * Clone this model
   */
  clone<T extends BaseModel>(this: T): T {
    const ModelClass = this.constructor as new () => T;
    const clone = new ModelClass();
    clone.populate(this.toPlainObject());
    return clone;
  }
}