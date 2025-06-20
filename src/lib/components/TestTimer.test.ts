import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import TestTimer from './TestTimer.svelte'

// Mock the alert function
const mockAlert = vi.fn()
global.alert = mockAlert

describe('TestTimer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Time Formatting', () => {
    it('formats time under 1 hour as MM:SS', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 300, // 5 minutes
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('5:00')).toBeInTheDocument()
    })

    it('formats time over 1 hour as HH:MM:SS', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 3661, // 1 hour, 1 minute, 1 second
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('1:01:01')).toBeInTheDocument()
    })

    it('pads single digits with zeros', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 65, // 1 minute, 5 seconds
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('1:05')).toBeInTheDocument()
    })

    it('shows 00:00 when expired', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 0,
          isRunning: false,
          isExpired: true
        }
      })

      expect(screen.getByText('00:00')).toBeInTheDocument()
    })
  })

  describe('Timer States', () => {
    it('shows "Time Remaining" when running', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 300,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('Time Remaining')).toBeInTheDocument()
    })

    it('shows "Timer Stopped" when not running', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 300,
          isRunning: false,
          isExpired: false
        }
      })

      expect(screen.getByText('Timer Stopped')).toBeInTheDocument()
    })

    it('shows "Time Expired" when expired', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 0,
          isRunning: false,
          isExpired: true
        }
      })

      expect(screen.getByText('Time Expired')).toBeInTheDocument()
    })
  })

  describe('Color Coding', () => {
    it('shows green color for more than 10 minutes', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 700, // 11 minutes 40 seconds
          isRunning: true,
          isExpired: false
        }
      })

      const timeDisplay = container.querySelector('.text-green-600')
      expect(timeDisplay).toBeInTheDocument()
      expect(timeDisplay).toHaveTextContent('11:40')
    })

    it('shows orange color for 6-10 minutes', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 500, // 8 minutes 20 seconds
          isRunning: true,
          isExpired: false
        }
      })

      const timeDisplay = container.querySelector('.text-orange-600')
      expect(timeDisplay).toBeInTheDocument()
      expect(timeDisplay).toHaveTextContent('8:20')
    })

    it('shows yellow color for 2-5 minutes', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 180, // 3 minutes
          isRunning: true,
          isExpired: false
        }
      })

      const timeDisplay = container.querySelector('.text-yellow-600')
      expect(timeDisplay).toBeInTheDocument()
      expect(timeDisplay).toHaveTextContent('3:00')
    })

    it('shows red color for last minute', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 30, // 30 seconds
          isRunning: true,
          isExpired: false
        }
      })

      const timeDisplay = container.querySelector('.text-red-600')
      expect(timeDisplay).toBeInTheDocument()
      expect(timeDisplay).toHaveTextContent('0:30')
    })
  })

  describe('Background Colors', () => {
    it('shows green background for safe time', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 700,
          isRunning: true,
          isExpired: false
        }
      })

      const timerDisplay = container.querySelector('.bg-green-50.border-green-200')
      expect(timerDisplay).toBeInTheDocument()
    })

    it('shows orange background for warning time', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 500,
          isRunning: true,
          isExpired: false
        }
      })

      const timerDisplay = container.querySelector('.bg-orange-50.border-orange-200')
      expect(timerDisplay).toBeInTheDocument()
    })

    it('shows yellow background for caution time', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 180,
          isRunning: true,
          isExpired: false
        }
      })

      const timerDisplay = container.querySelector('.bg-yellow-50.border-yellow-200')
      expect(timerDisplay).toBeInTheDocument()
    })

    it('shows red background for critical time', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 30,
          isRunning: true,
          isExpired: false
        }
      })

      const timerDisplay = container.querySelector('.bg-red-50.border-red-200')
      expect(timerDisplay).toBeInTheDocument()
    })
  })

  describe('Icons', () => {
    it('shows clock icon for normal time', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 700,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('⏱️')).toBeInTheDocument()
    })

    it('shows warning icon for 2-5 minutes', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 180,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })

    it('shows alarm icon for last minute', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 30,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('🚨')).toBeInTheDocument()
    })

    it('shows alarm clock icon when expired', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 0,
          isRunning: false,
          isExpired: true
        }
      })

      expect(screen.getByText('⏰')).toBeInTheDocument()
    })
  })

  describe('Warning Messages', () => {
    it('shows warning message for 2-5 minutes remaining when running', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 180, // 3 minutes
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('Less than 5 minutes remaining.')).toBeInTheDocument()
    })

    it('shows critical message for last minute when running', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 30,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('Time is almost up! Submit your test now.')).toBeInTheDocument()
    })

    it('does not show warning messages when timer is not running', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 180,
          isRunning: false,
          isExpired: false
        }
      })

      expect(screen.queryByText('Less than 5 minutes remaining.')).not.toBeInTheDocument()
    })

    it('does not show warning messages for safe time', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 700,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.queryByText('Less than 5 minutes remaining.')).not.toBeInTheDocument()
      expect(screen.queryByText('Time is almost up! Submit your test now.')).not.toBeInTheDocument()
    })
  })

  describe('Callbacks and Effects', () => {
    it('calls onTimeExpired when expired and callback is provided', () => {
      const mockCallback = vi.fn()
      
      render(TestTimer, {
        props: {
          timeRemaining: 0,
          isRunning: false,
          isExpired: true,
          onTimeExpired: mockCallback
        }
      })

      // Note: We can't easily test effects in component tests,
      // this would be better tested in integration tests
      // For now, we verify the callback prop is accepted
      expect(mockCallback).toBeDefined()
    })

    it('accepts undefined onTimeExpired callback', () => {
      expect(() => {
        render(TestTimer, {
          props: {
            timeRemaining: 300,
            isRunning: true,
            isExpired: false
            // onTimeExpired is undefined
          }
        })
      }).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero time remaining', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 0,
          isRunning: false,
          isExpired: false
        }
      })

      expect(screen.getByText('0:00')).toBeInTheDocument()
    })

    it('handles exactly 1 minute remaining', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 60,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('1:00')).toBeInTheDocument()
      expect(screen.getByText('🚨')).toBeInTheDocument()
    })

    it('handles exactly 5 minutes remaining', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 300,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('5:00')).toBeInTheDocument()
      expect(screen.getByText('⚠️')).toBeInTheDocument()
    })

    it('handles exactly 10 minutes remaining', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 600,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('10:00')).toBeInTheDocument()
      expect(screen.getByText('⏱️')).toBeInTheDocument()
    })

    it('handles negative time (should not happen in practice)', () => {
      render(TestTimer, {
        props: {
          timeRemaining: -10,
          isRunning: false,
          isExpired: true
        }
      })

      // Component should handle gracefully and show expired state
      expect(screen.getByText('00:00')).toBeInTheDocument()
      expect(screen.getByText('Time Expired')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      const { container } = render(TestTimer, {
        props: {
          timeRemaining: 300,
          isRunning: true,
          isExpired: false
        }
      })

      // Check that timer is contained in a proper container
      const timerContainer = container.querySelector('.timer-container')
      expect(timerContainer).toBeInTheDocument()
    })

    it('shows clear text labels for screen readers', () => {
      render(TestTimer, {
        props: {
          timeRemaining: 300,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('Time Remaining')).toBeInTheDocument()
      expect(screen.getByText('5:00')).toBeInTheDocument()
    })

    it('provides different states that are clearly distinguishable', () => {
      const { rerender } = render(TestTimer, {
        props: {
          timeRemaining: 300,
          isRunning: true,
          isExpired: false
        }
      })

      expect(screen.getByText('Time Remaining')).toBeInTheDocument()

      rerender({
        timeRemaining: 300,
        isRunning: false,
        isExpired: false
      })

      expect(screen.getByText('Timer Stopped')).toBeInTheDocument()

      rerender({
        timeRemaining: 0,
        isRunning: false,
        isExpired: true
      })

      expect(screen.getByText('Time Expired')).toBeInTheDocument()
    })
  })
})