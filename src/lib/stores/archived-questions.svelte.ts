import type { Tables } from '$lib/types/supabase.js'

type Question = Tables<'java_questions'>

class ArchivedQuestionsStore {
  questions = $state<Question[]>([])
  selectedQuestionIds = $state<string[]>([])
  loading = $state(false)
  error = $state<string | null>(null)

  constructor() {
    // Listen for questions being archived from the main store
    if (typeof window !== 'undefined') {
      window.addEventListener('question-archived', (event: CustomEvent) => {
        this.addArchivedQuestion(event.detail)
      })
    }
  }

  addArchivedQuestion(question: Question) {
    // Check if question already exists to avoid duplicates
    if (!this.questions.find(q => q.id === question.id)) {
      // Add the archived question to the beginning of the list
      this.questions = [question, ...this.questions]
    }
  }

  async loadArchivedQuestions() {
    this.loading = true
    this.error = null
    
    try {
      const response = await fetch('/api/questions/archived')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch archived questions')
      }
      
      this.questions = data.questions || []
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Unknown error'
      console.error('Failed to load archived questions:', err)
    } finally {
      this.loading = false
    }
  }

  toggleQuestionSelection(questionId: string) {
    if (this.selectedQuestionIds.includes(questionId)) {
      this.selectedQuestionIds = this.selectedQuestionIds.filter(id => id !== questionId)
    } else {
      this.selectedQuestionIds = [...this.selectedQuestionIds, questionId]
    }
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.selectedQuestionIds = []
    } else {
      this.selectedQuestionIds = this.questions.map(q => q.id)
    }
  }

  async restoreSelectedQuestions() {
    if (this.selectedQuestionIds.length === 0) {
      throw new Error('No questions selected')
    }

    try {
      const response = await fetch('/api/questions/archive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: this.selectedQuestionIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restore questions')
      }

      // Remove restored questions from the archive list reactively
      const restoredIds = this.selectedQuestionIds
      const restoredQuestions = this.questions.filter(q => restoredIds.includes(q.id))
      this.questions = this.questions.filter(q => !restoredIds.includes(q.id))
      this.selectedQuestionIds = []

      // Notify main questions store about restored questions
      if (typeof window !== 'undefined') {
        restoredQuestions.forEach(question => {
          window.dispatchEvent(new CustomEvent('question-restored', { 
            detail: { ...question, archived: false }
          }))
        })
      }

      return { success: true, restoredCount: restoredIds.length }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      this.error = error
      throw err
    }
  }

  async deleteSelectedQuestions() {
    if (this.selectedQuestionIds.length === 0) {
      throw new Error('No questions selected')
    }

    try {
      const response = await fetch('/api/questions/archive/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: this.selectedQuestionIds })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete questions')
      }

      // Remove deleted questions from the archive list reactively
      const deletedIds = this.selectedQuestionIds
      this.questions = this.questions.filter(q => !deletedIds.includes(q.id))
      this.selectedQuestionIds = []

      return { success: true, deletedCount: deletedIds.length }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      this.error = error
      throw err
    }
  }

  // Derived reactive states using $derived runes
  allSelected = $derived(this.questions.length > 0 && this.selectedQuestionIds.length === this.questions.length)
  selectedCount = $derived(this.selectedQuestionIds.length)
  totalCount = $derived(this.questions.length)
  hasQuestions = $derived(this.questions.length > 0)
  selectedQuestions = $derived(this.questions.filter(q => this.selectedQuestionIds.includes(q.id)))
}

// Create a singleton instance
export const archivedQuestionsStore = new ArchivedQuestionsStore()