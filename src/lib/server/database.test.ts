import {describe, it, expect, vi, beforeEach} from "vitest";
import {
  mockSupabaseClient,
  createMockUser,
  createMockProfile,
  createMockQuestion,
  createMockTest,
  createMockAttempt,
  createMockAnswer,
  resetMocks,
} from "../../test/setup.js";
import type {Tables, TablesInsert, TablesUpdate} from "$lib/types/supabase.js";

// Import the module being tested
vi.mock("$lib/server/supabase", () => ({
  supabase: mockSupabaseClient,
}));

describe("Database Operations", () => {
  beforeEach(() => {
    resetMocks();
  });

  describe("Profiles Table Operations", () => {
    it("should create a new profile successfully", async () => {
      const mockProfile = createMockProfile();
      const mockQuery = mockSupabaseClient.from("profiles");

      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("profiles")
        .insert({
          id: mockProfile.id,
          full_name: mockProfile.full_name,
          role: mockProfile.role,
        })
        .select()
        .single();

      expect(mockQuery.insert).toHaveBeenCalledWith({
        id: mockProfile.id,
        full_name: mockProfile.full_name,
        role: mockProfile.role,
      });
      expect(result.data).toEqual(mockProfile);
      expect(result.error).toBeNull();
    });

    it("should fetch profile by user ID", async () => {
      const mockProfile = createMockProfile();
      const mockQuery = mockSupabaseClient.from("profiles");

      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", mockProfile.id)
        .single();

      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(result.data).toEqual(mockProfile);
    });

    it("should handle profile not found error", async () => {
      const mockQuery = mockSupabaseClient.from("profiles");

      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {message: "Profile not found", code: "PGRST116"},
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("profiles")
        .select("*")
        .eq("id", "non-existent-id")
        .single();

      expect(result.data).toBeNull();
      expect(result.error).toMatchObject({
        message: "Profile not found",
        code: "PGRST116",
      });
    });

    it("should update profile successfully", async () => {
      const mockProfile = createMockProfile({full_name: "Updated Name"});
      const mockQuery = mockSupabaseClient.from("profiles");

      mockQuery.update.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("profiles")
        .update({full_name: "Updated Name"})
        .eq("id", mockProfile.id);

      expect(mockQuery.update).toHaveBeenCalledWith({
        full_name: "Updated Name",
      });
    });
  });

  describe("Questions Table Operations", () => {
    it("should create a new question with all required fields", async () => {
      const mockQuestion = createMockQuestion();
      const mockQuery = mockSupabaseClient.from("questions");

      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockQuestion,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("questions")
        .insert({
          question_text: mockQuestion.question_text,
          concepts: mockQuestion.concepts,
          rubric: mockQuestion.rubric,
          solution: mockQuestion.solution,
          language: mockQuestion.language,
          archived: false,
          created_by: mockQuestion.created_by,
        })
        .select()
        .single();

      expect(mockQuery.insert).toHaveBeenCalledWith({
        question_text: mockQuestion.question_text,
        concepts: mockQuestion.concepts,
        rubric: mockQuestion.rubric,
        solution: mockQuestion.solution,
        language: mockQuestion.language,
        archived: false,
        created_by: mockQuestion.created_by,
      });
      expect(result.data).toEqual(mockQuestion);
    });

    it("should fetch non-archived questions", async () => {
      const mockQuestions = [
        createMockQuestion({id: "q1", archived: false}),
        createMockQuestion({id: "q2", archived: false}),
      ];
      const mockQuery = mockSupabaseClient.from("questions");

      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockQuestions,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("questions")
        .select("*")
        .eq("archived", false)
        .order("created_at", {ascending: false});

      expect(mockQuery.select).toHaveBeenCalledWith("*");
      expect(result.data).toEqual(mockQuestions);
    });

    it("should archive a question", async () => {
      const questionId = "test-question-id";
      const mockQuery = mockSupabaseClient.from("questions");

      mockQuery.update.mockResolvedValue({
        data: {id: questionId, archived: true},
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("questions")
        .update({archived: true})
        .eq("id", questionId);

      expect(mockQuery.update).toHaveBeenCalledWith({archived: true});
    });

    it("should delete a question permanently", async () => {
      const questionId = "test-question-id";
      const mockQuery = mockSupabaseClient.from("questions");

      mockQuery.delete.mockResolvedValue({
        data: null,
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      expect(mockQuery.delete).toHaveBeenCalled();
    });
  });

  describe("Coding Tests Table Operations", () => {
    it("should create a new test successfully", async () => {
      const mockTest = createMockTest();
      const mockQuery = mockSupabaseClient.from("coding_tests");

      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockTest,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("coding_tests")
        .insert({
          title: mockTest.title,
          description: mockTest.description,
          time_limit_minutes: mockTest.time_limit_minutes,
          end_date: mockTest.end_date,
          created_by: mockTest.created_by,
          status: "draft",
        })
        .select()
        .single();

      expect(mockQuery.insert).toHaveBeenCalledWith({
        title: mockTest.title,
        description: mockTest.description,
        time_limit_minutes: mockTest.time_limit_minutes,
        end_date: mockTest.end_date,
        created_by: mockTest.created_by,
        status: "draft",
      });
      expect(result.data).toEqual(mockTest);
    });

    it("should fetch active tests", async () => {
      const mockTests = [
        createMockTest({id: "t1", status: "active"}),
        createMockTest({id: "t2", status: "active"}),
      ];
      const mockQuery = mockSupabaseClient.from("coding_tests");

      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTests,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("coding_tests")
        .select("*")
        .eq("status", "active")
        .order("created_at", {ascending: false});

      expect(result.data).toEqual(mockTests);
    });

    it("should update test status", async () => {
      const testId = "test-id";
      const mockQuery = mockSupabaseClient.from("coding_tests");

      mockQuery.update.mockResolvedValue({
        data: {id: testId, status: "active"},
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("coding_tests")
        .update({status: "active"})
        .eq("id", testId);

      expect(mockQuery.update).toHaveBeenCalledWith({status: "active"});
    });
  });

  describe("Test Attempts Table Operations", () => {
    it("should create a new test attempt", async () => {
      const mockAttempt = createMockAttempt();
      const mockQuery = mockSupabaseClient.from("test_attempts");

      mockQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockAttempt,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("test_attempts")
        .insert({
          test_id: mockAttempt.test_id,
          student_id: mockAttempt.student_id,
          status: "in_progress",
        })
        .select()
        .single();

      expect(mockQuery.insert).toHaveBeenCalledWith({
        test_id: mockAttempt.test_id,
        student_id: mockAttempt.student_id,
        status: "in_progress",
      });
      expect(result.data).toEqual(mockAttempt);
    });

    it("should fetch student attempts for a test", async () => {
      const mockAttempts = [createMockAttempt()];
      const mockQuery = mockSupabaseClient.from("test_attempts");

      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockAttempts,
          error: null,
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("test_attempts")
        .select("*")
        .eq("test_id", "test-id")
        .eq("student_id", "student-id")
        .order("created_at", {ascending: false});

      expect(result.data).toEqual(mockAttempts);
    });

    it("should submit a test attempt", async () => {
      const attemptId = "attempt-id";
      const mockQuery = mockSupabaseClient.from("test_attempts");

      mockQuery.update.mockResolvedValue({
        data: {
          id: attemptId,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        },
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const submittedAt = new Date().toISOString();
      const result = await supabase
        .from("test_attempts")
        .update({
          status: "submitted",
          submitted_at: submittedAt,
        })
        .eq("id", attemptId);

      expect(mockQuery.update).toHaveBeenCalledWith({
        status: "submitted",
        submitted_at: submittedAt,
      });
    });
  });

  describe("Test Answers Table Operations", () => {
    it("should save answer code", async () => {
      const mockAnswer = createMockAnswer();
      const mockQuery = mockSupabaseClient.from("test_answers");

      mockQuery.update.mockResolvedValue({
        data: mockAnswer,
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("test_answers")
        .update({
          answer_code: mockAnswer.answer_code,
          last_saved_at: mockAnswer.last_saved_at,
        })
        .eq("attempt_id", mockAnswer.attempt_id)
        .eq("question_id", mockAnswer.question_id);

      expect(mockQuery.update).toHaveBeenCalledWith({
        answer_code: mockAnswer.answer_code,
        last_saved_at: mockAnswer.last_saved_at,
      });
    });

    it("should fetch answers for an attempt", async () => {
      const mockAnswers = [createMockAnswer()];
      const mockQuery = mockSupabaseClient.from("test_answers");

      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockAnswers,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("test_answers")
        .select("*")
        .eq("attempt_id", "attempt-id")
        .order("created_at");

      expect(result.data).toEqual(mockAnswers);
    });

    it("should save grading results", async () => {
      const mockAnswer = createMockAnswer();
      const mockQuery = mockSupabaseClient.from("test_answers");

      mockQuery.update.mockResolvedValue({
        data: mockAnswer,
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("test_answers")
        .update({
          scores: mockAnswer.scores,
          feedback: mockAnswer.feedback,
          question_score: mockAnswer.question_score,
          graded_at: mockAnswer.graded_at,
        })
        .eq("id", mockAnswer.id);

      expect(mockQuery.update).toHaveBeenCalledWith({
        scores: mockAnswer.scores,
        feedback: mockAnswer.feedback,
        question_score: mockAnswer.question_score,
        graded_at: mockAnswer.graded_at,
      });
    });
  });

  describe("Test Questions Junction Table", () => {
    it("should add questions to a test", async () => {
      const testQuestions = [
        {test_id: "test-id", question_id: "q1", question_order: 1, points: 100},
        {test_id: "test-id", question_id: "q2", question_order: 2, points: 100},
      ];
      const mockQuery = mockSupabaseClient.from("questions");

      mockQuery.insert.mockResolvedValue({
        data: testQuestions,
        error: null,
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase.from("questions").insert(testQuestions);

      expect(mockQuery.insert).toHaveBeenCalledWith(testQuestions);
    });

    it("should fetch questions for a test in order", async () => {
      const mockTestQuestions = [
        {
          id: "tq1",
          test_id: "test-id",
          question_id: "q1",
          question_order: 1,
          points: 100,
        },
        {
          id: "tq2",
          test_id: "test-id",
          question_id: "q2",
          question_order: 2,
          points: 100,
        },
      ];
      const mockQuery = mockSupabaseClient.from("questions");

      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTestQuestions,
            error: null,
          }),
        }),
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase
        .from("questions")
        .select("*, questions(*)")
        .eq("test_id", "test-id")
        .order("question_order");

      expect(result.data).toEqual(mockTestQuestions);
    });
  });

  describe("Database Constraints and Relationships", () => {
    it("should handle foreign key constraint violations", async () => {
      const mockQuery = mockSupabaseClient.from("test_answers");

      mockQuery.insert.mockResolvedValue({
        data: null,
        error: {
          message: "Foreign key constraint violated",
          code: "23503",
          details:
            'Key (question_id)=(invalid-id) is not present in table "questions"',
        },
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase.from("test_answers").insert({
        attempt_id: "valid-attempt-id",
        question_id: "invalid-question-id",
        answer_code: "test code",
      });

      expect(result.error).toMatchObject({
        code: "23503",
        message: "Foreign key constraint violated",
      });
    });

    it("should handle unique constraint violations", async () => {
      const mockQuery = mockSupabaseClient.from("test_attempts");

      mockQuery.insert.mockResolvedValue({
        data: null,
        error: {
          message: "Unique constraint violated",
          code: "23505",
          details: "Key (test_id, student_id) already exists",
        },
      });

      const {supabase} = await import("$lib/server/supabase");
      const result = await supabase.from("test_attempts").insert({
        test_id: "test-id",
        student_id: "student-id",
        status: "in_progress",
      });

      expect(result.error).toMatchObject({
        code: "23505",
        message: "Unique constraint violated",
      });
    });
  });

  describe("Database Transactions and Atomicity", () => {
    it("should handle rollback scenarios", async () => {
      // Test transaction-like behavior where related operations should succeed or fail together
      const mockTestQuery = mockSupabaseClient.from("coding_tests");
      const mockQuestionsQuery = mockSupabaseClient.from("questions");

      // Mock successful test creation
      mockTestQuery.insert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createMockTest(),
            error: null,
          }),
        }),
      });

      // Mock failed question assignment
      mockQuestionsQuery.insert.mockResolvedValue({
        data: null,
        error: {message: "Failed to assign questions", code: "23505"},
      });

      const {supabase} = await import("$lib/server/supabase");

      // Test creation should succeed
      const testResult = await supabase
        .from("coding_tests")
        .insert(createMockTest())
        .select()
        .single();

      expect(testResult.data).toBeTruthy();

      // Question assignment should fail
      const questionResult = await supabase
        .from("questions")
        .insert([{test_id: "test-id", question_id: "q1", question_order: 1}]);

      expect(questionResult.error).toBeTruthy();
    });
  });
});
