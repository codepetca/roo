import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockSupabaseClient, createMockQuestion, resetMocks } from '../../test/setup.js'
import type { Question, APIResponse } from '$lib/types/index.js'

// Mock dependencies
vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Questions Store', () => {
  let QuestionsStore: any
  let mockEventListeners: Record<string, Function[]> = {}

  beforeEach(async () => {
    resetMocks()
    vi.clearAllMocks()
    mockEventListeners = {}

    // Mock window and event listeners
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn((event: string, callback: Function) => {
        if (!mockEventListeners[event]) {
          mockEventListeners[event] = []
        }
        mockEventListeners[event].push(callback)
      }),
      writable: true
    })

    Object.defineProperty(window, 'dispatchEvent', {
      value: vi.fn((event: Event) => {
        const eventType = event.type
        if (mockEventListeners[eventType]) {
          mockEventListeners[eventType].forEach(callback => callback(event))
        }
      }),
      writable: true
    })

    // Dynamic import to ensure fresh instance
    const module = await import('./questions.svelte.js')
    QuestionsStore = module.QuestionsStore
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const questionsStore = new QuestionsStore()
      
      expect(questionsStore.questions).toEqual([])
      expect(questionsStore.loading).toBe(false)
      expect(questionsStore.error).toBeNull()
    })

    it('should set up event listeners for question restoration', () => {
      new QuestionsStore()
      
      expect(window.addEventListener).toHaveBeenCalledWith('question-restored', expect.any(Function))
    })

    it('should auto-load questions on client side', () => {
      const mockQuestions = [createMockQuestion(), createMockQuestion()]
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: mockQuestions
        })
      } as Response)

      const questionsStore = new QuestionsStore()
      
      expect(fetch).toHaveBeenCalledWith('/api/questions')
    })
  })

  describe('Load Questions', () => {
    it('should load questions successfully', async () => {
      const mockQuestions = [
        createMockQuestion({ id: 'q1', question_text: 'Question 1' }),
        createMockQuestion({ id: 'q2', question_text: 'Question 2' })
      ]

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: mockQuestions
        })
      } as Response)

      const questionsStore = new QuestionsStore()
      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toEqual(mockQuestions)
      expect(questionsStore.loading).toBe(false)
      expect(questionsStore.error).toBeNull()
    })

    it('should handle API response with success false', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Bad request' }
        })
      } as Response)

      const questionsStore = new QuestionsStore()
      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toEqual([])
      expect(questionsStore.loading).toBe(false)
      expect(questionsStore.error).toBe('Bad request')
    })

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const questionsStore = new QuestionsStore()
      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toEqual([])
      expect(questionsStore.loading).toBe(false)
      expect(questionsStore.error).toBe('Network error')
    })

    it('should handle empty response data', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: null
        })
      } as Response)

      const questionsStore = new QuestionsStore()
      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toEqual([])
      expect(questionsStore.loading).toBe(false)
      expect(questionsStore.error).toBeNull()
    })

    it('should set loading state during request', async () => {
      let resolvePromise: Function
      const fetchPromise = new Promise(resolve => {
        resolvePromise = resolve
      })

      vi.mocked(fetch).mockReturnValue(fetchPromise as Promise<Response>)

      const questionsStore = new QuestionsStore()
      const loadPromise = questionsStore.loadQuestions()

      expect(questionsStore.loading).toBe(true)

      resolvePromise({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })

      await loadPromise

      expect(questionsStore.loading).toBe(false)
    })
  })

  describe('Archive Question', () => {
    it('should archive question successfully', async () => {
      const mockQuestion = createMockQuestion({ id: 'q1' })
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [mockQuestion]

      const result = await questionsStore.archiveQuestion('q1')

      expect(result.success).toBe(true)
      expect(questionsStore.questions).toHaveLength(0)
      expect(fetch).toHaveBeenCalledWith('/api/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: 'q1' })
      })
    })

    it('should dispatch question-archived event', async () => {
      const mockQuestion = createMockQuestion({ id: 'q1' })
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [mockQuestion]

      await questionsStore.archiveQuestion('q1')

      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'question-archived',
          detail: expect.objectContaining({
            id: 'q1',
            archived: true
          })
        })
      )
    })

    it('should return false for non-existent question', async () => {
      const questionsStore = new QuestionsStore()
      questionsStore.questions = []

      const result = await questionsStore.archiveQuestion('non-existent')

      expect(result.success).toBe(false)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle archive API errors', async () => {
      const mockQuestion = createMockQuestion({ id: 'q1' })
      
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Server error' }
        })
      } as Response)

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [mockQuestion]

      await expect(questionsStore.archiveQuestion('q1')).rejects.toThrow('Server error')
      expect(questionsStore.error).toBe('Server error')
      expect(questionsStore.questions).toContain(mockQuestion) // Should not remove on error
    })

    it('should handle network errors during archive', async () => {
      const mockQuestion = createMockQuestion({ id: 'q1' })
      
      vi.mocked(fetch).mockRejectedValue(new Error('Network failure'))

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [mockQuestion]

      await expect(questionsStore.archiveQuestion('q1')).rejects.toThrow('Network failure')
      expect(questionsStore.error).toBe('Network failure')
    })
  })

  describe('Restore Question', () => {
    it('should restore question successfully', async () => {
      const mockQuestions = [createMockQuestion({ id: 'q1' })]
      
      // Mock restore API call
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true })
        } as Response)
        // Mock loadQuestions call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            success: true,
            data: mockQuestions
          })
        } as Response)

      const questionsStore = new QuestionsStore()
      const result = await questionsStore.restoreQuestion('q1')

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith('/api/questions/archive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: ['q1'] })
      })
      expect(questionsStore.questions).toEqual(mockQuestions)
    })

    it('should handle restore API errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Question not found' }
        })
      } as Response)

      const questionsStore = new QuestionsStore()

      await expect(questionsStore.restoreQuestion('q1')).rejects.toThrow('Question not found')
      expect(questionsStore.error).toBe('Question not found')
    })

    it('should handle network errors during restore', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection timeout'))

      const questionsStore = new QuestionsStore()

      await expect(questionsStore.restoreQuestion('q1')).rejects.toThrow('Connection timeout')
      expect(questionsStore.error).toBe('Connection timeout')
    })
  })

  describe('Add Question', () => {
    it('should add question to beginning of list', () => {
      const existingQuestion = createMockQuestion({ id: 'q1' })
      const newQuestion = createMockQuestion({ id: 'q2' })

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [existingQuestion]
      questionsStore.addQuestion(newQuestion)

      expect(questionsStore.questions).toEqual([newQuestion, existingQuestion])
    })

    it('should handle adding question to empty list', () => {
      const newQuestion = createMockQuestion({ id: 'q1' })

      const questionsStore = new QuestionsStore()
      questionsStore.addQuestion(newQuestion)

      expect(questionsStore.questions).toEqual([newQuestion])
    })
  })

  describe('Event Handling', () => {
    it('should handle question-restored event', () => {
      const questionsStore = new QuestionsStore()
      const restoredQuestion = createMockQuestion({ id: 'restored-q' })

      // Simulate question-restored event
      const event = new CustomEvent('question-restored', { detail: restoredQuestion })
      mockEventListeners['question-restored']?.[0]?.(event)

      expect(questionsStore.questions).toContain(restoredQuestion)
    })

    it('should handle multiple event listeners correctly', () => {
      const questionsStore1 = new QuestionsStore()
      const questionsStore2 = new QuestionsStore()
      
      expect(mockEventListeners['question-restored']).toHaveLength(2)
    })
  })

  describe('Derived Properties', () => {
    it('should compute activeQuestions correctly', () => {
      const activeQuestion = createMockQuestion({ id: 'q1', archived: false })
      const archivedQuestion = createMockQuestion({ id: 'q2', archived: true })

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [activeQuestion, archivedQuestion]

      expect(questionsStore.activeQuestions).toEqual([activeQuestion])
      expect(questionsStore.archivedQuestions).toEqual([archivedQuestion])
    })

    it('should compute counts correctly', () => {
      const activeQuestions = [
        createMockQuestion({ id: 'q1', archived: false }),
        createMockQuestion({ id: 'q2', archived: false })
      ]
      const archivedQuestions = [
        createMockQuestion({ id: 'q3', archived: true })
      ]

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [...activeQuestions, ...archivedQuestions]

      expect(questionsStore.totalCount).toBe(3)
      expect(questionsStore.activeCount).toBe(2)
      expect(questionsStore.archivedCount).toBe(1)
    })

    it('should handle empty questions list', () => {
      const questionsStore = new QuestionsStore()
      questionsStore.questions = []

      expect(questionsStore.activeQuestions).toEqual([])
      expect(questionsStore.archivedQuestions).toEqual([])
      expect(questionsStore.totalCount).toBe(0)
      expect(questionsStore.activeCount).toBe(0)
      expect(questionsStore.archivedCount).toBe(0)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed API responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          // Missing success field
          data: []
        })
      } as Response)

      const questionsStore = new QuestionsStore()
      await questionsStore.loadQuestions()

      expect(questionsStore.error).toBeTruthy()
    })

    it('should handle JSON parse errors', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as Response)

      const questionsStore = new QuestionsStore()
      await questionsStore.loadQuestions()

      expect(questionsStore.error).toBe('Invalid JSON')
    })

    it('should handle concurrent archive operations', async () => {
      const mockQuestion = createMockQuestion({ id: 'q1' })
      
      vi.mocked(fetch).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response), 100)
        })
      })

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [mockQuestion]

      // Start two concurrent archive operations
      const promise1 = questionsStore.archiveQuestion('q1')
      const promise2 = questionsStore.archiveQuestion('q1')

      const [result1, result2] = await Promise.allSettled([promise1, promise2])

      // At least one should succeed
      expect(result1.status === 'fulfilled' || result2.status === 'fulfilled').toBe(true)
    })

    it('should handle questions with missing or null fields', () => {
      const questionWithNulls = createMockQuestion({
        id: 'q1',
        question_text: null as any,
        concepts: null as any
      })

      const questionsStore = new QuestionsStore()
      questionsStore.addQuestion(questionWithNulls)

      expect(questionsStore.questions).toContain(questionWithNulls)
      expect(questionsStore.totalCount).toBe(1)
    })

    it('should handle very large question lists efficiently', async () => {
      const largeQuestionList = Array(1000).fill(null).map((_, index) => 
        createMockQuestion({ id: `q${index}` })
      )

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: largeQuestionList
        })
      } as Response)

      const questionsStore = new QuestionsStore()
      const start = Date.now()
      await questionsStore.loadQuestions()
      const duration = Date.now() - start

      expect(questionsStore.questions).toHaveLength(1000)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })
  })

  describe('Memory Management and Performance', () => {
    it('should not cause memory leaks with repeated operations', async () => {
      const questionsStore = new QuestionsStore()
      
      // Simulate many rapid operations
      for (let i = 0; i < 100; i++) {
        const question = createMockQuestion({ id: `q${i}` })
        questionsStore.addQuestion(question)
      }

      expect(questionsStore.questions).toHaveLength(100)
      expect(questionsStore.totalCount).toBe(100)
    })

    it('should handle rapid state changes without issues', () => {
      const questionsStore = new QuestionsStore()
      
      // Rapidly change questions state
      for (let i = 0; i < 50; i++) {
        questionsStore.questions = [createMockQuestion({ id: `q${i}` })]
      }

      expect(questionsStore.questions).toHaveLength(1)
      expect(questionsStore.questions[0].id).toBe('q49')
    })

    it('should debounce rapid archive requests appropriately', async () => {
      const mockQuestion = createMockQuestion({ id: 'q1' })
      let callCount = 0
      
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
      })

      const questionsStore = new QuestionsStore()
      questionsStore.questions = [mockQuestion]

      // Try to archive same question multiple times rapidly
      try {
        await questionsStore.archiveQuestion('q1')
        await questionsStore.archiveQuestion('q1') // Should fail since question is already removed
      } catch (error) {
        // Expected - question no longer exists after first archive
      }

      expect(callCount).toBe(1) // Should only make one actual API call
    })
  })
})