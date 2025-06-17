import { supabase } from '$lib/supabase.js'
import type { 
  TestAttempt, 
  TestAnswer, 
  CodingTest, 
  TestQuestionWithDetails,
  TimerState,
  AutoSaveState 
} from '$lib/types/index.js'

class TestAttemptStore {
  // Core state
  test = $state<CodingTest | null>(null)
  attempt = $state<TestAttempt | null>(null)
  questions = $state<TestQuestionWithDetails[]>([])
  answers = $state<Record<string, TestAnswer>>({})
  currentQuestionIndex = $state(0)
  
  // Timer state
  timer = $state<TimerState>({
    timeRemaining: 0,
    isRunning: false,
    isExpired: false
  })
  
  // Auto-save state
  autoSave = $state<AutoSaveState>({
    lastSaved: null,
    isDirty: false,
    isSaving: false
  })
  
  // UI state
  loading = $state(false)
  error = $state<string | null>(null)
  submitting = $state(false)
  fontSize = $state(14)
  
  // Security state
  fullscreenActive = $state(false)
  copyPasteBlocked = $state(false)

  // Computed properties
  currentQuestion = $derived(this.questions[this.currentQuestionIndex] || null)
  currentAnswer = $derived(this.currentQuestion ? this.answers[this.currentQuestion.question_id!] : null)
  currentCode = $derived(this.currentAnswer?.answer_code || '')
  progress = $derived({
    answered: Object.values(this.answers).filter(a => a.answer_code && a.answer_code.trim()).length,
    total: this.questions.length,
    percentage: this.questions.length > 0 
      ? (Object.values(this.answers).filter(a => a.answer_code && a.answer_code.trim()).length / this.questions.length) * 100 
      : 0
  })
  
  isLastQuestion = $derived(this.currentQuestionIndex === this.questions.length - 1)
  isFirstQuestion = $derived(this.currentQuestionIndex === 0)

