import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './create/+server.js'
import { GET, PUT } from './[testId]/+server.js'
import { POST as StartTest } from './[testId]/start/+server.js'
import { POST as SaveAnswer } from './[testId]/save-answer/+server.js'
import { POST as SubmitTest } from './[testId]/submit/+server.js'
import { mockSupabaseClient, createMockUser, createMockTest, createMockQuestion, createMockAttempt, createMockAnswer, resetMocks } from '../../../test/setup.js'
import type { RequestEvent } from '@sveltejs/kit'

// Mock dependencies
vi.mock('$lib/server/supabase', () => ({
  supabase: mockSupabaseClient
}))

vi.mock('$lib/server/auth', () => ({
  requireAuth: vi.fn(),
  getAuthenticatedUser: vi.fn()
}))

describe('Tests API Endpoints', () => {
  beforeEach(() => {
    resetMocks()
  })

  describe('POST /api/tests/create - Create Test', () => {
    it('should create a new test successfully', async () => {
      const mockUser = createMockUser()
      const mockTest = createMockTest()
      const mockQuestions = [createMockQuestion({ id: 'q1' }), createMockQuestion({ id: 'q2' })]

      const requestBody = {
        title: mockTest.title,
        description: mockTest.description,
        questionIds: ['q1', 'q2'],
        timeLimitMinutes: mockTest.time_limit_minutes,
        endDate: mockTest.end_date,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      // Mock authentication
      const { requireAuth } = await import('$lib/server/auth')
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      // Mock test creation
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'coding_tests') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockTest,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_questions') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: [
                { test_id: mockTest.id, question_id: 'q1', question_order: 1 },
                { test_id: mockTest.id, question_id: 'q2', question_order: 2 }
              ],
              error: null
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toMatchObject({
        id: mockTest.id,
        title: mockTest.title
      })
    })

    it('should return 400 for invalid request data', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          // Missing required fields
          title: '',
          questionIds: []
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeTruthy()
    })

    it('should return 401 when user is not authenticated', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({})
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      // Mock authentication failure
      const { requireAuth } = await import('$lib/server/auth')
      vi.mocked(requireAuth).mockRejectedValue(new Error('Authentication required'))

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toContain('Authentication required')
    })

    it('should handle database errors during test creation', async () => {
      const mockUser = createMockUser()
      const requestBody = {
        title: 'Test Title',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString()
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const { requireAuth } = await import('$lib/server/auth')
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      // Mock database error
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: '500' }
            })
          })
        })
      })

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toBeTruthy()
    })
  })

  describe('GET /api/tests/[testId] - Get Test Details', () => {
    it('should return test details successfully', async () => {
      const mockTest = createMockTest()
      const mockParams = { testId: mockTest.id }

      const mockRequestEvent = {
        params: mockParams
      } as any

      // Mock test fetch with questions
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                ...mockTest,
                test_questions: [
                  { question_id: 'q1', question_order: 1, points: 100 },
                  { question_id: 'q2', question_order: 2, points: 100 }
                ]
              },
              error: null
            })
          })
        })
      })

      const response = await GET(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data).toMatchObject({
        id: mockTest.id,
        title: mockTest.title
      })
    })

    it('should return 404 for non-existent test', async () => {
      const mockParams = { testId: 'non-existent-id' }

      const mockRequestEvent = {
        params: mockParams
      } as any

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found', code: 'PGRST116' }
            })
          })
        })
      })

      const response = await GET(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.success).toBe(false)
      expect(responseData.error).toContain('not found')
    })
  })

  describe('PUT /api/tests/[testId] - Update Test', () => {
    it('should publish test successfully', async () => {
      const mockUser = createMockUser()
      const mockTest = createMockTest({ status: 'active' })
      const mockParams = { testId: mockTest.id }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          status: 'active'
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      const { requireAuth } = await import('$lib/server/auth')
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockTest,
                error: null
              })
            })
          })
        })
      })

      const response = await PUT(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.status).toBe('active')
    })
  })

  describe('POST /api/tests/[testId]/start - Start Test', () => {
    it('should start a new test attempt successfully', async () => {
      const mockTest = createMockTest()
      const mockAttempt = createMockAttempt()
      const mockParams = { testId: mockTest.id }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          studentId: 'student-id'
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      // Mock test exists and is active
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'coding_tests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockTest,
                error: null
              })
            })
          }
        }
        if (table === 'test_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null, // No existing attempt
                error: null
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockAttempt,
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_questions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { question_id: 'q1' },
                    { question_id: 'q2' }
                  ],
                  error: null
                })
              })
            })
          }
        }
        if (table === 'test_answers') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: [
                { attempt_id: mockAttempt.id, question_id: 'q1', answer_code: '' },
                { attempt_id: mockAttempt.id, question_id: 'q2', answer_code: '' }
              ],
              error: null
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const response = await StartTest(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.attempt).toMatchObject({
        id: mockAttempt.id,
        test_id: mockTest.id
      })
    })

    it('should return existing attempt if student already started test', async () => {
      const mockTest = createMockTest()
      const mockAttempt = createMockAttempt({ status: 'in_progress' })
      const mockParams = { testId: mockTest.id }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          studentId: 'student-id'
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'coding_tests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockTest,
                error: null
              })
            })
          }
        }
        if (table === 'test_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: mockAttempt, // Existing attempt
                error: null
              })
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const response = await StartTest(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.attempt).toEqual(mockAttempt)
    })

    it('should prevent starting if test has ended', async () => {
      const mockTest = createMockTest({
        end_date: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      })
      const mockParams = { testId: mockTest.id }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          studentId: 'student-id'
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockTest,
            error: null
          })
        })
      })

      const response = await StartTest(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('ended')
    })
  })

  describe('POST /api/tests/[testId]/save-answer - Save Answer', () => {
    it('should save answer code successfully', async () => {
      const mockParams = { testId: 'test-id' }
      const requestBody = {
        questionId: 'question-id',
        code: 'public int add(int a, int b) { return a + b; }',
        studentId: 'student-id'
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody)
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      // Mock finding the attempt
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'test_attempts') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: createMockAttempt(),
                error: null
              })
            })
          }
        }
        if (table === 'test_answers') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnThis(),
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: createMockAnswer({
                    answer_code: requestBody.code,
                    last_saved_at: new Date().toISOString()
                  }),
                  error: null
                })
              })
            })
          }
        }
        return mockSupabaseClient.from(table)
      })

      const response = await SaveAnswer(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.answer_code).toBe(requestBody.code)
    })

    it('should handle attempt not found', async () => {
      const mockParams = { testId: 'test-id' }
      const requestBody = {
        questionId: 'question-id',
        code: 'test code',
        studentId: 'student-id'
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody)
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        })
      })

      const response = await SaveAnswer(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toContain('Attempt not found')
    })
  })

  describe('POST /api/tests/[testId]/submit - Submit Test', () => {
    it('should submit test successfully', async () => {
      const mockAttempt = createMockAttempt({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      const mockParams = { testId: 'test-id' }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          studentId: 'student-id'
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAttempt,
              error: null
            })
          })
        })
      })

      const response = await SubmitTest(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.data.status).toBe('submitted')
      expect(responseData.data.submitted_at).toBeTruthy()
    })

    it('should handle submitting already submitted test', async () => {
      const mockAttempt = createMockAttempt({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      const mockParams = { testId: 'test-id' }

      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          studentId: 'student-id'
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      // Mock attempt already submitted
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttempt,
            error: null
          })
        })
      })

      const response = await SubmitTest(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('already submitted')
    })
  })

  describe('API Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const mockRequest = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.success).toBe(false)
    })

    it('should handle database connection errors', async () => {
      const mockUser = createMockUser()
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          title: 'Test',
          questionIds: ['q1'],
          timeLimitMinutes: 60,
          endDate: new Date().toISOString()
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const { requireAuth } = await import('$lib/server/auth')
      vi.mocked(requireAuth).mockResolvedValue(mockUser)

      // Mock database connection error
      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.success).toBe(false)
    })

    it('should handle concurrent request conflicts', async () => {
      const mockParams = { testId: 'test-id' }
      const requestBody = {
        studentId: 'student-id'
      }

      const mockRequest = {
        json: vi.fn().mockResolvedValue(requestBody)
      } as any

      const mockRequestEvent = {
        request: mockRequest,
        params: mockParams
      } as any

      // Mock unique constraint violation
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'Unique constraint violation',
            code: '23505'
          }
        })
      })

      const response = await StartTest(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(409)
      expect(responseData.error).toContain('already exists')
    })
  })
})