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

// Import new core schemas - using TypeScript source files to avoid CommonJS issues
import {
	teacherSchema,
	teacherDashboardSchema,
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
	type SubmissionWithGrade,
	type TeacherDashboard
} from '@shared/schemas/core';

// Import snapshot schemas
import {
	classroomSnapshotSchema,
	type ClassroomSnapshot
} from '@shared/schemas/classroom-snapshot';


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
	},


	// Snapshot import endpoints
	async validateSnapshot(snapshot: ClassroomSnapshot): Promise<{
		isValid: boolean;
		stats: {
			classroomCount: number;
			totalStudents: number;
			totalAssignments: number;
			totalSubmissions: number;
			ungradedSubmissions: number;
		};
		metadata: any;
		preview: {
			classrooms: Array<{
				id: string;
				name: string;
				studentCount: number;
				assignmentCount: number;
				ungradedSubmissions: number;
			}>;
		};
	}> {
		return typedApiRequest(
			'/snapshots/validate',
			{
				method: 'POST',
				body: JSON.stringify(snapshot)
			},
			z.object({
				isValid: z.boolean(),
				stats: z.object({
					classroomCount: z.number(),
					totalStudents: z.number(),
					totalAssignments: z.number(),
					totalSubmissions: z.number(),
					ungradedSubmissions: z.number()
				}),
				metadata: z.any(),
				preview: z.object({
					classrooms: z.array(z.object({
						id: z.string(),
						name: z.string(),
						studentCount: z.number(),
						assignmentCount: z.number(),
						ungradedSubmissions: z.number()
					}))
				})
			})
		);
	},

	async importSnapshot(snapshot: ClassroomSnapshot): Promise<{
		snapshotId: string;
		stats: {
			classroomsCreated: number;
			classroomsUpdated: number;
			assignmentsCreated: number;
			assignmentsUpdated: number;
			submissionsCreated: number;
			submissionsVersioned: number;
			gradesPreserved: number;
			gradesCreated: number;
			enrollmentsCreated: number;
			enrollmentsUpdated: number;
			enrollmentsArchived: number;
		};
		processingTime: number;
		summary: string;
	}> {
		return typedApiRequest(
			'/snapshots/import',
			{
				method: 'POST',
				body: JSON.stringify(snapshot)
			},
			z.object({
				snapshotId: z.string(),
				stats: z.object({
					classroomsCreated: z.number(),
					classroomsUpdated: z.number(),
					assignmentsCreated: z.number(),
					assignmentsUpdated: z.number(),
					submissionsCreated: z.number(),
					submissionsVersioned: z.number(),
					gradesPreserved: z.number(),
					gradesCreated: z.number(),
					enrollmentsCreated: z.number(),
					enrollmentsUpdated: z.number(),
					enrollmentsArchived: z.number()
				}),
				processingTime: z.number(),
				summary: z.string()
			})
		);
	},

	async getImportHistory(): Promise<Array<{
		id: string;
		timestamp: Date;
		status: string;
		stats: {
			classroomsCreated: number;
			assignmentsCreated: number;
			submissionsCreated: number;
		};
	}>> {
		return typedApiRequest(
			'/snapshots/history',
			{},
			z.array(z.object({
				id: z.string(),
				timestamp: z.date(),
				status: z.string(),
				stats: z.object({
					classroomsCreated: z.number(),
					assignmentsCreated: z.number(),
					submissionsCreated: z.number()
				})
			}))
		);
	},

	async generateSnapshotDiff(snapshot: ClassroomSnapshot): Promise<{
		hasExistingData: boolean;
		isFirstImport: boolean;
		existing?: {
			classroomCount: number;
		};
		new: {
			classroomCount: number;
			totalAssignments: number;
			totalSubmissions: number;
		};
		changes?: {
			newClassrooms: number;
		};
	}> {
		return typedApiRequest(
			'/snapshots/diff',
			{
				method: 'POST',
				body: JSON.stringify(snapshot)
			},
			z.object({
				hasExistingData: z.boolean(),
				isFirstImport: z.boolean(),
				existing: z.object({
					classroomCount: z.number()
				}).optional(),
				new: z.object({
					classroomCount: z.number(),
					totalAssignments: z.number(),
					totalSubmissions: z.number()
				}),
				changes: z.object({
					newClassrooms: z.number()
				}).optional()
			})
		);
	},

	// Teacher dashboard endpoints  
	async getTeacherDashboard(): Promise<TeacherDashboard> {
		return typedApiRequest('/teacher/dashboard', {}, teacherDashboardSchema);
	},

	async getTeacherClassroomsBasic(): Promise<Classroom[]> {
		return typedApiRequest('/teacher/classrooms', {}, z.array(classroomSchema));
	},

	async getClassroomStats(classroomId: string): Promise<{
		classroom: Classroom;
		students: StudentEnrollment[];
		recentActivity: Array<Submission | Grade>;
		statistics: {
			studentCount: number;
			assignmentCount: number;
			activeSubmissions: number;
			ungradedSubmissions: number;
			averageGrade?: number;
			submissionRate: number;
		};
	}> {
		return typedApiRequest(
			`/classrooms/${classroomId}/stats`,
			{},
			z.object({
				classroom: classroomSchema,
				students: z.array(studentEnrollmentSchema),
				recentActivity: z.array(z.union([submissionSchema, gradeSchema])),
				statistics: z.object({
					studentCount: z.number(),
					assignmentCount: z.number(),
					activeSubmissions: z.number(),
					ungradedSubmissions: z.number(),
					averageGrade: z.number().optional(),
					submissionRate: z.number()
				})
			})
		);
	},

	async getClassroomAssignmentsWithStats(classroomId: string): Promise<AssignmentWithStats[]> {
		return typedApiRequest(
			`/classrooms/${classroomId}/assignments/stats`,
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
	}
};
