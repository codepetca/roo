/**
 * Test data factories using schemas
 * Location: functions/src/test/factories.ts
 */

import * as admin from "firebase-admin";
import {
  type SheetAssignment,
  type SheetSubmission,
  type SheetAnswerKey,
  type AssignmentDomain,
  type SubmissionDomain,
  type GradeDomain,
  type QuizAnswerKeyDomain,
  type CreateAssignmentRequest,
  type CreateSubmissionRequest,
  type GradeQuizRequest,
  type GradeCodeRequest,
  type TestGradingRequest
} from "../schemas";

// Utility function to create Firebase Timestamp
const createTimestamp = (date?: Date): admin.firestore.Timestamp => {
  const d = date || new Date();
  return new admin.firestore.Timestamp(Math.floor(d.getTime() / 1000), 0);
};

// Sheet data factories
export const sheetFactories = {
  assignment: (overrides: Partial<SheetAssignment> = {}): SheetAssignment => ({
    id: "assignment-1",
    courseId: "course-101",
    title: "Test Assignment",
    description: "A test assignment for validation",
    dueDate: "2024-12-31",
    maxPoints: 100,
    submissionType: "mixed",
    createdDate: "2024-01-01",
    ...overrides
  }),

  submission: (overrides: Partial<SheetSubmission> = {}): SheetSubmission => ({
    id: "submission-1",
    assignmentTitle: "Test Assignment",
    courseId: "course-101",
    studentFirstName: "John",
    studentLastName: "Doe",
    studentEmail: "john.doe@student.edu",
    submissionText: "function hello() { console.log(\"Hello World!\"); }",
    submissionDate: "2024-01-15T10:30:00Z",
    currentGrade: undefined,
    gradingStatus: "pending",
    maxPoints: 100,
    sourceSheetName: "Submissions",
    assignmentDescription: "Write a hello world function",
    lastProcessed: "2024-01-15T10:30:00Z",
    sourceFileId: "file-123",
    isQuiz: false,
    formId: "",
    ...overrides
  }),

  quizSubmission: (overrides: Partial<SheetSubmission> = {}): SheetSubmission => ({
    ...sheetFactories.submission(),
    submissionText: "Answer 1: True, Answer 2: False, Answer 3: C",
    isQuiz: true,
    formId: "quiz-form-1",
    ...overrides
  }),

  answerKey: (overrides: Partial<SheetAnswerKey> = {}): SheetAnswerKey => ({
    formId: "quiz-form-1",
    assignmentTitle: "Quiz 1",
    courseId: "course-101",
    questionNumber: "1",
    questionText: "What is the capital of France?",
    questionType: "multiple-choice",
    points: "10",
    correctAnswer: "Paris",
    answerExplanation: "Paris is the capital and largest city of France.",
    gradingStrictness: "standard",
    ...overrides
  }),

  answerKeySet: (formId = "quiz-form-1", questionCount = 3): SheetAnswerKey[] => {
    return Array.from({ length: questionCount }, (_, index) => 
      sheetFactories.answerKey({
        formId,
        questionNumber: `${index + 1}`,
        questionText: `Question ${index + 1}?`,
        correctAnswer: `Answer ${index + 1}`,
        points: "10"
      })
    );
  }
};

