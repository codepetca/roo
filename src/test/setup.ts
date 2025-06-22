import '@testing-library/jest-dom'
import { vi } from 'vitest'
import type { Database } from '$lib/types/supabase.js'

// Mock environment variables
vi.mock('$env/static/private', () => ({
  ANTHROPIC_API_KEY: 'test-api-key',
  SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key'
}))

vi.mock('$env/dynamic/public', () => ({
  PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}))

// Enhanced Supabase client mock with better type support
const mockSupabaseResponse = {
  data: null,
  error: null,
  status: 200,
  statusText: 'OK'
}

const createMockQuery = () => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  like: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  and: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(mockSupabaseResponse),
  maybeSingle: vi.fn().mockResolvedValue(mockSupabaseResponse),
  then: vi.fn().mockResolvedValue(mockSupabaseResponse)
})

export const mockSupabaseClient = {
  from: vi.fn(() => createMockQuery()),
  auth: {
    getSession: vi.fn().mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    }),
    getUser: vi.fn().mockResolvedValue({ 
      data: { user: null }, 
      error: null 
    }),
    signInWithPassword: vi.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signUp: vi.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    }),
    refreshSession: vi.fn().mockResolvedValue({ 
      data: { session: null }, 
      error: null 
    })
  },
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ 
        data: { path: 'test-path' }, 
        error: null 
      }),
      download: vi.fn().mockResolvedValue({ 
        data: new Blob(['test']), 
        error: null 
      }),
      remove: vi.fn().mockResolvedValue({ 
        data: null, 
        error: null 
      })
    }))
  },
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn()
  }))
}

vi.mock('$lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

vi.mock('$lib/server/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock Anthropic client with more realistic responses
const mockAnthropicClient = {
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ 
          question: 'Write a Java method that adds two numbers.',
          rubric: {
            communication: { description: 'Code formatting', weight: 0.25, criteria: ['indentation'] },
            correctness: { description: 'Syntax accuracy', weight: 0.50, criteria: ['syntax'] },
            logic: { description: 'Problem solving', weight: 0.25, criteria: ['logic'] }
          },
          solution: {
            code: 'public int add(int a, int b) {\n  return a + b;\n}',
            explanation: 'Simple addition method'
          },
          concepts: ['variables', 'methods']
        })
      }]
    })
  }
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropicClient)
}))

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
  browser: false,
  dev: true,
  building: false
}))

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidate: vi.fn(),
  invalidateAll: vi.fn(),
  preloadData: vi.fn(),
  preloadCode: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
  pushState: vi.fn(),
  replaceState: vi.fn()
}))

vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn()
  },
  updated: {
    subscribe: vi.fn()
  },
  navigating: {
    subscribe: vi.fn()
  }
}))

// Export test utilities
export const createMockUser = (overrides: any = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
  user_metadata: {
    full_name: 'Test User',
    role: 'teacher'
  },
  ...overrides
})

export const createMockProfile = (overrides: any = {}) => ({
  id: 'test-user-id',
  full_name: 'Test User',
  role: 'teacher' as const,
  created_at: new Date().toISOString(),
  ...overrides
})

export const createMockQuestion = (overrides: any = {}) => ({
  id: 'test-question-id',
  question_text: 'Write a Java method that adds two numbers.',
  concepts: ['variables', 'methods'],
  rubric: {
    communication: { description: 'Code formatting', weight: 0.25, criteria: ['indentation'] },
    correctness: { description: 'Syntax accuracy', weight: 0.50, criteria: ['syntax'] },
    logic: { description: 'Problem solving', weight: 0.25, criteria: ['logic'] }
  },
  solution: {
    code: 'public int add(int a, int b) {\n  return a + b;\n}',
    explanation: 'Simple addition method'
  },
  language: 'java',
  archived: false,
  created_at: new Date().toISOString(),
  created_by: 'test-teacher-id',
  ...overrides
})

export const createMockTest = (overrides: any = {}) => ({
  id: 'test-test-id',
  title: 'Test Java Quiz',
  description: 'A test quiz for Java fundamentals',
  time_limit_minutes: 60,
  start_date: null,
  end_date: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
  immediate_feedback: false,
  fullscreen_required: false,
  disable_copy_paste: false,
  status: 'active' as const,
  created_by: 'test-teacher-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createMockAttempt = (overrides: any = {}) => ({
  id: 'test-attempt-id',
  test_id: 'test-test-id',
  student_id: 'test-student-id',
  started_at: new Date().toISOString(),
  submitted_at: null,
  auto_submitted: false,
  time_spent_seconds: 0,
  status: 'in_progress' as const,
  total_score: null,
  graded_at: null,
  created_at: new Date().toISOString(),
  ...overrides
})

export const createMockAnswer = (overrides: any = {}) => ({
  id: 'test-answer-id',
  attempt_id: 'test-attempt-id',
  question_id: 'test-question-id',
  answer_code: 'public int add(int a, int b) {\n  return a + b;\n}',
  scores: { communication: 4, correctness: 4, logic: 4 },
  feedback: {
    communication: 'Excellent formatting',
    correctness: 'Perfect syntax',
    logic: 'Correct solution'
  },
  question_score: 95.5,
  last_saved_at: new Date().toISOString(),
  graded_at: null,
  created_at: new Date().toISOString(),
  ...overrides
})

// Reset all mocks before each test
export const resetMocks = () => {
  vi.clearAllMocks()
  
  // Reset mock implementations to defaults
  mockSupabaseClient.from.mockImplementation(() => createMockQuery())
  mockAnthropicClient.messages.create.mockResolvedValue({
    content: [{ 
      type: 'text', 
      text: JSON.stringify({ 
        question: 'Write a Java method that adds two numbers.',
        rubric: {
          communication: { description: 'Code formatting', weight: 0.25, criteria: ['indentation'] },
          correctness: { description: 'Syntax accuracy', weight: 0.50, criteria: ['syntax'] },
          logic: { description: 'Problem solving', weight: 0.25, criteria: ['logic'] }
        },
        solution: {
          code: 'public int add(int a, int b) {\n  return a + b;\n}',
          explanation: 'Simple addition method'
        },
        concepts: ['variables', 'methods']
      })
    }]
  })
}