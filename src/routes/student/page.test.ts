import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte'
import { tick } from 'svelte'
import StudentDashboard from './+page.svelte'

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

const mockGoto = vi.fn()

vi.mock('$lib/stores/auth.svelte.js', () => ({
  authStore: mockAuthStore
}))

vi.mock('$app/navigation', () => ({
  goto: mockGoto
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

describe('Student Dashboard', () => {
  const mockAvailableTests = [
    {
      id: 'test-1',
      title: 'Java Basics Test',
      description: 'Test your knowledge of Java fundamentals',
      status: 'active',
      time_limit_minutes: 60,
      question_count: 5,
      start_date: '2023-01-01T00:00:00Z',
      end_date: '2023-12-31T23:59:59Z'
    },
    {
      id: 'test-2',
      title: 'Advanced Java Test',
      description: 'Advanced concepts in Java',
      status: 'active',
      time_limit_minutes: 90,
      question_count: 8,
      start_date: '2023-01-01T00:00:00Z',
      end_date: '2023-12-31T23:59:59Z'
    }
  ]

  const mockPastAttempts = [
    {
      id: 'attempt-1',
      test_id: 'test-1',
      test_title: 'Java Basics Test',
      status: 'graded',
      started_at: '2023-06-01T10:00:00Z',
      submitted_at: '2023-06-01T10:45:00Z',
      total_score: 85
    },
    {
      id: 'attempt-2',
      test_id: 'test-2',
      test_title: 'Advanced Java Test',
      status: 'in_progress',
      started_at: '2023-06-02T10:00:00Z',
      submitted_at: null,
      total_score: null
    }
  ]

  describe('Initial Loading', () => {
    it('renders dashboard title and description', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tests: [] })
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ attempts: [] })
      })

      render(StudentDashboard)

      expect(screen.getByText('Student Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Welcome back! Here are your available tests and past results.')).toBeInTheDocument()
    })

    it('shows loading state initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(StudentDashboard)

      expect(screen.getByText('Loading your tests...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('redirects to login if user is not authenticated', () => {
      const originalUser = mockAuthStore.user
      mockAuthStore.user = null

      render(StudentDashboard)

      expect(mockGoto).toHaveBeenCalledWith('/auth/login')
      
      // Restore user
      mockAuthStore.user = originalUser
    })
  })

  describe('Data Loading', () => {
    it('loads available tests and past attempts successfully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: mockPastAttempts })
        })

      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/student/available-tests?studentId=student-123')
      expect(mockFetch).toHaveBeenCalledWith('/api/student/attempts?studentId=student-123')
    })

    it('handles API error for available tests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Failed to load tests' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: [] })
        })

      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('Failed to load tests')).toBeInTheDocument()
      })

      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('handles API error for past attempts gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Failed to load attempts' })
        })

      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
      })

      // Should still show available tests
      expect(screen.getByText('Java Basics Test')).toBeInTheDocument()
      expect(console.error).toHaveBeenCalledWith('Failed to load past attempts:', 'Failed to load attempts')
    })

    it('retries loading data when retry button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Network error' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: mockPastAttempts })
        })

      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Retry')
      await fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Java Basics Test')).toBeInTheDocument()
      })
    })
  })

  describe('Quick Stats', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: mockPastAttempts })
        })
    })

    it('displays correct available tests count', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Available Tests')).toBeInTheDocument()
      // Should show tests that can be taken or resumed
      const availableCount = screen.getByText('1') // Only test-2 can be resumed, test-1 is completed
      expect(availableCount).toBeInTheDocument()
    })

    it('displays correct completed tests count', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Completed')).toBeInTheDocument()
      const completedCount = screen.getByText('1') // One graded attempt
      expect(completedCount).toBeInTheDocument()
    })

    it('displays correct in progress tests count', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('In Progress')).toBeInTheDocument()
      const inProgressCount = screen.getByText('1') // One in_progress attempt
      expect(inProgressCount).toBeInTheDocument()
    })

    it('calculates and displays average score', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('Average Score')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument() // Only one scored attempt with 85%
    })

    it('shows N/A for average score when no scores available', async () => {
      const attemptsWithoutScores = [
        {
          id: 'attempt-1',
          test_id: 'test-1',
          test_title: 'Java Basics Test',
          status: 'in_progress',
          started_at: '2023-06-01T10:00:00Z',
          submitted_at: null,
          total_score: null
        }
      ]

      mockFetch.mockClear()
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: attemptsWithoutScores })
        })

      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
      })

      expect(screen.getByText('N/A')).toBeInTheDocument()
    })
  })

  describe('Available Tests Section', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: mockPastAttempts })
        })
    })

    it('displays available tests with correct information', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('Java Basics Test')).toBeInTheDocument()
      })

      expect(screen.getByText('Advanced Java Test')).toBeInTheDocument()
      expect(screen.getByText('Test your knowledge of Java fundamentals')).toBeInTheDocument()
      expect(screen.getByText('1h 0m')).toBeInTheDocument() // 60 minutes
      expect(screen.getByText('1h 30m')).toBeInTheDocument() // 90 minutes
    })

    it('shows correct action buttons based on test status', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('View Results')).toBeInTheDocument() // For completed test
      })

      expect(screen.getByText('Resume Test')).toBeInTheDocument() // For in-progress test
    })

    it('navigates to test results when View Results is clicked', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('View Results')).toBeInTheDocument()
      })

      const viewResultsButton = screen.getByText('View Results')
      await fireEvent.click(viewResultsButton)

      expect(mockGoto).toHaveBeenCalledWith('/student/results/attempt-1')
    })

    it('navigates to test when Resume Test is clicked', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('Resume Test')).toBeInTheDocument()
      })

      const resumeButton = screen.getByText('Resume Test')
      await fireEvent.click(resumeButton)

      expect(mockGoto).toHaveBeenCalledWith('/student/test/test-2')
    })

    it('shows empty state when no tests available', async () => {
      mockFetch.mockClear()
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: [] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: [] })
        })

      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('No tests available')).toBeInTheDocument()
      })

      expect(screen.getByText('Check back later for new assignments from your teacher.')).toBeInTheDocument()
    })
  })

  describe('Past Attempts Section', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: mockPastAttempts })
        })
    })

    it('displays past attempts table with correct data', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('Past Attempts')).toBeInTheDocument()
      })

      // Check table headers
      expect(screen.getByText('Test')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Started')).toBeInTheDocument()
      expect(screen.getByText('Submitted')).toBeInTheDocument()
      expect(screen.getByText('Score')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()

      // Check attempt data
      expect(screen.getByText('Java Basics Test')).toBeInTheDocument()
      expect(screen.getByText('graded')).toBeInTheDocument()
      expect(screen.getByText('85%')).toBeInTheDocument()
    })

    it('shows correct status colors for different attempt statuses', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('graded')).toBeInTheDocument()
      })

      const gradedStatus = screen.getByText('graded')
      expect(gradedStatus.closest('.bg-green-100')).toBeInTheDocument()

      const inProgressStatus = screen.getByText('in progress')
      expect(inProgressStatus.closest('.bg-blue-100')).toBeInTheDocument()
    })

    it('shows Resume button for in-progress attempts', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('Resume')).toBeInTheDocument()
      })

      const resumeButton = screen.getByText('Resume')
      await fireEvent.click(resumeButton)

      expect(mockGoto).toHaveBeenCalledWith('/student/test/test-2')
    })

    it('shows View Results button for completed attempts', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getAllByText('View Results')).toHaveLength(2) // One in available tests, one in past attempts
      })

      const viewResultsButtons = screen.getAllByText('View Results')
      await fireEvent.click(viewResultsButtons[1]) // Click the one in the table

      expect(mockGoto).toHaveBeenCalledWith('/student/results/attempt-1')
    })

    it('shows empty state when no attempts exist', async () => {
      mockFetch.mockClear()
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: [] })
        })

      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByText('No attempts yet')).toBeInTheDocument()
      })

      expect(screen.getByText('Your test results will appear here after you complete tests.')).toBeInTheDocument()
    })
  })

  describe('Utility Functions', () => {
    describe('Date Formatting', () => {
      beforeEach(async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ tests: mockAvailableTests })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ attempts: mockPastAttempts })
          })
      })

      it('formats dates correctly', async () => {
        render(StudentDashboard)
        await waitFor(() => {
          expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
        })

        // Should show formatted dates (exact format depends on locale)
        expect(screen.getByText(/6\/1\/2023/)).toBeInTheDocument() // Started date
        expect(screen.getByText(/6\/2\/2023/)).toBeInTheDocument() // Started date for in-progress
      })

      it('handles null dates gracefully', async () => {
        const attemptsWithNullDates = [
          {
            id: 'attempt-1',
            test_id: 'test-1',
            test_title: 'Java Basics Test',
            status: 'in_progress',
            started_at: null,
            submitted_at: null,
            total_score: null
          }
        ]

        mockFetch.mockClear()
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ tests: mockAvailableTests })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ attempts: attemptsWithNullDates })
          })

        render(StudentDashboard)
        await waitFor(() => {
          expect(screen.queryByText('Loading your tests...')).not.toBeInTheDocument()
        })

        expect(screen.getAllByText('N/A')).toHaveLength(3) // Started, Submitted, and average score
      })
    })

    describe('Duration Formatting', () => {
      it('formats duration correctly for hours and minutes', async () => {
        render(StudentDashboard)
        await waitFor(() => {
          expect(screen.getByText('1h 30m')).toBeInTheDocument() // 90 minutes
        })
      })

      it('formats duration correctly for minutes only', async () => {
        const testsWithShortDuration = [
          {
            ...mockAvailableTests[0],
            time_limit_minutes: 45
          }
        ]

        mockFetch.mockClear()
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ tests: testsWithShortDuration })
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ attempts: [] })
          })

        render(StudentDashboard)
        await waitFor(() => {
          expect(screen.getByText('45m')).toBeInTheDocument()
        })
      })
    })
  })

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tests: mockAvailableTests })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ attempts: mockPastAttempts })
        })
    })

    it('has proper heading structure', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Student Dashboard' })).toBeInTheDocument()
      })

      expect(screen.getByRole('heading', { level: 2, name: 'Available Tests' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2, name: 'Past Attempts' })).toBeInTheDocument()
    })

    it('has accessible table structure', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })

      expect(screen.getByRole('columnheader', { name: 'Test' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    })

    it('has accessible buttons with proper labels', async () => {
      render(StudentDashboard)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View Results' })).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: 'Resume Test' })).toBeInTheDocument()
    })
  })
})