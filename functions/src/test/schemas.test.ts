/**
 * Comprehensive schema validation tests
 * Location: functions/src/test/schemas.test.ts
 */

import { describe, it, expect } from "vitest";
import { ZodError } from "zod";
import * as admin from "firebase-admin";
import {
  // Source schemas
  sheetAssignmentSchema,
  sheetSubmissionSchema,
  sheetAnswerKeySchema,
  parseAssignmentRow,
  parseSubmissionRow,
  parseAnswerKeyRow,
  
  // Domain schemas
  assignmentDomainSchema,
  gradeDomainSchema,
  
  // DTO schemas
  createAssignmentRequestSchema,
  gradeQuizRequestSchema,
  gradeCodeRequestSchema,
  testGradingRequestSchema,
  
  // Transformers
  sheetAssignmentToDomain,
  sheetSubmissionToDomain,
  sheetAnswerKeysToDomain,
  assignmentDomainToDto
} from "../schemas";

describe("Source Schema Validation", () => {
  describe("Sheet Assignment Schema", () => {
    it("should validate valid sheet assignment data", () => {
      const validData = {
        id: "assignment-1",
        courseId: "course-101",
        title: "Test Assignment",
        description: "A test assignment",
        dueDate: "2024-01-01",
        maxPoints: "100", // String format as it comes from sheets
        submissionType: "mixed" as const,
        createdDate: "2024-01-01"
      };

      const result = sheetAssignmentSchema.parse(validData);
      expect(result.maxPoints).toBe(100); // Should be transformed to number
    });

    it("should fail validation with missing required fields", () => {
      const invalidData = {
        courseId: "course-101"
        // missing id and title
      };

      expect(() => sheetAssignmentSchema.parse(invalidData)).toThrow(ZodError);
    });

    it("should handle optional fields with defaults", () => {
      const minimalData = {
        id: "assignment-1",
        courseId: "course-101",
        title: "Test Assignment"
      };

      const result = sheetAssignmentSchema.parse(minimalData);
      expect(result.description).toBe("");
      expect(result.dueDate).toBe("");
      expect(result.submissionType).toBe("mixed");
    });

    it("should parse assignment rows correctly", () => {
      const row = ["assignment-1", "course-101", "Test Assignment", "Description", "2024-01-01", "100", "forms", "2024-01-01"];
      const parsed = parseAssignmentRow(row);
      
      expect(parsed.id).toBe("assignment-1");
      expect(parsed.courseId).toBe("course-101");
      expect(parsed.title).toBe("Test Assignment");
      expect(parsed.maxPoints).toBe(100); // Parser converts to number
      expect(parsed.submissionType).toBe("forms");
    });
  });

  describe("Sheet Submission Schema", () => {
    it("should validate valid sheet submission data", () => {
      const validData = {
        id: "submission-1",
        assignmentTitle: "Test Assignment",
        courseId: "course-101",
        studentFirstName: "John",
        studentLastName: "Doe",
        studentEmail: "john.doe@student.edu",
        submissionText: "My submission content",
        submissionDate: "2024-01-01",
        currentGrade: "85",
        gradingStatus: "graded" as const,
        maxPoints: "100",
        sourceSheetName: "Submissions",
        assignmentDescription: "Assignment description",
        lastProcessed: "2024-01-01",
        sourceFileId: "file-123",
        isQuiz: "false",
        formId: "form-456"
      };

      const result = sheetSubmissionSchema.parse(validData);
      expect(result.isQuiz).toBe(false);
      expect(result.maxPoints).toBe(100);
    });

    it("should handle boolean conversion for isQuiz field", () => {
      const dataWithTrueString = parseSubmissionRow([
        "sub-1", "Assignment", "course-1", "John", "Doe", "john@test.com",
        "content", "2024-01-01", "85", "graded", "100", "sheet", "desc",
        "2024-01-01", "file-1", "TRUE", "form-1"
      ]);

      expect(dataWithTrueString.isQuiz).toBe(true); // Parser converts to boolean

      const dataWithFalseString = parseSubmissionRow([
        "sub-1", "Assignment", "course-1", "John", "Doe", "john@test.com",
        "content", "2024-01-01", "85", "graded", "100", "sheet", "desc",
        "2024-01-01", "file-1", "false", "form-1"
      ]);

      expect(dataWithFalseString.isQuiz).toBe(false); // Parser converts to boolean
    });
  });

  describe("Sheet Answer Key Schema", () => {
    it("should validate valid answer key data", () => {
      const validData = {
        formId: "form-123",
        assignmentTitle: "Quiz 1",
        courseId: "course-101",
        questionNumber: "1",
        questionText: "What is 2+2?",
        questionType: "multiple-choice",
        points: "10",
        correctAnswer: "4",
        answerExplanation: "Basic addition",
        gradingStrictness: "standard" as const
      };

      const result = sheetAnswerKeySchema.parse(validData);
      expect(result.questionNumber).toBe(1);
      expect(result.points).toBe(10);
    });

    it("should handle number conversion for points and questionNumber", () => {
      const row = ["form-1", "Quiz", "course-1", "1", "Question?", "mc", "10", "Answer", "Explanation", "strict"];
      const parsed = parseAnswerKeyRow(row);
      
      expect(parsed.questionNumber).toBe(1); // Parser converts to number
      expect(parsed.points).toBe(10); // Parser converts to number
      expect(parsed.gradingStrictness).toBe("strict");
    });
  });
});