// Domain data factories
export const domainFactories = {
  assignment: (overrides: Partial<AssignmentDomain> = {}): AssignmentDomain => ({
    id: "assignment-1",
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    classroomId: "classroom-1",
    title: "Test Assignment",
    description: "A test assignment for domain testing",
    dueDate: createTimestamp(new Date("2024-12-31")),
    maxPoints: 100,
    gradingRubric: {
      enabled: true,
      criteria: ["Logic", "Implementation", "Style"],
      promptTemplate: "Grade this assignment based on the criteria"
    },
    isQuiz: false,
    formId: undefined,
    sourceFileId: "source-file-123",
    submissionType: "mixed",
    ...overrides
  }),

  submission: (overrides: Partial<SubmissionDomain> = {}): SubmissionDomain => ({
    id: "submission-1",
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    assignmentId: "assignment-1",
    studentId: "student-1",
    studentEmail: "john.doe@student.edu",
    studentName: "John Doe",
    submittedAt: createTimestamp(),
    documentUrl: "https://example.com/submission.pdf",
    content: "function greet(name) { return `Hello, ${name}!`; }",
    status: "pending",
    sourceSheetName: "Submissions",
    sourceFileId: "file-123",
    formId: undefined,
    gradeId: undefined,
    ...overrides
  }),

  grade: (overrides: Partial<GradeDomain> = {}): GradeDomain => ({
    id: "grade-1",
    createdAt: createTimestamp(),
    updatedAt: createTimestamp(),
    submissionId: "submission-1",
    assignmentId: "assignment-1",
    studentId: "student-1",
    studentName: "John Doe",
    score: 85,
    maxScore: 100,
    feedback: "Good work! The function correctly implements the greeting logic. Consider adding input validation for better robustness.",
    gradingDetails: {
      criteria: [
        {
          name: "Logic",
          score: 90,
          maxScore: 100,
          feedback: "Excellent logical implementation"
        },
        {
          name: "Implementation",
          score: 85,
          maxScore: 100,
          feedback: "Good implementation with room for improvement"
        },
        {
          name: "Style",
          score: 80,
          maxScore: 100,
          feedback: "Code style is mostly good"
        }
      ]
    },
    gradedBy: "ai",
    gradedAt: createTimestamp(),
    postedToClassroom: false,
    metadata: {
      submissionLength: 50,
      criteria: ["Logic", "Implementation", "Style"],
      promptLength: 150,
      gradingDuration: 2.5,
      isCodeAssignment: true,
      gradingMode: "generous"
    },
    ...overrides
  }),

  quizAnswerKey: (overrides: Partial<QuizAnswerKeyDomain> = {}): QuizAnswerKeyDomain => ({
    formId: "quiz-form-1",
    assignmentTitle: "JavaScript Basics Quiz",
    courseId: "course-101",
    questions: [
      {
        questionNumber: 1,
        questionText: "What is a variable in JavaScript?",
        questionType: "multiple-choice",
        points: 10,
        correctAnswer: "A container for storing data",
        answerExplanation: "Variables are used to store data values in JavaScript.",
        gradingStrictness: "standard"
      },
      {
        questionNumber: 2,
        questionText: "Which keyword is used to declare a constant?",
        questionType: "multiple-choice",
        points: 10,
        correctAnswer: "const",
        answerExplanation: "The const keyword declares a block-scoped constant.",
        gradingStrictness: "strict"
      }
    ],
    totalPoints: 20,
    ...overrides
  })
};

// DTO request factories
export const requestFactories = {
  createAssignment: (overrides: Partial<CreateAssignmentRequest> = {}): CreateAssignmentRequest => ({
    title: "New Assignment",
    description: "A new assignment for testing",
    maxPoints: 100,
    dueDate: "2024-12-31T23:59:59Z",
    gradingRubric: {
      enabled: true,
      criteria: ["Understanding", "Implementation"],
      promptTemplate: "Grade this assignment carefully"
    },
    ...overrides
  }),

  createSubmission: (overrides: Partial<CreateSubmissionRequest> = {}): CreateSubmissionRequest => ({
    assignmentId: "assignment-1",
    studentId: "student-1",
    studentName: "John Doe",
    studentEmail: "john.doe@student.edu",
    submissionText: "console.log(\"Hello, World!\");",
    submittedAt: "2024-01-15T10:30:00Z",
    status: "pending",
    ...overrides
  }),

  gradeQuiz: (overrides: Partial<GradeQuizRequest> = {}): GradeQuizRequest => ({
    submissionId: "submission-1",
    formId: "quiz-form-1",
    assignmentId: "assignment-1",
    studentId: "student-1",
    studentName: "John Doe",
    studentAnswers: {
      "1": "A container for storing data",
      "2": "const",
      "3": "function myFunction() {}"
    },
    ...overrides
  }),

  gradeCode: (overrides: Partial<GradeCodeRequest> = {}): GradeCodeRequest => ({
    submissionId: "submission-1",
    submissionText: "function greet(name) { return `Hello, ${name}!`; }",
    assignmentId: "assignment-1",
    assignmentTitle: "Greeting Function",
    studentId: "student-1",
    studentName: "John Doe",
    assignmentDescription: "Write a function that greets a person by name",
    maxPoints: 100,
    isCodeAssignment: true,
    gradingStrictness: "generous",
    ...overrides
  }),

  testGrading: (overrides: Partial<TestGradingRequest> = {}): TestGradingRequest => ({
    text: "function fibonacci(n) { if (n <= 1) return n; return fibonacci(n-1) + fibonacci(n-2); }",
    criteria: ["Logic", "Efficiency", "Style"],
    maxPoints: 100,
    promptTemplate: "Grade this code for correctness and efficiency",
    ...overrides
  })
};

