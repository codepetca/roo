import { z } from "zod";
/**
 * DTO (Data Transfer Object) schemas for API boundaries
 * These schemas define the structure of data sent to and from the API
 */
export declare const serializedTimestampSchema: z.ZodObject<{
    _seconds: z.ZodNumber;
    _nanoseconds: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    _seconds: number;
    _nanoseconds: number;
}, {
    _seconds: number;
    _nanoseconds: number;
}>;
export type SerializedTimestamp = z.infer<typeof serializedTimestampSchema>;
export declare const baseDtoSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
    updatedAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
}, {
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
}>;
export declare const createAssignmentRequestSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    maxPoints: z.ZodNumber;
    dueDate: z.ZodOptional<z.ZodString>;
    gradingRubric: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        criteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        promptTemplate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        criteria: string[];
        promptTemplate?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        criteria?: string[] | undefined;
        promptTemplate?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    maxPoints: number;
    dueDate?: string | undefined;
    gradingRubric?: {
        enabled: boolean;
        criteria: string[];
        promptTemplate?: string | undefined;
    } | undefined;
}, {
    title: string;
    description: string;
    maxPoints: number;
    dueDate?: string | undefined;
    gradingRubric?: {
        enabled?: boolean | undefined;
        criteria?: string[] | undefined;
        promptTemplate?: string | undefined;
    } | undefined;
}>;
export declare const assignmentResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
    updatedAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
} & {
    classroomId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    dueDate: z.ZodOptional<z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>>;
    maxPoints: z.ZodNumber;
    gradingRubric: z.ZodObject<{
        enabled: z.ZodBoolean;
        criteria: z.ZodArray<z.ZodString, "many">;
        promptTemplate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        criteria: string[];
        promptTemplate?: string | undefined;
    }, {
        enabled: boolean;
        criteria: string[];
        promptTemplate?: string | undefined;
    }>;
    isQuiz: z.ZodBoolean;
    formId: z.ZodOptional<z.ZodString>;
    sourceFileId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    title: string;
    description: string;
    maxPoints: number;
    gradingRubric: {
        enabled: boolean;
        criteria: string[];
        promptTemplate?: string | undefined;
    };
    classroomId: string;
    isQuiz: boolean;
    dueDate?: {
        _seconds: number;
        _nanoseconds: number;
    } | undefined;
    formId?: string | undefined;
    sourceFileId?: string | undefined;
}, {
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    title: string;
    description: string;
    maxPoints: number;
    gradingRubric: {
        enabled: boolean;
        criteria: string[];
        promptTemplate?: string | undefined;
    };
    classroomId: string;
    isQuiz: boolean;
    dueDate?: {
        _seconds: number;
        _nanoseconds: number;
    } | undefined;
    formId?: string | undefined;
    sourceFileId?: string | undefined;
}>;
export declare const createSubmissionRequestSchema: z.ZodObject<{
    assignmentId: z.ZodString;
    studentId: z.ZodString;
    studentName: z.ZodString;
    studentEmail: z.ZodString;
    submissionText: z.ZodString;
    submittedAt: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["pending", "grading", "graded", "error"]>>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "grading" | "graded" | "error";
    assignmentId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    submissionText: string;
    submittedAt?: string | undefined;
}, {
    assignmentId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    submissionText: string;
    status?: "pending" | "grading" | "graded" | "error" | undefined;
    submittedAt?: string | undefined;
}>;
export declare const updateSubmissionStatusRequestSchema: z.ZodObject<{
    status: z.ZodEnum<["pending", "grading", "graded", "error"]>;
    gradeId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "grading" | "graded" | "error";
    gradeId?: string | undefined;
}, {
    status: "pending" | "grading" | "graded" | "error";
    gradeId?: string | undefined;
}>;
export declare const submissionResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
    updatedAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
} & {
    assignmentId: z.ZodString;
    studentId: z.ZodString;
    studentEmail: z.ZodString;
    studentName: z.ZodString;
    submittedAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
    documentUrl: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["pending", "grading", "graded", "error"]>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "grading" | "graded" | "error";
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    assignmentId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    submittedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    documentUrl?: string | undefined;
    content?: string | undefined;
}, {
    status: "pending" | "grading" | "graded" | "error";
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    assignmentId: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    submittedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    documentUrl?: string | undefined;
    content?: string | undefined;
}>;
export declare const createGradeRequestSchema: z.ZodObject<{
    submissionId: z.ZodString;
    assignmentId: z.ZodString;
    studentId: z.ZodString;
    score: z.ZodNumber;
    maxScore: z.ZodNumber;
    feedback: z.ZodString;
    gradingDetails: z.ZodObject<{
        criteria: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodNumber;
            maxScore: z.ZodNumber;
            feedback: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }, {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    }, {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    }>;
}, "strip", z.ZodTypeAny, {
    assignmentId: string;
    studentId: string;
    submissionId: string;
    score: number;
    maxScore: number;
    feedback: string;
    gradingDetails: {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    };
}, {
    assignmentId: string;
    studentId: string;
    submissionId: string;
    score: number;
    maxScore: number;
    feedback: string;
    gradingDetails: {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    };
}>;
export declare const gradeResponseSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
    updatedAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
} & {
    submissionId: z.ZodString;
    assignmentId: z.ZodString;
    studentId: z.ZodString;
    score: z.ZodNumber;
    maxScore: z.ZodNumber;
    feedback: z.ZodString;
    gradingDetails: z.ZodObject<{
        criteria: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            score: z.ZodNumber;
            maxScore: z.ZodNumber;
            feedback: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }, {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    }, {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    }>;
    gradedBy: z.ZodEnum<["ai", "manual"]>;
    gradedAt: z.ZodObject<{
        _seconds: z.ZodNumber;
        _nanoseconds: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        _seconds: number;
        _nanoseconds: number;
    }, {
        _seconds: number;
        _nanoseconds: number;
    }>;
    postedToClassroom: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    assignmentId: string;
    studentId: string;
    submissionId: string;
    score: number;
    maxScore: number;
    feedback: string;
    gradingDetails: {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    };
    gradedBy: "ai" | "manual";
    gradedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    postedToClassroom: boolean;
}, {
    id: string;
    createdAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    updatedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    assignmentId: string;
    studentId: string;
    submissionId: string;
    score: number;
    maxScore: number;
    feedback: string;
    gradingDetails: {
        criteria: {
            score: number;
            maxScore: number;
            feedback: string;
            name: string;
        }[];
    };
    gradedBy: "ai" | "manual";
    gradedAt: {
        _seconds: number;
        _nanoseconds: number;
    };
    postedToClassroom: boolean;
}>;
export declare const gradeQuizRequestSchema: z.ZodObject<{
    submissionId: z.ZodString;
    formId: z.ZodString;
    assignmentId: z.ZodString;
    studentId: z.ZodString;
    studentName: z.ZodString;
    studentAnswers: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    formId: string;
    assignmentId: string;
    studentId: string;
    studentName: string;
    submissionId: string;
    studentAnswers: Record<string, string>;
}, {
    formId: string;
    assignmentId: string;
    studentId: string;
    studentName: string;
    submissionId: string;
    studentAnswers: Record<string, string>;
}>;
export declare const gradeCodeRequestSchema: z.ZodObject<{
    submissionId: z.ZodString;
    submissionText: z.ZodString;
    assignmentId: z.ZodString;
    assignmentTitle: z.ZodString;
    studentId: z.ZodString;
    studentName: z.ZodString;
    assignmentDescription: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    maxPoints: z.ZodDefault<z.ZodNumber>;
    isCodeAssignment: z.ZodDefault<z.ZodBoolean>;
    gradingStrictness: z.ZodDefault<z.ZodEnum<["strict", "standard", "generous"]>>;
}, "strip", z.ZodTypeAny, {
    maxPoints: number;
    assignmentId: string;
    studentId: string;
    studentName: string;
    submissionText: string;
    submissionId: string;
    assignmentTitle: string;
    assignmentDescription: string;
    isCodeAssignment: boolean;
    gradingStrictness: "strict" | "standard" | "generous";
}, {
    assignmentId: string;
    studentId: string;
    studentName: string;
    submissionText: string;
    submissionId: string;
    assignmentTitle: string;
    maxPoints?: number | undefined;
    assignmentDescription?: string | undefined;
    isCodeAssignment?: boolean | undefined;
    gradingStrictness?: "strict" | "standard" | "generous" | undefined;
}>;
export declare const testGradingRequestSchema: z.ZodObject<{
    text: z.ZodString;
    criteria: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    maxPoints: z.ZodDefault<z.ZodNumber>;
    promptTemplate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    maxPoints: number;
    criteria: string[];
    text: string;
    promptTemplate?: string | undefined;
}, {
    text: string;
    maxPoints?: number | undefined;
    criteria?: string[] | undefined;
    promptTemplate?: string | undefined;
}>;
export declare const gradingResultResponseSchema: z.ZodObject<{
    score: z.ZodNumber;
    feedback: z.ZodString;
    criteriaScores: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        score: z.ZodNumber;
        maxScore: z.ZodNumber;
        feedback: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        score: number;
        maxScore: number;
        feedback: string;
        name: string;
    }, {
        score: number;
        maxScore: number;
        feedback: string;
        name: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    score: number;
    feedback: string;
    criteriaScores?: {
        score: number;
        maxScore: number;
        feedback: string;
        name: string;
    }[] | undefined;
}, {
    score: number;
    feedback: string;
    criteriaScores?: {
        score: number;
        maxScore: number;
        feedback: string;
        name: string;
    }[] | undefined;
}>;
export declare const quizGradingResultResponseSchema: z.ZodObject<{
    totalScore: z.ZodNumber;
    totalPossible: z.ZodNumber;
    questionGrades: z.ZodArray<z.ZodObject<{
        questionNumber: z.ZodNumber;
        isCorrect: z.ZodBoolean;
        studentAnswer: z.ZodString;
        correctAnswer: z.ZodString;
        points: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        questionNumber: number;
        isCorrect: boolean;
        studentAnswer: string;
        correctAnswer: string;
        points: number;
    }, {
        questionNumber: number;
        isCorrect: boolean;
        studentAnswer: string;
        correctAnswer: string;
        points: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalScore: number;
    totalPossible: number;
    questionGrades: {
        questionNumber: number;
        isCorrect: boolean;
        studentAnswer: string;
        correctAnswer: string;
        points: number;
    }[];
}, {
    totalScore: number;
    totalPossible: number;
    questionGrades: {
        questionNumber: number;
        isCorrect: boolean;
        studentAnswer: string;
        correctAnswer: string;
        points: number;
    }[];
}>;
export declare const getSheetsSubmissionsRequestSchema: z.ZodObject<{
    assignmentId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    assignmentId: string;
}, {
    assignmentId: string;
}>;
export declare const getAnswerKeyRequestSchema: z.ZodObject<{
    formId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    formId: string;
}, {
    formId: string;
}>;
export declare const answerKeyResponseSchema: z.ZodObject<{
    formId: z.ZodString;
    totalPoints: z.ZodNumber;
    questions: z.ZodArray<z.ZodObject<{
        questionNumber: z.ZodNumber;
        correctAnswer: z.ZodString;
        points: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        questionNumber: number;
        correctAnswer: string;
        points: number;
    }, {
        questionNumber: number;
        correctAnswer: string;
        points: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    formId: string;
    totalPoints: number;
    questions: {
        questionNumber: number;
        correctAnswer: string;
        points: number;
    }[];
}, {
    formId: string;
    totalPoints: number;
    questions: {
        questionNumber: number;
        correctAnswer: string;
        points: number;
    }[];
}>;
export declare const apiResponseSchema: <T extends z.ZodType>(dataSchema: T) => z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}>, any>[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: z.ZodOptional<T>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}>[k_1]; } : never>;
export declare const errorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    details: z.ZodOptional<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        path: string;
        message: string;
    }, {
        path: string;
        message: string;
    }>, "many">>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    error: string;
    message?: string | undefined;
    details?: {
        path: string;
        message: string;
    }[] | undefined;
}, {
    error: string;
    message?: string | undefined;
    details?: {
        path: string;
        message: string;
    }[] | undefined;
}>;
export declare const assignmentsListResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
        updatedAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
    } & {
        classroomId: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        dueDate: z.ZodOptional<z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>>;
        maxPoints: z.ZodNumber;
        gradingRubric: z.ZodObject<{
            enabled: z.ZodBoolean;
            criteria: z.ZodArray<z.ZodString, "many">;
            promptTemplate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            criteria: string[];
            promptTemplate?: string | undefined;
        }, {
            enabled: boolean;
            criteria: string[];
            promptTemplate?: string | undefined;
        }>;
        isQuiz: z.ZodBoolean;
        formId: z.ZodOptional<z.ZodString>;
        sourceFileId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        title: string;
        description: string;
        maxPoints: number;
        gradingRubric: {
            enabled: boolean;
            criteria: string[];
            promptTemplate?: string | undefined;
        };
        classroomId: string;
        isQuiz: boolean;
        dueDate?: {
            _seconds: number;
            _nanoseconds: number;
        } | undefined;
        formId?: string | undefined;
        sourceFileId?: string | undefined;
    }, {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        title: string;
        description: string;
        maxPoints: number;
        gradingRubric: {
            enabled: boolean;
            criteria: string[];
            promptTemplate?: string | undefined;
        };
        classroomId: string;
        isQuiz: boolean;
        dueDate?: {
            _seconds: number;
            _nanoseconds: number;
        } | undefined;
        formId?: string | undefined;
        sourceFileId?: string | undefined;
    }>, "many">>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        title: string;
        description: string;
        maxPoints: number;
        gradingRubric: {
            enabled: boolean;
            criteria: string[];
            promptTemplate?: string | undefined;
        };
        classroomId: string;
        isQuiz: boolean;
        dueDate?: {
            _seconds: number;
            _nanoseconds: number;
        } | undefined;
        formId?: string | undefined;
        sourceFileId?: string | undefined;
    }[] | undefined;
}, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        title: string;
        description: string;
        maxPoints: number;
        gradingRubric: {
            enabled: boolean;
            criteria: string[];
            promptTemplate?: string | undefined;
        };
        classroomId: string;
        isQuiz: boolean;
        dueDate?: {
            _seconds: number;
            _nanoseconds: number;
        } | undefined;
        formId?: string | undefined;
        sourceFileId?: string | undefined;
    }[] | undefined;
}>;
export declare const submissionsListResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
        updatedAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
    } & {
        assignmentId: z.ZodString;
        studentId: z.ZodString;
        studentEmail: z.ZodString;
        studentName: z.ZodString;
        submittedAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
        documentUrl: z.ZodOptional<z.ZodString>;
        content: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<["pending", "grading", "graded", "error"]>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "grading" | "graded" | "error";
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        studentName: string;
        studentEmail: string;
        submittedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        documentUrl?: string | undefined;
        content?: string | undefined;
    }, {
        status: "pending" | "grading" | "graded" | "error";
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        studentName: string;
        studentEmail: string;
        submittedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        documentUrl?: string | undefined;
        content?: string | undefined;
    }>, "many">>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        status: "pending" | "grading" | "graded" | "error";
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        studentName: string;
        studentEmail: string;
        submittedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        documentUrl?: string | undefined;
        content?: string | undefined;
    }[] | undefined;
}, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        status: "pending" | "grading" | "graded" | "error";
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        studentName: string;
        studentEmail: string;
        submittedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        documentUrl?: string | undefined;
        content?: string | undefined;
    }[] | undefined;
}>;
export declare const gradesListResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
        updatedAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
    } & {
        submissionId: z.ZodString;
        assignmentId: z.ZodString;
        studentId: z.ZodString;
        score: z.ZodNumber;
        maxScore: z.ZodNumber;
        feedback: z.ZodString;
        gradingDetails: z.ZodObject<{
            criteria: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                score: z.ZodNumber;
                maxScore: z.ZodNumber;
                feedback: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }, {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            criteria: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[];
        }, {
            criteria: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[];
        }>;
        gradedBy: z.ZodEnum<["ai", "manual"]>;
        gradedAt: z.ZodObject<{
            _seconds: z.ZodNumber;
            _nanoseconds: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            _seconds: number;
            _nanoseconds: number;
        }, {
            _seconds: number;
            _nanoseconds: number;
        }>;
        postedToClassroom: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        submissionId: string;
        score: number;
        maxScore: number;
        feedback: string;
        gradingDetails: {
            criteria: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[];
        };
        gradedBy: "ai" | "manual";
        gradedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        postedToClassroom: boolean;
    }, {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        submissionId: string;
        score: number;
        maxScore: number;
        feedback: string;
        gradingDetails: {
            criteria: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[];
        };
        gradedBy: "ai" | "manual";
        gradedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        postedToClassroom: boolean;
    }>, "many">>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        submissionId: string;
        score: number;
        maxScore: number;
        feedback: string;
        gradingDetails: {
            criteria: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[];
        };
        gradedBy: "ai" | "manual";
        gradedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        postedToClassroom: boolean;
    }[] | undefined;
}, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        id: string;
        createdAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        updatedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        assignmentId: string;
        studentId: string;
        submissionId: string;
        score: number;
        maxScore: number;
        feedback: string;
        gradingDetails: {
            criteria: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[];
        };
        gradedBy: "ai" | "manual";
        gradedAt: {
            _seconds: number;
            _nanoseconds: number;
        };
        postedToClassroom: boolean;
    }[] | undefined;
}>;
export declare const gradeQuizResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodObject<{
        gradeId: z.ZodString;
        grading: z.ZodObject<{
            totalScore: z.ZodNumber;
            totalPossible: z.ZodNumber;
            questionGrades: z.ZodArray<z.ZodObject<{
                questionNumber: z.ZodNumber;
                isCorrect: z.ZodBoolean;
                studentAnswer: z.ZodString;
                correctAnswer: z.ZodString;
                points: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }, {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            totalScore: number;
            totalPossible: number;
            questionGrades: {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }[];
        }, {
            totalScore: number;
            totalPossible: number;
            questionGrades: {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }[];
        }>;
    }, "strip", z.ZodTypeAny, {
        grading: {
            totalScore: number;
            totalPossible: number;
            questionGrades: {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }[];
        };
        gradeId: string;
    }, {
        grading: {
            totalScore: number;
            totalPossible: number;
            questionGrades: {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }[];
        };
        gradeId: string;
    }>>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        grading: {
            totalScore: number;
            totalPossible: number;
            questionGrades: {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }[];
        };
        gradeId: string;
    } | undefined;
}, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        grading: {
            totalScore: number;
            totalPossible: number;
            questionGrades: {
                questionNumber: number;
                isCorrect: boolean;
                studentAnswer: string;
                correctAnswer: string;
                points: number;
            }[];
        };
        gradeId: string;
    } | undefined;
}>;
export declare const gradeCodeResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodOptional<z.ZodObject<{
        gradeId: z.ZodString;
        grading: z.ZodObject<{
            score: z.ZodNumber;
            feedback: z.ZodString;
            criteriaScores: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                score: z.ZodNumber;
                maxScore: z.ZodNumber;
                feedback: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }, {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            score: number;
            feedback: string;
            criteriaScores?: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[] | undefined;
        }, {
            score: number;
            feedback: string;
            criteriaScores?: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        grading: {
            score: number;
            feedback: string;
            criteriaScores?: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[] | undefined;
        };
        gradeId: string;
    }, {
        grading: {
            score: number;
            feedback: string;
            criteriaScores?: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[] | undefined;
        };
        gradeId: string;
    }>>;
    error: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        grading: {
            score: number;
            feedback: string;
            criteriaScores?: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[] | undefined;
        };
        gradeId: string;
    } | undefined;
}, {
    success: boolean;
    message?: string | undefined;
    error?: string | undefined;
    data?: {
        grading: {
            score: number;
            feedback: string;
            criteriaScores?: {
                score: number;
                maxScore: number;
                feedback: string;
                name: string;
            }[] | undefined;
        };
        gradeId: string;
    } | undefined;
}>;
export declare const healthCheckResponseSchema: z.ZodObject<{
    status: z.ZodString;
    version: z.ZodString;
    endpoints: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    status: string;
    version: string;
    endpoints: string[];
}, {
    status: string;
    version: string;
    endpoints: string[];
}>;
export type CreateAssignmentRequest = z.infer<typeof createAssignmentRequestSchema>;
export type AssignmentResponse = z.infer<typeof assignmentResponseSchema>;
export type CreateSubmissionRequest = z.infer<typeof createSubmissionRequestSchema>;
export type UpdateSubmissionStatusRequest = z.infer<typeof updateSubmissionStatusRequestSchema>;
export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;
export type CreateGradeRequest = z.infer<typeof createGradeRequestSchema>;
export type GradeResponse = z.infer<typeof gradeResponseSchema>;
export type GradeQuizRequest = z.infer<typeof gradeQuizRequestSchema>;
export type GradeCodeRequest = z.infer<typeof gradeCodeRequestSchema>;
export type TestGradingRequest = z.infer<typeof testGradingRequestSchema>;
export type GradingResultResponse = z.infer<typeof gradingResultResponseSchema>;
export type QuizGradingResultResponse = z.infer<typeof quizGradingResultResponseSchema>;
export type GetSheetsSubmissionsRequest = z.infer<typeof getSheetsSubmissionsRequestSchema>;
export type GetAnswerKeyRequest = z.infer<typeof getAnswerKeyRequestSchema>;
export type AnswerKeyResponse = z.infer<typeof answerKeyResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type HealthCheckResponse = z.infer<typeof healthCheckResponseSchema>;
//# sourceMappingURL=dto.d.ts.map