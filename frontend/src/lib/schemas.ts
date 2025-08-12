import { z } from 'zod';

/**
 * Frontend DTO schemas that match the backend API DTOs
 * These schemas validate API responses on the client side
 */

// ============================================
// Serialized Timestamp for API communication
// ============================================
export const serializedTimestampSchema = z.object({
	_seconds: z.number(),
	_nanoseconds: z.number()
});

export type SerializedTimestamp = z.infer<typeof serializedTimestampSchema>;

// Utility function to convert to JavaScript Date
export function timestampToDate(timestamp: SerializedTimestamp): Date {
	return new Date(timestamp._seconds * 1000);
}

// Utility function to format timestamp for display
export function formatTimestamp(timestamp: SerializedTimestamp): string {
	return timestampToDate(timestamp).toLocaleString();
}

// ============================================
// Base DTO Schema
// ============================================
export const baseDtoSchema = z.object({
	id: z.string().min(1),
	createdAt: serializedTimestampSchema,
	updatedAt: serializedTimestampSchema
});

// ============================================
// Assignment DTOs
// ============================================

// Request DTO for creating assignments
export const createAssignmentRequestSchema = z.object({
	title: z.string().min(1, 'Title is required'),
	description: z.string().min(1, 'Description is required'),
	maxPoints: z.number().min(0).max(1000),
	dueDate: z.string().datetime().optional(),
	gradingRubric: z
		.object({
			enabled: z.boolean().default(true),
			criteria: z.array(z.string()).default(['Content', 'Grammar', 'Structure']),
			promptTemplate: z.string().optional()
		})
		.optional()
});

// Response DTO for assignments
export const assignmentResponseSchema = baseDtoSchema.extend({
	classroomId: z.string().optional(),
	title: z.string(),
	description: z.string(),
	dueDate: serializedTimestampSchema.optional(),
	maxPoints: z.number(),
	gradingRubric: z.object({
		enabled: z.boolean(),
		criteria: z.array(z.string()),
		promptTemplate: z.string().optional()
	}),
	isQuiz: z.boolean(),
	formId: z.string().optional(),
	sourceFileId: z.string().optional()
});

// ============================================
// Submission DTOs
// ============================================

// Request DTO for creating submissions
export const createSubmissionRequestSchema = z.object({
	assignmentId: z.string().min(1),
	studentId: z.string().min(1),
	studentName: z.string().min(1),
	studentEmail: z.string().email(),
	submissionText: z.string().min(1),
	submittedAt: z.string().datetime().optional(),
	status: z.enum(['pending', 'grading', 'graded', 'error']).default('pending')
});

// Request DTO for updating submission status
export const updateSubmissionStatusRequestSchema = z.object({
	status: z.enum(['pending', 'grading', 'graded', 'error']),
	gradeId: z.string().optional()
});

// Response DTO for submissions
export const submissionResponseSchema = baseDtoSchema.extend({
	assignmentId: z.string(),
	studentId: z.string(),
	studentEmail: z.string(),
	studentName: z.string(),
	submittedAt: serializedTimestampSchema,
	documentUrl: z.string().optional(),
	content: z.string().optional(),
	status: z.enum(['pending', 'grading', 'graded', 'error'])
});

// ============================================
// Grade DTOs
// ============================================

// Request DTO for creating grades
export const createGradeRequestSchema = z.object({
	submissionId: z.string().min(1),
	assignmentId: z.string().min(1),
	studentId: z.string().min(1),
	score: z.number().min(0),
	maxScore: z.number().min(0),
	feedback: z.string(),
	gradingDetails: z.object({
		criteria: z.array(
			z.object({
				name: z.string(),
				score: z.number().min(0),
				maxScore: z.number().min(0),
				feedback: z.string()
			})
		)
	})
});

// Response DTO for grades
export const gradeResponseSchema = baseDtoSchema.extend({
	submissionId: z.string(),
	assignmentId: z.string(),
	studentId: z.string(),
	score: z.number(),
	maxScore: z.number(),
	feedback: z.string(),
	gradingDetails: z.object({
		criteria: z.array(
			z.object({
				name: z.string(),
				score: z.number(),
				maxScore: z.number(),
				feedback: z.string()
			})
		)
	}),
	gradedBy: z.enum(['ai', 'manual']),
	gradedAt: serializedTimestampSchema,
	postedToClassroom: z.boolean()
});

// ============================================
// API Response Wrapper
// ============================================

// Generic API response wrapper
export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
	z.object({
		success: z.boolean(),
		data: dataSchema.optional(),
		error: z.string().optional(),
		message: z.string().optional()
	});

export type ApiResponse<T> = {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
};

// ============================================
// List Response DTOs
// ============================================

export const assignmentsListResponseSchema = apiResponseSchema(z.array(assignmentResponseSchema));

export const submissionsListResponseSchema = apiResponseSchema(z.array(submissionResponseSchema));

export const gradesListResponseSchema = apiResponseSchema(z.array(gradeResponseSchema));

// ============================================
// Grading Request/Response DTOs
// ============================================

export const gradeQuizRequestSchema = z.object({
	submissionId: z.string().min(1),
	formId: z.string().min(1),
	assignmentId: z.string().min(1),
	studentId: z.string().min(1),
	studentName: z.string().min(1),
	studentAnswers: z.record(z.string(), z.string())
});

