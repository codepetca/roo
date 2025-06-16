import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from './+server.js'
import type { RequestEvent } from '@sveltejs/kit'

// Mock the dependencies
vi.mock('$lib/server/supabase')
vi.mock('$lib/server/claude')

describe('/api/questions API endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST - Create Question', () => {
    it('should create a new question successfully', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          concepts: ['variables', 'conditionals']
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      // Mock generateQuestion
      const mockQuestionData = {
        question: 'Test question',
        rubric: { communication: { weight: 0.25 } },
        solution: { code: 'test code', explanation: 'test' },
        concepts: ['variables']
      }

      const { generateQuestion } = await import('$lib/server/claude')
      vi.mocked(generateQuestion).mockResolvedValue(mockQuestionData)

      // Mock supabase insert
      const mockQuestion = {
        id: 'test-id',
        question_text: 'Test question',
        java_concepts: ['variables'],
        created_at: new Date().toISOString()
      }

      const { supabase } = await import('$lib/server/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockQuestion,
              error: null
            })
          })
        })
      } as any)

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toMatchObject({
        question: expect.objectContaining({
          id: 'test-id',
          question_text: 'Test question'
        })
      })
    })

    it('should return 400 if concepts are missing', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({})
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Concepts array required')
    })

    it('should return 400 if concepts is not an array', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          concepts: 'not-an-array'
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Concepts array required')
    })

    it('should handle database errors', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          concepts: ['variables']
        })
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      // Mock successful question generation
      const { generateQuestion } = await import('$lib/server/claude')
      vi.mocked(generateQuestion).mockResolvedValue({
        question: 'Test',
        rubric: {},
        solution: { code: 'test', explanation: 'test' },
        concepts: ['variables']
      })

      // Mock database error
      const { supabase } = await import('$lib/server/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      } as any)

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to create question')
    })
  })

  describe('GET - Fetch Questions', () => {
    it('should fetch questions successfully', async () => {
      const mockQuestions = [
        {
          id: 'q1',
          question_text: 'Question 1',
          java_concepts: ['variables'],
          created_at: new Date().toISOString()
        },
        {
          id: 'q2',
          question_text: 'Question 2',
          java_concepts: ['loops'],
          created_at: new Date().toISOString()
        }
      ]

      const { supabase } = await import('$lib/server/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockQuestions,
              error: null
            })
          })
        })
      } as any)

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.questions).toHaveLength(2)
      expect(responseData.questions[0]).toMatchObject({
        id: 'q1',
        question_text: 'Question 1'
      })
    })

    it('should handle database fetch errors', async () => {
      const { supabase } = await import('$lib/server/supabase')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Fetch error' }
            })
          })
        })
      } as any)

      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to fetch questions')
    })
  })
})