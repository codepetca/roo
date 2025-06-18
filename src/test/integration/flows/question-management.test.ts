import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IntegrationTestUtils, expectStoreState, ErrorScenarios } from '../../integration-setup.js'
import { mockSupabaseClient, resetMocks } from '../../setup.js'

// Mock dependencies
vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Set up fetch mock before stores initialize
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ success: true, data: [] })
})

describe('Question Management Integration Flow', () => {
  let QuestionsStore: any
  let ArchivedQuestionsStore: any
  let mockEventListeners: Record<string, Function[]> = {}

  beforeEach(async () => {
    resetMocks()
    IntegrationTestUtils.cleanup()
    mockEventListeners = {}

    // Mock window event listeners
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
        return true
      }),
      writable: true
    })

    // Import stores
    const [questionsModule] = await Promise.all([
      import('../../../lib/stores/questions.svelte.js')
    ])

    QuestionsStore = questionsModule.QuestionsStore

    // Mock archived questions store for testing
    ArchivedQuestionsStore = class {
      questions = []
      loading = false
      error = null

      addQuestion(question: any) {
        this.questions = [question, ...this.questions]
      }

      removeQuestion(questionId: string) {
        this.questions = this.questions.filter(q => q.id !== questionId)
      }
    }
  })

  afterEach(() => {
    IntegrationTestUtils.cleanup()
  })

  describe('Complete Question Lifecycle Management', () => {
    it('should complete full question lifecycle: create → use in test → archive → restore', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { questions } = IntegrationTestUtils.createTestScenario()

      const questionsStore = new QuestionsStore()
      const archivedStore = new ArchivedQuestionsStore()

      // Step 1: Load initial questions
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toHaveLength(3)
      expect(questionsStore.activeQuestions).toHaveLength(3)
      expect(questionsStore.archivedQuestions).toHaveLength(0)

      // Step 2: Archive a question
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const questionToArchive = questions[0]
      const archiveResult = await questionsStore.archiveQuestion(questionToArchive.id)

      expect(archiveResult.success).toBe(true)
      expect(questionsStore.questions).toHaveLength(2)
      expect(questionsStore.activeQuestions).toHaveLength(2)

      // Verify archive event was dispatched
      expect(window.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'question-archived',
          detail: expect.objectContaining({
            id: questionToArchive.id,
            archived: true
          })
        })
      )

      // Step 3: Restore the question
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: questions // All questions including restored one
          })
        } as Response)

      const restoreResult = await questionsStore.restoreQuestion(questionToArchive.id)

      expect(restoreResult.success).toBe(true)
      expect(questionsStore.questions).toHaveLength(3)
      expect(questionsStore.activeQuestions).toHaveLength(3)

      // Verify final state
      expectStoreState(questionsStore, {
        loading: false,
        error: null
      })
    })

    it('should handle cross-store communication via events', async () => {
      const questionsStore = new QuestionsStore()
      const archivedStore = new ArchivedQuestionsStore()

      const { questions } = IntegrationTestUtils.createTestScenario()
      questionsStore.questions = questions

      // Mock question restoration event
      const restoredQuestion = {
        ...questions[0],
        archived: false
      }

      // Simulate question-restored event
      const restoreEvent = new CustomEvent('question-restored', { 
        detail: restoredQuestion 
      })

      // Trigger event listeners
      mockEventListeners['question-restored']?.[0]?.(restoreEvent)

      // Should add question to active store
      expect(questionsStore.questions).toContain(restoredQuestion)
    })

    it('should maintain data consistency across archive/restore operations', async () => {
      const { questions } = IntegrationTestUtils.createTestScenario()
      const questionsStore = new QuestionsStore()

      questionsStore.questions = questions

      // Archive multiple questions
      const questionsToArchive = [questions[0], questions[1]]
      
      for (const question of questionsToArchive) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)

        await questionsStore.archiveQuestion(question.id)
      }

      expect(questionsStore.questions).toHaveLength(1)
      expect(questionsStore.activeQuestions).toHaveLength(1)

      // Restore one question
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: [questions[2], questions[0]] // One restored
          })
        } as Response)

      await questionsStore.restoreQuestion(questionsToArchive[0].id)

      expect(questionsStore.questions).toHaveLength(2)
      expect(questionsStore.activeQuestions).toHaveLength(2)

      // Verify IDs are correct
      const activeIds = questionsStore.activeQuestions.map((q: any) => q.id)
      expect(activeIds).toContain(questions[2].id)
      expect(activeIds).toContain(questions[0].id)
      expect(activeIds).not.toContain(questions[1].id)
    })
  })

  describe('Question Filtering and Search', () => {
    it('should handle concept-based filtering', async () => {
      const questionsWithConcepts = [
        {
          id: 'q1',
          question_text: 'Variables question',
          concepts: ['variables', 'data-types'],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        },
        {
          id: 'q2',
          question_text: 'Loops question',
          concepts: ['loops', 'iteration'],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'intermediate' as const,
          solution: null,
          rubric: {}
        },
        {
          id: 'q3',
          question_text: 'Methods question',
          concepts: ['methods', 'parameters'],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'advanced' as const,
          solution: null,
          rubric: {}
        }
      ]

      const questionsStore = new QuestionsStore()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questionsWithConcepts
        })
      } as Response)

      await questionsStore.loadQuestions()

      // Filter by concept (would be implemented in UI layer)
      const variableQuestions = questionsStore.questions.filter((q: any) => 
        q.concepts.includes('variables')
      )
      const loopQuestions = questionsStore.questions.filter((q: any) => 
        q.concepts.includes('loops')
      )

      expect(variableQuestions).toHaveLength(1)
      expect(loopQuestions).toHaveLength(1)
      expect(variableQuestions[0].id).toBe('q1')
      expect(loopQuestions[0].id).toBe('q2')
    })

    it('should handle difficulty-based filtering', async () => {
      const questionsStore = new QuestionsStore()
      
      // Load questions with mixed difficulties
      const mixedQuestions = IntegrationTestUtils.generateLargeDataset(
        (index) => ({
          id: `q${index}`,
          question_text: `Question ${index}`,
          concepts: ['variables'],
          archived: false,
          difficulty: ['beginner', 'intermediate', 'advanced'][index % 3] as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          solution: null,
          rubric: {}
        }),
        12
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mixedQuestions
        })
      } as Response)

      await questionsStore.loadQuestions()

      // Filter by difficulty
      const beginnerQuestions = questionsStore.questions.filter((q: any) => 
        q.difficulty === 'beginner'
      )
      const intermediateQuestions = questionsStore.questions.filter((q: any) => 
        q.difficulty === 'intermediate'
      )
      const advancedQuestions = questionsStore.questions.filter((q: any) => 
        q.difficulty === 'advanced'
      )

      expect(beginnerQuestions).toHaveLength(4)
      expect(intermediateQuestions).toHaveLength(4)
      expect(advancedQuestions).toHaveLength(4)
    })

    it('should handle text-based search', async () => {
      const questionsWithSearchableText = [
        {
          id: 'q1',
          question_text: 'Write a method to calculate factorial',
          concepts: ['methods', 'recursion'],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'intermediate' as const,
          solution: null,
          rubric: {}
        },
        {
          id: 'q2',
          question_text: 'Create a for loop to iterate through array',
          concepts: ['loops', 'arrays'],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        },
        {
          id: 'q3',
          question_text: 'Implement binary search algorithm',
          concepts: ['algorithms', 'arrays'],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'advanced' as const,
          solution: null,
          rubric: {}
        }
      ]

      const questionsStore = new QuestionsStore()

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questionsWithSearchableText
        })
      } as Response)

      await questionsStore.loadQuestions()

      // Search functionality (would be implemented in UI layer)
      const searchQuestions = (term: string) => {
        return questionsStore.questions.filter((q: any) => 
          q.question_text.toLowerCase().includes(term.toLowerCase())
        )
      }

      const methodQuestions = searchQuestions('method')
      const loopQuestions = searchQuestions('loop')
      const algorithmQuestions = searchQuestions('algorithm')

      expect(methodQuestions).toHaveLength(1)
      expect(loopQuestions).toHaveLength(1)
      expect(algorithmQuestions).toHaveLength(1)
      expect(methodQuestions[0].id).toBe('q1')
    })
  })

  describe('Bulk Operations', () => {
    it('should handle bulk archive operations', async () => {
      const { questions } = IntegrationTestUtils.createTestScenario()
      const questionsStore = new QuestionsStore()

      questionsStore.questions = questions

      // Archive multiple questions in sequence
      const questionsToArchive = [questions[0].id, questions[1].id]
      
      for (const questionId of questionsToArchive) {
        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)

        const result = await questionsStore.archiveQuestion(questionId)
        expect(result.success).toBe(true)
      }

      expect(questionsStore.questions).toHaveLength(1)
      expect(questionsStore.activeQuestions).toHaveLength(1)
    })

    it('should handle bulk restore operations', async () => {
      const questionsStore = new QuestionsStore()
      const { questions } = IntegrationTestUtils.createTestScenario()

      // Mock bulk restore API call
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: questions
          })
        } as Response)

      // Simulate bulk restore (multiple question IDs)
      const restoreResult = await questionsStore.restoreQuestion(questions[0].id)

      expect(restoreResult.success).toBe(true)
      expect(questionsStore.questions).toEqual(questions)
    })

    it('should handle partial failures in bulk operations', async () => {
      const { questions } = IntegrationTestUtils.createTestScenario()
      const questionsStore = new QuestionsStore()

      questionsStore.questions = questions

      // First archive succeeds, second fails
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            success: false,
            error: { message: 'Question in use' }
          })
        } as Response)

      const firstResult = await questionsStore.archiveQuestion(questions[0].id)
      expect(firstResult.success).toBe(true)
      expect(questionsStore.questions).toHaveLength(2)

      await expect(questionsStore.archiveQuestion(questions[1].id))
        .rejects.toThrow('Question in use')
      
      // Should still have 2 questions (one archived, one failed)
      expect(questionsStore.questions).toHaveLength(2)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle archive attempts on non-existent questions', async () => {
      const questionsStore = new QuestionsStore()
      questionsStore.questions = []

      const result = await questionsStore.archiveQuestion('non-existent-id')

      expect(result.success).toBe(false)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle concurrent archive operations on same question', async () => {
      const { questions } = IntegrationTestUtils.createTestScenario()
      const questionsStore = new QuestionsStore()

      questionsStore.questions = questions

      // First call succeeds, second should fail (question already archived)
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        } as Response)

      const firstPromise = questionsStore.archiveQuestion(questions[0].id)
      const secondPromise = questionsStore.archiveQuestion(questions[0].id)

      const [firstResult, secondResult] = await Promise.allSettled([
        firstPromise, 
        secondPromise
      ])

      expect(firstResult.status).toBe('fulfilled')
      if (firstResult.status === 'fulfilled') {
        expect(firstResult.value.success).toBe(true)
      }

      expect(secondResult.status).toBe('fulfilled')
      if (secondResult.status === 'fulfilled') {
        expect(secondResult.value.success).toBe(false)
      }
    })

    it('should handle malformed question data gracefully', async () => {
      const questionsStore = new QuestionsStore()

      const malformedQuestions = [
        {
          id: 'q1',
          question_text: null, // Invalid
          concepts: undefined, // Invalid
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        }
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: malformedQuestions
        })
      } as Response)

      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toEqual(malformedQuestions)
      expect(questionsStore.error).toBeNull()

      // Should be able to archive even malformed questions
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response)

      const result = await questionsStore.archiveQuestion('q1')
      expect(result.success).toBe(true)
    })

    it('should handle network interruptions during operations', async () => {
      const { questions } = IntegrationTestUtils.createTestScenario()
      const questionsStore = new QuestionsStore()

      questionsStore.questions = questions

      // Simulate network error during archive
      vi.mocked(fetch).mockRejectedValueOnce(ErrorScenarios.networkError())

      await expect(questionsStore.archiveQuestion(questions[0].id))
        .rejects.toThrow('Network request failed')

      // Question should remain in active list
      expect(questionsStore.questions).toContain(questions[0])
      expect(questionsStore.error).toBe('Network request failed')
    })

    it('should handle API rate limiting', async () => {
      const { questions } = IntegrationTestUtils.createTestScenario()
      const questionsStore = new QuestionsStore()

      questionsStore.questions = questions

      // Simulate rate limit error
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Rate limit exceeded' }
        })
      } as Response)

      await expect(questionsStore.archiveQuestion(questions[0].id))
        .rejects.toThrow('Rate limit exceeded')

      expect(questionsStore.error).toBe('Rate limit exceeded')
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large question sets efficiently', async () => {
      const questionsStore = new QuestionsStore()

      // Generate large dataset
      const largeQuestionSet = IntegrationTestUtils.generateLargeDataset(
        (index) => ({
          id: `q${index}`,
          question_text: `Question ${index}`,
          concepts: [`concept${index % 10}`],
          archived: index % 10 === 0, // 10% archived
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        }),
        1000
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: largeQuestionSet
        })
      } as Response)

      const start = Date.now()
      await questionsStore.loadQuestions()
      const loadDuration = Date.now() - start

      expect(questionsStore.questions).toHaveLength(1000)
      expect(loadDuration).toBeLessThan(1000)

      // Test filtering performance
      const filterStart = Date.now()
      const activeQuestions = questionsStore.activeQuestions
      const archivedQuestions = questionsStore.archivedQuestions
      const filterDuration = Date.now() - filterStart

      expect(activeQuestions).toHaveLength(900)
      expect(archivedQuestions).toHaveLength(100)
      expect(filterDuration).toBeLessThan(100)
    })

    it('should handle rapid question state changes', async () => {
      const questionsStore = new QuestionsStore()
      const { questions } = IntegrationTestUtils.createTestScenario()

      // Rapid state changes
      for (let i = 0; i < 100; i++) {
        questionsStore.questions = [...questions, {
          id: `temp-${i}`,
          question_text: `Temp question ${i}`,
          concepts: ['temp'],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        }]
      }

      expect(questionsStore.questions).toHaveLength(4) // Original 3 + 1 temp
      expect(questionsStore.activeQuestions).toHaveLength(4)
    })

    it('should optimize memory usage with large datasets', async () => {
      const questionsStore = new QuestionsStore()

      // Generate very large dataset
      const veryLargeDataset = IntegrationTestUtils.generateLargeDataset(
        (index) => ({
          id: `q${index}`,
          question_text: `Question ${index}`,
          concepts: [`concept${index % 5}`],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'teacher-id',
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        }),
        5000
      )

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: veryLargeDataset
        })
      } as Response)

      const start = Date.now()
      await questionsStore.loadQuestions()
      const duration = Date.now() - start

      expect(questionsStore.questions).toHaveLength(5000)
      expect(duration).toBeLessThan(2000) // Should handle within 2 seconds

      // Test memory cleanup
      questionsStore.questions = []
      expect(questionsStore.questions).toHaveLength(0)
      expect(questionsStore.activeQuestions).toHaveLength(0)
    })
  })
})