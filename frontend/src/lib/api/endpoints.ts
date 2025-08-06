/**
 * API Endpoints - All application API method definitions
 * @module frontend/src/lib/api/endpoints
 * @size ~500 lines (extracted from oversized api.ts)
 * @exports api object with 30+ endpoint methods
 * @dependencies ./client, ../schemas, zod
 * @patterns Type-safe endpoints, runtime validation, consistent error handling
 */

import { z } from 'zod';
import { typedApiRequest } from './client';
import {
	// Legacy schemas (keeping for backward compatibility)
	answerKeyResponseSchema,
	healthCheckResponseSchema,
	submissionResponseSchema,
	gradeResponseSchema,
	type GradeQuizRequest,
	type GradeCodeRequest,
	type GradingResultResponse,
	type QuizGradingResultResponse,
	type AnswerKeyResponse,
	type GetAnswerKeyRequest,
	type GetSheetsSubmissionsRequest,
	type UpdateSubmissionStatusRequest,
	type HealthCheckResponse,
	type SubmissionResponse,
	type GradeResponse
} from '../schemas';

// Import new core schemas
import {
	classroomSchema,
	assignmentSchema,
	submissionSchema,
	gradeSchema,
	studentEnrollmentSchema,
	type Classroom,
	type Assignment,
	type Submission,
	type Grade,
	type StudentEnrollment,
	type ClassroomWithAssignments,
	type AssignmentWithStats,
	type SubmissionWithGrade
} from '@shared/schemas/core';

/**
 * Type-safe API methods with runtime validation
 * All methods use Zod schemas for response validation
 */
