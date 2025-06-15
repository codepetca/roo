class QuestionsStore {
  questions = $state([])
  loading = $state(false)
  error = $state(null)

  constructor() {
    // Auto-load questions when store is created
    this.loadQuestions()
    
    // Listen for questions being restored from archive
    if (typeof window !== 'undefined') {
      window.addEventListener('question-restored', (event: CustomEvent) => {
        this.addQuestion(event.detail)
      })
    }
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

  async archiveQuestion(questionId) {
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

      // Update the question's archived status and remove from active list
      const archivedQuestion = { ...question, archived: true }
      this.questions = this.questions.filter(q => q.id !== questionId)
      
      // Notify archived questions store if it exists
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('question-archived', { 
          detail: archivedQuestion 
        }))
      }
      
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      this.error = error
      throw err
    }
  }

  async restoreQuestion(questionId) {
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

  addQuestion(question) {
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