import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IntegrationTestUtils, expectStoreState, waitForStoreUpdate, ErrorScenarios } from '../../integration-setup.js'
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

describe('Teacher Test Creation Integration Flow', () => {
  let QuestionsStore: any
  let TestsStore: any
  let AuthStore: any

  beforeEach(async () => {
    resetMocks()
    IntegrationTestUtils.cleanup()

    // Import stores
    const [questionsModule, testsModule, authModule] = await Promise.all([
      import('../../../lib/stores/questions.svelte.js'),
      import('../../../lib/stores/tests.svelte.js'),
      import('../../../lib/stores/auth.svelte.js')
    ])

    QuestionsStore = questionsModule.QuestionsStore
    TestsStore = testsModule.TestsStore
    AuthStore = authModule.AuthStore
  })

  afterEach(() => {
    IntegrationTestUtils.cleanup()
  })

  describe('Complete Test Creation Workflow', () => {
    it('should complete full test creation from questions to published test', async () => {
      // Setup user session
      const { mockUser, mockProfile } = await IntegrationTestUtils.createUserSession('teacher')
      
      // Setup test scenario
      const { questions, test } = IntegrationTestUtils.createTestScenario()

      // Initialize stores
      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      // Step 1: Authenticate user
      authStore.user = mockUser
      authStore.profile = mockProfile

      // Step 2: Load questions
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toHaveLength(3)
      expect(questionsStore.loading).toBe(false)
      expect(questionsStore.error).toBeNull()

      // Step 3: Create test with selected questions
      const testData = {
        title: 'Java Fundamentals Test',
        description: 'Test covering basic Java concepts',
        questionIds: ['q1', 'q2'], // Select first two questions
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: true,
          disableCopyPaste: false
        }
      }

      // Mock test creation API call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { ...test, ...testData }
        })
      } as Response)

      // Mock loadTests call after creation
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ ...test, ...testData, status: 'draft' }],
            error: null
          })
        })
      })

      const createResult = await testsStore.createTest(testData)

      expect(createResult.success).toBe(true)
      expect(createResult.test).toBeDefined()
      expect(testsStore.tests).toHaveLength(1)
      expect(testsStore.draftTests).toHaveLength(1)
      expect(testsStore.activeTests).toHaveLength(0)

      // Step 4: Publish the test
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true
        })
      } as Response)

      const publishResult = await testsStore.publishTest(createResult.test!.id)

      expect(publishResult.success).toBe(true)
      expect(testsStore.tests[0].status).toBe('active')
      expect(testsStore.activeTests).toHaveLength(1)
      expect(testsStore.draftTests).toHaveLength(0)

      // Verify final state
      expectStoreState(questionsStore, {
        loading: false,
        error: null
      })

      expectStoreState(testsStore, {
        loading: false,
        error: null
      })

      expect(testsStore.tests[0]).toMatchObject({
        title: testData.title,
        description: testData.description,
        time_limit_minutes: testData.timeLimitMinutes,
        status: 'active'
      })
    })

    it('should handle test creation with all available questions', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { questions } = IntegrationTestUtils.createTestScenario()

      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      authStore.user = mockUser

      // Load all questions
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      // Create test with all questions
      const testData = {
        title: 'Comprehensive Java Test',
        description: 'Complete coverage test',
        questionIds: questions.map(q => q.id),
        timeLimitMinutes: 120,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: true,
          fullscreenRequired: false,
          disableCopyPaste: true
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'comprehensive-test', ...testData }
        })
      } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'comprehensive-test', ...testData, status: 'draft' }],
            error: null
          })
        })
      })

      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(true)
      expect(result.test?.title).toBe('Comprehensive Java Test')
      expect(testsStore.tests[0]).toMatchObject({
        title: testData.title,
        time_limit_minutes: 120
      })
    })

    it('should handle partial workflow failures gracefully', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { questions } = IntegrationTestUtils.createTestScenario()

      const authStore = new AuthStore()
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      authStore.user = mockUser

      // Step 1: Questions load successfully
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()
      expect(questionsStore.questions).toHaveLength(3)

      // Step 2: Test creation fails
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Invalid test configuration' }
        })
      } as Response)

      const testData = {
        title: 'Failed Test',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid test configuration')
      expect(testsStore.tests).toHaveLength(0)

      // Verify questions store is unaffected
      expect(questionsStore.questions).toHaveLength(3)
      expect(questionsStore.error).toBeNull()
    })
  })

  describe('Question Selection and Validation', () => {
    it('should validate question availability during test creation', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { questions } = IntegrationTestUtils.createTestScenario()

      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      // Load questions
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      // Try to create test with non-existent question
      const testData = {
        title: 'Invalid Test',
        questionIds: ['q1', 'q2', 'non-existent-q'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'One or more questions not found' }
        })
      } as Response)

      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('One or more questions not found')
    })

    it('should handle archived questions during test creation', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const questions = [
        ...IntegrationTestUtils.createTestScenario().questions,
        {
          id: 'q4',
          question_text: 'Archived question',
          concepts: ['archived'],
          archived: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: mockUser.id,
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        }
      ]

      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      // Load questions (including archived)
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      expect(questionsStore.activeQuestions).toHaveLength(3)
      expect(questionsStore.archivedQuestions).toHaveLength(1)

      // Should only be able to use active questions
      const availableQuestionIds = questionsStore.activeQuestions.map(q => q.id)
      expect(availableQuestionIds).toEqual(['q1', 'q2', 'q3'])
      expect(availableQuestionIds).not.toContain('q4')
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle network errors during question loading', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      
      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      // Simulate network error
      vi.mocked(fetch).mockRejectedValueOnce(ErrorScenarios.networkError())

      await questionsStore.loadQuestions()

      expect(questionsStore.questions).toHaveLength(0)
      expect(questionsStore.error).toBe('Network request failed')
      expect(questionsStore.loading).toBe(false)

      // Should not be able to create test without questions
      const testData = {
        title: 'Test Without Questions',
        questionIds: [],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'No questions selected' }
        })
      } as Response)

      const result = await testsStore.createTest(testData)
      expect(result.success).toBe(false)
    })

    it('should handle concurrent test creation attempts', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { questions } = IntegrationTestUtils.createTestScenario()

      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      // Load questions
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: questions
        })
      } as Response)

      await questionsStore.loadQuestions()

      const testData = {
        title: 'Concurrent Test',
        questionIds: ['q1', 'q2'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      // Mock successful responses for both attempts
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'test-1', ...testData }
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { id: 'test-2', ...testData, title: 'Concurrent Test 2' }
          })
        } as Response)

      // Mock loadTests calls
      mockSupabaseClient.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'test-1', ...testData, status: 'draft' }],
              error: null
            })
          })
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'test-1', ...testData, status: 'draft' },
                { id: 'test-2', ...testData, title: 'Concurrent Test 2', status: 'draft' }
              ],
              error: null
            })
          })
        })

      // Create two tests concurrently
      const [result1, result2] = await Promise.all([
        testsStore.createTest(testData),
        testsStore.createTest({ ...testData, title: 'Concurrent Test 2' })
      ])

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(testsStore.tests).toHaveLength(2)
    })

    it('should maintain data consistency during failed operations', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      const { questions } = IntegrationTestUtils.createTestScenario()

      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

      // Initial state
      questionsStore.questions = questions
      const initialQuestionCount = questionsStore.questions.length

      // Attempt test creation that fails
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: { message: 'Server error' }
        })
      } as Response)

      const testData = {
        title: 'Failed Test',
        questionIds: ['q1'],
        timeLimitMinutes: 60,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      const result = await testsStore.createTest(testData)

      expect(result.success).toBe(false)

      // Verify data consistency - questions should be unchanged
      expect(questionsStore.questions).toHaveLength(initialQuestionCount)
      expect(testsStore.tests).toHaveLength(0)
      expect(questionsStore.questions[0].id).toBe('q1')
    })
  })

  describe('Performance and Scale Testing', () => {
    it('should handle large question sets efficiently', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('teacher')
      
      // Generate large question set
      const largeQuestionSet = IntegrationTestUtils.generateLargeDataset(
        (index) => ({
          id: `q${index}`,
          question_text: `Question ${index}`,
          concepts: [`concept${index % 5}`],
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: mockUser.id,
          language: 'java' as const,
          difficulty: 'beginner' as const,
          solution: null,
          rubric: {}
        }),
        100
      )

      const questionsStore = new QuestionsStore()
      const testsStore = new TestsStore()

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

      expect(questionsStore.questions).toHaveLength(100)
      expect(loadDuration).toBeLessThan(1000) // Should load within 1 second

      // Test creation with subset of questions
      const selectedQuestionIds = largeQuestionSet.slice(0, 10).map(q => q.id)
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 'large-test', questionIds: selectedQuestionIds }
        })
      } as Response)

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'large-test', status: 'draft' }],
            error: null
          })
        })
      })

      const testData = {
        title: 'Large Scale Test',
        questionIds: selectedQuestionIds,
        timeLimitMinutes: 120,
        endDate: new Date(Date.now() + 86400000).toISOString(),
        createdBy: mockUser.id,
        settings: {
          immediateeFeedback: false,
          fullscreenRequired: false,
          disableCopyPaste: false
        }
      }

      const createStart = Date.now()
      const result = await testsStore.createTest(testData)
      const createDuration = Date.now() - createStart

      expect(result.success).toBe(true)
      expect(createDuration).toBeLessThan(500) // Should create within 500ms
    })
  })
})