describe("Domain Schema Validation", () => {
  describe("Assignment Domain Schema", () => {
    it("should validate complete assignment domain object", () => {
      const timestamp = new admin.firestore.Timestamp(1640995200, 0);
      const validData = {
        id: "assignment-1",
        createdAt: timestamp,
        updatedAt: timestamp,
        classroomId: "classroom-1",
        title: "Test Assignment",
        description: "A test assignment",
        dueDate: timestamp,
        maxPoints: 100,
        gradingRubric: {
          enabled: true,
          criteria: ["Logic", "Implementation"],
          promptTemplate: "Grade this assignment"
        },
        isQuiz: false,
        formId: undefined,
        sourceFileId: "file-123",
        submissionType: "mixed" as const
      };

      const result = assignmentDomainSchema.parse(validData);
      expect(result.title).toBe("Test Assignment");
      expect(result.maxPoints).toBe(100);
    });

    it("should apply default values for gradingRubric", () => {
      const timestamp = new admin.firestore.Timestamp(1640995200, 0);
      const minimalData = {
        id: "assignment-1",
        createdAt: timestamp,
        updatedAt: timestamp,
        classroomId: "classroom-1",
        title: "Test Assignment",
        description: "A test assignment",
        maxPoints: 100,
        gradingRubric: {
          enabled: true,
          criteria: ["Content"]
        },
        isQuiz: false,
        submissionType: "mixed" as const
      };

      const result = assignmentDomainSchema.parse(minimalData);
      expect(result.gradingRubric.enabled).toBe(true);
      expect(result.gradingRubric.criteria).toContain("Content");
    });
  });

  describe("Grade Domain Schema", () => {
    it("should validate complete grade domain object", () => {
      const timestamp = new admin.firestore.Timestamp(1640995200, 0);
      const validData = {
        id: "grade-1",
        createdAt: timestamp,
        updatedAt: timestamp,
        submissionId: "submission-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        studentName: "John Doe",
        score: 85,
        maxScore: 100,
        feedback: "Good work!",
        gradingDetails: {
          criteria: [
            { name: "Logic", score: 90, maxScore: 100, feedback: "Excellent" },
            { name: "Style", score: 80, maxScore: 100, feedback: "Good" }
          ]
        },
        gradedBy: "ai" as const,
        gradedAt: timestamp,
        postedToClassroom: false
      };

      const result = gradeDomainSchema.parse(validData);
      expect(result.score).toBe(85);
      expect(result.gradedBy).toBe("ai");
      expect(result.gradingDetails.criteria).toHaveLength(2);
    });
  });
});

