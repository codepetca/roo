import { vi } from 'vitest'
import { render } from '@testing-library/svelte'
import type { ComponentType } from 'svelte'
import { mockSupabaseClient, createMockUser, createMockProfile, createMockQuestion, createMockTest, createMockAttempt, createMockAnswer } from './setup.js'

// Integration test utilities for complex scenarios
export class IntegrationTestUtils {
  // Mock complete user session
  static async createUserSession(role: 'teacher' | 'student' = 'teacher') {
    const mockUser = createMockUser({
      user_metadata: { role, full_name: `Test ${role}` }
    })
    const mockProfile = createMockProfile({
      id: mockUser.id,
      role,
      full_name: mockUser.user_metadata.full_name
    })

    return { mockUser, mockProfile }
  }

  // Setup store instance for testing
  static setupStoreForTesting(StoreClass: any, initialState: any = {}) {
    const instance = new StoreClass()
    
    // Apply any initial state
    Object.entries(initialState).forEach(([key, value]) => {
      if (key in instance) {
        instance[key] = value
      }
    })

    return instance
  }

  // Create a complete test scenario with questions
  static createTestScenario() {
    const questions = [
      createMockQuestion({
        id: 'q1',
        question_text: 'Write a method to add two integers',
        concepts: ['methods', 'parameters', 'return']
      }),
      createMockQuestion({
        id: 'q2', 
        question_text: 'Create a for loop to print numbers 1-10',
        concepts: ['loops', 'iteration', 'output']
      }),
      createMockQuestion({
        id: 'q3',
        question_text: 'Write an if-else statement to check even/odd',
        concepts: ['conditionals', 'modulo', 'boolean']
      })
    ]

    const test = createMockTest({
      id: 'test-1',
      title: 'Java Fundamentals Test',
      description: 'Basic Java programming concepts',
      time_limit_minutes: 60,
      status: 'active',
      end_date: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
    })

    return { questions, test }
  }

  // Create test attempt with answers
  static createTestAttemptScenario() {
    const { questions, test } = this.createTestScenario()
    
    const attempt = createMockAttempt({
      id: 'attempt-1',
      test_id: test.id,
      status: 'in_progress',
      started_at: new Date().toISOString()
    })

    const answers = {
      'q1': createMockAnswer({
        id: 'ans-1',
        attempt_id: attempt.id,
        question_id: 'q1',
        answer_code: 'public int add(int a, int b) { return a + b; }'
      }),
      'q2': createMockAnswer({
        id: 'ans-2', 
        attempt_id: attempt.id,
        question_id: 'q2',
        answer_code: 'for(int i = 1; i <= 10; i++) { System.out.println(i); }'
      }),
      'q3': createMockAnswer({
        id: 'ans-3',
        attempt_id: attempt.id, 
        question_id: 'q3',
        answer_code: '' // Not answered yet
      })
    }

    return { questions, test, attempt, answers }
  }

  // Mock fetch responses for complete workflows
  static mockFetchSequence(responses: Array<{ ok: boolean; data?: any; error?: any }>) {
    let callIndex = 0
    global.fetch = vi.fn().mockImplementation(() => {
      const response = responses[callIndex] || responses[responses.length - 1]
      callIndex++
      
      return Promise.resolve({
        ok: response.ok,
        status: response.ok ? 200 : 400,
        json: () => Promise.resolve(response.ok ? 
          { success: true, ...response.data } : 
          { success: false, error: response.error }
        )
      } as Response)
    })
  }

  // Simulate API delays for timing tests
  static mockAsyncFetch(delay: number = 100) {
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] })
        } as Response), delay)
      )
    )
  }

  // Mock Supabase real-time subscriptions
  static mockSupabaseRealtime() {
    const mockSubscription = {
      subscribe: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({
          unsubscribe: vi.fn()
        })
      })
    }

    mockSupabaseClient.channel = vi.fn().mockReturnValue(mockSubscription)
    return mockSubscription
  }

  // Create component with integrated stores
  static renderWithStores<T extends ComponentType>(
    component: T,
    props: any = {},
    stores: any = {}
  ) {
    // Initialize any required stores
    Object.entries(stores).forEach(([storeName, storeData]) => {
      // This would be implemented based on specific store initialization needs
    })

    return render(component, { props })
  }

  // Workflow simulation helper
  static async simulateWorkflow(steps: Array<() => Promise<any>>) {
    const results = []
    for (const step of steps) {
      try {
        const result = await step()
        results.push({ success: true, data: result })
      } catch (error) {
        results.push({ success: false, error })
        break // Stop on first error
      }
    }
    return results
  }

  // Generate large datasets for performance testing
  static generateLargeDataset<T>(factory: (index: number) => T, count: number): T[] {
    return Array(count).fill(null).map((_, index) => factory(index))
  }

  // Mock timer operations for test environment
  static mockTimers() {
    vi.useFakeTimers()
    return {
      tick: (ms: number) => vi.advanceTimersByTime(ms),
      flush: () => vi.runAllTimers(),
      cleanup: () => vi.useRealTimers()
    }
  }

  // Mock DOM APIs for testing browser features
  static mockBrowserAPIs() {
    // Mock fullscreen API
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true
    })
    
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: vi.fn().mockResolvedValue(undefined)
    })

    // Mock copy/paste events
    const mockEvent = (type: string) => ({
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      type
    })

    return {
      triggerFullscreen: () => {
        document.fullscreenElement = document.documentElement
        document.dispatchEvent(new Event('fullscreenchange'))
      },
      triggerCopy: () => mockEvent('copy'),
      triggerPaste: () => mockEvent('paste'),
      triggerKeydown: (key: string, ctrlKey = false) => mockEvent('keydown')
    }
  }

  // Cleanup helper for integration tests
  static cleanup() {
    vi.clearAllMocks()
    vi.clearAllTimers()
    if (global.fetch && typeof global.fetch.mockClear === 'function') {
      global.fetch.mockClear()
    }
  }
}

// Helper for asserting complex state changes
export function expectStoreState(store: any, expectedState: Partial<any>) {
  Object.entries(expectedState).forEach(([key, value]) => {
    expect(store[key]).toEqual(value)
  })
}

// Helper for testing async workflows
export async function waitForStoreUpdate(store: any, property: string, expectedValue: any, timeout = 1000) {
  const startTime = Date.now()
  
  while (Date.now() - startTime < timeout) {
    if (store[property] === expectedValue) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  
  throw new Error(`Store property ${property} did not reach expected value ${expectedValue} within ${timeout}ms`)
}

// Helper for testing error recovery
export class ErrorScenarios {
  static networkError() {
    return new Error('Network request failed')
  }

  static apiError(message: string, code = 400) {
    return {
      ok: false,
      status: code,
      error: { message }
    }
  }

  static databaseError(message: string) {
    return {
      data: null,
      error: { message, code: '500' }
    }
  }

  static authError() {
    return {
      data: { user: null },
      error: { message: 'Authentication required', code: 'auth_error' }
    }
  }
}