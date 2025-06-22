<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import type { TestAttempt, TestAnswer, CodingTest } from '$lib/types/index.js'
  
  const testId = $derived($page.params.testId)
  
  let test = $state<CodingTest | null>(null)
  let submissions = $state<(TestAttempt & { 
    student_name?: string,
    answers_count?: number,
    total_questions?: number 
  })[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)
  let gradingAll = $state(false)
  let selectedSubmission = $state<string | null>(null)
  let submissionDetails = $state<{
    attempt: TestAttempt,
    answers: (TestAnswer & { 
      question_text?: string, 
      concepts?: string[], 
      rubric?: any 
    })[]
  } | null>(null)
  let gradingResults = $state<any>(null)

  async function loadSubmissions(): Promise<void> {
    if (!testId) return

    loading = true
    error = null

    try {
        
      // Load test details
      const testResponse = await fetch(`/api/tests/${testId}`)
      const testResult = await testResponse.json()
      
      
      if (testResponse.ok) {
        test = testResult.test
      }

      // Load submissions
      if (!authStore.user?.id) {
        throw new Error('User not authenticated')
      }
      const response = await fetch(`/api/tests/${testId}/submissions?teacherId=${authStore.user.id}`)
      const result = await response.json()


      if (response.ok) {
        submissions = result.submissions || []
      } else {
        error = result.error || 'Failed to load submissions'
        // Submissions error
      }
    } catch (err) {
      // Error loading submissions
      error = 'Failed to load submissions'
    } finally {
      loading = false
    }
  }

  async function loadSubmissionDetails(attemptId: string): Promise<void> {
    try {
      const response = await fetch(`/api/tests/${testId}/submissions/${attemptId}`)
      const result = await response.json()

      if (response.ok && result.success) {
        submissionDetails = result.data
        selectedSubmission = attemptId
      } else {
        alert(`Failed to load submission details: ${result.error?.message || result.error}`)
      }
    } catch (error) {
      // Error loading submission details
      alert('Failed to load submission details')
    }
  }

  async function gradeAllSubmissions(): Promise<void> {
    if (!test || submissions.length === 0) return

    // Get all submitted attempt IDs
    const attemptIds = submissions
      .filter(sub => sub.status === 'submitted')
      .map(sub => sub.id)

    if (attemptIds.length === 0) {
      alert('No submitted tests to grade')
      return
    }

    gradingAll = true
    try {
      const response = await fetch(`/api/tests/${testId}/grade-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attemptIds })
      })

      const result = await response.json()

      if (response.ok) {
        gradingResults = result
        alert(`Grading complete! Processed ${result.gradedCount} submissions.`)
        // Reload submissions to see updated scores
        loadSubmissions()
      } else {
        alert(`Grading failed: ${result.error}`)
      }
    } catch (error) {
      // Error grading submissions
      alert('Failed to grade submissions')
    } finally {
      gradingAll = false
    }
  }

  async function gradeSubmission(attemptId: string): Promise<void> {
    try {
      const response = await fetch(`/api/tests/${testId}/grade-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ attemptId })
      })

      const result = await response.json()

      if (response.ok) {
        alert('Submission graded successfully!')
        // Reload the submission details to show updated scores
        loadSubmissionDetails(attemptId)
        // Reload submissions list to update overall scores
        loadSubmissions()
      } else {
        alert(`Grading failed: ${result.error}`)
      }
    } catch (error) {
      // Error grading submission
      alert('Failed to grade submission')
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'graded': return 'text-green-600 bg-green-50'
      case 'submitted': return 'text-blue-600 bg-blue-50'
      case 'in_progress': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  function getScoreColor(score: number | null): string {
    if (score === null) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  function formatDuration(startTime: string | null, endTime: string | null): string {
    if (!startTime || !endTime) return 'N/A'
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
    return `${Math.round(duration / (1000 * 60))} min`
  }

  onMount(() => {
    if (authStore.user) {
      loadSubmissions()
    } else {
      goto('/auth/login')
    }
  })
</script>

<svelte:head>
  <title>Test Submissions - {test?.title || 'Loading...'}</title>
</svelte:head>

<div class="max-w-7xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Test Submissions</h1>
        {#if test}
          <p class="text-gray-600 mt-1">{test.title}</p>
          <div class="text-sm text-gray-500 mt-2">
            {submissions.length} submissions • 
            {submissions.filter(s => s.status === 'graded').length} graded •
            {submissions.filter(s => s.status === 'submitted').length} pending
          </div>
        {/if}
      </div>
      <div class="flex items-center space-x-4">
        <button
          onclick={gradeAllSubmissions}
          disabled={gradingAll || submissions.filter(s => s.status === 'submitted').length === 0}
          class="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded font-medium"
        >
          {gradingAll ? 'Grading...' : 'Grade All Pending'}
        </button>
        <button
          onclick={() => goto(`/teacher/tests/${testId}`)}
          class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Back to Test
        </button>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading submissions...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-800">{error}</p>
      <button
        onclick={loadSubmissions}
        class="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Retry
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Submissions List -->
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-gray-900">All Submissions</h2>
        
        {#if submissions.length === 0}
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p class="text-gray-500">No submissions yet</p>
          </div>
        {:else}
          {#each submissions as submission}
            <div 
              class="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              class:ring-2={selectedSubmission === submission.id}
              class:ring-blue-500={selectedSubmission === submission.id}
              onclick={() => loadSubmissionDetails(submission.id)}
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-3">
                    <h3 class="font-medium text-gray-900">
                      {submission.student_name || 'Student'}
                    </h3>
                    <span class="px-2 py-1 text-xs rounded-full {getStatusColor(submission.status || 'unknown')}">
                      {submission.status || 'unknown'}
                    </span>
                  </div>
                  
                  <div class="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span class="font-medium">Submitted:</span>
                      {formatDate(submission.submitted_at)}
                    </div>
                    <div>
                      <span class="font-medium">Duration:</span>
                      {formatDuration(submission.started_at, submission.submitted_at)}
                    </div>
                    <div>
                      <span class="font-medium">Answers:</span>
                      {submission.answers_count || 0}/{submission.total_questions || 0}
                    </div>
                    <div>
                      <span class="font-medium">Score:</span>
                      <span class="{getScoreColor(submission.total_score)}">
                        {submission.total_score !== null ? `${submission.total_score}%` : 'Not graded'}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center space-x-2">
                  {#if submission.status === 'submitted'}
                    <button
                      onclick={(e) => {
                        e.stopPropagation()
                        gradeSubmission(submission.id)
                      }}
                      class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Grade
                    </button>
                  {/if}
                  <button
                    onclick={(e) => {
                      e.stopPropagation()
                      loadSubmissionDetails(submission.id)
                    }}
                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Submission Details -->
      <div>
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Submission Details</h2>
        
        {#if !submissionDetails}
          <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p class="text-gray-500">Select a submission to view details</p>
          </div>
        {:else}
          <div class="bg-white border rounded-lg overflow-hidden">
            <!-- Submission Header -->
            <div class="p-6 bg-gray-50 border-b">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">
                    Submission Details
                  </h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Status: <span class="font-medium">{submissionDetails.attempt.status}</span>
                  </p>
                </div>
                {#if submissionDetails.attempt.total_score !== null}
                  <div class="text-right">
                    <div class="text-2xl font-bold {getScoreColor(submissionDetails.attempt.total_score)}">
                      {submissionDetails.attempt.total_score}%
                    </div>
                    <div class="text-sm text-gray-600">Final Score</div>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Questions and Answers -->
            <div class="max-h-96 overflow-y-auto">
              {#each submissionDetails.answers as answer, index}
                <div class="p-6 border-b border-gray-100">
                  <!-- Question Header -->
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-medium text-gray-900">
                      Question {index + 1}
                    </h4>
                    <div class="flex items-center space-x-2">
                      {#if answer.concepts && answer.concepts.length > 0}
                        <div class="flex flex-wrap gap-1">
                          {#each answer.concepts as concept}
                            <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {concept}
                            </span>
                          {/each}
                        </div>
                      {/if}
                      {#if answer.question_score !== null}
                        <div class="text-sm font-semibold {getScoreColor(answer.question_score)}">
                          {answer.question_score}%
                        </div>
                      {/if}
                    </div>
                  </div>

                  <!-- Question Text -->
                  {#if answer.question_text}
                    <div class="mb-3 p-3 bg-gray-50 rounded text-sm">
                      <strong>Question:</strong> {answer.question_text}
                    </div>
                  {/if}

                  <!-- Student's Code -->
                  <div class="mb-3">
                    <strong class="text-sm text-gray-700">Student's Answer:</strong>
                    {#if answer.answer_code && answer.answer_code.trim()}
                      <pre class="mt-1 bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
                        <code>{answer.answer_code}</code>
                      </pre>
                    {:else}
                      <div class="mt-1 text-gray-500 italic p-3 bg-gray-50 rounded text-sm">
                        No answer provided
                      </div>
                    {/if}
                  </div>

                  <!-- Feedback -->
                  {#if answer.feedback}
                    <div class="mt-3 p-3 bg-blue-50 rounded">
                      <strong class="text-sm text-blue-900">Feedback:</strong>
                      <div class="mt-1 text-sm text-blue-800">
                        {#if typeof answer.feedback === 'string'}
                          {answer.feedback}
                        {:else}
                          <div class="space-y-1">
                            {#each Object.entries(answer.feedback) as [category, feedback]}
                              <div>
                                <span class="font-medium capitalize">{category}:</span>
                                <span class="ml-1">{feedback}</span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  {/if}

                  <!-- Score Breakdown -->
                  {#if answer.scores && typeof answer.scores === 'object'}
                    <div class="mt-3 p-3 bg-gray-50 rounded">
                      <strong class="text-sm text-gray-900">Score Breakdown:</strong>
                      <div class="mt-2 grid grid-cols-3 gap-2 text-sm">
                        {#each Object.entries(answer.scores) as [category, score]}
                          <div class="text-center">
                            <div class="font-semibold text-gray-700">{score}/4</div>
                            <div class="text-xs text-gray-600 capitalize">{category}</div>
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>