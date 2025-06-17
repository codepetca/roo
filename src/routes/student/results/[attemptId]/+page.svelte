<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { user } from '$lib/stores/auth.svelte.js'
  import Markdown from '$lib/components/Markdown.svelte'
  import type { TestAttempt, TestAnswer, CodingTest } from '$lib/types/index.js'

  const attemptId = $derived($page.params.attemptId)
  
  let attempt = $state<TestAttempt | null>(null)
  let test = $state<CodingTest | null>(null)
  let answers = $state<(TestAnswer & { question_text?: string; java_concepts?: string[] })[]>([])
  let loading = $state(true)
  let error = $state<string | null>(null)

  async function loadResults(): Promise<void> {
    if (!attemptId || !$user?.id) return

    loading = true
    error = null

    try {
      const response = await fetch(`/api/student/results/${attemptId}?studentId=${$user.id}`)
      const result = await response.json()

      if (response.ok) {
        attempt = result.attempt
        test = result.test
        answers = result.answers || []
      } else {
        error = result.error || 'Failed to load results'
      }
    } catch (err) {
      console.error('Error loading results:', err)
      error = 'Failed to load results'
    } finally {
      loading = false
    }
  }

  function getScoreColor(score: number | null): string {
    if (score === null) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getGradeLetter(score: number | null): string {
    if (score === null) return 'N/A'
    if (score >= 90) return 'A'
    if (score >= 80) return 'B'
    if (score >= 70) return 'C'
    if (score >= 60) return 'D'
    return 'F'
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  onMount(() => {
    if ($user) {
      loadResults()
    } else {
      goto('/auth/login')
    }
  })
</script>

<svelte:head>
  <title>Test Results - Student Portal</title>
</svelte:head>

<div class="max-w-4xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Test Results</h1>
        {#if test}
          <p class="text-gray-600 mt-1">{test.title}</p>
        {/if}
      </div>
      <button
        onclick={() => goto('/student')}
        class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
      >
        Back to Dashboard
      </button>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading your results...</p>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-800">{error}</p>
      <button
        onclick={loadResults}
        class="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Retry
      </button>
    </div>
  {:else if attempt}
    <!-- Overall Results -->
    <div class="bg-white rounded-lg border shadow-sm mb-8">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Overall Results</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Final Score -->
          <div class="text-center">
            <div class="text-4xl font-bold {getScoreColor(attempt.final_score)} mb-2">
              {attempt.final_score !== null ? `${attempt.final_score}%` : 'Pending'}
            </div>
            <div class="text-lg font-medium {getScoreColor(attempt.final_score)}">
              Grade: {getGradeLetter(attempt.final_score)}
            </div>
          </div>

          <!-- Test Details -->
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600">Status:</span>
              <span class="font-medium">
                {attempt.status === 'graded' ? 'Graded' : 'Submitted'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Started:</span>
              <span>{formatDate(attempt.started_at)}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Submitted:</span>
              <span>{formatDate(attempt.submitted_at)}</span>
            </div>
            {#if attempt.graded_at}
              <div class="flex justify-between">
                <span class="text-gray-600">Graded:</span>
                <span>{formatDate(attempt.graded_at)}</span>
              </div>
            {/if}
          </div>

          <!-- Duration -->
          <div class="text-center">
            <div class="text-2xl font-semibold text-gray-700 mb-1">
              {#if attempt.started_at && attempt.submitted_at}
                {Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / (1000 * 60))} min
              {:else}
                N/A
              {/if}
            </div>
            <div class="text-sm text-gray-600">Duration</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Question Results -->
    <div class="space-y-6">
      <h2 class="text-xl font-semibold text-gray-900">Question Results</h2>
      
      {#if answers.length === 0}
        <div class="bg-white rounded-lg border p-8 text-center">
          <p class="text-gray-500">No answers found for this test</p>
        </div>
      {:else}
        {#each answers as answer, index}
          <div class="bg-white rounded-lg border shadow-sm">
            <div class="p-6">
              <!-- Question Header -->
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900">
                  Question {index + 1}
                </h3>
                <div class="flex items-center space-x-4">
                  {#if answer.java_concepts && answer.java_concepts.length > 0}
                    <div class="flex flex-wrap gap-1">
                      {#each answer.java_concepts as concept}
                        <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {concept}
                        </span>
                      {/each}
                    </div>
                  {/if}
                  {#if answer.question_score !== null}
                    <div class="text-lg font-semibold {getScoreColor(answer.question_score)}">
                      {answer.question_score}%
                    </div>
                  {:else}
                    <div class="text-sm text-gray-500">Not graded</div>
                  {/if}
                </div>
              </div>

              <!-- Question Text -->
              {#if answer.question_text}
                <div class="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 class="font-medium text-gray-900 mb-2">Question:</h4>
                  <div class="prose prose-sm max-w-none">
                    <Markdown content={answer.question_text} />
                  </div>
                </div>
              {/if}

              <!-- Your Answer -->
              <div class="mb-4">
                <h4 class="font-medium text-gray-900 mb-2">Your Answer:</h4>
                {#if answer.answer_code && answer.answer_code.trim()}
                  <pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                    <code>{answer.answer_code}</code>
                  </pre>
                {:else}
                  <div class="text-gray-500 italic p-4 bg-gray-50 rounded-lg">
                    No answer submitted
                  </div>
                {/if}
              </div>

              <!-- Feedback -->
              {#if answer.feedback}
                <div class="mt-4 p-4 bg-blue-50 rounded-lg">
                  <h4 class="font-medium text-blue-900 mb-2">Feedback:</h4>
                  <div class="text-blue-800 text-sm">
                    {#if typeof answer.feedback === 'string'}
                      {answer.feedback}
                    {:else}
                      <div class="space-y-2">
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

              <!-- Scores Breakdown -->
              {#if answer.scores && typeof answer.scores === 'object'}
                <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 class="font-medium text-gray-900 mb-2">Score Breakdown:</h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {#each Object.entries(answer.scores) as [category, score]}
                      <div class="text-center">
                        <div class="text-lg font-semibold text-gray-700">{score}/4</div>
                        <div class="text-sm text-gray-600 capitalize">{category}</div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Additional Information -->
    {#if attempt.status === 'submitted'}
      <div class="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p class="text-yellow-800 text-sm">
          <strong>Note:</strong> Your test has been submitted successfully. 
          Your teacher will review and grade your answers soon. Check back later for detailed feedback and scores.
        </p>
      </div>
    {/if}
  {:else}
    <div class="text-center py-12">
      <p class="text-gray-500">No results found</p>
      <button
        onclick={() => goto('/student')}
        class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Back to Dashboard
      </button>
    </div>
  {/if}
</div>