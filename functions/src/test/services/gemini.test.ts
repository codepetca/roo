/**
 * Gemini service tests
 * Location: functions/src/test/services/gemini.test.ts
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiService, createGeminiService, GRADING_PROMPTS } from "../../services/gemini";
import { requestFactories } from "../factories";

// Mock @google/generative-ai
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn()
    })
  }))
}));

describe("GeminiService", () => {
  let service: GeminiService;
  let mockModel: { generateContent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockModel = {
      generateContent: vi.fn()
    };
    service = new GeminiService(mockModel);
  });

  describe("gradeSubmission", () => {
    it("should grade a code submission successfully", async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: 85,
            feedback: "Good implementation with room for improvement.",
            criteriaScores: [
              { name: "Logic", score: 90, maxScore: 100, feedback: "Excellent logical flow" },
              { name: "Implementation", score: 80, maxScore: 100, feedback: "Good implementation" }
            ]
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const request = requestFactories.gradeCode();
      const result = await service.gradeSubmission({
        submissionId: request.submissionId,
        assignmentId: request.assignmentId,
        title: request.assignmentTitle,
        description: request.assignmentDescription,
        maxPoints: request.maxPoints,
        criteria: ["Logic", "Implementation"],
        submission: request.studentWork
      });

      expect(result.score).toBe(85);
      expect(result.feedback).toBe("Good implementation with room for improvement.");
      expect(result.criteriaScores).toHaveLength(2);
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining(request.assignmentTitle)
      );
    });

    it("should use custom prompt template when provided", async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: 90,
            feedback: "Excellent work!",
            criteriaScores: []
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const customPrompt = "Custom grading prompt: {title} - {submission}";
      const request = {
        submissionId: "test-submission",
        assignmentId: "test-assignment",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission",
        promptTemplate: customPrompt
      };

      await service.gradeSubmission(request);

      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("Custom grading prompt: Test Assignment")
      );
    });

    it("should clamp score within bounds", async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: 150, // Above maximum
            feedback: "Perfect work!",
            criteriaScores: []
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const request = {
        submissionId: "test-submission",
        assignmentId: "test-assignment",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission"
      };

      const result = await service.gradeSubmission(request);

      expect(result.score).toBe(100); // Clamped to maxPoints
    });

    it("should handle negative scores", async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: -10, // Below minimum
            feedback: "Needs improvement",
            criteriaScores: []
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const request = {
        submissionId: "test-submission",
        assignmentId: "test-assignment",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission"
      };

      const result = await service.gradeSubmission(request);

      expect(result.score).toBe(0); // Clamped to minimum
    });

    it("should throw error for invalid JSON response", async () => {
      const mockResponse = {
        response: {
          text: () => "Invalid response format without JSON"
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const request = {
        submissionId: "test-submission",
        assignmentId: "test-assignment",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission"
      };

      await expect(service.gradeSubmission(request)).rejects.toThrow("Invalid response format from AI");
    });

    it("should throw error for malformed grading response", async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: "not a number", // Invalid type
            feedback: null,
            criteriaScores: "not an array"
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const request = {
        submissionId: "test-submission",
        assignmentId: "test-assignment",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission"
      };

      await expect(service.gradeSubmission(request)).rejects.toThrow("Invalid grading response structure");
    });

    it("should enforce rate limiting", async () => {
      // Make 16 requests quickly to exceed the 15 requests per minute limit
      const request = {
        submissionId: "test-submission",
        assignmentId: "same-assignment", // Same assignment for rate limiting
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission"
      };

      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: 85,
            feedback: "Good work",
            criteriaScores: []
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      // Make 15 successful requests
      for (let i = 0; i < 15; i++) {
        await service.gradeSubmission({ ...request, submissionId: `sub-${i}` });
      }

      // 16th request should be rate limited
      await expect(service.gradeSubmission({ ...request, submissionId: "sub-16" }))
        .rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("gradeQuiz", () => {
    it("should grade multiple choice questions correctly", async () => {
      const request = requestFactories.gradeQuiz();
      const answerKey = {
        formId: "quiz-form-1",
        assignmentTitle: "Test Quiz",
        courseId: "course-101",
        questions: [
          {
            questionNumber: 1,
            questionText: "What is 2+2?",
            questionType: "MULTIPLE_CHOICE",
            points: 10,
            correctAnswer: "4",
            answerExplanation: "Basic addition",
            gradingStrictness: "standard" as const
          },
          {
            questionNumber: 2,
            questionText: "What is the capital of France?",
            questionType: "MULTIPLE_CHOICE",
            points: 10,
            correctAnswer: "Paris",
            answerExplanation: "Geography",
            gradingStrictness: "standard" as const
          }
        ],
        totalPoints: 20
      };

      const result = await service.gradeQuiz({
        submissionId: request.submissionId,
        formId: request.formId,
        studentAnswers: {
          1: "4",      // Correct
          2: "London"  // Incorrect
        },
        answerKey
      });

      expect(result.totalScore).toBe(10);
      expect(result.questionGrades).toHaveLength(2);
      expect(result.questionGrades[0].score).toBe(10);
      expect(result.questionGrades[1].score).toBe(0);
      expect(result.questionGrades[0].feedback).toBe("Correct!");
      expect(result.questionGrades[1].feedback).toContain("The correct answer is: Paris");
    });

    it("should use AI grading for text/code questions", async () => {
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            score: 8,
            feedback: "Good understanding, minor syntax error"
          })
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const answerKey = {
        formId: "quiz-form-1",
        assignmentTitle: "Code Quiz",
        courseId: "course-101",
        questions: [
          {
            questionNumber: 1,
            questionText: "Write a function that adds two numbers",
            questionType: "TEXT",
            points: 10,
            correctAnswer: "function add(a, b) { return a + b; }",
            answerExplanation: "Basic function syntax",
            gradingStrictness: "generous" as const
          }
        ],
        totalPoints: 10
      };

      const result = await service.gradeQuiz({
        submissionId: "sub-1",
        formId: "form-1",
        studentAnswers: {
          1: "function add(a, b) return a + b end" // Lua-like syntax instead of JS
        },
        answerKey
      });

      expect(result.totalScore).toBe(8);
      expect(result.questionGrades[0].feedback).toBe("Good understanding, minor syntax error");
      expect(mockModel.generateContent).toHaveBeenCalled();
    });

    it("should handle AI grading errors gracefully", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("AI service unavailable"));

      const answerKey = {
        formId: "quiz-form-1",
        assignmentTitle: "Code Quiz",
        courseId: "course-101",
        questions: [
          {
            questionNumber: 1,
            questionText: "Write a function",
            questionType: "TEXT",
            points: 10,
            correctAnswer: "function example() {}",
            answerExplanation: "Example",
            gradingStrictness: "standard" as const
          }
        ],
        totalPoints: 10
      };

      const result = await service.gradeQuiz({
        submissionId: "sub-1",
        formId: "form-1",
        studentAnswers: {
          1: "function example() { console.log(\"hello\"); }"
        },
        answerKey
      });

      // Should give partial credit for attempts when AI fails
      expect(result.totalScore).toBe(5); // 50% of 10 points
      expect(result.questionGrades[0].feedback).toContain("Grading error occurred");
    });

    it("should handle malformed AI responses", async () => {
      const mockResponse = {
        response: {
          text: () => "Not valid JSON response"
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const answerKey = {
        formId: "quiz-form-1",
        assignmentTitle: "Code Quiz",
        courseId: "course-101",
        questions: [
          {
            questionNumber: 1,
            questionText: "Write a function",
            questionType: "TEXT",
            points: 10,
            correctAnswer: "function example() {}",
            answerExplanation: "Example",
            gradingStrictness: "standard" as const
          }
        ],
        totalPoints: 10
      };

      const result = await service.gradeQuiz({
        submissionId: "sub-1",
        formId: "form-1",
        studentAnswers: {
          1: "some answer"
        },
        answerKey
      });

      // Should give partial credit when unable to parse AI response
      expect(result.totalScore).toBe(5); // 50% of 10 points
      expect(result.questionGrades[0].feedback).toContain("Could not parse AI response");
    });

    it("should enforce rate limiting for quiz grading", async () => {
      const answerKey = {
        formId: "same-form",
        assignmentTitle: "Test Quiz",
        courseId: "course-101",
        questions: [
          {
            questionNumber: 1,
            questionText: "Question",
            questionType: "MULTIPLE_CHOICE",
            points: 10,
            correctAnswer: "Answer",
            answerExplanation: "Explanation",
            gradingStrictness: "standard" as const
          }
        ],
        totalPoints: 10
      };

      // Make 15 successful requests
      for (let i = 0; i < 15; i++) {
        await service.gradeQuiz({
          submissionId: `sub-${i}`,
          formId: "same-form",
          studentAnswers: { 1: "Answer" },
          answerKey
        });
      }

      // 16th request should be rate limited
      await expect(service.gradeQuiz({
        submissionId: "sub-16",
        formId: "same-form",
        studentAnswers: { 1: "Answer" },
        answerKey
      })).rejects.toThrow("Rate limit exceeded");
    });
  });

  describe("testConnection", () => {
    it("should return true for successful connection", async () => {
      const mockResponse = {
        response: {
          text: () => "Hello, Roo! I can read this message."
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining("Hello, Roo!")
      );
    });

    it("should return false for failed connection", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Connection failed"));

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it("should return false for unexpected response", async () => {
      const mockResponse = {
        response: {
          text: () => "Unexpected response without the expected phrase"
        }
      };

      mockModel.generateContent.mockResolvedValue(mockResponse);

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe("buildQuestionGradingPrompt", () => {
    it("should use generous grading for code questions", () => {
      const question = {
        questionText: "Write a function that prints hello world",
        gradingStrictness: "standard",
        points: 10,
        correctAnswer: "function hello() { console.log(\"Hello World\"); }",
        answerExplanation: "Basic function"
      };

      const studentAnswer = "function hello() { console.log(\"Hello World\") }"; // Missing semicolon
      
      // Access private method for testing
      const prompt = (service as { [key: string]: (...args: unknown[]) => unknown }).buildQuestionGradingPrompt(question, studentAnswer);

      expect(prompt).toContain("GENEROUS GRADING MODE");
      expect(prompt).toContain("Focus on understanding and logic over syntax");
    });

    it("should use strict grading when specified", () => {
      const question = {
        questionText: "What is the exact syntax for declaring a variable?",
        gradingStrictness: "strict",
        points: 5,
        correctAnswer: "var x = 10;"
      };

      const studentAnswer = "var x = 10";
      
      const prompt = (service as { [key: string]: (...args: unknown[]) => unknown }).buildQuestionGradingPrompt(question, studentAnswer);

      expect(prompt).toContain("STRICT GRADING MODE");
      expect(prompt).toContain("Accuracy and precision are important");
    });

    it("should detect code questions by content", () => {
      const question = {
        questionText: "What is the capital of France?",
        gradingStrictness: "standard",
        points: 5,
        correctAnswer: "Paris"
      };

      const studentAnswer = "function test() { return \"Paris\"; }"; // Student wrote code
      
      const prompt = (service as { [key: string]: (...args: unknown[]) => unknown }).buildQuestionGradingPrompt(question, studentAnswer);

      expect(prompt).toContain("GENEROUS GRADING MODE"); // Should detect code in answer
    });
  });

  describe("prompt templates", () => {
    it("should have default grading prompt", () => {
      expect(GRADING_PROMPTS.default).toContain("{criteria}");
      expect(GRADING_PROMPTS.default).toContain("{title}");
      expect(GRADING_PROMPTS.default).toContain("{submission}");
      expect(GRADING_PROMPTS.default).toContain("JSON");
    });

    it("should have generous code grading prompt", () => {
      expect(GRADING_PROMPTS.generousCode).toContain("GENEROUS GRADING");
      expect(GRADING_PROMPTS.generousCode).toContain("handwritten code");
      expect(GRADING_PROMPTS.generousCode).toContain("Missing semicolons");
    });

    it("should have specific prompts for different assignment types", () => {
      expect(GRADING_PROMPTS.essay).toContain("essay");
      expect(GRADING_PROMPTS.essay).toContain("Thesis clarity");
      
      expect(GRADING_PROMPTS.code).toContain("programming");
      expect(GRADING_PROMPTS.code).toContain("Code correctness");
    });
  });

  describe("error handling", () => {
    it("should handle API timeout errors", async () => {
      mockModel.generateContent.mockRejectedValue(new Error("Request timeout"));

      const request = {
        submissionId: "test-submission",
        assignmentId: "test-assignment",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission"
      };

      await expect(service.gradeSubmission(request)).rejects.toThrow("Request timeout");
    });

    it("should handle quota exceeded errors", async () => {
      const quotaError = new Error("Quota exceeded");
      mockModel.generateContent.mockRejectedValue(quotaError);

      const request = {
        submissionId: "test-submission",
        assignmentId: "test-assignment",
        title: "Test Assignment",
        description: "Test description",
        maxPoints: 100,
        criteria: ["Understanding"],
        submission: "Test submission"
      };

      await expect(service.gradeSubmission(request)).rejects.toThrow("Quota exceeded");
    });
  });
});

describe("createGeminiService", () => {
  it("should create service instance with API key", () => {
    const service = createGeminiService("test-api-key");
    
    expect(service).toBeInstanceOf(GeminiService);
  });

  it("should initialize GoogleGenerativeAI with correct model", async () => {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    
    createGeminiService("test-api-key");
    
    expect(GoogleGenerativeAI).toHaveBeenCalledWith("test-api-key");
  });
});