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
	assignmentResponseSchema,
	submissionResponseSchema,
	gradeResponseSchema,
	answerKeyResponseSchema,
	healthCheckResponseSchema,
	classroomResponseSchema,
	type CreateAssignmentRequest,
	type AssignmentResponse,
	type CreateSubmissionRequest,
	type SubmissionResponse,
	type GradeResponse,
	type GradeQuizRequest,
	type GradeCodeRequest,
	type GradingResultResponse,
	type QuizGradingResultResponse,
	type AnswerKeyResponse,
	type GetAnswerKeyRequest,
	type GetSheetsSubmissionsRequest,
	type UpdateSubmissionStatusRequest,
	type HealthCheckResponse,
	type ClassroomResponse
} from '../schemas';

/**
 * Type-safe API methods with runtime validation
 * All methods use Zod schemas for response validation
 */
export const api = {
	// Health check
	async getStatus(): Promise<HealthCheckResponse> {
		return typedApiRequest('/', {}, healthCheckResponseSchema);
	},

	// Assignments
	async listAssignments(): Promise<AssignmentResponse[]> {
		return typedApiRequest('/assignments', {}, z.array(assignmentResponseSchema));
	},

	async createAssignment(data: CreateAssignmentRequest): Promise<AssignmentResponse> {
		return typedApiRequest(
			'/assignments',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			assignmentResponseSchema
		);
	},

	async listAssignmentsByClassroom(classroomId: string): Promise<AssignmentResponse[]> {
		return typedApiRequest(
			`/assignments?classroomId=${classroomId}`,
			{},
			z.array(assignmentResponseSchema)
		);
	},

	// Classrooms
	async getTeacherClassrooms(): Promise<ClassroomResponse[]> {
		return typedApiRequest('/classrooms/teacher', {}, z.array(classroomResponseSchema));
	},

	async getClassroomAssignments(classroomId: string): Promise<AssignmentResponse[]> {
		return typedApiRequest(
			`/classrooms/${classroomId}/assignments`,
			{},
			z.array(assignmentResponseSchema)
		);
	},

	// Submissions
	async createSubmission(data: CreateSubmissionRequest): Promise<SubmissionResponse> {
		return typedApiRequest(
			'/submissions',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			submissionResponseSchema
		);
	},

	async getSubmissionsByAssignment(assignmentId: string): Promise<SubmissionResponse[]> {
		return typedApiRequest(
			`/submissions/assignment/${assignmentId}`,
			{},
			z.array(submissionResponseSchema)
		);
	},

	async getSubmission(submissionId: string): Promise<SubmissionResponse> {
		return typedApiRequest(`/submissions/${submissionId}`, {}, submissionResponseSchema);
	},

	async updateSubmissionStatus(
		submissionId: string,
		data: UpdateSubmissionStatusRequest
	): Promise<SubmissionResponse> {
		return typedApiRequest(
			`/submissions/${submissionId}/status`,
			{
				method: 'PATCH',
				body: JSON.stringify(data)
			},
			submissionResponseSchema
		);
	},

	// Grades
	async getGradesByAssignment(assignmentId: string): Promise<GradeResponse[]> {
		return typedApiRequest(`/grades/assignment/${assignmentId}`, {}, z.array(gradeResponseSchema));
	},

	async getGradeBySubmission(submissionId: string): Promise<GradeResponse> {
		return typedApiRequest(`/grades/submission/${submissionId}`, {}, gradeResponseSchema);
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

	async getUngradedSubmissions(): Promise<SubmissionResponse[]> {
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
