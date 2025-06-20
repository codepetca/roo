import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import StudentResults from './+page.svelte'

// Mock stores and navigation
const mockUser = {
  id: 'student-123',
  email: 'student@example.com',
  email_confirmed_at: '2023-01-01T00:00:00Z'
}

const mockAuthStore = {
  user: mockUser,
  profile: { id: 'student-123', role: 'student', full_name: 'Test Student' },
  loading: false,
  error: null
}

const mockPage = {
  params: { attemptId: 'attempt-123' },
  url: { pathname: '/student/results/attempt-123' }
}

const mockGoto = vi.fn()

vi.mock('$lib/stores/auth.svelte.js', () => ({
  authStore: mockAuthStore
}))

vi.mock('$app/stores', () => ({
  page: { subscribe: vi.fn((fn) => fn(mockPage)) }
}))

vi.mock('$app/navigation', () => ({
  goto: mockGoto
}))

// Mock Markdown component
vi.mock('$lib/components/Markdown.svelte', () => ({
  default: class MockMarkdown {
    constructor() {
      this.$$prop_def = { content: {} }
    }
  }
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock console methods
const originalConsole = { ...console }
beforeEach(() => {
  console.error = vi.fn()
  vi.clearAllMocks()
  mockGoto.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
  Object.assign(console, originalConsole)
})

describe('Student Results Page', () => {
  const mockTestData = {
    attempt: {
      id: 'attempt-123',
      test_id: 'test-456',
      student_id: 'student-123',
      status: 'graded',
      started_at: '2023-06-01T10:00:00Z',
      submitted_at: '2023-06-01T10:45:00Z',
      graded_at: '2023-06-01T11:00:00Z',
      total_score: 85,
      time_spent_seconds: 2700
    },
    test: {
      id: 'test-456',
      title: 'Java Fundamentals Test',
      description: 'Test on basic Java concepts',
      time_limit_minutes: 60
    },
    answers: [
      {
        id: 'answer-1',
        question_id: 'q1',
        attempt_id: 'attempt-123',
        question_text: 'Write a simple Hello World program in Java.',
        concepts: ['Basic Syntax', 'Output'],
        answer_code: 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello World!");\n    }\n}',
        question_score: 90,
        feedback: 'Excellent work! Your code is syntactically correct and follows Java conventions.',
        scores: {
          correctness: 4,
          style: 3,
          logic: 4
        }
      },
      {
        id: 'answer-2',
        question_id: 'q2',
        attempt_id: 'attempt-123',
        question_text: 'Declare and initialize an integer variable.',
        concepts: ['Variables', 'Data Types'],
        answer_code: 'int number = 42;',
        question_score: 80,
        feedback: {
          correctness: 'Good variable declaration',
          style: 'Could use more descriptive variable name',
          logic: 'Logic is sound'
        },
        scores: {
          correctness: 4,
          style: 2,
          logic: 4
        }
      }
    ]
  }

  describe('Initial Loading', () => {
    it('renders page title and navigation', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(StudentResults)

      expect(screen.getByText('Test Results')).toBeInTheDocument()
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(StudentResults)

      expect(screen.getByText('Loading your results...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('redirects to login if user is not authenticated', () => {
      const originalUser = mockAuthStore.user
      mockAuthStore.user = null

      render(StudentResults)

      expect(mockGoto).toHaveBeenCalledWith('/auth/login')
      
      // Restore user
      mockAuthStore.user = originalUser
    })
  })

  describe('Data Loading', () => {
    it('loads results successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTestData
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.queryByText('Loading your results...')).not.toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/student/results/attempt-123?studentId=student-123')
      expect(screen.getByText('Java Fundamentals Test')).toBeInTheDocument()
    })

    it('handles API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Access denied' })
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Access denied')).toBeInTheDocument()
      })

      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Failed to load results')).toBeInTheDocument()
      })

      expect(console.error).toHaveBeenCalledWith('Error loading results:', expect.any(Error))
    })

    it('retries loading when retry button is clicked', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTestData
        })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Failed to load results')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      await fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Java Fundamentals Test')).toBeInTheDocument()
      })
    })
  })

  describe('Overall Results Display', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTestData
      })
    })

    it('displays overall score and grade correctly', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument()
      })

      expect(screen.getByText('Grade: B')).toBeInTheDocument()
    })

    it('shows correct score color for good performance', async () => {
      render(StudentResults)
      await waitFor(() => {
        const scoreElement = screen.getByText('85%')
        expect(scoreElement.closest('.text-green-600')).toBeInTheDocument()
      })
    })

    it('displays test status correctly', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Graded')).toBeInTheDocument()
      })
    })

    it('shows formatted dates correctly', async () => {
      render(StudentResults)
      await waitFor(() => {
        // Should show formatted dates (exact format depends on locale)
        expect(screen.getByText(/6\/1\/2023/)).toBeInTheDocument()
      })
    })

    it('calculates and displays duration correctly', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('45 min')).toBeInTheDocument() // 45 minutes duration
      })
    })

    it('handles pending scores', async () => {
      const pendingData = {
        ...mockTestData,
        attempt: {
          ...mockTestData.attempt,
          total_score: null,
          status: 'submitted'
        }
      }

      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => pendingData
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Pending')).toBeInTheDocument()
      })

      expect(screen.getByText('Grade: N/A')).toBeInTheDocument()
    })
  })

  describe('Grade Letter Calculation', () => {
    const testGradeData = (score: number, expectedGrade: string) => ({
      ...mockTestData,
      attempt: { ...mockTestData.attempt, total_score: score }
    })

    it('shows A grade for 90+ score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testGradeData(95, 'A')
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Grade: A')).toBeInTheDocument()
      })
    })

    it('shows B grade for 80-89 score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testGradeData(85, 'B')
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Grade: B')).toBeInTheDocument()
      })
    })

    it('shows C grade for 70-79 score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testGradeData(75, 'C')
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Grade: C')).toBeInTheDocument()
      })
    })

    it('shows D grade for 60-69 score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testGradeData(65, 'D')
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Grade: D')).toBeInTheDocument()
      })
    })

    it('shows F grade for below 60 score', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testGradeData(45, 'F')
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Grade: F')).toBeInTheDocument()
      })
    })
  })

  describe('Question Results Display', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTestData
      })
    })

    it('displays all questions with correct numbering', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeInTheDocument()
      })

      expect(screen.getByText('Question 2')).toBeInTheDocument()
    })

    it('shows question concepts as tags', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Basic Syntax')).toBeInTheDocument()
      })

      expect(screen.getByText('Output')).toBeInTheDocument()
      expect(screen.getByText('Variables')).toBeInTheDocument()
      expect(screen.getByText('Data Types')).toBeInTheDocument()
    })

    it('displays individual question scores', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('90%')).toBeInTheDocument()
      })

      expect(screen.getByText('80%')).toBeInTheDocument()
    })

    it('shows student code answers with proper formatting', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText(/public class HelloWorld/)).toBeInTheDocument()
      })

      expect(screen.getByText(/int number = 42;/)).toBeInTheDocument()
    })

    it('displays string feedback correctly', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Excellent work! Your code is syntactically correct and follows Java conventions.')).toBeInTheDocument()
      })
    })

    it('displays object feedback correctly', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Correctness:')).toBeInTheDocument()
      })

      expect(screen.getByText('Good variable declaration')).toBeInTheDocument()
      expect(screen.getByText('Style:')).toBeInTheDocument()
      expect(screen.getByText('Could use more descriptive variable name')).toBeInTheDocument()
    })

    it('shows score breakdown for each question', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getAllByText('4/4')).toHaveLength(4) // Two questions, multiple 4/4 scores
      })

      expect(screen.getAllByText('3/4')).toHaveLength(1) // One 3/4 score
      expect(screen.getAllByText('2/4')).toHaveLength(1) // One 2/4 score
    })

    it('handles questions without answers', async () => {
      const dataWithEmptyAnswer = {
        ...mockTestData,
        answers: [
          ...mockTestData.answers,
          {
            id: 'answer-3',
            question_id: 'q3',
            attempt_id: 'attempt-123',
            question_text: 'Unanswered question',
            concepts: ['Testing'],
            answer_code: '',
            question_score: null,
            feedback: null,
            scores: null
          }
        ]
      }

      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => dataWithEmptyAnswer
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('No answer submitted')).toBeInTheDocument()
      })

      expect(screen.getByText('Not graded')).toBeInTheDocument()
    })

    it('handles empty answers array', async () => {
      const dataWithNoAnswers = {
        ...mockTestData,
        answers: []
      }

      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => dataWithNoAnswers
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('No answers found for this test')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTestData
      })
    })

    it('navigates back to dashboard when button is clicked', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Back to Dashboard')
      await fireEvent.click(backButton)

      expect(mockGoto).toHaveBeenCalledWith('/student')
    })
  })

  describe('Submission Status Messages', () => {
    it('shows pending message for submitted tests', async () => {
      const submittedData = {
        ...mockTestData,
        attempt: {
          ...mockTestData.attempt,
          status: 'submitted',
          total_score: null,
          graded_at: null
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => submittedData
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText(/Your test has been submitted successfully/)).toBeInTheDocument()
      })

      expect(screen.getByText(/Check back later for detailed feedback/)).toBeInTheDocument()
    })

    it('does not show pending message for graded tests', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.queryByText(/Your test has been submitted successfully/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error States', () => {
    it('shows no results found when attempt is null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ attempt: null, test: null, answers: [] })
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument()
      })

      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })

    it('handles missing attempt ID', () => {
      mockPage.params.attemptId = ''
      
      render(StudentResults)

      // Should not make API call without attempt ID
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Score Color Coding', () => {
    const testScoreColor = async (score: number, expectedColorClass: string) => {
      const scoreData = {
        ...mockTestData,
        attempt: { ...mockTestData.attempt, total_score: score }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => scoreData
      })

      render(StudentResults)
      await waitFor(() => {
        const scoreElement = screen.getByText(`${score}%`)
        expect(scoreElement.closest(expectedColorClass)).toBeInTheDocument()
      })
    }

    it('shows green color for high scores (80+)', async () => {
      await testScoreColor(90, '.text-green-600')
    })

    it('shows yellow color for medium scores (60-79)', async () => {
      await testScoreColor(70, '.text-yellow-600')
    })

    it('shows red color for low scores (<60)', async () => {
      await testScoreColor(45, '.text-red-600')
    })
  })

  describe('Date Formatting', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTestData
      })
    })

    it('handles null dates gracefully', async () => {
      const dataWithNullDates = {
        ...mockTestData,
        attempt: {
          ...mockTestData.attempt,
          started_at: null,
          submitted_at: null,
          graded_at: null
        }
      }

      mockFetch.mockClear()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => dataWithNullDates
      })

      render(StudentResults)
      await waitFor(() => {
        expect(screen.getAllByText('N/A')).toHaveLength(4) // Started, Submitted, Duration, Grade
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTestData
      })
    })

    it('has proper heading structure', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Test Results' })).toBeInTheDocument()
      })

      expect(screen.getByRole('heading', { level: 2, name: 'Overall Results' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Question Results' })).toBeInTheDocument()
    })

    it('has accessible navigation buttons', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument()
      })
    })

    it('provides descriptive text for screen readers', async () => {
      render(StudentResults)
      await waitFor(() => {
        expect(screen.getByText('Overall Results')).toBeInTheDocument()
      })

      expect(screen.getByText('Question Results')).toBeInTheDocument()
      expect(screen.getByText('Your Answer:')).toBeInTheDocument()
      expect(screen.getByText('Feedback:')).toBeInTheDocument()
    })
  })
})