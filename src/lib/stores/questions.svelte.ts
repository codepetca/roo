import type { Question, QuestionArchivedEvent, QuestionRestoredEvent, ApiResponse } from '$lib/types/index.js'

class QuestionsStore {
  questions = $state<Question[]>([])
  loading = $state(false)
  error = $state<string | null>(null)

  constructor() {
    // Listen for questions being restored from archive
    if (typeof window !== 'undefined') {
      window.addEventListener('question-restored', (event: QuestionRestoredEvent) => {
        this.addQuestion(event.detail)
      })
      
      // Auto-load questions only on client side
      this.loadQuestions()
    }
  }

  async loadQuestions(): Promise<void> {
    this.loading = true
    this.error = null
    
    try {
      const response = await fetch('/api/questions')
      const data: ApiResponse<Question[]> = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch questions')
      }
      
      this.questions = data.questions || []
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load questions:', err)
    } finally {
      this.loading = false
    }
  }

  async archiveQuestion(questionId: string): Promise<{ success: boolean }> {
    const question = this.questions.find(q => q.id === questionId)
    if (!question) return { success: false }

    try {
      const response = await fetch('/api/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId })
      })

      if (!response.ok) {
        const errorData: ApiResponse = await response.json()
        console.error('Archive API error:', errorData)
        throw new Error(errorData.error || 'Failed to archive question')
      }

      // Only update local state if API call succeeded
      const archivedQuestion: Question = { ...question, archived: true }
      this.questions = this.questions.filter(q => q.id !== questionId)
      
      // Notify archived questions store if it exists
      if (typeof window !== 'undefined') {
        const event: QuestionArchivedEvent = new CustomEvent('question-archived', { 
          detail: archivedQuestion 
        }) as QuestionArchivedEvent
        window.dispatchEvent(event)
      }
      
      console.log('Question archived successfully:', questionId)
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      this.error = error
      console.error('Archive question failed:', err)
      throw err
    }
  }

  async restoreQuestion(questionId: string): Promise<{ success: boolean }> {
    try {
      const response = await fetch('/api/questions/archive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [questionId] })
      })

      if (!response.ok) {
        const errorData: ApiResponse = await response.json()
        throw new Error(errorData.error || 'Failed to restore question')
      }

      // Reload questions to get the restored question back
      await this.loadQuestions()
      
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      this.error = error
      throw err
    }
  }

  addQuestion(question: Question): void {
    this.questions = [question, ...this.questions]
  }

  // Derived reactive states using $derived runes
  activeQuestions = $derived(this.questions.filter(q => !q.archived))
  archivedQuestions = $derived(this.questions.filter(q => q.archived))
  totalCount = $derived(this.questions.length)
  activeCount = $derived(this.activeQuestions.length)
  archivedCount = $derived(this.archivedQuestions.length)
}

// Create a singleton instance
export const questionsStore = new QuestionsStore()