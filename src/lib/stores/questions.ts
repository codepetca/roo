import type { Tables } from '$lib/types/supabase.js'

type Question = Tables<'java_questions'>

class QuestionsStore {
  questions = $state<Question[]>([])
  loading = $state(false)
  error = $state<string | null>(null)

  constructor() {
    // Auto-load questions when store is created
    this.loadQuestions()
  }

  async loadQuestions() {
    this.loading = true
    this.error = null
    
    try {
      const response = await fetch('/api/questions')
      const data = await response.json()
      
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

  async archiveQuestion(questionId: string) {
    const question = this.questions.find(q => q.id === questionId)
    if (!question) return

    try {
      const response = await fetch('/api/questions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to archive question')
      }

      // Remove the question from the active list (it's now archived)
      this.questions = this.questions.filter(q => q.id !== questionId)
      
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      this.error = error
      throw err
    }
  }

  async restoreQuestion(questionId: string) {
    try {
      const response = await fetch('/api/questions/archive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: [questionId] })
      })

      if (!response.ok) {
        const errorData = await response.json()
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

  addQuestion(question: Question) {
    this.questions = [question, ...this.questions]
  }

  // Derived reactive states  
  get activeQuestions() {
    return this.questions.filter(q => !q.archived)
  }

  get archivedQuestions() {
    return this.questions.filter(q => q.archived)
  }

  get totalCount() {
    return this.questions.length
  }

  get activeCount() {
    return this.activeQuestions.length
  }

  get archivedCount() {
    return this.archivedQuestions.length
  }
}

// Create a singleton instance
export const questionsStore = new QuestionsStore()