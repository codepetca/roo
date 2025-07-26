"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckResponseSchema = exports.gradeCodeResponseSchema = exports.gradeQuizResponseSchema = exports.gradesListResponseSchema = exports.submissionsListResponseSchema = exports.assignmentsListResponseSchema = exports.errorResponseSchema = exports.apiResponseSchema = exports.answerKeyResponseSchema = exports.getAnswerKeyRequestSchema = exports.getSheetsSubmissionsRequestSchema = exports.quizGradingResultResponseSchema = exports.gradingResultResponseSchema = exports.testGradingRequestSchema = exports.gradeCodeRequestSchema = exports.gradeQuizRequestSchema = exports.gradeResponseSchema = exports.createGradeRequestSchema = exports.submissionResponseSchema = exports.updateSubmissionStatusRequestSchema = exports.createSubmissionRequestSchema = exports.assignmentResponseSchema = exports.createAssignmentRequestSchema = exports.baseDtoSchema = exports.serializedTimestampSchema = void 0;
const zod_1 = require("zod");
/**
 * DTO (Data Transfer Object) schemas for API boundaries
 * These schemas define the structure of data sent to and from the API
 */
// ============================================
// Serialized Timestamp for API communication
// ============================================
exports.serializedTimestampSchema = zod_1.z.object({
    _seconds: zod_1.z.number(),
    _nanoseconds: zod_1.z.number()
});
// ============================================
// Base DTO Schema
// ============================================
exports.baseDtoSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    createdAt: exports.serializedTimestampSchema,
    updatedAt: exports.serializedTimestampSchema
});
// ============================================
// Assignment DTOs
// ============================================
// Request DTO for creating assignments
exports.createAssignmentRequestSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required"),
    description: zod_1.z.string().min(1, "Description is required"),
    maxPoints: zod_1.z.number().min(0).max(1000),
    dueDate: zod_1.z.string().datetime().optional(),
    gradingRubric: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        criteria: zod_1.z.array(zod_1.z.string()).default(["Content", "Grammar", "Structure"]),
        promptTemplate: zod_1.z.string().optional()
    }).optional()
});
// Response DTO for assignments
exports.assignmentResponseSchema = exports.baseDtoSchema.extend({
    classroomId: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    dueDate: exports.serializedTimestampSchema.optional(),
    maxPoints: zod_1.z.number(),
    gradingRubric: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        criteria: zod_1.z.array(zod_1.z.string()),
        promptTemplate: zod_1.z.string().optional()
    }),
    isQuiz: zod_1.z.boolean(),
    formId: zod_1.z.string().optional(),
    sourceFileId: zod_1.z.string().optional()
});
// ============================================
// Submission DTOs
// ============================================
// Request DTO for creating submissions
exports.createSubmissionRequestSchema = zod_1.z.object({
    assignmentId: zod_1.z.string().min(1),
    studentId: zod_1.z.string().min(1),
    studentName: zod_1.z.string().min(1),
    studentEmail: zod_1.z.string().email(),
    submissionText: zod_1.z.string().min(1),
    submittedAt: zod_1.z.string().datetime().optional(),
    status: zod_1.z.enum(["pending", "grading", "graded", "error"]).default("pending")
});
// Request DTO for updating submission status
exports.updateSubmissionStatusRequestSchema = zod_1.z.object({
    status: zod_1.z.enum(["pending", "grading", "graded", "error"]),
    gradeId: zod_1.z.string().optional()
});
// Response DTO for submissions
exports.submissionResponseSchema = exports.baseDtoSchema.extend({
    assignmentId: zod_1.z.string(),
    studentId: zod_1.z.string(),
    studentEmail: zod_1.z.string(),
    studentName: zod_1.z.string(),
    submittedAt: exports.serializedTimestampSchema,
    documentUrl: zod_1.z.string().optional(),
    content: zod_1.z.string().optional(),
    status: zod_1.z.enum(["pending", "grading", "graded", "error"])
});
// ============================================
// Grade DTOs
// ============================================
// Request DTO for creating grades
exports.createGradeRequestSchema = zod_1.z.object({
    submissionId: zod_1.z.string().min(1),
    assignmentId: zod_1.z.string().min(1),
    studentId: zod_1.z.string().min(1),
    score: zod_1.z.number().min(0),
    maxScore: zod_1.z.number().min(0),
    feedback: zod_1.z.string(),
    gradingDetails: zod_1.z.object({
        criteria: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            score: zod_1.z.number().min(0),
            maxScore: zod_1.z.number().min(0),
            feedback: zod_1.z.string()
        }))
    })
});
// Response DTO for grades
exports.gradeResponseSchema = exports.baseDtoSchema.extend({
    submissionId: zod_1.z.string(),
    assignmentId: zod_1.z.string(),
    studentId: zod_1.z.string(),
    score: zod_1.z.number(),
    maxScore: zod_1.z.number(),
    feedback: zod_1.z.string(),
    gradingDetails: zod_1.z.object({
        criteria: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            score: zod_1.z.number(),
            maxScore: zod_1.z.number(),
            feedback: zod_1.z.string()
        }))
    }),
    gradedBy: zod_1.z.enum(["ai", "manual"]),
    gradedAt: exports.serializedTimestampSchema,
    postedToClassroom: zod_1.z.boolean()
});
// ============================================
// Grading Request DTOs
// ============================================
// Request DTO for grading quizzes
exports.gradeQuizRequestSchema = zod_1.z.object({
    submissionId: zod_1.z.string().min(1),
    formId: zod_1.z.string().min(1),
    assignmentId: zod_1.z.string().min(1),
    studentId: zod_1.z.string().min(1),
    studentName: zod_1.z.string().min(1),
    studentAnswers: zod_1.z.record(zod_1.z.string(), zod_1.z.string()) // questionNumber -> answer
});
// Request DTO for grading code assignments
exports.gradeCodeRequestSchema = zod_1.z.object({
    submissionId: zod_1.z.string().min(1),
    submissionText: zod_1.z.string().min(1),
    assignmentId: zod_1.z.string().min(1),
    assignmentTitle: zod_1.z.string().min(1),
    studentId: zod_1.z.string().min(1),
    studentName: zod_1.z.string().min(1),
    assignmentDescription: zod_1.z.string().optional().default(""),
    maxPoints: zod_1.z.number().min(1).default(100),
    isCodeAssignment: zod_1.z.boolean().default(false),
    gradingStrictness: zod_1.z.enum(["strict", "standard", "generous"]).default("generous")
});
// Request DTO for test grading
exports.testGradingRequestSchema = zod_1.z.object({
    text: zod_1.z.string().min(1, "Text to grade is required"),
    criteria: zod_1.z.array(zod_1.z.string()).default(["Content", "Grammar", "Structure"]),
    maxPoints: zod_1.z.number().min(1).max(1000).default(100),
    promptTemplate: zod_1.z.string().optional()
});
// ============================================
// Grading Result DTOs
// ============================================
// Response DTO for grading results
exports.gradingResultResponseSchema = zod_1.z.object({
    score: zod_1.z.number(),
    feedback: zod_1.z.string(),
    criteriaScores: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        score: zod_1.z.number(),
        maxScore: zod_1.z.number(),
        feedback: zod_1.z.string()
    })).optional()
});
// Response DTO for quiz grading results
exports.quizGradingResultResponseSchema = zod_1.z.object({
    totalScore: zod_1.z.number(),
    totalPossible: zod_1.z.number(),
    questionGrades: zod_1.z.array(zod_1.z.object({
        questionNumber: zod_1.z.number(),
        isCorrect: zod_1.z.boolean(),
        studentAnswer: zod_1.z.string(),
        correctAnswer: zod_1.z.string(),
        points: zod_1.z.number()
    }))
});
// ============================================
// Sheets Integration DTOs
// ============================================
// Request DTO for getting sheets submissions
exports.getSheetsSubmissionsRequestSchema = zod_1.z.object({
    assignmentId: zod_1.z.string().min(1)
});
// Request DTO for getting answer key
exports.getAnswerKeyRequestSchema = zod_1.z.object({
    formId: zod_1.z.string().min(1)
});
// Response DTO for answer key
exports.answerKeyResponseSchema = zod_1.z.object({
    formId: zod_1.z.string(),
    totalPoints: zod_1.z.number(),
    questions: zod_1.z.array(zod_1.z.object({
        questionNumber: zod_1.z.number(),
        correctAnswer: zod_1.z.string(),
        points: zod_1.z.number()
    }))
});
// ============================================
// API Response Wrapper
// ============================================
// Generic API response wrapper
const apiResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.boolean(),
    data: dataSchema.optional(),
    error: zod_1.z.string().optional(),
    message: zod_1.z.string().optional()
});
exports.apiResponseSchema = apiResponseSchema;
// Error response schema
exports.errorResponseSchema = zod_1.z.object({
    error: zod_1.z.string(),
    details: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(),
        message: zod_1.z.string()
    })).optional(),
    message: zod_1.z.string().optional()
});
// ============================================
// List/Array Response DTOs
// ============================================
exports.assignmentsListResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.array(exports.assignmentResponseSchema));
exports.submissionsListResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.array(exports.submissionResponseSchema));
exports.gradesListResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.array(exports.gradeResponseSchema));
// ============================================
// Specific API Response DTOs
// ============================================
exports.gradeQuizResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.object({
    gradeId: zod_1.z.string(),
    grading: exports.quizGradingResultResponseSchema
}));
exports.gradeCodeResponseSchema = (0, exports.apiResponseSchema)(zod_1.z.object({
    gradeId: zod_1.z.string(),
    grading: exports.gradingResultResponseSchema
}));
// ============================================
// Health Check DTO
// ============================================
exports.healthCheckResponseSchema = zod_1.z.object({
    status: zod_1.z.string(),
    version: zod_1.z.string(),
    endpoints: zod_1.z.array(zod_1.z.string())
});