export const api = {
	// Health check
	async getStatus(): Promise<HealthCheckResponse> {
		return typedApiRequest('/', {}, healthCheckResponseSchema);
	},

	// Assignments (using new core schemas)
	async listAssignments(): Promise<Assignment[]> {
		return typedApiRequest('/assignments', {}, z.array(assignmentSchema));
	},

	async createAssignment(data: Partial<Assignment>): Promise<Assignment> {
		return typedApiRequest(
			'/assignments',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			assignmentSchema
		);
	},

	async listAssignmentsByClassroom(classroomId: string): Promise<Assignment[]> {
		return typedApiRequest(
			`/assignments?classroomId=${classroomId}`,
			{},
			z.array(assignmentSchema)
		);
	},

	// Classrooms (using new core schemas)
	async getTeacherClassrooms(): Promise<ClassroomWithAssignments[]> {
		return typedApiRequest(
			'/classrooms/teacher',
			{},
			z.array(
				classroomSchema.extend({
					assignments: z.array(assignmentSchema)
				})
			)
		);
	},

	async getClassroomAssignments(classroomId: string): Promise<AssignmentWithStats[]> {
		return typedApiRequest(
			`/classrooms/${classroomId}/assignments`,
			{},
			z.array(
				assignmentSchema.extend({
					submissions: z.array(
						submissionSchema.extend({
							grade: gradeSchema.nullable()
						})
					),
					recentSubmissions: z.array(submissionSchema)
				})
			)
		);
	},

	async getClassroomDetails(classroomId: string): Promise<{
		classroom: Classroom;
		students: StudentEnrollment[];
		recentActivity: Array<Submission | Grade>;
		statistics: {
			studentCount: number;
			assignmentCount: number;
			activeSubmissions: number;
			ungradedSubmissions: number;
		};
	}> {
		return typedApiRequest(
			`/classrooms/${classroomId}/details`,
			{},
			z.object({
				classroom: classroomSchema,
				students: z.array(studentEnrollmentSchema),
				recentActivity: z.array(z.union([submissionSchema, gradeSchema])),
				statistics: z.object({
					studentCount: z.number(),
					assignmentCount: z.number(),
					activeSubmissions: z.number(),
					ungradedSubmissions: z.number()
				})
			})
		);
	},

	// Submissions (using new core schemas)
	async createSubmission(data: Partial<Submission>): Promise<Submission> {
		return typedApiRequest(
			'/submissions',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			submissionSchema
		);
	},

	async getSubmissionsByAssignment(assignmentId: string): Promise<SubmissionWithGrade[]> {
		return typedApiRequest(
			`/submissions/assignment/${assignmentId}`,
			{},
			z.array(
				submissionSchema.extend({
					grade: gradeSchema.nullable()
				})
			)
		);
	},

	async getSubmission(submissionId: string): Promise<SubmissionWithGrade> {
		return typedApiRequest(
			`/submissions/${submissionId}`,
			{},
			submissionSchema.extend({
				grade: gradeSchema.nullable()
			})
		);
	},

	async updateSubmissionStatus(
		submissionId: string,
		data: UpdateSubmissionStatusRequest
	): Promise<Submission> {
		return typedApiRequest(
			`/submissions/${submissionId}/status`,
			{
				method: 'PATCH',
				body: JSON.stringify(data)
			},
			submissionSchema
		);
	},

	// Grades (using new core schemas)
	async getGradesByAssignment(assignmentId: string): Promise<Grade[]> {
		return typedApiRequest(`/grades/assignment/${assignmentId}`, {}, z.array(gradeSchema));
	},

	async getGradeBySubmission(submissionId: string): Promise<Grade> {
		return typedApiRequest(`/grades/submission/${submissionId}`, {}, gradeSchema);
	},

	async getGradeHistory(submissionId: string): Promise<
		Array<{
			grade: Grade;
			version: number;
			timestamp: Date;
			reason: string;
		}>
	> {
		return typedApiRequest(
			`/grades/submission/${submissionId}/history`,
			{},
			z.array(
				z.object({
					grade: gradeSchema,
					version: z.number(),
					timestamp: z.date(),
					reason: z.string()
				})
			)
		);
	},

	async getUngradedSubmissions(): Promise<Submission[]> {
		return typedApiRequest('/submissions/ungraded', {}, z.array(submissionSchema));
	},

	// AI Grading
	async gradeQuiz(data: GradeQuizRequest): Promise<{
		gradeId: string;
		grading: QuizGradingResultResponse;
	}> {
		return typedApiRequest(
			'/grade-quiz',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				gradeId: z.string(),
				grading: z.object({
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
				})
			})
		);
	},

	async gradeCode(data: GradeCodeRequest): Promise<{
		gradeId: string;
		grading: GradingResultResponse;
	}> {
		return typedApiRequest(
			'/grade-code',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				gradeId: z.string(),
				grading: z.object({
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
				})
			})
		);
	},

	// Google Sheets Integration
	async getSheetsSubmissions(data: GetSheetsSubmissionsRequest): Promise<SubmissionResponse[]> {
		return typedApiRequest(
			'/sheets/submissions',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.array(submissionResponseSchema)
		);
	},

	async getAllSubmissions(): Promise<SubmissionResponse[]> {
		return typedApiRequest('/sheets/all-submissions', {}, z.array(submissionResponseSchema));
	},

	async getSheetsUngradedSubmissions(): Promise<SubmissionResponse[]> {
		return typedApiRequest('/sheets/ungraded', {}, z.array(submissionResponseSchema));
	},

	async getAnswerKey(data: GetAnswerKeyRequest): Promise<AnswerKeyResponse> {
		return typedApiRequest(
			'/sheets/answer-key',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			answerKeyResponseSchema
		);
	},

	// Student-specific endpoints (filtered by authentication)
	async getMyGrades(): Promise<GradeResponse[]> {
		return typedApiRequest('/student/my-grades', {}, z.array(gradeResponseSchema));
	},

	async getMySubmissions(): Promise<SubmissionResponse[]> {
		return typedApiRequest('/student/my-submissions', {}, z.array(submissionResponseSchema));
	},

	async getMyGradesByAssignment(assignmentId: string): Promise<GradeResponse[]> {
		return typedApiRequest(
			`/student/my-grades/assignment/${assignmentId}`,
			{},
			z.array(gradeResponseSchema)
		);
	},

	// Teacher onboarding
	async createTeacherSheet(data: { boardAccountEmail: string; teacherName: string }): Promise<{
		success: boolean;
		sheetId: string;
		message: string;
		appScriptCode: string;
	}> {
		return typedApiRequest(
			'/teacher/create-sheet',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				success: z.boolean(),
				sheetId: z.string(),
				message: z.string(),
				appScriptCode: z.string()
			})
		);
	},

	async createTeacherSheetOAuth(data: { teacherName: string; accessToken: string }): Promise<{
		success: boolean;
		sheetId: string;
		message: string;
		appScriptCode: string;
		boardAccountEmail: string;
	}> {
		return typedApiRequest(
			'/teacher/create-sheet-oauth',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				success: z.boolean(),
				sheetId: z.string(),
				message: z.string(),
				appScriptCode: z.string(),
				boardAccountEmail: z.string()
			})
		);
	},

	// Authentication endpoints
	async signup(data: {
		email: string;
		password: string;
		displayName: string;
		role: string;
	}): Promise<{
		uid: string;
		email: string;
		role: string;
		firebaseToken: string;
		isNewUser: boolean;
	}> {
		return typedApiRequest(
			'/auth/signup',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				uid: z.string(),
				email: z.string(),
				role: z.string(),
				firebaseToken: z.string(),
				isNewUser: z.boolean()
			})
		);
	},

	async sendPasscode(data: { email: string }): Promise<{
		email: string;
		sent: boolean;
		message: string;
	}> {
		return typedApiRequest(
			'/auth/send-passcode',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				email: z.string(),
				sent: z.boolean(),
				message: z.string()
			})
		);
	},

	async verifyPasscode(data: { email: string; passcode: string }): Promise<{
		email: string;
		valid: boolean;
		firebaseToken: string;
		isNewUser: boolean;
		userProfile: {
			uid: string;
			email: string;
			role: string;
			displayName: string;
		};
	}> {
		return typedApiRequest(
			'/auth/verify-passcode',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				email: z.string(),
				valid: z.boolean(),
				firebaseToken: z.string(),
				isNewUser: z.boolean(),
				userProfile: z.object({
					uid: z.string(),
					email: z.string(),
					role: z.string(),
					displayName: z.string()
				})
			})
		);
	}
};
