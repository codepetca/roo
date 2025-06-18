import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockSupabaseClient, createMockTest, createMockAttempt, createMockAnswer, createMockQuestion, resetMocks } from '../../test/setup.js'
import type { CodingTest, TestAttempt, TestAnswer, TestQuestionWithDetails } from '$lib/types/index.js'

// Mock dependencies
vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock fetch globally
global.fetch = vi.fn()

// Mock DOM APIs
Object.defineProperty(document, 'fullscreenElement', {
  value: null,
  writable: true
})

Object.defineProperty(document, 'documentElement', {
  value: {
    requestFullscreen: vi.fn()
  }
})

describe('Test Attempt Store', () => {
  let TestAttemptStore: any
  let mockTimers: { intervals: NodeJS.Timeout[], timeouts: NodeJS.Timeout[] } = { intervals: [], timeouts: [] }

  beforeEach(async () => {
    resetMocks()
    vi.clearAllMocks()
    mockTimers = { intervals: [], timeouts: [] }

    // Mock timer functions
    vi.spyOn(global, 'setInterval').mockImplementation((callback: Function, delay: number) => {
      const id = setTimeout(() => {}, delay) // Create a fake ID
      mockTimers.intervals.push(id)
      // Simulate timer behavior for testing
      if (delay === 1000) {
        // This is the countdown timer
        setTimeout(callback, 0) // Execute immediately for testing
      }
      return id
    })

    vi.spyOn(global, 'clearInterval').mockImplementation((id: NodeJS.Timeout) => {
      const index = mockTimers.intervals.indexOf(id)
      if (index > -1) {
        mockTimers.intervals.splice(index, 1)
      }
    })

    vi.spyOn(global, 'setTimeout').mockImplementation((callback: Function, delay: number) => {
      const id = setTimeout(callback, 0) // Execute immediately for testing
      mockTimers.timeouts.push(id)
      return id
    })

    vi.spyOn(global, 'clearTimeout').mockImplementation((id: NodeJS.Timeout) => {
      const index = mockTimers.timeouts.indexOf(id)
      if (index > -1) {
        mockTimers.timeouts.splice(index, 1)
      }
      clearTimeout(id)
    })

    // Mock Date.now for timer testing
    vi.spyOn(Date, 'now').mockReturnValue(1000000000000) // Fixed timestamp

    // Mock alert
    global.alert = vi.fn()

    // Dynamic import to ensure fresh instance
    const module = await import('./test-attempt.svelte.js')
    TestAttemptStore = module.TestAttemptStore
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Clean up any remaining timers
    mockTimers.intervals.forEach(clearInterval)
    mockTimers.timeouts.forEach(clearTimeout)
  })

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const store = new TestAttemptStore()
      
      expect(store.test).toBeNull()
      expect(store.attempt).toBeNull()
      expect(store.questions).toEqual([])
      expect(store.answers).toEqual({})
      expect(store.currentQuestionIndex).toBe(0)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.submitting).toBe(false)
      expect(store.fontSize).toBe(14)
      expect(store.fullscreenActive).toBe(false)
      expect(store.copyPasteBlocked).toBe(false)
    })

    it('should initialize timer state correctly', () => {
      const store = new TestAttemptStore()
      
      expect(store.timer.timeRemaining).toBe(0)
      expect(store.timer.isRunning).toBe(false)
      expect(store.timer.isExpired).toBe(false)
    })

    it('should initialize auto-save state correctly', () => {
      const store = new TestAttemptStore()
      
      expect(store.autoSave.lastSaved).toBeNull()
      expect(store.autoSave.isDirty).toBe(false)
      expect(store.autoSave.isSaving).toBe(false)
    })
  })

  describe('Start Test', () => {
    it('should start test successfully', async () => {
      const mockTest = createMockTest({
        id: 'test-1',
        time_limit_minutes: 60,
        fullscreen_required: false,
        disable_copy_paste: false
      })
      const mockAttempt = createMockAttempt({
        id: 'attempt-1',
        test_id: 'test-1',
        started_at: new Date().toISOString()
      })
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1', question_text: 'Question 1', concepts: ['variables'] },
        { id: 'tq2', question_id: 'q2', question_text: 'Question 2', concepts: ['loops'] }
      ]

      // Mock API responses
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            attempt: mockAttempt 
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            test: mockTest,
            questions: mockQuestions
          })
        } as Response)

      const store = new TestAttemptStore()
      const result = await store.startTest('test-1', 'student-1')

      expect(result.success).toBe(true)
      expect(store.test).toEqual(mockTest)
      expect(store.attempt).toEqual(mockAttempt)
      expect(store.questions).toEqual(mockQuestions)
      expect(store.loading).toBe(false)
    })

    it('should handle start test API error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Test not available'
        })
      } as Response)

      const store = new TestAttemptStore()
      const result = await store.startTest('test-1', 'student-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Test not available')
      expect(store.test).toBeNull()
      expect(store.attempt).toBeNull()
    })

    it('should handle questions loading error', async () => {
      const mockAttempt = createMockAttempt()

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true, 
            attempt: mockAttempt 
          })
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({
            success: false,
            error: 'Failed to load questions'
          })
        } as Response)

      const store = new TestAttemptStore()
      const result = await store.startTest('test-1', 'student-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to load questions')
    })

    it('should initialize timer when test starts', async () => {
      const startTime = new Date()
      const mockTest = createMockTest({
        time_limit_minutes: 60
      })
      const mockAttempt = createMockAttempt({
        started_at: startTime.toISOString(),
        status: 'in_progress'
      })

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ attempt: mockAttempt })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            test: mockTest,
            questions: []
          })
        } as Response)

      const store = new TestAttemptStore()
      await store.startTest('test-1', 'student-1')

      expect(store.timer.isRunning).toBe(true)
      expect(store.timer.timeRemaining).toBeGreaterThan(0)
    })

    it('should enable fullscreen if required', async () => {
      const mockTest = createMockTest({
        fullscreen_required: true
      })
      const mockAttempt = createMockAttempt()

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ attempt: mockAttempt })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            test: mockTest,
            questions: []
          })
        } as Response)

      const store = new TestAttemptStore()
      await store.startTest('test-1', 'student-1')

      expect(document.documentElement.requestFullscreen).toHaveBeenCalled()
      expect(store.fullscreenActive).toBe(true)
    })

    it('should block copy-paste if required', async () => {
      const mockTest = createMockTest({
        disable_copy_paste: true
      })
      const mockAttempt = createMockAttempt()

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ attempt: mockAttempt })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            test: mockTest,
            questions: []
          })
        } as Response)

      const store = new TestAttemptStore()
      await store.startTest('test-1', 'student-1')

      expect(store.copyPasteBlocked).toBe(true)
    })
  })

  describe('Save Answer', () => {
    it('should save answer successfully', async () => {
      const mockAttempt = createMockAttempt({
        id: 'attempt-1',
        test_id: 'test-1',
        status: 'in_progress'
      })
      const mockAnswer = createMockAnswer({
        answer_code: 'public int add(int a, int b) { return a + b; }',
        last_saved_at: new Date().toISOString()
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          answer: mockAnswer
        })
      } as Response)

      const store = new TestAttemptStore()
      store.attempt = mockAttempt

      const result = await store.saveAnswer('q1', 'public int add(int a, int b) { return a + b; }')

      expect(result.success).toBe(true)
      expect(store.answers['q1']).toEqual(mockAnswer)
      expect(store.autoSave.lastSaved).toBeTruthy()
      expect(store.autoSave.isDirty).toBe(false)
      expect(store.autoSave.isSaving).toBe(false)
    })

    it('should handle save answer when test not in progress', async () => {
      const mockAttempt = createMockAttempt({
        status: 'submitted'
      })

      const store = new TestAttemptStore()
      store.attempt = mockAttempt

      const result = await store.saveAnswer('q1', 'test code')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Test not in progress')
    })

    it('should handle save answer API error', async () => {
      const mockAttempt = createMockAttempt({
        status: 'in_progress'
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          success: false,
          error: 'Server error'
        })
      } as Response)

      const store = new TestAttemptStore()
      store.attempt = mockAttempt

      const result = await store.saveAnswer('q1', 'test code')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Server error')
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Failed to save your answer')
      )
    })

    it('should handle network errors during save', async () => {
      const mockAttempt = createMockAttempt({
        status: 'in_progress'
      })

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const store = new TestAttemptStore()
      store.attempt = mockAttempt

      const result = await store.saveAnswer('q1', 'test code')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Network error while saving')
      )
    })

    it('should not save when no attempt exists', async () => {
      const store = new TestAttemptStore()
      store.attempt = null

      const result = await store.saveAnswer('q1', 'test code')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Test not in progress')
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('Update Current Code', () => {
    it('should update code and set dirty flag', () => {
      const mockQuestion = { id: 'tq1', question_id: 'q1' } as TestQuestionWithDetails
      const mockAttempt = createMockAttempt()

      const store = new TestAttemptStore()
      store.attempt = mockAttempt
      store.questions = [mockQuestion]
      store.currentQuestionIndex = 0

      store.updateCurrentCode('test code')

      expect(store.answers['q1']).toBeDefined()
      expect(store.answers['q1'].answer_code).toBe('test code')
      expect(store.autoSave.isDirty).toBe(true)
    })

    it('should update existing answer', () => {
      const mockQuestion = { id: 'tq1', question_id: 'q1' } as TestQuestionWithDetails
      const existingAnswer = createMockAnswer({
        question_id: 'q1',
        answer_code: 'old code'
      })

      const store = new TestAttemptStore()
      store.questions = [mockQuestion]
      store.answers = { 'q1': existingAnswer }
      store.currentQuestionIndex = 0

      store.updateCurrentCode('new code')

      expect(store.answers['q1'].answer_code).toBe('new code')
      expect(store.autoSave.isDirty).toBe(true)
    })

    it('should trigger debounced auto-save', () => {
      const mockQuestion = { id: 'tq1', question_id: 'q1' } as TestQuestionWithDetails
      const mockAttempt = createMockAttempt()

      const store = new TestAttemptStore()
      store.attempt = mockAttempt
      store.questions = [mockQuestion]
      store.currentQuestionIndex = 0

      store.updateCurrentCode('test code')

      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000)
    })

    it('should not update when no current question', () => {
      const store = new TestAttemptStore()
      store.questions = []
      store.currentQuestionIndex = 0

      store.updateCurrentCode('test code')

      expect(Object.keys(store.answers)).toHaveLength(0)
      expect(store.autoSave.isDirty).toBe(false)
    })
  })

  describe('Navigation', () => {
    it('should navigate to specific question', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1' },
        { id: 'tq2', question_id: 'q2' },
        { id: 'tq3', question_id: 'q3' }
      ] as TestQuestionWithDetails[]

      const store = new TestAttemptStore()
      store.questions = mockQuestions

      store.goToQuestion(1)
      expect(store.currentQuestionIndex).toBe(1)

      store.goToQuestion(2)
      expect(store.currentQuestionIndex).toBe(2)
    })

    it('should not navigate to invalid question index', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1' }
      ] as TestQuestionWithDetails[]

      const store = new TestAttemptStore()
      store.questions = mockQuestions
      store.currentQuestionIndex = 0

      store.goToQuestion(-1)
      expect(store.currentQuestionIndex).toBe(0)

      store.goToQuestion(5)
      expect(store.currentQuestionIndex).toBe(0)
    })

    it('should navigate to next question', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1' },
        { id: 'tq2', question_id: 'q2' }
      ] as TestQuestionWithDetails[]

      const store = new TestAttemptStore()
      store.questions = mockQuestions
      store.currentQuestionIndex = 0

      store.nextQuestion()
      expect(store.currentQuestionIndex).toBe(1)

      // Should not go beyond last question
      store.nextQuestion()
      expect(store.currentQuestionIndex).toBe(1)
    })

    it('should navigate to previous question', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1' },
        { id: 'tq2', question_id: 'q2' }
      ] as TestQuestionWithDetails[]

      const store = new TestAttemptStore()
      store.questions = mockQuestions
      store.currentQuestionIndex = 1

      store.previousQuestion()
      expect(store.currentQuestionIndex).toBe(0)

      // Should not go below 0
      store.previousQuestion()
      expect(store.currentQuestionIndex).toBe(0)
    })
  })

  describe('Font Size Controls', () => {
    it('should increase font size', () => {
      const store = new TestAttemptStore()
      store.fontSize = 14

      store.increaseFontSize()
      expect(store.fontSize).toBe(16)

      store.increaseFontSize()
      expect(store.fontSize).toBe(18)
    })

    it('should not increase font size beyond maximum', () => {
      const store = new TestAttemptStore()
      store.fontSize = 24

      store.increaseFontSize()
      expect(store.fontSize).toBe(24)
    })

    it('should decrease font size', () => {
      const store = new TestAttemptStore()
      store.fontSize = 16

      store.decreaseFontSize()
      expect(store.fontSize).toBe(14)

      store.decreaseFontSize()
      expect(store.fontSize).toBe(12)
    })

    it('should not decrease font size below minimum', () => {
      const store = new TestAttemptStore()
      store.fontSize = 10

      store.decreaseFontSize()
      expect(store.fontSize).toBe(10)
    })
  })

  describe('Submit Test', () => {
    it('should submit test successfully', async () => {
      const mockAttempt = createMockAttempt({
        id: 'attempt-1',
        test_id: 'test-1',
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          attempt: mockAttempt
        })
      } as Response)

      const store = new TestAttemptStore()
      store.attempt = createMockAttempt({ id: 'attempt-1', test_id: 'test-1' })

      const result = await store.submitTest()

      expect(result.success).toBe(true)
      expect(store.attempt).toEqual(mockAttempt)
      expect(store.timer.isRunning).toBe(false)
      expect(store.submitting).toBe(false)
    })

    it('should handle submit test error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          success: false,
          error: 'Cannot submit test'
        })
      } as Response)

      const store = new TestAttemptStore()
      store.attempt = createMockAttempt()

      const result = await store.submitTest()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot submit test')
      expect(store.submitting).toBe(false)
    })

    it('should not submit when no attempt exists', async () => {
      const store = new TestAttemptStore()
      store.attempt = null

      const result = await store.submitTest()

      expect(result.success).toBe(false)
      expect(result.error).toBe('No active attempt')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle auto-submit correctly', async () => {
      const mockAttempt = createMockAttempt()

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          attempt: mockAttempt
        })
      } as Response)

      const store = new TestAttemptStore()
      store.attempt = mockAttempt

      const result = await store.submitTest(true)

      expect(result.success).toBe(true)
    })
  })

  describe('Timer Management', () => {
    it('should initialize timer correctly', () => {
      const startTime = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      const mockTest = createMockTest({ time_limit_minutes: 60 })
      const mockAttempt = createMockAttempt({
        started_at: startTime.toISOString(),
        status: 'in_progress'
      })

      const store = new TestAttemptStore()
      store.test = mockTest
      store.attempt = mockAttempt

      // Access private method for testing
      ;(store as any).initializeTimer()

      expect(store.timer.timeRemaining).toBeGreaterThan(0)
      expect(store.timer.isRunning).toBe(true)
      expect(store.timer.isExpired).toBe(false)
    })

    it('should mark timer as expired when time is up', () => {
      const startTime = new Date(Date.now() - 90 * 60 * 1000) // 90 minutes ago (past time limit)
      const mockTest = createMockTest({ time_limit_minutes: 60 })
      const mockAttempt = createMockAttempt({
        started_at: startTime.toISOString(),
        status: 'in_progress'
      })

      const store = new TestAttemptStore()
      store.test = mockTest
      store.attempt = mockAttempt

      ;(store as any).initializeTimer()

      expect(store.timer.timeRemaining).toBe(0)
      expect(store.timer.isExpired).toBe(true)
      expect(store.timer.isRunning).toBe(false)
    })

    it('should not start timer when attempt is not in progress', () => {
      const mockTest = createMockTest({ time_limit_minutes: 60 })
      const mockAttempt = createMockAttempt({
        status: 'submitted'
      })

      const store = new TestAttemptStore()
      store.test = mockTest
      store.attempt = mockAttempt

      ;(store as any).initializeTimer()

      expect(store.timer.isRunning).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should compute current question correctly', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1', question_text: 'Question 1' },
        { id: 'tq2', question_id: 'q2', question_text: 'Question 2' }
      ] as TestQuestionWithDetails[]

      const store = new TestAttemptStore()
      store.questions = mockQuestions
      store.currentQuestionIndex = 1

      expect(store.currentQuestion).toEqual(mockQuestions[1])

      store.currentQuestionIndex = 0
      expect(store.currentQuestion).toEqual(mockQuestions[0])
    })

    it('should compute current answer correctly', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1' }
      ] as TestQuestionWithDetails[]
      const mockAnswer = createMockAnswer({
        question_id: 'q1',
        answer_code: 'test code'
      })

      const store = new TestAttemptStore()
      store.questions = mockQuestions
      store.answers = { 'q1': mockAnswer }
      store.currentQuestionIndex = 0

      expect(store.currentAnswer).toEqual(mockAnswer)
      expect(store.currentCode).toBe('test code')
    })

    it('should compute progress correctly', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1' },
        { id: 'tq2', question_id: 'q2' },
        { id: 'tq3', question_id: 'q3' }
      ] as TestQuestionWithDetails[]

      const mockAnswers = {
        'q1': createMockAnswer({ question_id: 'q1', answer_code: 'code 1' }),
        'q2': createMockAnswer({ question_id: 'q2', answer_code: '' }), // Empty code
        'q3': createMockAnswer({ question_id: 'q3', answer_code: 'code 3' })
      }

      const store = new TestAttemptStore()
      store.questions = mockQuestions
      store.answers = mockAnswers

      expect(store.progress.answered).toBe(2) // Only q1 and q3 have non-empty code
      expect(store.progress.total).toBe(3)
      expect(store.progress.percentage).toBeCloseTo(66.67, 1)
    })

    it('should compute navigation flags correctly', () => {
      const mockQuestions = [
        { id: 'tq1', question_id: 'q1' },
        { id: 'tq2', question_id: 'q2' }
      ] as TestQuestionWithDetails[]

      const store = new TestAttemptStore()
      store.questions = mockQuestions

      // First question
      store.currentQuestionIndex = 0
      expect(store.isFirstQuestion).toBe(true)
      expect(store.isLastQuestion).toBe(false)

      // Last question
      store.currentQuestionIndex = 1
      expect(store.isFirstQuestion).toBe(false)
      expect(store.isLastQuestion).toBe(true)
    })
  })

  describe('Reset', () => {
    it('should reset all state to defaults', () => {
      const store = new TestAttemptStore()
      
      // Set some state
      store.test = createMockTest()
      store.attempt = createMockAttempt()
      store.questions = [{ id: 'tq1', question_id: 'q1' }] as TestQuestionWithDetails[]
      store.answers = { 'q1': createMockAnswer() }
      store.currentQuestionIndex = 1
      store.loading = true
      store.error = 'Test error'
      store.fontSize = 20
      store.fullscreenActive = true

      store.reset()

      expect(store.test).toBeNull()
      expect(store.attempt).toBeNull()
      expect(store.questions).toEqual([])
      expect(store.answers).toEqual({})
      expect(store.currentQuestionIndex).toBe(0)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.fontSize).toBe(14)
      expect(store.fullscreenActive).toBe(false)
      expect(store.timer.timeRemaining).toBe(0)
      expect(store.timer.isRunning).toBe(false)
      expect(store.autoSave.isDirty).toBe(false)
    })

    it('should clear auto-save timeout on reset', () => {
      const store = new TestAttemptStore()
      
      // Trigger auto-save timeout
      store.updateCurrentCode = vi.fn()
      ;(store as any).autoSaveTimeout = setTimeout(() => {}, 1000)

      store.reset()

      expect(clearTimeout).toHaveBeenCalled()
      expect((store as any).autoSaveTimeout).toBeNull()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed API responses', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing success field
          attempt: {}
        })
      } as Response)

      const store = new TestAttemptStore()
      const result = await store.startTest('test-1', 'student-1')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle concurrent save operations', async () => {
      const mockAttempt = createMockAttempt({ status: 'in_progress' })
      let callCount = 0

      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            answer: createMockAnswer()
          })
        } as Response)
      })

      const store = new TestAttemptStore()
      store.attempt = mockAttempt

      // Start multiple concurrent saves
      const promises = [
        store.saveAnswer('q1', 'code1'),
        store.saveAnswer('q1', 'code2'),
        store.saveAnswer('q1', 'code3')
      ]

      const results = await Promise.all(promises)

      // All should complete successfully
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      expect(callCount).toBe(3) // All should make API calls
    })

    it('should handle rapid navigation without issues', () => {
      const mockQuestions = Array(10).fill(null).map((_, i) => ({
        id: `tq${i}`,
        question_id: `q${i}`
      })) as TestQuestionWithDetails[]

      const store = new TestAttemptStore()
      store.questions = mockQuestions

      // Rapid navigation
      for (let i = 0; i < 20; i++) {
        store.goToQuestion(i % 10)
      }

      expect(store.currentQuestionIndex).toBe(9)
    })

    it('should handle missing question data gracefully', () => {
      const store = new TestAttemptStore()
      store.questions = []
      store.currentQuestionIndex = 0

      expect(store.currentQuestion).toBeNull()
      expect(store.currentAnswer).toBeNull()
      expect(store.currentCode).toBe('')
    })

    it('should handle timer edge cases', () => {
      const store = new TestAttemptStore()
      
      // Timer with null test or attempt
      ;(store as any).initializeTimer()
      
      expect(store.timer.timeRemaining).toBe(0)
      expect(store.timer.isRunning).toBe(false)
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle large answer sets efficiently', () => {
      const store = new TestAttemptStore()
      const largeAnswerSet: Record<string, TestAnswer> = {}

      // Create 1000 answers
      for (let i = 0; i < 1000; i++) {
        largeAnswerSet[`q${i}`] = createMockAnswer({
          question_id: `q${i}`,
          answer_code: `code for question ${i}`
        })
      }

      const start = Date.now()
      store.answers = largeAnswerSet
      const duration = Date.now() - start

      expect(Object.keys(store.answers)).toHaveLength(1000)
      expect(duration).toBeLessThan(100) // Should be fast
    })

    it('should cleanup resources properly', () => {
      const store = new TestAttemptStore()
      
      // Set up some timeouts
      store.updateCurrentCode = vi.fn()
      ;(store as any).debouncedAutoSave('q1', 'code')

      store.reset()

      expect(clearTimeout).toHaveBeenCalled()
    })
  })
})