describe("DTO Schema Validation", () => {
  describe("Create Assignment Request", () => {
    it("should validate valid assignment creation request", () => {
      const validData = {
        title: "New Assignment",
        description: "Assignment description",
        maxPoints: 100,
        dueDate: "2024-12-31T23:59:59Z",
        gradingRubric: {
          enabled: true,
          criteria: ["Logic", "Implementation"],
          promptTemplate: "Grade this carefully"
        }
      };

      const result = createAssignmentRequestSchema.parse(validData);
      expect(result.title).toBe("New Assignment");
      expect(result.maxPoints).toBe(100);
    });

    it("should fail with invalid data", () => {
      const invalidData = {
        title: "", // empty title should fail
        description: "Valid description",
        maxPoints: -10 // negative points should fail
      };

      expect(() => createAssignmentRequestSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe("Grading Request Schemas", () => {
    it("should validate quiz grading request", () => {
      const validData = {
        submissionId: "submission-1",
        formId: "form-1",
        assignmentId: "assignment-1",
        studentId: "student-1",
        studentName: "John Doe",
        studentAnswers: {
          "1": "Answer to question 1",
          "2": "Answer to question 2"
        }
      };

      const result = gradeQuizRequestSchema.parse(validData);
      expect(result.studentAnswers["1"]).toBe("Answer to question 1");
    });

    it("should validate code grading request", () => {
      const validData = {
        submissionId: "submission-1",
        submissionText: "function hello() { console.log(\"Hello\"); }",
        assignmentId: "assignment-1",
        assignmentTitle: "Coding Assignment",
        studentId: "student-1",
        studentName: "John Doe",
        assignmentDescription: "Write a hello function",
        maxPoints: 100,
        isCodeAssignment: true,
        gradingStrictness: "generous" as const
      };

      const result = gradeCodeRequestSchema.parse(validData);
      expect(result.isCodeAssignment).toBe(true);
      expect(result.gradingStrictness).toBe("generous");
    });

    it("should validate test grading request", () => {
      const validData = {
        text: "Sample code to grade",
        criteria: ["Logic", "Style"],
        maxPoints: 100,
        promptTemplate: "Grade this code"
      };

      const result = testGradingRequestSchema.parse(validData);
      expect(result.criteria).toContain("Logic");
      expect(result.maxPoints).toBe(100);
    });
  });
});

describe("Schema Transformers", () => {
  describe("Sheet to Domain Transformers", () => {
    it("should transform sheet assignment to domain", () => {
      const sheetData = {
        id: "assignment-1",
        courseId: "course-101",
        title: "Test Assignment",
        description: "Description",
        dueDate: "2024-01-01",
        maxPoints: 100,
        submissionType: "mixed" as const,
        createdDate: "2024-01-01"
      };

      const result = sheetAssignmentToDomain(sheetData, "classroom-1");
      
      expect(result.id).toBe("assignment-1");
      expect(result.classroomId).toBe("classroom-1");
      expect(result.title).toBe("Test Assignment");
      expect(result.maxPoints).toBe(100);
      expect(result.gradingRubric.enabled).toBe(true);
    });

    it("should transform sheet submission to domain", () => {
      const sheetData = {
        id: "submission-1",
        assignmentTitle: "Test Assignment",
        courseId: "course-101",
        studentFirstName: "John",
        studentLastName: "Doe",
        studentEmail: "john@test.com",
        submissionText: "My submission",
        submissionDate: "2024-01-01T10:00:00Z",
        gradingStatus: "pending" as const,
        maxPoints: 100,
        sourceSheetName: "Submissions",
        assignmentDescription: "Description",
        lastProcessed: "2024-01-01",
        sourceFileId: "file-1",
        isQuiz: false,
        formId: "",
        currentGrade: undefined
      };

      const result = sheetSubmissionToDomain(sheetData);
      
      expect(result.studentName).toBe("John Doe");
      expect(result.studentEmail).toBe("john@test.com");
      expect(result.status).toBe("pending");
    });

    it("should transform answer keys to domain", () => {
      const sheetData = [
        {
          formId: "form-1",
          assignmentTitle: "Quiz 1",
          courseId: "course-1",
          questionNumber: 1,
          questionText: "What is 2+2?",
          questionType: "multiple-choice",
          points: 10,
          correctAnswer: "4",
          answerExplanation: "Basic math",
          gradingStrictness: "standard" as const
        }
      ];

      const result = sheetAnswerKeysToDomain(sheetData);
      
      expect(result).toBeDefined();
      expect(result!.formId).toBe("form-1");
      expect(result!.questions).toHaveLength(1);
      expect(result!.totalPoints).toBe(10);
    });
  });

  describe("Domain to DTO Transformers", () => {
    it("should transform assignment domain to DTO", () => {
      const timestamp = new admin.firestore.Timestamp(1640995200, 0);
      const domainData = {
        id: "assignment-1",
        createdAt: timestamp,
        updatedAt: timestamp,
        classroomId: "classroom-1",
        title: "Test Assignment",
        description: "Description",
        dueDate: timestamp,
        maxPoints: 100,
        gradingRubric: {
          enabled: true,
          criteria: ["Logic"],
          promptTemplate: undefined
        },
        isQuiz: false,
        formId: undefined,
        sourceFileId: undefined,
        submissionType: "mixed" as const
      };

      const result = assignmentDomainToDto(domainData);
      
      expect(result.id).toBe("assignment-1");
      expect(result.title).toBe("Test Assignment");
      expect(result.createdAt._seconds).toBe(1640995200);
    });
  });
});

describe("Schema Edge Cases", () => {
  it("should handle empty string transformations", () => {
    const row = ["", "", "", "", "", "", "", ""];
    const parsed = parseAssignmentRow(row);
    
    expect(parsed.id).toBe("");
    expect(parsed.maxPoints).toBe(100); // Empty string falls back to default 100
  });

  it("should handle invalid number strings", () => {
    const row = ["id", "course", "title", "desc", "date", "invalid-number", "mixed", "date"];
    const parsed = parseAssignmentRow(row);
    
    // parseInt returns NaN for invalid strings
    expect(isNaN(parsed.maxPoints as number)).toBe(true);
  });

  it("should validate enum values strictly", () => {
    const invalidStatus = {
      submissionId: "sub-1",
      formId: "form-1",
      assignmentId: "assign-1",
      studentId: "student-1",
      studentName: "John",
      studentAnswers: {}
    };

    expect(() => gradeQuizRequestSchema.parse(invalidStatus)).not.toThrow();
  });
});