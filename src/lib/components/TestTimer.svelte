<script lang="ts">
  interface Props {
    timeRemaining: number // in seconds
    isRunning: boolean
    isExpired: boolean
    onTimeExpired?: () => void
  }

  let {
    timeRemaining = 0,
    isRunning = false,
    isExpired = false,
    onTimeExpired
  }: Props = $props()

  // Format time as MM:SS or HH:MM:SS
  function formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  }

  // Determine color based on time remaining
  function getTimerColor(seconds: number): string {
    if (seconds <= 60) return 'text-red-600' // Last minute - red
    if (seconds <= 300) return 'text-yellow-600' // Last 5 minutes - yellow
    if (seconds <= 600) return 'text-orange-600' // Last 10 minutes - orange
    return 'text-green-600' // More than 10 minutes - green
  }

  // Get background color for timer
  function getTimerBg(seconds: number): string {
    if (seconds <= 60) return 'bg-red-50 border-red-200'
    if (seconds <= 300) return 'bg-yellow-50 border-yellow-200'
    if (seconds <= 600) return 'bg-orange-50 border-orange-200'
    return 'bg-green-50 border-green-200'
  }

  // Check for warnings
  $effect(() => {
    if (isRunning && timeRemaining === 60 && onTimeExpired) {
      // Show warning at 1 minute remaining
      alert('⚠️ Warning: Only 1 minute remaining!')
    }

    if (isExpired && onTimeExpired) {
      onTimeExpired()
    }
  })
</script>

<div class="timer-container">
  <div class="timer-display {getTimerBg(timeRemaining)} border-2 rounded-lg px-4 py-2">
    <div class="flex items-center gap-2">
      <div class="timer-icon">
        {#if isExpired}
          ⏰
        {:else if timeRemaining <= 60}
          🚨
        {:else if timeRemaining <= 300}
          ⚠️
        {:else}
          ⏱️
        {/if}
      </div>
      
      <div class="timer-text">
        <div class="text-xs text-gray-600 font-medium">
          {#if isExpired}
            Time Expired
          {:else if !isRunning}
            Timer Stopped
          {:else}
            Time Remaining
          {/if}
        </div>
        
        <div class="text-lg font-mono font-bold {getTimerColor(timeRemaining)}">
          {#if isExpired}
            00:00
          {:else}
            {formatTime(timeRemaining)}
          {/if}
        </div>
      </div>
    </div>
  </div>

  {#if isRunning && timeRemaining <= 300}
    <div class="mt-2 text-xs text-center {getTimerColor(timeRemaining)}">
      {#if timeRemaining <= 60}
        Time is almost up! Submit your test now.
      {:else if timeRemaining <= 300}
        Less than 5 minutes remaining.
      {/if}
    </div>
  {/if}
</div>

<style>
  .timer-container {
    position: sticky;
    top: 0;
    z-index: 40;
  }

  .timer-display {
    min-width: 140px;
    transition: all 0.3s ease;
  }

  .timer-icon {
    font-size: 1.2rem;
  }

  .timer-text {
    text-align: left;
  }

  /* Pulse animation for critical time */
  .timer-display:has(.text-red-600) {
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }
</style>