import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './+server.js'
import type { RequestEvent } from '@sveltejs/kit'

// Mock dependencies
vi.mock('$lib/server/supabase')
vi.mock('$lib/server/claude')

describe('/api/grade API endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST - Grade Submission', () => {
    it('should grade a submission successfully', async () => {
      // Mock form data
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 }) // 1KB
      
      const mockFormData = new FormData()
      mockFormData.append('image', mockFile)
      mockFormData.append('questionId', 'test-question-id')
      mockFormData.append('studentId', 'test-student-id')
      mockFormData.append('teacherId', 'test-teacher-id')

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      // Mock Supabase storage upload
      const { supabase } = await import('$lib/server/supabase')
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: { path: 'test-path.jpg' },
              error: null
            })
          })
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'java_questions') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      question_text: 'Test question',
                      rubric: { communication: { weight: 0.25 } }
                    },
                    error: null
                  })
                })
              })
            }
          } else if (table === 'java_submissions') {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'submission-id',
                      overall_score: 3.5,
                      status: 'graded'
                    },
                    error: null
                  })
                })
              })
            }
          }
          return {}
        })
      }

      vi.mocked(supabase).mockReturnValue(mockSupabase as any)

      // Mock Claude grading
      const mockGradingResult = {
        extractedCode: 'public int add(int a, int b) { return a + b; }',
        scores: { communication: 3, correctness: 4, logic: 3 },
        feedback: {
          communication: 'Good formatting',
          correctness: 'Correct syntax',
          logic: 'Solves the problem'
        },
        overallScore: 3.5,
        generalComments: 'Well done!'
      }

      const { gradeCode } = await import('$lib/server/claude')
      vi.mocked(gradeCode).mockResolvedValue(mockGradingResult)

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.submission).toMatchObject({
        id: 'submission-id',
        overall_score: 3.5,
        gradingResult: mockGradingResult
      })
    })

    it('should return 400 for missing required fields', async () => {
      const mockFormData = new FormData()
      // Missing required fields

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Missing required fields')
    })

    it('should return 400 for non-image files', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const mockFormData = new FormData()
      mockFormData.append('image', mockFile)
      mockFormData.append('questionId', 'test-question-id')
      mockFormData.append('studentId', 'test-student-id')
      mockFormData.append('teacherId', 'test-teacher-id')

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('File must be an image')
    })

    it('should return 400 for files too large', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 11 * 1024 * 1024 }) // 11MB
      
      const mockFormData = new FormData()
      mockFormData.append('image', mockFile)
      mockFormData.append('questionId', 'test-question-id')
      mockFormData.append('studentId', 'test-student-id')
      mockFormData.append('teacherId', 'test-teacher-id')

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Image too large (max 10MB)')
    })

    it('should handle storage upload errors', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })
      
      const mockFormData = new FormData()
      mockFormData.append('image', mockFile)
      mockFormData.append('questionId', 'test-question-id')
      mockFormData.append('studentId', 'test-student-id')
      mockFormData.append('teacherId', 'test-teacher-id')

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      // Mock storage upload error
      const { supabase } = await import('$lib/server/supabase')
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Upload failed' }
            })
          })
        }
      }

      vi.mocked(supabase).mockReturnValue(mockSupabase as any)

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to upload image')
    })

    it('should handle question not found error', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      Object.defineProperty(mockFile, 'size', { value: 1024 })
      
      const mockFormData = new FormData()
      mockFormData.append('image', mockFile)
      mockFormData.append('questionId', 'non-existent-id')
      mockFormData.append('studentId', 'test-student-id')
      mockFormData.append('teacherId', 'test-teacher-id')

      const mockRequest = {
        formData: vi.fn().mockResolvedValue(mockFormData)
      } as any

      const mockRequestEvent = {
        request: mockRequest
      } as RequestEvent

      // Mock successful upload but question not found
      const { supabase } = await import('$lib/server/supabase')
      const mockSupabase = {
        storage: {
          from: vi.fn().mockReturnValue({
            upload: vi.fn().mockResolvedValue({
              data: { path: 'test-path.jpg' },
              error: null
            })
          })
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Question not found' }
              })
            })
          })
        })
      }

      vi.mocked(supabase).mockReturnValue(mockSupabase as any)

      const response = await POST(mockRequestEvent)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Question not found')
    })
  })
})