  async startTest(testId: string, studentId: string): Promise<{ success: boolean; error?: string }> {
    this.loading = true
    this.error = null

    try {
      console.log('Starting test:', testId, 'for student:', studentId)
      
      // Start the test attempt
      const startResponse = await fetch(`/api/tests/${testId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentId })
      })

      console.log('Start response status:', startResponse.status)
      const startResult = await startResponse.json()
      console.log('Start result:', startResult)

      if (!startResponse.ok) {
        return { success: false, error: startResult.error || 'Failed to start test' }
      }

      this.attempt = startResult.attempt

      // Load test questions
      console.log('Loading questions for test:', testId)
      const questionsResponse = await fetch(`/api/tests/${testId}/questions?studentId=${studentId}`)
      console.log('Questions response status:', questionsResponse.status)
      const questionsResult = await questionsResponse.json()
      console.log('Questions result:', questionsResult)

      if (!questionsResponse.ok) {
        return { success: false, error: questionsResult.error || 'Failed to load questions' }
      }

      this.test = questionsResult.test
      this.questions = questionsResult.questions || []
      
      console.log('Questions loaded:', {
        count: this.questions.length,
        sampleQuestion: this.questions[0] ? {
          id: this.questions[0].id,
          question_id: this.questions[0].question_id,
          question_text: this.questions[0].question_text?.slice(0, 100),
          java_concepts: this.questions[0].java_concepts
        } : null
      })
      
      // Initialize answers map
      this.answers = {}
      questionsResult.questions?.forEach((q: any) => {
        if (q.answer) {
          this.answers[q.question_id] = q.answer
        }
      })

      // Initialize timer
      if (this.attempt && this.test) {
        this.initializeTimer()
      }

      // Set up security if required
      if (this.test?.fullscreen_required) {
        this.enableFullscreen()
      }

      if (this.test?.disable_copy_paste) {
        this.blockCopyPaste()
      }

      return { success: true }

    } catch (error) {
      console.error('Error starting test:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to start test' 
      }
    } finally {
      this.loading = false
    }
  }

  private initializeTimer(): void {
    console.log('Initializing timer with:', { 
      attempt: this.attempt, 
      test: this.test?.time_limit_minutes,
      started_at: this.attempt?.started_at 
    })
    
    if (!this.attempt || !this.test) {
      console.log('Timer init failed: missing attempt or test')
      return
    }

    const startTime = new Date(this.attempt.started_at!)
    const timeLimit = this.test.time_limit_minutes * 60 * 1000 // Convert to milliseconds
    const elapsed = Date.now() - startTime.getTime()
    const remaining = Math.max(0, timeLimit - elapsed)

    console.log('Timer calculation:', { 
      startTime, 
      timeLimit, 
      elapsed, 
      remaining,
      remainingSeconds: Math.floor(remaining / 1000)
    })

    this.timer.timeRemaining = Math.floor(remaining / 1000) // Convert to seconds
    this.timer.isExpired = remaining <= 0
    this.timer.isRunning = !this.timer.isExpired && this.attempt.status === 'in_progress'

    console.log('Timer state after init:', this.timer)

    if (this.timer.isRunning) {
      console.log('Starting timer countdown')
      this.startTimerCountdown()
    }
  }

  private startTimerCountdown(): void {
    const interval = setInterval(() => {
      if (this.timer.timeRemaining > 0) {
        this.timer.timeRemaining--
      } else {
        this.timer.isExpired = true
        this.timer.isRunning = false
        clearInterval(interval)
        this.autoSubmitTest()
      }
    }, 1000)
  }

  private async autoSubmitTest(): Promise<void> {
    if (!this.attempt) return

    try {
      await this.submitTest(true)
    } catch (error) {
      console.error('Auto-submit failed:', error)
    }
  }

  async saveAnswer(questionId: string, code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.attempt || this.attempt.status !== 'in_progress') {
      console.error('Save attempt failed: Test not in progress', { 
        attempt: this.attempt?.id, 
        status: this.attempt?.status 
      })
      return { success: false, error: 'Test not in progress' }
    }

    console.log('Attempting to save answer:', { 
      questionId, 
      codeLength: code.length, 
      attemptId: this.attempt.id 
    })

    this.autoSave.isSaving = true

    try {
      const response = await fetch(`/api/tests/${this.attempt.test_id}/save-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          questionId,
          code,
          attemptId: this.attempt.id,
          timestamp: new Date().toISOString()
        })
      })

      const result = await response.json()

      console.log('Save answer response:', { 
        status: response.status, 
        success: response.ok, 
        result 
      })

      if (!response.ok) {
        console.error('Save answer failed:', { 
          status: response.status, 
          error: result.error,
          questionId,
          codeLength: code.length
        })
        
        // Show user-visible error for critical save failures
        if (response.status >= 500) {
          alert(`Warning: Failed to save your answer. Please try typing again or contact your teacher. Error: ${result.error}`)
        }
        
        return { success: false, error: result.error || 'Failed to save answer' }
      }

      // Update local state
      this.answers[questionId] = result.answer
      this.autoSave.lastSaved = new Date()
      this.autoSave.isDirty = false

      console.log('Answer saved successfully:', { 
        questionId, 
        savedAt: this.autoSave.lastSaved.toISOString() 
      })

      return { success: true }

    } catch (error) {
      console.error('Network error saving answer:', error)
      
      // Show user-visible error for network failures
      alert(`Warning: Network error while saving your answer. Please check your connection and try typing again. Your work may not be saved!`)
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save answer' 
      }
    } finally {
      this.autoSave.isSaving = false
    }
  }

  updateCurrentCode(code: string): void {
    if (!this.currentQuestion) return

    // Update the answer in local state
    const questionId = this.currentQuestion.question_id!
    if (!this.answers[questionId]) {
      this.answers[questionId] = {
        id: '',
        attempt_id: this.attempt?.id || '',
        question_id: questionId,
        answer_code: code,
        scores: null,
        feedback: null,
        question_score: null,
        last_saved_at: null,
        graded_at: null,
        created_at: null
      }
    } else {
      this.answers[questionId] = {
        ...this.answers[questionId],
        answer_code: code
      }
    }

    this.autoSave.isDirty = true

    // Debounced auto-save
    this.debouncedAutoSave(questionId, code)
  }

  private autoSaveTimeout: NodeJS.Timeout | null = null

  private debouncedAutoSave(questionId: string, code: string): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }

    this.autoSaveTimeout = setTimeout(() => {
      this.saveAnswer(questionId, code)
    }, 10000) // 10 second delay
  }

  goToQuestion(index: number): void {
    if (index >= 0 && index < this.questions.length) {
      this.currentQuestionIndex = index
    }
  }

  nextQuestion(): void {
    if (!this.isLastQuestion) {
      this.currentQuestionIndex++
    }
  }

  previousQuestion(): void {
    if (!this.isFirstQuestion) {
      this.currentQuestionIndex--
    }
  }

  increaseFontSize(): void {
    this.fontSize = Math.min(this.fontSize + 2, 24)
  }

  decreaseFontSize(): void {
    this.fontSize = Math.max(this.fontSize - 2, 10)
  }

  async submitTest(autoSubmit = false): Promise<{ success: boolean; error?: string }> {
    if (!this.attempt) {
      return { success: false, error: 'No active attempt' }
    }

    this.submitting = true

    try {
      const response = await fetch(`/api/tests/${this.attempt.test_id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          attemptId: this.attempt.id 
        })
      })

      const result = await response.json()

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to submit test' }
      }

      this.attempt = result.attempt
      this.timer.isRunning = false

      return { success: true }

    } catch (error) {
      console.error('Error submitting test:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to submit test' 
      }
    } finally {
      this.submitting = false
    }
  }

  private enableFullscreen(): void {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen()
      this.fullscreenActive = true

      document.addEventListener('fullscreenchange', () => {
        this.fullscreenActive = !!document.fullscreenElement
      })
    }
  }

  private blockCopyPaste(): void {
    this.copyPasteBlocked = true
    
    const preventDefault = (e: Event) => {
      e.preventDefault()
      return false
    }

    // Block copy/paste/cut
    document.addEventListener('copy', preventDefault)
    document.addEventListener('paste', preventDefault)
    document.addEventListener('cut', preventDefault)

    // Block right-click context menu
    document.addEventListener('contextmenu', preventDefault)

    // Block common keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (['c', 'v', 'x', 'a', 's', 'p'].includes(e.key.toLowerCase())) {
          e.preventDefault()
          return false
        }
      }
    })
  }

  reset(): void {
    this.test = null
    this.attempt = null
    this.questions = []
    this.answers = {}
    this.currentQuestionIndex = 0
    this.timer = { timeRemaining: 0, isRunning: false, isExpired: false }
    this.autoSave = { lastSaved: null, isDirty: false, isSaving: false }
    this.loading = false
    this.error = null
    this.submitting = false
    this.fontSize = 14
    this.fullscreenActive = false
    this.copyPasteBlocked = false

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
      this.autoSaveTimeout = null
    }
  }
}

// Create singleton instance
export const testAttemptStore = new TestAttemptStore()