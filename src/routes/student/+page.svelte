<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import type { CodingTest, TestAttempt } from '$lib/types/index.js'

  let availableTests = $state<CodingTest[]>([])
  let pastAttempts = $state<TestAttempt[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  async function loadStudentData(): Promise<void> {
    if (!authStore.user?.id) return

    loading = true
    error = null

    try {
      // Load available tests
      const testsResponse = await fetch(`/api/student/available-tests?studentId=${authStore.user.id}`)
      const testsResult = await testsResponse.json()

      if (testsResponse.ok) {
        availableTests = testsResult.tests || []
      } else {
        throw new Error(testsResult.error || 'Failed to load available tests')
      }

      // Load past attempts
      const attemptsResponse = await fetch(`/api/student/attempts?studentId=${authStore.user.id}`)
      const attemptsResult = await attemptsResponse.json()

      if (attemptsResponse.ok) {
        pastAttempts = attemptsResult.attempts || []
      } else {
        // Don't throw error for past attempts - it's not critical
      }
    } catch (err) {
      // Error loading student data
      error = err instanceof Error ? err.message : 'Failed to load student data'
    } finally {
      loading = false
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'ended': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'submitted': return 'bg-purple-100 text-purple-800'
      case 'graded': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  function formatDateTime(dateString: string | null): string {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  function canTakeTest(test: CodingTest): boolean {
    if (test.status !== 'active') return false
    
    // Check if already completed
    const existingAttempt = pastAttempts.find(attempt => 
      attempt.test_id === test.id && 
      (attempt.status === 'submitted' || attempt.status === 'graded')
    )
    if (existingAttempt) return false

    // Check if currently in progress
    const inProgressAttempt = pastAttempts.find(attempt => 
      attempt.test_id === test.id && attempt.status === 'in_progress'
    )
    
    // Check dates
    const now = new Date()
    if (test.start_date && new Date(test.start_date) > now) return false
    if (test.end_date && new Date(test.end_date) < now) return false

    return true
  }

  function canResumeTest(test: CodingTest): boolean {
    const inProgressAttempt = pastAttempts.find(attempt => 
      attempt.test_id === test.id && attempt.status === 'in_progress'
    )
    return !!inProgressAttempt
  }

  function getTestAction(test: CodingTest): { text: string; action: () => void; disabled: boolean } {
    const existingAttempt = pastAttempts.find(attempt => 
      attempt.test_id === test.id && 
      (attempt.status === 'submitted' || attempt.status === 'graded')
    )
    
    if (existingAttempt) {
      return {
        text: 'View Results',
        action: () => goto(`/student/results/${existingAttempt.id}`),
        disabled: false
      }
    }

    if (canResumeTest(test)) {
      return {
        text: 'Resume Test',
        action: () => goto(`/student/test/${test.id}`),
        disabled: false
      }
    }

    if (canTakeTest(test)) {
      return {
        text: 'Start Test',
        action: () => goto(`/student/test/${test.id}`),
        disabled: false
      }
    }

    if (test.status !== 'active') {
      return {
        text: 'Not Available',
        action: () => {},
        disabled: true
      }
    }

    const now = new Date()
    if (test.start_date && new Date(test.start_date) > now) {
      return {
        text: `Available ${formatDate(test.start_date)}`,
        action: () => {},
        disabled: true
      }
    }

    if (test.end_date && new Date(test.end_date) < now) {
      return {
        text: 'Expired',
        action: () => {},
        disabled: true
      }
    }

    return {
      text: 'Not Available',
      action: () => {},
      disabled: true
    }
  }

  onMount(() => {
    if (authStore.user) {
      loadStudentData()
    } else {
      goto('/auth/login')
    }
  })
</script>

<svelte:head>
  <title>Student Dashboard - Online Tests</title>
</svelte:head>

<div class="max-w-6xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Student Dashboard</h1>
    <p class="text-gray-600 mt-1">
      Welcome back! Here are your available tests and past results.
    </p>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading your tests...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-800">{error}</p>
      <button
        onclick={loadStudentData}
        class="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Retry
      </button>
    </div>
  {:else}
    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">Available Tests</div>
        <div class="text-2xl font-semibold text-blue-600">
          {availableTests.filter(test => canTakeTest(test) || canResumeTest(test)).length}
        </div>
      </div>
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">Completed</div>
        <div class="text-2xl font-semibold text-green-600">
          {pastAttempts.filter(attempt => attempt.status === 'submitted' || attempt.status === 'graded').length}
        </div>
      </div>
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">In Progress</div>
        <div class="text-2xl font-semibold text-yellow-600">
          {pastAttempts.filter(attempt => attempt.status === 'in_progress').length}
        </div>
      </div>
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">Average Score</div>
        <div class="text-2xl font-semibold text-gray-900">
          {pastAttempts.filter(a => a.total_score !== null).length > 0
            ? Math.round(
                pastAttempts
                  .filter(a => a.total_score !== null)
                  .reduce((sum, a) => sum + (a.total_score || 0), 0) / 
                pastAttempts.filter(a => a.total_score !== null).length
              ) + '%'
            : 'N/A'
          }
        </div>
      </div>
    </div>

    <!-- Available Tests -->
    <div class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Available Tests</h2>
      
      {#if availableTests.length === 0}
        <div class="bg-white rounded-lg border p-8 text-center">
          <div class="text-4xl mb-4">📝</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No tests available</h3>
          <p class="text-gray-600">Check back later for new assignments from your teacher.</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each availableTests as test}
            {@const action = getTestAction(test)}
            <div class="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
              <div class="p-6">
                <div class="flex items-start justify-between mb-3">
                  <h3 class="text-lg font-semibold text-gray-900">{test.title}</h3>
                  <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(test.status)}">
                    {test.status}
                  </span>
                </div>
                
                {#if test.description}
                  <p class="text-gray-600 text-sm mb-4">{test.description}</p>
                {/if}
                
                <div class="space-y-2 text-sm text-gray-500 mb-4">
                  <div class="flex justify-between">
                    <span>Duration:</span>
                    <span>{formatDuration(test.time_limit_minutes)}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Questions:</span>
                    <span>{test.question_count || 0}</span>
                  </div>
                  {#if test.end_date}
                    <div class="flex justify-between">
                      <span>Due:</span>
                      <span>{formatDate(test.end_date)}</span>
                    </div>
                  {/if}
                </div>
                
                <button
                  onclick={action.action}
                  disabled={action.disabled}
                  class="w-full py-2 px-4 rounded font-medium transition-colors {
                    action.disabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : action.text === 'Start Test' || action.text === 'Resume Test'
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                  }"
                >
                  {action.text}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Past Attempts -->
    <div>
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Past Attempts</h2>
      
      {#if pastAttempts.length === 0}
        <div class="bg-white rounded-lg border p-8 text-center">
          <div class="text-4xl mb-4">📊</div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">No attempts yet</h3>
          <p class="text-gray-600">Your test results will appear here after you complete tests.</p>
        </div>
      {:else}
        <div class="bg-white rounded-lg border overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                {#each pastAttempts as attempt}
                  <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-medium text-gray-900">
                        {attempt.test_title || 'Test'}
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(attempt.status)}">
                        {attempt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(attempt.started_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(attempt.submitted_at)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                      {#if attempt.total_score !== null}
                        <span class="font-medium {
                          attempt.total_score >= 80 ? 'text-green-600' :
                          attempt.total_score >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }">
                          {attempt.total_score}%
                        </span>
                      {:else}
                        <span class="text-gray-400">
                          {attempt.status === 'in_progress' ? 'In progress' : 'Pending'}
                        </span>
                      {/if}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {#if attempt.status === 'in_progress'}
                        <button
                          onclick={() => goto(`/student/test/${attempt.test_id}`)}
                          class="text-blue-600 hover:text-blue-800"
                        >
                          Resume
                        </button>
                      {:else if attempt.status === 'submitted' || attempt.status === 'graded'}
                        <button
                          onclick={() => goto(`/student/results/${attempt.id}`)}
                          class="text-green-600 hover:text-green-800"
                        >
                          View Results
                        </button>
                      {:else}
                        <span class="text-gray-400">N/A</span>
                      {/if}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>