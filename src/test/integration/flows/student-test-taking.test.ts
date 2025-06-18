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

describe('Student Test Taking Integration Flow', () => {
  let TestAttemptStore: any
  let AuthStore: any
  let timers: ReturnType<typeof IntegrationTestUtils.mockTimers>

  beforeEach(async () => {
    resetMocks()
    IntegrationTestUtils.cleanup()

    // Setup timer mocking
    timers = IntegrationTestUtils.mockTimers()

    // Import stores
    const [testAttemptModule, authModule] = await Promise.all([
      import('../../../lib/stores/test-attempt.svelte.js'),
      import('../../../lib/stores/auth.svelte.js')
    ])

    TestAttemptStore = testAttemptModule.TestAttemptStore
    AuthStore = authModule.AuthStore
  })

  afterEach(() => {
    timers.cleanup()
    IntegrationTestUtils.cleanup()
  })

  describe('Complete Test Taking Workflow', () => {
    it('should complete full test attempt from start to submission', async () => {
      // Setup student session
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { questions, test, attempt, answers } = IntegrationTestUtils.createTestAttemptScenario()

      const authStore = new AuthStore()
      const testAttemptStore = new TestAttemptStore()

      authStore.user = mockUser

      // Mock test start sequence
      IntegrationTestUtils.mockFetchSequence([
        {
          ok: true,
          data: { attempt }
        },
        {
          ok: true,
          data: {
            test,
            questions: questions.map((q, index) => ({
              id: `tq${index + 1}`,
              question_id: q.id,
              question_text: q.question_text,
              concepts: q.concepts,
              question_order: index + 1,
              points: 100
            }))
          }
        }
      ])

      // Step 1: Start test
      const startResult = await testAttemptStore.startTest(test.id, mockUser.id)

      expect(startResult.success).toBe(true)
      expect(testAttemptStore.test).toEqual(test)
      expect(testAttemptStore.attempt).toEqual(attempt)
      expect(testAttemptStore.questions).toHaveLength(3)
      expect(testAttemptStore.currentQuestionIndex).toBe(0)
      expect(testAttemptStore.timer.isRunning).toBe(true)

      // Step 2: Answer first question
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          answer: answers['q1']
        })
      } as Response)

      testAttemptStore.updateCurrentCode('public int add(int a, int b) { return a + b; }')
      expect(testAttemptStore.currentCode).toBe('public int add(int a, int b) { return a + b; }')

      const saveResult1 = await testAttemptStore.saveAnswer('q1', 'public int add(int a, int b) { return a + b; }')
      expect(saveResult1.success).toBe(true)
      expect(testAttemptStore.answers['q1']).toEqual(answers['q1'])

      // Step 3: Navigate to second question
      testAttemptStore.nextQuestion()
      expect(testAttemptStore.currentQuestionIndex).toBe(1)
      expect(testAttemptStore.currentQuestion?.question_id).toBe('q2')

      // Step 4: Answer second question
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          answer: answers['q2']
        })
      } as Response)

      testAttemptStore.updateCurrentCode('for(int i = 1; i <= 10; i++) { System.out.println(i); }')
      const saveResult2 = await testAttemptStore.saveAnswer('q2', 'for(int i = 1; i <= 10; i++) { System.out.println(i); }')
      expect(saveResult2.success).toBe(true)

      // Step 5: Navigate to third question but leave it blank
      testAttemptStore.nextQuestion()
      expect(testAttemptStore.currentQuestionIndex).toBe(2)
      expect(testAttemptStore.isLastQuestion).toBe(true)

      // Step 6: Check progress
      expect(testAttemptStore.progress.answered).toBe(2)
      expect(testAttemptStore.progress.total).toBe(3)
      expect(testAttemptStore.progress.percentage).toBeCloseTo(66.67, 1)

      // Step 7: Submit test
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          attempt: {
            ...attempt,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          }
        })
      } as Response)

      const submitResult = await testAttemptStore.submitTest()

      expect(submitResult.success).toBe(true)
      expect(testAttemptStore.attempt?.status).toBe('submitted')
      expect(testAttemptStore.timer.isRunning).toBe(false)

      // Verify final state
      expectStoreState(testAttemptStore, {
        submitting: false,
        error: null
      })
    })

    it('should handle auto-submit when timer expires', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      // Set test to expire soon
      const startTime = new Date(Date.now() - 59 * 60 * 1000) // 59 minutes ago
      const modifiedAttempt = {
        ...attempt,
        started_at: startTime.toISOString()
      }

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        {
          ok: true,
          data: { attempt: modifiedAttempt }
        },
        {
          ok: true,
          data: { test, questions: [] }
        }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Timer should be close to expiring
      expect(testAttemptStore.timer.timeRemaining).toBeLessThan(120) // Less than 2 minutes

      // Mock auto-submit
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          attempt: {
            ...modifiedAttempt,
            status: 'submitted',
            submitted_at: new Date().toISOString()
          }
        })
      } as Response)

      // Simulate timer expiration
      testAttemptStore.timer.timeRemaining = 0
      testAttemptStore.timer.isExpired = true
      testAttemptStore.timer.isRunning = false

      // Trigger auto-submit manually (simulating timer callback)
      const autoSubmitResult = await testAttemptStore.submitTest(true)

      expect(autoSubmitResult.success).toBe(true)
      expect(testAttemptStore.attempt?.status).toBe('submitted')
    })

    it('should handle test with security features enabled', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      // Enable security features
      const secureTest = {
        ...test,
        fullscreen_required: true,
        disable_copy_paste: true
      }

      const testAttemptStore = new TestAttemptStore()
      const browserAPIs = IntegrationTestUtils.mockBrowserAPIs()

      IntegrationTestUtils.mockFetchSequence([
        {
          ok: true,
          data: { attempt }
        },
        {
          ok: true,
          data: { test: secureTest, questions: [] }
        }
      ])

      await testAttemptStore.startTest(secureTest.id, mockUser.id)

      // Should have enabled security features
      expect(testAttemptStore.fullscreenActive).toBe(true)
      expect(testAttemptStore.copyPasteBlocked).toBe(true)
      expect(document.documentElement.requestFullscreen).toHaveBeenCalled()

      // Test fullscreen change
      browserAPIs.triggerFullscreen()
      expect(testAttemptStore.fullscreenActive).toBe(true)
    })
  })

  describe('Navigation and Code Management', () => {
    it('should handle navigation between questions with code persistence', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { questions, test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test, questions } }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Answer first question
      testAttemptStore.updateCurrentCode('answer 1')
      expect(testAttemptStore.currentCode).toBe('answer 1')

      // Navigate to second question
      testAttemptStore.nextQuestion()
      expect(testAttemptStore.currentQuestionIndex).toBe(1)
      expect(testAttemptStore.currentCode).toBe('') // No answer yet

      // Answer second question
      testAttemptStore.updateCurrentCode('answer 2')
      expect(testAttemptStore.currentCode).toBe('answer 2')

      // Navigate back to first question
      testAttemptStore.previousQuestion()
      expect(testAttemptStore.currentQuestionIndex).toBe(0)
      expect(testAttemptStore.currentCode).toBe('answer 1') // Should persist

      // Navigate to specific question
      testAttemptStore.goToQuestion(2)
      expect(testAttemptStore.currentQuestionIndex).toBe(2)
      expect(testAttemptStore.currentCode).toBe('') // Third question not answered

      // Test boundary conditions
      testAttemptStore.goToQuestion(-1) // Should not change
      expect(testAttemptStore.currentQuestionIndex).toBe(2)

      testAttemptStore.goToQuestion(10) // Should not change
      expect(testAttemptStore.currentQuestionIndex).toBe(2)
    })

    it('should handle font size controls', async () => {
      const testAttemptStore = new TestAttemptStore()

      expect(testAttemptStore.fontSize).toBe(14) // Default

      // Increase font size
      testAttemptStore.increaseFontSize()
      expect(testAttemptStore.fontSize).toBe(16)

      testAttemptStore.increaseFontSize()
      expect(testAttemptStore.fontSize).toBe(18)

      // Test maximum limit
      for (let i = 0; i < 10; i++) {
        testAttemptStore.increaseFontSize()
      }
      expect(testAttemptStore.fontSize).toBe(24) // Maximum

      // Decrease font size
      testAttemptStore.decreaseFontSize()
      expect(testAttemptStore.fontSize).toBe(22)

      // Test minimum limit
      for (let i = 0; i < 20; i++) {
        testAttemptStore.decreaseFontSize()
      }
      expect(testAttemptStore.fontSize).toBe(10) // Minimum
    })

    it('should handle auto-save with debouncing', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test, questions: [{ id: 'tq1', question_id: 'q1' }] } }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Mock save response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          answer: { answer_code: 'test code' }
        })
      } as Response)

      // Rapid code updates should debounce
      testAttemptStore.updateCurrentCode('a')
      testAttemptStore.updateCurrentCode('ab')
      testAttemptStore.updateCurrentCode('abc')

      expect(testAttemptStore.autoSave.isDirty).toBe(true)

      // Fast-forward timers to trigger debounced save
      timers.tick(10000)

      // Should have only triggered one save call
      expect(fetch).toHaveBeenCalledTimes(2) // Start test calls + 1 save
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle test start failures gracefully', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const testAttemptStore = new TestAttemptStore()

      // Mock test start failure
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Test not available'
        })
      } as Response)

      const result = await testAttemptStore.startTest('invalid-test', mockUser.id)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Test not available')
      expect(testAttemptStore.test).toBeNull()
      expect(testAttemptStore.attempt).toBeNull()
      expect(testAttemptStore.loading).toBe(false)
    })

    it('should handle save failures with user notification', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test, questions: [{ id: 'tq1', question_id: 'q1' }] } }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Mock save failure
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Server error'
        })
      } as Response)

      // Mock alert
      global.alert = vi.fn()

      const saveResult = await testAttemptStore.saveAnswer('q1', 'test code')

      expect(saveResult.success).toBe(false)
      expect(saveResult.error).toBe('Server error')
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Failed to save your answer')
      )
    })

    it('should handle network failures during save', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test, questions: [{ id: 'tq1', question_id: 'q1' }] } }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Mock network error
      vi.mocked(fetch).mockRejectedValueOnce(ErrorScenarios.networkError())
      global.alert = vi.fn()

      const saveResult = await testAttemptStore.saveAnswer('q1', 'test code')

      expect(saveResult.success).toBe(false)
      expect(saveResult.error).toBe('Network request failed')
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Network error while saving')
      )
    })

    it('should handle submit failures', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test, questions: [] } }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Mock submit failure
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Submit failed'
        })
      } as Response)

      const submitResult = await testAttemptStore.submitTest()

      expect(submitResult.success).toBe(false)
      expect(submitResult.error).toBe('Submit failed')
      expect(testAttemptStore.submitting).toBe(false)
    })

    it('should prevent operations when test not in progress', async () => {
      const testAttemptStore = new TestAttemptStore()

      // Try to save without starting test
      const saveResult = await testAttemptStore.saveAnswer('q1', 'test code')
      expect(saveResult.success).toBe(false)
      expect(saveResult.error).toBe('Test not in progress')

      // Try to submit without starting test
      const submitResult = await testAttemptStore.submitTest()
      expect(submitResult.success).toBe(false)
      expect(submitResult.error).toBe('No active attempt')
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle large code content efficiently', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test, questions: [{ id: 'tq1', question_id: 'q1' }] } }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Generate large code content
      const largeCode = 'a'.repeat(10000) // 10KB of code

      const start = Date.now()
      testAttemptStore.updateCurrentCode(largeCode)
      const duration = Date.now() - start

      expect(testAttemptStore.currentCode).toBe(largeCode)
      expect(duration).toBeLessThan(100) // Should handle quickly
    })

    it('should cleanup resources on reset', async () => {
      const testAttemptStore = new TestAttemptStore()

      // Set up some state
      testAttemptStore.test = IntegrationTestUtils.createTestScenario().test
      testAttemptStore.attempt = IntegrationTestUtils.createTestAttemptScenario().attempt
      testAttemptStore.timer.isRunning = true

      // Trigger auto-save timeout
      testAttemptStore.updateCurrentCode('test')

      testAttemptStore.reset()

      // Verify complete cleanup
      expect(testAttemptStore.test).toBeNull()
      expect(testAttemptStore.attempt).toBeNull()
      expect(testAttemptStore.questions).toEqual([])
      expect(testAttemptStore.answers).toEqual({})
      expect(testAttemptStore.timer.isRunning).toBe(false)
      expect(testAttemptStore.autoSave.isDirty).toBe(false)
    })

    it('should handle concurrent save operations', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test, questions: [{ id: 'tq1', question_id: 'q1' }] } }
      ])

      await testAttemptStore.startTest(test.id, mockUser.id)

      // Mock save responses
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          answer: { answer_code: 'test' }
        })
      } as Response)

      // Multiple concurrent saves
      const savePromises = Array(5).fill(null).map((_, i) =>
        testAttemptStore.saveAnswer('q1', `code ${i}`)
      )

      const results = await Promise.all(savePromises)

      // All should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      expect(testAttemptStore.autoSave.isSaving).toBe(false)
    })
  })

  describe('Integration with Browser Features', () => {
    it('should integrate with fullscreen API correctly', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const secureTest = { ...test, fullscreen_required: true }
      const testAttemptStore = new TestAttemptStore()
      const browserAPIs = IntegrationTestUtils.mockBrowserAPIs()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test: secureTest, questions: [] } }
      ])

      await testAttemptStore.startTest(secureTest.id, mockUser.id)

      expect(testAttemptStore.fullscreenActive).toBe(true)

      // Simulate fullscreen exit
      document.fullscreenElement = null
      document.dispatchEvent(new Event('fullscreenchange'))

      // Should detect fullscreen exit
      expect(testAttemptStore.fullscreenActive).toBe(false)
    })

    it('should block copy-paste operations when enabled', async () => {
      const { mockUser } = await IntegrationTestUtils.createUserSession('student')
      const { test, attempt } = IntegrationTestUtils.createTestAttemptScenario()

      const secureTest = { ...test, disable_copy_paste: true }
      const testAttemptStore = new TestAttemptStore()

      IntegrationTestUtils.mockFetchSequence([
        { ok: true, data: { attempt } },
        { ok: true, data: { test: secureTest, questions: [] } }
      ])

      await testAttemptStore.startTest(secureTest.id, mockUser.id)

      expect(testAttemptStore.copyPasteBlocked).toBe(true)

      // Event listeners should be set up to prevent copy/paste
      // This would be verified in actual browser testing
    })
  })
})