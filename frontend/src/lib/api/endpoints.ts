/**
 * API Endpoints - All application API method definitions
 * @module frontend/src/lib/api/endpoints
 * @size ~500 lines (extracted from oversized api.ts)
 * @exports api object with 30+ endpoint methods
 * @dependencies ./client, ../schemas, zod
 * @patterns Type-safe endpoints, runtime validation, consistent error handling
 */

import { z } from 'zod';
import { typedApiRequest, callFunction, apiRequest } from './client';
import {
	// Legacy schemas (keeping for backward compatibility)
	answerKeyResponseSchema,
	healthCheckResponseSchema,
	submissionResponseSchema,
	gradeResponseSchema,
	// New wrapper schemas for API responses (unused schemas removed for cleaner imports)
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

// Import shared auth response schemas
import {
	sendPasscodeResponseSchema,
	verifyPasscodeResponseSchema,
	resetStudentAuthResponseSchema,
	storeGmailTokenResponseSchema,
	type SendPasscodeResponse,
	type VerifyPasscodeResponse,
	type ResetStudentAuthResponse,
	type StoreGmailTokenResponse
} from '@shared/schemas/auth-responses';

// Import new core schemas - using TypeScript source files to avoid CommonJS issues
import {
	teacherDashboardSchema,
	studentDashboardSchema,
	classroomSchema,
	assignmentSchema,
	assignmentBaseSchema, // For .extend() operations
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
	type TeacherDashboard,
	type StudentDashboard
} from '@shared/schemas/core';

// Import snapshot schemas
import { type ClassroomSnapshot } from '@shared/schemas/classroom-snapshot';

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
				assignmentBaseSchema.extend({
					submissions: z.array(
						submissionSchema.extend({
							grade: gradeSchema.optional()
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

	async getSubmissionsByAssignment(assignmentId: string): Promise<{
		submissions: SubmissionWithGrade[];
		enrollments: StudentEnrollment[];
		classroomId: string;
		stats: {
			totalSubmissions: number;
			totalEnrolled: number;
			submissionRate: number;
		};
	}> {
		return typedApiRequest(
			`/submissions/assignment/${assignmentId}`,
			{},
			z.object({
				submissions: z.array(
					submissionSchema.extend({
						grade: gradeSchema.optional()
					})
				),
				enrollments: z.array(studentEnrollmentSchema),
				classroomId: z.string(),
				stats: z.object({
					totalSubmissions: z.number(),
					totalEnrolled: z.number(),
					submissionRate: z.number()
				})
			})
		);
	},

	async getSubmission(submissionId: string): Promise<SubmissionWithGrade> {
		return typedApiRequest(
			`/submissions/${submissionId}`,
			{},
			submissionSchema.extend({
				grade: gradeSchema.optional()
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

	async gradeAssignment(data: GradeCodeRequest): Promise<{
		gradeId: string;
		grading: GradingResultResponse;
	}> {
		return typedApiRequest(
			'/grade-assignment',
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

	// Backward compatibility - deprecated, use gradeAssignment instead
	async gradeCode(data: GradeCodeRequest): Promise<{
		gradeId: string;
		grading: GradingResultResponse;
	}> {
		console.warn('gradeCode is deprecated, use gradeAssignment instead');
		return this.gradeAssignment(data);
	},

	// Grade All Assignments
	async gradeAllAssignments(data: { assignmentId: string }): Promise<{
		totalSubmissions: number;
		gradedCount: number;
		failedCount: number;
		skippedCount: number;
		results: Array<{
			submissionId: string;
			gradeId: string;
			score: number;
			maxScore: number;
			feedback: string;
		}>;
		failures?: Array<{
			submissionId: string;
			error: string;
		}>;
	}> {
		return typedApiRequest(
			'/grade-all-assignments',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				totalSubmissions: z.number(),
				gradedCount: z.number(),
				failedCount: z.number(),
				skippedCount: z.number(),
				results: z.array(
					z.object({
						submissionId: z.string(),
						gradeId: z.string(),
						score: z.number(),
						maxScore: z.number(),
						feedback: z.string()
					})
				),
				failures: z
					.array(
						z.object({
							submissionId: z.string(),
							error: z.string()
						})
					)
					.optional()
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
		// boardAccountEmail is legacy field name for backward compatibility
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
	// NOTE: User signup now handled by Firebase Auth SDK + createProfileForExistingUser callable function

	async createProfile(data: {
		uid: string;
		role: 'teacher' | 'student';
		schoolEmail?: string;
		displayName?: string;
	}): Promise<{
		success: boolean;
		message: string;
		profile: any;
	}> {
		const result = await callFunction('createProfileForExistingUser', data);
		return result.data;
	},

	async updateSchoolEmail(schoolEmail: string): Promise<{
		success: boolean;
		schoolEmail: string;
	}> {
		return typedApiRequest(
			'/users/profile/school-email',
			{
				method: 'PATCH',
				body: JSON.stringify({ schoolEmail })
			},
			z.object({
				success: z.boolean(),
				schoolEmail: z.string()
			})
		);
	},

	async sendPasscode(data: { email: string }): Promise<SendPasscodeResponse> {
		return typedApiRequest(
			'/auth/send-passcode',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			sendPasscodeResponseSchema
		);
	},

	async verifyPasscode(data: { email: string; passcode: string }): Promise<VerifyPasscodeResponse> {
		return typedApiRequest(
			'/auth/verify-passcode',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			verifyPasscodeResponseSchema
		);
	},

	async storeGmailToken(data: {
		accessToken: string;
		expiresAt?: number;
	}): Promise<StoreGmailTokenResponse> {
		return typedApiRequest(
			'/auth/store-gmail-token',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			storeGmailTokenResponseSchema
		);
	},

	async storePasscode(data: {
		email: string;
		passcode: string;
		expiresAt: string;
	}): Promise<{ success: boolean; message: string }> {
		return typedApiRequest(
			'/auth/store-passcode',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				success: z.boolean(),
				message: z.string()
			})
		);
	},

	async sendPasscodeFirebase(data: {
		email: string;
		passcode: string;
	}): Promise<{ success: boolean; message: string; email: string }> {
		return typedApiRequest(
			'/auth/send-passcode-firebase',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				success: z.boolean(),
				message: z.string(),
				email: z.string().email()
			})
		);
	},

	// New simple Brevo-based endpoint
	async generateAndSendPasscode(data: {
		email: string;
	}): Promise<{ success: boolean; message: string; sentTo: string }> {
		return typedApiRequest(
			'/auth/generate-and-send-passcode',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			z.object({
				success: z.boolean(),
				message: z.string(),
				sentTo: z.string().email()
			})
		);
	},

	// Student self-registration endpoint
	async studentRequestPasscode(data: { email: string }): Promise<SendPasscodeResponse> {
		return typedApiRequest(
			'/auth/student-request-passcode',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			sendPasscodeResponseSchema
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
					classrooms: z.array(
						z.object({
							id: z.string(),
							name: z.string(),
							studentCount: z.number(),
							assignmentCount: z.number(),
							ungradedSubmissions: z.number()
						})
					)
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

	async getImportHistory(): Promise<
		Array<{
			id: string;
			timestamp: Date;
			status: string;
			stats: {
				classroomsCreated: number;
				assignmentsCreated: number;
				submissionsCreated: number;
			};
		}>
	> {
		return typedApiRequest(
			'/snapshots/history',
			{},
			z.array(
				z.object({
					id: z.string(),
					timestamp: z.date(),
					status: z.string(),
					stats: z.object({
						classroomsCreated: z.number(),
						assignmentsCreated: z.number(),
						submissionsCreated: z.number()
					})
				})
			)
		);
	},

	async generateSnapshotDiff(snapshot: ClassroomSnapshot): Promise<{
		hasExistingData?: boolean;
		isFirstImport?: boolean;
		existing?: {
			classroomCount: number;
		};
		new?: {
			classroomCount: number;
			assignmentCount: number;
			submissionCount: number;
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
				hasExistingData: z.boolean().optional(),
				isFirstImport: z.boolean().optional(),
				existing: z
					.object({
						classroomCount: z.number()
					})
					.optional(),
				new: z
					.object({
						classroomCount: z.number(),
						assignmentCount: z.number(),
						submissionCount: z.number()
					})
					.optional(),
				changes: z
					.object({
						newClassrooms: z.number()
					})
					.optional()
			})
		);
	},

	// Teacher dashboard endpoints
	async getTeacherDashboard(): Promise<TeacherDashboard> {
		try {
			const result = await typedApiRequest('/teacher/dashboard', {}, teacherDashboardSchema);
			console.log('🏠 Dashboard loaded:', {
				classroomCount: result.classrooms.length,
				hasTeacher: !!result.teacher
			});
			return result;
		} catch (error) {
			console.error('❌ getTeacherDashboard failed:', error);
			throw error;
		}
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
				assignmentBaseSchema.extend({
					submissions: z.array(
						submissionSchema.extend({
							grade: gradeSchema.optional()
						})
					),
					recentSubmissions: z.array(submissionSchema)
				})
			)
		);
	},

	// Student dashboard endpoints
	async getStudentDashboard(): Promise<StudentDashboard> {
		console.log('🔍 Calling getStudentDashboard API...');

		try {
			const result = await typedApiRequest('/student/dashboard', {}, studentDashboardSchema);
			console.log('✅ getStudentDashboard succeeded:', result);
			return result;
		} catch (error) {
			console.error('❌ getStudentDashboard failed:', error);
			throw error;
		}
	},

	async getStudentAssignments(classroomId?: string): Promise<{
		pending: Submission[];
		returned: Array<Submission & { grade: Grade }>;
		allSubmissions: Submission[];
		allGrades: Grade[];
	}> {
		const queryParam = classroomId ? `?classroomId=${classroomId}` : '';
		return typedApiRequest(
			`/student/assignments${queryParam}`,
			{},
			z.object({
				pending: z.array(submissionSchema),
				returned: z.array(
					submissionSchema.extend({
						grade: gradeSchema
					})
				),
				allSubmissions: z.array(submissionSchema),
				allGrades: z.array(gradeSchema)
			})
		);
	},

	async getStudentActivity(limit?: number): Promise<Array<Submission | Grade>> {
		const queryParam = limit ? `?limit=${limit}` : '';
		return typedApiRequest(
			`/student/activity${queryParam}`,
			{},
			z.array(z.union([submissionSchema, gradeSchema]))
		);
	},

	async resetStudentAuth(data: { studentEmail: string }): Promise<ResetStudentAuthResponse> {
		return typedApiRequest(
			'/auth/reset-student',
			{
				method: 'POST',
				body: JSON.stringify(data)
			},
			resetStudentAuthResponseSchema
		);
	}
};