// API response factories
export const responseFactories = {
  apiSuccess: <T>(data: T, message = "Success") => ({
    success: true,
    data,
    message
  }),

  apiError: (error: string, details?: unknown) => ({
    success: false,
    error,
    details
  }),

  gradingResult: (overrides = {}) => ({
    score: 85,
    feedback: "Good implementation with room for improvement.",
    criteriaScores: [
      {
        name: "Logic",
        score: 90,
        maxScore: 100,
        feedback: "Excellent logical flow"
      },
      {
        name: "Implementation",
        score: 80,
        maxScore: 100,
        feedback: "Good implementation"
      }
    ],
    ...overrides
  }),

  quizGradingResult: (overrides = {}) => ({
    totalScore: 80,
    totalPossible: 100,
    questionGrades: [
      {
        questionNumber: 1,
        isCorrect: true,
        studentAnswer: "A container for storing data",
        correctAnswer: "A container for storing data",
        points: 10
      },
      {
        questionNumber: 2,
        isCorrect: false,
        studentAnswer: "var",
        correctAnswer: "const",
        points: 0
      }
    ],
    ...overrides
  })
};

// Utility functions for test data
export const testData = {
  /**
   * Create a set of related test data
   */
  createTestScenario: (scenarioName = "default") => {
    const assignment = domainFactories.assignment({
      id: `assignment-${scenarioName}`,
      title: `Test Assignment - ${scenarioName}`
    });

    const submission = domainFactories.submission({
      id: `submission-${scenarioName}`,
      assignmentId: assignment.id
    });

    const grade = domainFactories.grade({
      id: `grade-${scenarioName}`,
      submissionId: submission.id,
      assignmentId: assignment.id
    });

    return { assignment, submission, grade };
  },

  /**
   * Create quiz test scenario
   */
  createQuizScenario: (scenarioName = "quiz") => {
    const answerKey = domainFactories.quizAnswerKey({
      formId: `form-${scenarioName}`
    });

    const assignment = domainFactories.assignment({
      id: `assignment-${scenarioName}`,
      isQuiz: true,
      formId: answerKey.formId
    });

    const submission = domainFactories.submission({
      id: `submission-${scenarioName}`,
      assignmentId: assignment.id,
      formId: answerKey.formId
    });

    return { assignment, submission, answerKey };
  },

  /**
   * Generate invalid test data for error scenarios
   */
  createInvalidData: {
    emptyTitle: () => requestFactories.createAssignment({ title: "" }),
    negativePoints: () => requestFactories.createAssignment({ maxPoints: -10 }),
    invalidEmail: () => requestFactories.createSubmission({ studentEmail: "invalid-email" }),
    missingFields: () => ({ title: "Only Title" }), // Missing required fields
    invalidEnum: () => ({ ...requestFactories.gradeCode(), gradingStrictness: "invalid" as "strict" | "standard" | "generous" })
  }
};

// Exports are already declared above for each factory object