export const gradeCodeRequestSchema = z.object({
	submissionId: z.string().min(1),
	submissionText: z.string().min(1),
	assignmentId: z.string().min(1),
	assignmentTitle: z.string().min(1),
	studentId: z.string().min(1),
	studentName: z.string().min(1),
	assignmentDescription: z.string().optional().default(''),
	maxPoints: z.number().min(1).default(100),
	isCodeAssignment: z.boolean().default(false),
	gradingStrictness: z.enum(['strict', 'standard', 'generous']).default('generous')
});

export const gradingResultResponseSchema = z.object({
	score: z.number(),
	feedback: z.string(),
	criteriaScores: z
		.array(
			z.object({
				name: z.string(),
				score: z.number(),
				maxScore: z.number(),
				feedback: z.string()
			})
		)
		.optional()
});

export const quizGradingResultResponseSchema = z.object({
	totalScore: z.number(),
	totalPossible: z.number(),
	questionGrades: z.array(
		z.object({
			questionNumber: z.number(),
			isCorrect: z.boolean(),
			studentAnswer: z.string(),
			correctAnswer: z.string(),
			points: z.number()
		})
	)
});

export const gradeQuizResponseSchema = apiResponseSchema(
	z.object({
		gradeId: z.string(),
		grading: quizGradingResultResponseSchema
	})
);

export const gradeCodeResponseSchema = apiResponseSchema(
	z.object({
		gradeId: z.string(),
		grading: gradingResultResponseSchema
	})
);

// ============================================
// Classroom DTOs
// ============================================

export const classroomResponseSchema = baseDtoSchema.extend({
	name: z.string(),
	courseCode: z.string(),
	teacherId: z.string(),
	studentIds: z.array(z.string()).default([]),
	isActive: z.boolean().default(true),
	// Additional metadata for dashboard
	assignmentCount: z.number().optional(),
	totalSubmissions: z.number().optional(),
	ungradedSubmissions: z.number().optional()
});

// ============================================
// Sheets Integration DTOs
// ============================================

export const getSheetsSubmissionsRequestSchema = z.object({
	assignmentId: z.string().min(1)
});

export const getAnswerKeyRequestSchema = z.object({
	formId: z.string().min(1)
});

export const answerKeyResponseSchema = z.object({
	formId: z.string(),
	totalPoints: z.number(),
	questions: z.array(
		z.object({
			questionNumber: z.number(),
			correctAnswer: z.string(),
			points: z.number()
		})
	)
});

// ============================================
// Health Check DTO
// ============================================

export const healthCheckResponseSchema = z.object({
	status: z.string(),
	version: z.string(),
	endpoints: z.array(z.string())
});

// ============================================
// Type exports for convenience
// ============================================

export type CreateAssignmentRequest = z.infer<typeof createAssignmentRequestSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type ClassroomResponse = z.infer<typeof classroomResponseSchema>;
export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequestSchema>;
export type UpdateSubmissionStatusRequest = z.infer<typeof updateSubmissionStatusRequestSchema>;
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
export type CreateGradeRequest = z.infer<typeof createGradeRequestSchema>;
export type GradeResponse = z.infer<typeof gradeResponseSchema>;
export type GradeQuizRequest = z.infer<typeof gradeQuizRequestSchema>;
export type GradeCodeRequest = z.infer<typeof gradeCodeRequestSchema>;
export type GradingResultResponse = z.infer<typeof gradingResultResponseSchema>;
export type QuizGradingResultResponse = z.infer<typeof quizGradingResultResponseSchema>;
export type GetSheetsSubmissionsRequest = z.infer<typeof getSheetsSubmissionsRequestSchema>;
export type GetAnswerKeyRequest = z.infer<typeof getAnswerKeyRequestSchema>;
export type AnswerKeyResponse = z.infer<typeof answerKeyResponseSchema>;
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;

// ============================================
// Response Validation Helper
// ============================================

/**
 * Validates API response data using the appropriate schema
 */
export function validateApiResponse<T>(schema: z.ZodType<T>, data: unknown): T {
	return schema.parse(data);
}

/**
 * Safely validates API response with error handling
 */
export function safeValidateApiResponse<T>(
	schema: z.ZodType<T>,
	data: unknown
): { success: true; data: T } | { success: false; error: string } {
	try {
		const validated = schema.parse(data);
		return { success: true, data: validated };
	} catch (error) {
		if (error instanceof z.ZodError) {
			// Enhanced error reporting with field paths and expected vs actual values
			const detailedErrors = error.issues
				.map((issue) => {
					const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
					return `Field "${path}": ${issue.message}`;
				})
				.join('; ');

			// Log the raw data and schema for debugging
			console.error('API Response Validation Failed:', {
				errors: error.issues,
				receivedData: data,
				schemaName: schema.constructor.name,
				detailedErrors
			});

			return {
				success: false,
				error: `Validation failed: ${detailedErrors}`
			};
		}
		return {
			success: false,
			error: `Unknown validation error: ${error instanceof Error ? error.message : 'Unknown'}`
		};
	}
}
