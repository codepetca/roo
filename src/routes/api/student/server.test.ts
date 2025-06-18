import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as GetAvailableTests } from './available-tests/+server.js'
import { GET as GetAttempts } from './attempts/+server.js'
import { GET as GetResults } from './results/[attemptId]/+server.js'
import { mockSupabaseClient, createMockUser, createMockTest, createMockAttempt, createMockAnswer, createMockQuestion, resetMocks } from '../../../test/setup.js'
import type { RequestEvent } from '@sveltejs/kit'

// Mock dependencies
vi.mock('$lib/server/supabase', () => ({
  supabase: mockSupabaseClient
}))

describe('Student API Endpoints', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('GET /api/student/available-tests - Get Available Tests', () => {
    it('should return available tests for student', async () => {
      const mockTests = [
        createMockTest({ 
          id: 't1', 
          title: 'Java Basics Test',
          status: 'active',
          end_date: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
        }),
        createMockTest({ 
          id: 't2', 
          title: 'Advanced Java Test',
          status: 'active',
          start_date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          end_date: new Date(Date.now() + 82800000).toISOString() // 23 hours from now
        })
      ]

      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      // Mock database response for active tests
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTests,
              error: null
            })
          })
        })
      })

      const response = await GetAvailableTests(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(2)
      expect(responseData.data[0]).toMatchObject({
        id: 't1',
        title: 'Java Basics Test',
        status: 'active'
      })
    })

    it('should filter out expired tests', async () => {
      const mockTests = [
        createMockTest({ 
          id: 't1', 
          title: 'Current Test',
          status: 'active',
          end_date: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
        }),
        createMockTest({ 
          id: 't2', 
          title: 'Expired Test',
          status: 'active',
          end_date: new Date(Date.now() - 3600000).toISOString() // 1 hour ago (expired)
        })
      ]

      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTests,
              error: null
            })
          })
        })
      })

      const response = await GetAvailableTests(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      // Should only return non-expired tests
      expect(responseData.data).toHaveLength(1)
      expect(responseData.data[0].title).toBe('Current Test')
    })

    it('should handle tests that haven\'t started yet', async () => {
      const mockTests = [
        createMockTest({ 
          id: 't1', 
          title: 'Future Test',
          status: 'active',
          start_date: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          end_date: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
        }),
        createMockTest({ 
          id: 't2', 
          title: 'Available Test',
          status: 'active',
          start_date: null, // Immediate availability
          end_date: new Date(Date.now() + 86400000).toISOString()
        })
      ]

      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTests,
              error: null
            })
          })
        })
      })

      const response = await GetAvailableTests(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toHaveLength(2)
      // Both tests should be returned with appropriate metadata
      const futureTest = responseData.data.find((t: any) => t.id === 't1')
      const availableTest = responseData.data.find((t: any) => t.id === 't2')
      
      expect(futureTest).toBeTruthy()
      expect(availableTest).toBeTruthy()
    })

    it('should return 400 when studentId is missing', async () => {
      const mockRequest = new Request('http://localhost') // No studentId
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      const response = await GetAvailableTests(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('Student ID is required')
    })

    it('should handle database errors gracefully', async () => {
      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed', code: '500' }
            })
          })
        })
      })

      const response = await GetAvailableTests(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeTruthy()
    })
  })

  describe('GET /api/student/attempts - Get Student Attempts', () => {
    it('should return student test attempts with test details', async () => {
      const mockAttempts = [
        createMockAttempt({ 
          id: 'a1',
          test_id: 't1',
          status: 'submitted',
          total_score: 85.5,
          submitted_at: new Date().toISOString()
        }),
        createMockAttempt({ 
          id: 'a2',
          test_id: 't2',
          status: 'in_progress',
          total_score: null,
          submitted_at: null
        })
      ]

      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockAttempts.map(attempt => ({
                ...attempt,
                coding_tests: {
                  id: attempt.test_id,
                  title: `Test for ${attempt.id}`,
                  time_limit_minutes: 60
                }
              })),
              error: null
            })
          })
        })
      })

      const response = await GetAttempts(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(2)
      
      const submittedAttempt = responseData.data.find((a: any) => a.id === 'a1')
      expect(submittedAttempt.status).toBe('submitted')
      expect(submittedAttempt.total_score).toBe(85.5)
      expect(submittedAttempt.coding_tests).toBeTruthy()
    })

    it('should return empty array when student has no attempts', async () => {
      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const response = await GetAttempts(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toHaveLength(0)
    })

    it('should filter attempts by student ID correctly', async () => {
      const mockRequest = new Request('http://localhost?studentId=specific-student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      const mockQuery = mockSupabaseClient.from('test_attempts')
      mockQuery.select.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [createMockAttempt({ student_id: 'specific-student-id' })],
          error: null
        })
      })

      await GetAttempts(mockRequestEvent)

      expect(mockQuery.select).toHaveBeenCalledWith('*, coding_tests(*)')
      // Verify eq was called with correct student ID
      expect(mockQuery.select().eq).toHaveBeenCalledWith('student_id', 'specific-student-id')
    })
  })

  describe('GET /api/student/results/[attemptId] - Get Test Results', () => {
    it('should return detailed test results for student', async () => {
      const mockAttempt = createMockAttempt({
        id: 'attempt-id',
        status: 'graded',
        total_score: 88.5,
        graded_at: new Date().toISOString()
      })

      const mockTest = createMockTest({
        id: mockAttempt.test_id,
        title: 'Java Fundamentals Test'
      })

      const mockAnswers = [
        createMockAnswer({
          id: 'ans1',
          question_id: 'q1',
          answer_code: 'public int add(int a, int b) { return a + b; }',
          question_score: 95.0,
          scores: { communication: 4, correctness: 4, logic: 4 },
          feedback: {
            communication: 'Excellent formatting',
            correctness: 'Perfect syntax',
            logic: 'Correct solution'
          }
        }),
        createMockAnswer({
          id: 'ans2',
          question_id: 'q2',
          answer_code: 'public boolean isEven(int n) { return n % 2 == 0; }',
          question_score: 82.0,
          scores: { communication: 3, correctness: 4, logic: 3 }
        })
      ]

      const mockParams = { attemptId: 'attempt-id' }
      const mockUrl = new URL('http://localhost?studentId=student-id')
      const mockRequestEvent = { 
        params: mockParams,
        url: mockUrl
      } as any

      // Mock attempt fetch
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'test_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockAttempt,
                error: null
              })
            })
          }
        }
        if (table === 'coding_tests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockTest,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_answers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockAnswers.map(answer => ({
                    ...answer,
                    questions: {
                      id: answer.question_id,
                      question_text: `Question text for ${answer.question_id}`,
                      concepts: ['variables', 'methods']
                    }
                  })),
                  error: null
                })
              })
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const response = await GetResults(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toMatchObject({
        attempt: mockAttempt,
        test: mockTest,
        answers: expect.arrayContaining([
          expect.objectContaining({
            id: 'ans1',
            question_score: 95.0,
            scores: { communication: 4, correctness: 4, logic: 4 }
          })
        ])
      })
    })

    it('should return 404 for non-existent attempt', async () => {
      const mockParams = { attemptId: 'non-existent-id' }
      const mockUrl = new URL('http://localhost?studentId=student-id')
      const mockRequestEvent = { 
        params: mockParams,
        url: mockUrl
      } as any

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found', code: 'PGRST116' }
          })
        })
      })

      const response = await GetResults(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('not found')
    })

    it('should return 403 when student tries to access another student\'s results', async () => {
      const mockAttempt = createMockAttempt({
        id: 'attempt-id',
        student_id: 'different-student-id' // Different from query param
      })

      const mockParams = { attemptId: 'attempt-id' }
      const mockUrl = new URL('http://localhost?studentId=requesting-student-id')
      const mockRequestEvent = { 
        params: mockParams,
        url: mockUrl
      } as any

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttempt,
            error: null
          })
        })
      })

      const response = await GetResults(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(403)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('access denied')
    })

    it('should handle test results that are not yet graded', async () => {
      const mockAttempt = createMockAttempt({
        id: 'attempt-id',
        status: 'submitted',
        total_score: null,
        graded_at: null
      })

      const mockTest = createMockTest()
      const mockAnswers = [
        createMockAnswer({
          question_score: null,
          scores: null,
          feedback: null,
          graded_at: null
        })
      ]

      const mockParams = { attemptId: 'attempt-id' }
      const mockUrl = new URL('http://localhost?studentId=student-id')
      const mockRequestEvent = { 
        params: mockParams,
        url: mockUrl
      } as any

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'test_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockAttempt,
                error: null
              })
            })
          }
        }
        if (table === 'coding_tests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockTest,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_answers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockAnswers,
                  error: null
                })
              })
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const response = await GetResults(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.attempt.status).toBe('submitted')
      expect(responseData.data.attempt.total_score).toBeNull()
      expect(responseData.data.answers[0].question_score).toBeNull()
    })

    it('should include question details with answers', async () => {
      const mockAttempt = createMockAttempt()
      const mockTest = createMockTest()
      const mockAnswers = [
        createMockAnswer({
          question_id: 'q1'
        })
      ]

      const mockParams = { attemptId: 'attempt-id' }
      const mockUrl = new URL('http://localhost?studentId=student-id')
      const mockRequestEvent = { 
        params: mockParams,
        url: mockUrl
      } as any

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'test_answers') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockAnswers.map(answer => ({
                    ...answer,
                    questions: {
                      id: answer.question_id,
                      question_text: 'Write a method to add two numbers',
                      concepts: ['variables', 'methods', 'arithmetic'],
                      rubric: {
                        communication: { weight: 0.25 },
                        correctness: { weight: 0.50 },
                        logic: { weight: 0.25 }
                      }
                    }
                  })),
                  error: null
                })
              })
            })
          }
        }
        // ... other table mocks
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: table === 'test_attempts' ? mockAttempt : mockTest,
              error: null
            })
          })
        }
      })

      const response = await GetResults(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data.answers[0].questions).toMatchObject({
        question_text: 'Write a method to add two numbers',
        concepts: ['variables', 'methods', 'arithmetic']
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing query parameters gracefully', async () => {
      const endpoints = [
        { fn: GetAvailableTests, url: 'http://localhost' },
        { fn: GetAttempts, url: 'http://localhost' }
      ]

      for (const { fn, url } of endpoints) {
        const mockRequest = new Request(url)
        const mockRequestEvent = { request: mockRequest } as RequestEvent

        const response = await fn(mockRequestEvent)
        const responseData = await response.json()

        expect(response.status).toBe(400)
        expect(responseData.success).toBe(false)
        expect(responseData.error).toContain('required')
      }
    })

    it('should handle database timeout errors', async () => {
      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockRejectedValue(new Error('Connection timeout'))
          })
        })
      })

      const response = await GetAvailableTests(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
    })

    it('should handle malformed query parameters', async () => {
      const mockRequest = new Request('http://localhost?studentId=')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      const response = await GetAvailableTests(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
    })

    it('should handle large datasets efficiently', async () => {
      // Mock a large number of attempts
      const largeAttemptSet = Array(100).fill(null).map((_, index) => 
        createMockAttempt({ 
          id: `attempt-${index}`,
          test_id: `test-${index % 10}` // 10 different tests
        })
      )

      const mockRequest = new Request('http://localhost?studentId=student-id')
      const mockRequestEvent = { request: mockRequest } as RequestEvent

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: largeAttemptSet,
              error: null
            })
          })
        })
      })

      const start = Date.now()
      const response = await GetAttempts(mockRequestEvent)
      const duration = Date.now() - start
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data).toHaveLength(100)
      expect(duration).toBeLessThan(1000) // Should handle efficiently
    })
  })
})