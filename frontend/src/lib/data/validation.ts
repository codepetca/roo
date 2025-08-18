/**
 * Data Validation Schemas - Zod schemas for runtime validation
 * Location: frontend/src/lib/data/validation.ts
 *
 * Provides runtime validation for all data types regardless of source
 */

import { z } from 'zod';

// Helper for date/timestamp handling - flexible parsing for various Firebase formats
const dateTimeSchema = z
	.union([
		// ISO datetime string
		z
			.string()
			.datetime()
			.transform((val) => new Date(val)),
		// Firebase Timestamp object (admin SDK)
		z
			.object({
				_seconds: z.number(),
				_nanoseconds: z.number()
			})
			.transform((val) => new Date(val._seconds * 1000 + val._nanoseconds / 1000000)),
		// Firebase Timestamp object (client SDK)
		z
			.object({
				seconds: z.number(),
				nanoseconds: z.number()
			})
			.transform((val) => new Date(val.seconds * 1000 + val.nanoseconds / 1000000)),
		// Raw timestamp number (milliseconds)
		z.number().transform((val) => new Date(val)),
		// Date object (already parsed)
		z.date(),
		// Empty object (API returning {}) - default to current date
		z.object({}).transform(() => new Date()),
		// null or undefined - default to current date
		z.null().transform(() => new Date()),
		z.undefined().transform(() => new Date()),
		// String that can be parsed as date
		z.string().transform((val) => {
			const date = new Date(val);
			if (isNaN(date.getTime())) {
				throw new Error(`Invalid date string: ${val}`);
			}
			return date;
		})
	])
	.transform((val) => (val instanceof Date ? val : val));

/**
 * User profile schema for validation
 */
export const userProfileSchema = z.object({
	uid: z.string().min(1),
	email: z.string().email(),
	displayName: z.string().min(1),
	role: z.enum(['teacher', 'student']),
	schoolEmail: z.string().email().optional().nullable(),
	classroomIds: z.array(z.string()).optional(),
	totalClassrooms: z.number().min(0).optional(),
	totalStudents: z.number().min(0).optional(),
	isActive: z.boolean().optional(),
	lastLogin: dateTimeSchema.optional(),
	createdAt: dateTimeSchema,
	updatedAt: dateTimeSchema,
	version: z.number().min(1),
	isLatest: z.boolean()
});

export type UserProfile = z.infer<typeof userProfileSchema>;

/**
 * Profile creation data schema
 */
export const createProfileDataSchema = z.object({
	uid: z.string().min(1),
	role: z.enum(['teacher', 'student']),
	schoolEmail: z.string().email().optional(),
	displayName: z.string().min(1).optional()
});

export type CreateProfileData = z.infer<typeof createProfileDataSchema>;

/**
 * Auth user schema (for authentication store)
 */
export const authUserSchema = z.object({
	uid: z.string().min(1),
	email: z.string().email().nullable(),
	displayName: z.string().nullable(),
	role: z.enum(['teacher', 'student']),
	schoolEmail: z.string().email().optional().nullable()
});

export type AuthUser = z.infer<typeof authUserSchema>;

/**
 * Standard API response schema
 */
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({
		success: z.boolean(),
		data: dataSchema,
		error: z.string().optional().nullable(),
		message: z.string().optional()
	});

/**
 * Type definition for API response
 */
export interface ApiResponse<T> {
	success: boolean;
	data: T;
	error?: string | null;
	message?: string;
}

/**
 * Firebase Functions Callable result schema
 */
export const callableResultSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({
		data: dataSchema
	});

/**
 * Classroom schema (for reference)
 */
export const classroomSchema = z.object({
	id: z.string(),
	name: z.string(),
	teacherId: z.string(),
	teacherEmail: z.string().email(),
	students: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				email: z.string().email()
			})
		)
		.optional(),
	assignmentCount: z.number().min(0).optional(),
	studentCount: z.number().min(0).optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

export type Classroom = z.infer<typeof classroomSchema>;

/**
 * Assignment schema (for reference)
 */
export const assignmentSchema = z.object({
	id: z.string(),
	title: z.string(),
	description: z.string().optional(),
	classroomId: z.string(),
	maxPoints: z.number().min(0),
	dueDate: z.date().optional(),
	submissionCount: z.number().min(0).optional(),
	gradedCount: z.number().min(0).optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
});

export type Assignment = z.infer<typeof assignmentSchema>;

/**
 * Grade schema (for reference)
 */
export const gradeSchema = z.object({
	id: z.string(),
	assignmentId: z.string(),
	studentId: z.string(),
	classroomId: z.string(),
	score: z.number().min(0),
	maxScore: z.number().min(0),
	percentage: z.number().min(0).max(100),
	feedback: z.string().optional(),
	gradedBy: z.enum(['ai', 'manual', 'auto']),
	gradedAt: z.date().optional(),
	version: z.number().min(1).optional(),
	isLatest: z.boolean().optional()
});

export type Grade = z.infer<typeof gradeSchema>;

/**
 * Safe validation function with detailed error reporting
 */
export function safeValidate<T>(
	schema: z.ZodSchema<T>,
	data: unknown
):
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: string;
			issues: z.ZodIssue[];
	  } {
	try {
		const result = schema.safeParse(data);

		if (result.success) {
			return {
				success: true,
				data: result.data
			};
		} else {
			const errorMessages = result.error.issues
				.map((issue) => `Field "${issue.path.join('.')}": ${issue.message}`)
				.join(', ');

			return {
				success: false,
				error: errorMessages,
				issues: result.error.issues
			};
		}
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown validation error',
			issues: []
		};
	}
}

/**
 * Validate user profile with detailed error reporting
 */
export function validateUserProfile(data: unknown): UserProfile {
	const result = safeValidate(userProfileSchema, data);

	if (!result.success) {
		console.error('❌ User profile validation failed:', result.error);
		console.error('Invalid data:', data);
		throw new Error(`User profile validation failed: ${result.error}`);
	}

	return result.data;
}

/**
 * Validate profile creation data
 */
export function validateCreateProfileData(data: unknown): CreateProfileData {
	const result = safeValidate(createProfileDataSchema, data);

	if (!result.success) {
		console.error('❌ Create profile data validation failed:', result.error);
		console.error('Invalid data:', data);
		throw new Error(`Create profile data validation failed: ${result.error}`);
	}

	return result.data;
}

/**
 * Validate API response structure
 */
export function validateApiResponse<T>(
	dataSchema: z.ZodSchema<T>,
	response: unknown
): {
	success: boolean;
	data: T;
	error?: string;
	message?: string;
} {
	const responseSchema = apiResponseSchema(dataSchema);
	const result = safeValidate(responseSchema, response);

	if (!result.success) {
		console.error('❌ API response validation failed:', result.error);
		console.error('Invalid response:', response);
		throw new Error(`API response validation failed: ${result.error}`);
	}

	const apiResponse = result.data;

	if (!apiResponse.success) {
		throw new Error(apiResponse.error || 'API request failed');
	}

	if (!apiResponse.data) {
		throw new Error('API response missing data field');
	}

	return {
		success: apiResponse.success,
		data: apiResponse.data,
		error: apiResponse.error,
		message: apiResponse.message
	};
}
