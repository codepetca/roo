import { supabase } from '$lib/supabase.js'
import type { CodingTest, CodingTestWithQuestions, APIResponse } from '$lib/types/index.js'

class TestsStore {
  tests = $state<CodingTest[]>([])
  loading = $state(false)
  error = $state<string | null>(null)

  // Computed properties
  activeTests = $derived(this.tests.filter(test => test.status === 'active'))
  draftTests = $derived(this.tests.filter(test => test.status === 'draft'))
  endedTests = $derived(this.tests.filter(test => test.status === 'ended'))

  async loadTests(): Promise<void> {
    this.loading = true
    this.error = null

    try {
      const { data, error } = await supabase
        .from('coding_tests')
        .select(`
          *,
          test_questions (
            id,
            question_order,
            points,
            questions (
              id,
              question_text,
              concepts
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      this.tests = data || []
    } catch (error) {
      console.error('Error loading tests:', error)
      this.error = error instanceof Error ? error.message : 'Failed to load tests'
    } finally {
      this.loading = false
    }
  }

  async createTest(testData: {
    title: string
    description?: string
    questionIds: string[]
    timeLimitMinutes: number
    startDate?: string
    endDate: string
    createdBy: string
    settings: {
      immediateeFeedback: boolean
      fullscreenRequired: boolean
      disableCopyPaste: boolean
    }
  }): Promise<{ success: boolean; test?: CodingTestWithQuestions; error?: string }> {
    try {
      const response = await fetch('/api/tests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      })

      const result: APIResponse<CodingTestWithQuestions> = await response.json()

      if (!response.ok || !result.success) {
        return { success: false, error: result.error?.message || 'Failed to create test' }
      }

      // Reload tests to get the updated list
      await this.loadTests()

      return { success: true, test: result.data }
    } catch (error) {
      console.error('Error creating test:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create test' 
      }
    }
  }

  async publishTest(testId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/tests/${testId}/publish`, {
        method: 'PUT'
      })

      const result: APIResponse = await response.json()

      if (!response.ok || !result.success) {
        return { success: false, error: result.error?.message || 'Failed to publish test' }
      }

      // Update local state
      const testIndex = this.tests.findIndex(t => t.id === testId)
      if (testIndex !== -1) {
        this.tests[testIndex] = { ...this.tests[testIndex], status: 'active' }
      }

      return { success: true }
    } catch (error) {
      console.error('Error publishing test:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to publish test' 
      }
    }
  }

  async deleteTest(testId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'DELETE'
      })

      const result: APIResponse = await response.json()

      if (!response.ok || !result.success) {
        return { success: false, error: result.error?.message || 'Failed to delete test' }
      }

      // Remove from local state
      this.tests = this.tests.filter(t => t.id !== testId)

      return { success: true }
    } catch (error) {
      console.error('Error deleting test:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete test' 
      }
    }
  }

  getTestById(testId: string): CodingTest | undefined {
    return this.tests.find(test => test.id === testId)
  }

  async updateTestStatus(testId: string, status: 'draft' | 'active' | 'ended'): Promise<void> {
    try {
      const response = await fetch(`/api/tests/${testId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        const testIndex = this.tests.findIndex(t => t.id === testId)
        if (testIndex !== -1) {
          this.tests[testIndex] = { ...this.tests[testIndex], status }
        }
      }
    } catch (error) {
      console.error('Error updating test status:', error)
    }
  }
}

// Create singleton instance
export const testsStore = new TestsStore()