<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { testsStore } from '$lib/stores/tests.svelte.js'
  import Markdown from '$lib/components/Markdown.svelte'
  import type { CodingTest, TestAttempt, TestQuestionWithDetails } from '$lib/types/index.js'

  const testId = $derived($page.params.testId)
  
  let test = $state<CodingTest | null>(null)
  let attempts = $state<TestAttempt[]>([])
  let questions = $state<TestQuestionWithDetails[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let activeTab = $state<'overview' | 'attempts' | 'results' | 'settings'>('overview')
  let gradingAll = $state(false)
  let publishingTest = $state(false)

  // Real-time monitoring
  let monitoringInterval: NodeJS.Timeout | null = null
  let lastUpdate = $state<Date | null>(null)

  async function loadTestData(): Promise<void> {
    if (!testId) return

    loading = true
    error = null

    try {
      // Load test details
      const testResponse = await fetch(`/api/tests/${testId}`)
      const testResult = await testResponse.json()

      if (!testResponse.ok) {
        throw new Error(testResult.error || 'Failed to load test')
      }

      test = testResult.test
      questions = testResult.questions || []

      // Load attempts
      await loadAttempts()
      
      lastUpdate = new Date()
    } catch (err) {
      console.error('Error loading test data:', err)
      error = err instanceof Error ? err.message : 'Failed to load test data'
    } finally {
      loading = false
    }
  }

  async function loadAttempts(): Promise<void> {
    if (!testId) return

    try {
      const response = await fetch(`/api/tests/${testId}/progress`)
      const result = await response.json()

      if (response.ok) {
        attempts = result.attempts || []
      }
    } catch (err) {
      console.error('Error loading attempts:', err)
    }
  }

  async function publishTest(): Promise<void> {
    if (!testId) return

    publishingTest = true
    try {
      const result = await testsStore.publishTest(testId)
      
      if (result.success) {
        alert('Test published successfully!')
        if (test) {
          test.status = 'active'
        }
      } else {
        alert(`Failed to publish test: ${result.error}`)
      }
    } catch (error) {
      console.error('Error publishing test:', error)
      alert('Failed to publish test')
    } finally {
      publishingTest = false
    }
  }

  async function gradeAllSubmissions(): Promise<void> {
    if (!testId || !confirm('Grade all completed submissions? This may take several minutes.')) {
      return
    }

    gradingAll = true
    try {
      const response = await fetch(`/api/tests/${testId}/grade-all`, {
        method: 'POST'
      })

      const result = await response.json()

      if (response.ok) {
        alert(`Grading completed! Processed ${result.gradedCount} submissions.`)
        await loadAttempts() // Refresh attempts to show updated grades
      } else {
        alert(`Grading failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error grading submissions:', error)
      alert('Failed to grade submissions')
    } finally {
      gradingAll = false
    }
  }

  async function deleteTest(): Promise<void> {
    if (!testId || !confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return
    }

    const result = await testsStore.deleteTest(testId)
    
    if (result.success) {
      alert('Test deleted successfully!')
      goto('/teacher/tests')
    } else {
      alert(`Failed to delete test: ${result.error}`)
    }
  }

  async function exportResults(): Promise<void> {
    if (!testId) return

    try {
      const response = await fetch(`/api/tests/${testId}/results?format=csv`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${test?.title || 'test'}_results.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Failed to export results')
      }
    } catch (error) {
      console.error('Error exporting results:', error)
      alert('Failed to export results')
    }
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'ended': return 'bg-red-100 text-red-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'submitted': return 'bg-purple-100 text-purple-800'
      case 'graded': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function getTimeRemaining(attempt: TestAttempt): string {
    if (!attempt.started_at || !test) return 'N/A'
    
    const startTime = new Date(attempt.started_at)
    const timeLimit = test.time_limit_minutes * 60 * 1000
    const elapsed = Date.now() - startTime.getTime()
    const remaining = Math.max(0, timeLimit - elapsed)
    
    if (remaining === 0) return 'Expired'
    
    const minutes = Math.floor(remaining / (1000 * 60))
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000)
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Set up real-time monitoring
  onMount(() => {
    loadTestData()
    
    // Refresh attempts every 30 seconds for active tests
    if (test?.status === 'active') {
      monitoringInterval = setInterval(() => {
        loadAttempts()
        lastUpdate = new Date()
      }, 30000)
    }

    return () => {
      if (monitoringInterval) {
        clearInterval(monitoringInterval)
      }
    }
  })
</script>

<svelte:head>
  <title>
    {test?.title || 'Test Details'} - Teacher Dashboard
  </title>
</svelte:head>

<div class="max-w-7xl mx-auto p-6">
  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading test details...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-800">{error}</p>
      <button
        onclick={() => goto('/teacher/tests')}
        class="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Back to Tests
      </button>
    </div>
  {:else if test}
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">{test.title}</h1>
          {#if test.description}
            <p class="text-gray-600 mt-1">{test.description}</p>
          {/if}
        </div>
        
        <div class="flex items-center space-x-3">
          <span class="px-3 py-1 rounded-full text-sm font-medium {getStatusColor(test.status)}">
            {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
          </span>
          
          {#if test.status === 'draft'}
            <button
              onclick={publishTest}
              disabled={publishingTest}
              class="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded"
            >
              {publishingTest ? 'Publishing...' : 'Publish Test'}
            </button>
          {/if}
          
          <button
            onclick={deleteTest}
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Delete
          </button>
        </div>
      </div>

      <!-- Test Info -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-lg border p-4">
          <div class="text-sm text-gray-500">Time Limit</div>
          <div class="text-lg font-semibold">{formatDuration(test.time_limit_minutes)}</div>
        </div>
        <div class="bg-white rounded-lg border p-4">
          <div class="text-sm text-gray-500">Questions</div>
          <div class="text-lg font-semibold">{questions.length}</div>
        </div>
        <div class="bg-white rounded-lg border p-4">
          <div class="text-sm text-gray-500">Attempts</div>
          <div class="text-lg font-semibold">{attempts.length}</div>
        </div>
        <div class="bg-white rounded-lg border p-4">
          <div class="text-sm text-gray-500">Completed</div>
          <div class="text-lg font-semibold">
            {attempts.filter(a => a.status === 'submitted' || a.status === 'graded').length}
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 mb-6">
      <nav class="-mb-px flex space-x-8">
        {#each [
          { id: 'overview', label: 'Overview' },
          { id: 'attempts', label: `Live Monitoring (${attempts.filter(a => a.status === 'in_progress').length})` },
          { id: 'results', label: 'Results' },
          { id: 'settings', label: 'Settings' }
        ] as tab}
          <button
            onclick={() => activeTab = tab.id}
            class="py-2 px-1 border-b-2 font-medium text-sm {
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }"
          >
            {tab.label}
          </button>
        {/each}
      </nav>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'overview'}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Questions List -->
        <div class="bg-white rounded-lg border p-6">
          <h2 class="text-xl font-semibold mb-4">Questions</h2>
          <div class="space-y-4 max-h-96 overflow-y-auto">
            {#each questions as question, index}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                    Question {index + 1}
                  </span>
                  <span class="text-xs text-gray-500">
                    {question.java_concepts?.join(', ') || 'N/A'}
                  </span>
                </div>
                <div class="text-sm prose prose-sm max-w-none">
                  <Markdown content={question.question_text || ''} />
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Test Statistics -->
        <div class="bg-white rounded-lg border p-6">
          <h2 class="text-xl font-semibold mb-4">Statistics</h2>
          
          {#if attempts.length > 0}
            <div class="space-y-4">
              <div>
                <div class="text-sm text-gray-500 mb-1">Completion Rate</div>
                <div class="bg-gray-200 rounded-full h-2">
                  <div 
                    class="bg-green-500 h-2 rounded-full"
                    style="width: {(attempts.filter(a => a.status === 'submitted' || a.status === 'graded').length / attempts.length) * 100}%"
                  ></div>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {attempts.filter(a => a.status === 'submitted' || a.status === 'graded').length} of {attempts.length} completed
                </div>
              </div>

              {#if attempts.some(a => a.final_score !== null)}
                <div>
                  <div class="text-sm text-gray-500 mb-2">Score Distribution</div>
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between">
                      <span>Average:</span>
                      <span class="font-medium">
                        {(attempts
                          .filter(a => a.final_score !== null)
                          .reduce((sum, a) => sum + (a.final_score || 0), 0) / 
                          attempts.filter(a => a.final_score !== null).length
                        ).toFixed(1)}%
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span>Highest:</span>
                      <span class="font-medium text-green-600">
                        {Math.max(...attempts.map(a => a.final_score || 0))}%
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span>Lowest:</span>
                      <span class="font-medium text-red-600">
                        {Math.min(...attempts.filter(a => a.final_score !== null).map(a => a.final_score || 0))}%
                      </span>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
          {:else}
            <p class="text-gray-500">No attempts yet</p>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'attempts'}
      <div class="bg-white rounded-lg border">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Live Monitoring</h2>
            <div class="flex items-center space-x-4">
              {#if lastUpdate}
                <span class="text-sm text-gray-500">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              {/if}
              <button
                onclick={loadAttempts}
                class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Remaining
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each attempts as attempt}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {attempt.student_name || attempt.student_id}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(attempt.status)}">
                      {attempt.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.questions_answered || 0} / {questions.length}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.status === 'in_progress' ? getTimeRemaining(attempt) : 'N/A'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {attempt.started_at ? new Date(attempt.started_at).toLocaleString() : 'N/A'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attempt.final_score !== null ? `${attempt.final_score}%` : 'N/A'}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          
          {#if attempts.length === 0}
            <div class="text-center py-8">
              <p class="text-gray-500">No attempts yet</p>
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'results'}
      <div class="bg-white rounded-lg border">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Results & Grading</h2>
            <div class="flex items-center space-x-3">
              <button
                onclick={() => goto(`/teacher/tests/${testId}/submissions`)}
                class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm"
              >
                View Submissions
              </button>
              <button
                onclick={exportResults}
                class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm"
              >
                Export CSV
              </button>
              <button
                onclick={gradeAllSubmissions}
                disabled={gradingAll}
                class="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm"
              >
                {gradingAll ? 'Grading...' : 'Grade All'}
              </button>
            </div>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Score
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#each attempts.filter(a => a.status === 'submitted' || a.status === 'graded') as attempt}
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {attempt.student_name || attempt.student_id}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(attempt.status)}">
                      {attempt.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'N/A'}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    {#if attempt.final_score !== null}
                      <span class="font-medium {
                        attempt.final_score >= 80 ? 'text-green-600' :
                        attempt.final_score >= 60 ? 'text-yellow-600' :
                        'text-red-600'
                      }">
                        {attempt.final_score}%
                      </span>
                    {:else}
                      <span class="text-gray-400">Not graded</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {#if attempt.started_at && attempt.submitted_at}
                      {Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / (1000 * 60))}m
                    {:else}
                      N/A
                    {/if}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onclick={() => goto(`/teacher/tests/${testId}/attempts/${attempt.id}`)}
                      class="text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          
          {#if attempts.filter(a => a.status === 'submitted' || a.status === 'graded').length === 0}
            <div class="text-center py-8">
              <p class="text-gray-500">No completed submissions yet</p>
            </div>
          {/if}
        </div>
      </div>

    {:else if activeTab === 'settings'}
      <div class="bg-white rounded-lg border p-6">
        <h2 class="text-xl font-semibold mb-6">Test Settings</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-4">
            <h3 class="text-lg font-medium">Basic Information</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700">Title</label>
                <div class="mt-1 text-sm text-gray-900">{test.title}</div>
              </div>
              {#if test.description}
                <div>
                  <label class="block text-sm font-medium text-gray-700">Description</label>
                  <div class="mt-1 text-sm text-gray-900">{test.description}</div>
                </div>
              {/if}
              <div>
                <label class="block text-sm font-medium text-gray-700">Time Limit</label>
                <div class="mt-1 text-sm text-gray-900">{formatDuration(test.time_limit_minutes)}</div>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h3 class="text-lg font-medium">Security & Features</h3>
            <div class="space-y-3">
              <div class="flex items-center">
                <span class="text-sm text-gray-700">Immediate Feedback:</span>
                <span class="ml-2 text-sm {test.immediate_feedback ? 'text-green-600' : 'text-gray-400'}">
                  {test.immediate_feedback ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div class="flex items-center">
                <span class="text-sm text-gray-700">Fullscreen Required:</span>
                <span class="ml-2 text-sm {test.fullscreen_required ? 'text-green-600' : 'text-gray-400'}">
                  {test.fullscreen_required ? 'Yes' : 'No'}
                </span>
              </div>
              <div class="flex items-center">
                <span class="text-sm text-gray-700">Copy/Paste Disabled:</span>
                <span class="ml-2 text-sm {test.disable_copy_paste ? 'text-green-600' : 'text-gray-400'}">
                  {test.disable_copy_paste ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-200">
          <h3 class="text-lg font-medium mb-4">Schedule</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Start Date</label>
              <div class="mt-1 text-sm text-gray-900">
                {test.start_date ? new Date(test.start_date).toLocaleString() : 'Immediate'}
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">End Date</label>
              <div class="mt-1 text-sm text-gray-900">
                {test.end_date ? new Date(test.end_date).toLocaleString() : 'No end date'}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-200">
          <h3 class="text-lg font-medium mb-4">Test Link</h3>
          <div class="bg-gray-50 rounded p-3">
            <div class="text-sm text-gray-600 mb-2">Share this link with students:</div>
            <div class="font-mono text-sm bg-white border rounded px-3 py-2">
              {window.location.origin}/student/test/{test.id}
            </div>
            <button
              onclick={() => navigator.clipboard.writeText(`${window.location.origin}/student/test/${test.id}`)}
              class="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>