import { describe, it, expect } from 'vitest'
import type { Question, Submission, GradingResult, QuestionData, JavaConcept } from './index.js'

describe('Type Definitions', () => {
  describe('JavaConcept', () => {
    it('should accept valid Java concepts', () => {
      const validConcepts: JavaConcept[] = [
        'variables',
        'data-types', 
        'conditionals',
        'loops',
        'methods',
        'arrays',
        'strings',
        'input-output'
      ]

      // Type check - should compile without errors
      expect(validConcepts).toHaveLength(8)
    })
  })

  describe('Question Type', () => {
    it('should have correct structure for database questions', () => {
      const mockQuestion: Question = {
        id: 'test-id',
        question_text: 'Write a Java method',
        rubric: {
          communication: { weight: 0.25, description: 'test', criteria: ['test'] },
          correctness: { weight: 0.5, description: 'test', criteria: ['test'] },
          logic: { weight: 0.25, description: 'test', criteria: ['test'] }
        },
        solution: {
          code: 'public void test() {}',
          explanation: 'Test method'
        },
        java_concepts: ['variables'],
        created_by: 'user-id',
        archived: false,
        created_at: '2024-01-01T00:00:00Z'
      }

      expect(mockQuestion.id).toBe('test-id')
      expect(mockQuestion.question_text).toBeTruthy()
      expect(mockQuestion.java_concepts).toContain('variables')
      expect(mockQuestion.rubric.communication.weight).toBe(0.25)
      expect(mockQuestion.solution?.code).toBeTruthy()
    })
  })

  describe('Submission Type', () => {
    it('should have correct structure for grading submissions', () => {
      const mockSubmission: Submission = {
        id: 'sub-id',
        question_id: 'q-id', 
        student_id: 'student-id',
        teacher_id: 'teacher-id',
        image_url: 'path/to/image.jpg',
        extracted_code: 'public void test() {}',
        scores: {
          communication: 3,
          correctness: 4,
          logic: 3
        },
        feedback: {
          communication: 'Good formatting',
          correctness: 'Correct syntax', 
          logic: 'Sound approach'
        },
        overall_score: 3.5,
        status: 'graded',
        created_at: '2024-01-01T00:00:00Z',
        graded_at: '2024-01-01T01:00:00Z'
      }

      expect(mockSubmission.status).toBe('graded')
      expect(mockSubmission.overall_score).toBe(3.5)
      expect(mockSubmission.scores).toHaveProperty('communication')
      expect(mockSubmission.feedback).toHaveProperty('correctness')
    })
  })

  describe('GradingResult Type', () => {
    it('should match Claude API response structure', () => {
      const mockResult: GradingResult = {
        extractedCode: 'public boolean isEven(int n) { return n % 2 == 0; }',
        scores: {
          communication: 4,
          correctness: 4,
          logic: 4
        },
        feedback: {
          communication: 'Excellent code formatting and readability',
          correctness: 'Perfect Java syntax and conventions',
          logic: 'Correctly implements even number check'
        },
        overallScore: 4.0,
        generalComments: 'Outstanding work! Clean, correct, and well-formatted code.'
      }

      expect(mockResult.extractedCode).toContain('public boolean')
      expect(mockResult.scores.communication).toBe(4)
      expect(mockResult.feedback.logic).toContain('even number')
      expect(mockResult.overallScore).toBe(4.0)
      expect(mockResult.generalComments).toBeTruthy()
    })

    it('should handle partial scoring scenarios', () => {
      const partialResult: GradingResult = {
        extractedCode: 'int x = 5; // incomplete method',
        scores: {
          communication: 2,
          correctness: 1,
          logic: 1
        },
        feedback: {
          communication: 'Basic formatting present but could be improved',
          correctness: 'Incomplete method signature and missing return',
          logic: 'Does not solve the intended problem'
        },
        overallScore: 1.25,
        generalComments: 'Good start but needs more work on method structure.'
      }

      expect(partialResult.overallScore).toBeLessThan(2)
      expect(partialResult.scores.correctness).toBe(1)
      expect(partialResult.feedback.correctness).toContain('Incomplete')
    })
  })

  describe('QuestionData Type', () => {
    it('should match question generation API structure', () => {
      const mockQuestionData: QuestionData = {
        question: 'Write a Java method called `calculateAverage` that takes an array of integers and returns the average as a double.',
        rubric: {
          communication: {
            description: 'Code formatting, readability, and documentation',
            weight: 0.25,
            criteria: ['proper indentation', 'clear variable names', 'readable structure']
          },
          correctness: {
            description: 'Syntax accuracy and Java conventions',
            weight: 0.50,
            criteria: ['correct syntax', 'proper method signature', 'follows Java naming conventions']
          },
          logic: {
            description: 'Problem-solving approach and algorithm correctness',
            weight: 0.25,
            criteria: ['solves the problem correctly', 'handles edge cases', 'efficient approach']
          }
        },
        solution: {
          code: 'public double calculateAverage(int[] numbers) {\n  if (numbers.length == 0) return 0.0;\n  int sum = 0;\n  for (int num : numbers) {\n    sum += num;\n  }\n  return (double) sum / numbers.length;\n}',
          explanation: 'This method calculates the average by summing all elements and dividing by the array length, with proper handling of empty arrays.'
        },
        concepts: ['arrays', 'loops', 'methods', 'data-types']
      }

      expect(mockQuestionData.question).toContain('calculateAverage')
      expect(mockQuestionData.rubric.communication.weight).toBe(0.25)
      expect(mockQuestionData.rubric.correctness.weight).toBe(0.50)
      expect(mockQuestionData.rubric.logic.weight).toBe(0.25)
      expect(mockQuestionData.solution.code).toContain('public double')
      expect(mockQuestionData.concepts).toContain('arrays')

      // Verify rubric weights sum to 1.0
      const totalWeight = mockQuestionData.rubric.communication.weight + 
                         mockQuestionData.rubric.correctness.weight + 
                         mockQuestionData.rubric.logic.weight
      expect(totalWeight).toBe(1.0)
    })
  })
})