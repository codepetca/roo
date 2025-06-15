<script lang="ts">
  import { onMount } from 'svelte'
  import { user, profile } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'
  
  // Use Svelte 5 runes for state management
  let submissions = $state([])
  let loading = $state(true)
  let selectedSubmission = $state(null)

  // Redirect if not a student
  $effect(() => {
    if ($profile && $profile.role !== 'student') {
      goto('/teacher')
    }
  })

  async function loadSubmissions() {
    if (!$user?.id) return
    
    loading = true
    try {
      const response = await fetch(`/api/submissions?studentId=${$user.id}`)
      const data = await response.json()
      submissions = data.submissions || []
    } catch (error) {
      console.error('Failed to load submissions:', error)
      submissions = []
    } finally {
      loading = false
    }
  }

  function viewSubmissionDetails(submission) {
    selectedSubmission = submission
  }

  function closeDetails() {
    selectedSubmission = null
  }

  function getScoreColor(score) {
    if (score >= 3.5) return 'text-green-600'
    if (score >= 2.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  function getScoreLabel(score) {
    if (score >= 3.5) return 'Excellent'
    if (score >= 2.5) return 'Good'
    if (score >= 1.5) return 'Fair'
    return 'Needs Improvement'
  }

  onMount(() => {
    loadSubmissions()
  })
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">My Submissions</h1>
    <p class="text-gray-600 mt-2">View your Java code submissions and feedback</p>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading your submissions...</p>
    </div>
  {:else if submissions.length === 0}
    <div class="card text-center py-12">
      <div class="mb-4">
        <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No submissions yet</h3>
      <p class="text-gray-600">
        Your teacher hasn't graded any of your work yet. Check back later!
      </p>
    </div>
  {:else}
    <div class="space-y-6">
      {#each submissions as submission}
        <button class="card hover:shadow-lg transition-shadow cursor-pointer w-full text-left" onclick={() => viewSubmissionDetails(submission)}>
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                Java Assignment
              </h3>
              <p class="text-sm text-gray-600">
                Submitted: {new Date(submission.created_at).toLocaleDateString()}
              </p>
            </div>
            
            {#if submission.overall_score}
              <div class="text-right">
                <div class="text-2xl font-bold {getScoreColor(submission.overall_score)}">
                  {submission.overall_score}/4.0
                </div>
                <div class="text-sm {getScoreColor(submission.overall_score)}">
                  {getScoreLabel(submission.overall_score)}
                </div>
              </div>
            {:else}
              <div class="text-right">
                <div class="text-lg font-medium text-gray-500">Pending</div>
                <div class="text-sm text-gray-500">Not graded yet</div>
              </div>
            {/if}
          </div>

          <div class="border-t pt-4">
            <p class="text-gray-700 mb-2">
              <span class="font-medium">Question:</span>
              {submission.java_questions?.question_text?.slice(0, 150)}
              {submission.java_questions?.question_text?.length > 150 ? '...' : ''}
            </p>
            
            {#if submission.java_questions?.java_concepts}
              <div class="flex flex-wrap gap-2">
                {#each submission.java_questions.java_concepts as concept}
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {concept}
                  </span>
                {/each}
              </div>
            {/if}
          </div>

          <div class="mt-4 text-right">
            <span class="text-blue-600 text-sm hover:text-blue-800">
              Click to view details →
            </span>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Submission Details Modal -->
{#if selectedSubmission}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" onclick={closeDetails}>
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick={(e) => e.stopPropagation()}>
      <div class="p-6">
        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Submission Details</h2>
            <p class="text-gray-600">
              Submitted: {new Date(selectedSubmission.created_at).toLocaleDateString()}
            </p>
          </div>
          <button onclick={closeDetails} class="text-gray-400 hover:text-gray-600" aria-label="Close modal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- Question -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Question</h3>
          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-gray-800">{selectedSubmission.java_questions?.question_text}</p>
            {#if selectedSubmission.java_questions?.java_concepts}
              <div class="flex flex-wrap gap-2 mt-3">
                {#each selectedSubmission.java_questions.java_concepts as concept}
                  <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {concept}
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        {#if selectedSubmission.overall_score}
          <!-- Overall Score -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">Overall Score</h3>
            <div class="bg-white border-2 border-gray-200 rounded-lg p-4 text-center">
              <div class="text-4xl font-bold {getScoreColor(selectedSubmission.overall_score)} mb-2">
                {selectedSubmission.overall_score}/4.0
              </div>
              <div class="text-lg {getScoreColor(selectedSubmission.overall_score)}">
                {getScoreLabel(selectedSubmission.overall_score)}
              </div>
            </div>
          </div>

          <!-- Detailed Scores -->
          {#if selectedSubmission.scores}
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Detailed Scores</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                {#each Object.entries(selectedSubmission.scores) as [category, score]}
                  <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-center mb-2">
                      <div class="text-2xl font-bold text-gray-900">{score}/4</div>
                      <div class="text-sm text-gray-600 capitalize">{category}</div>
                    </div>
                    {#if selectedSubmission.feedback && selectedSubmission.feedback[category]}
                      <p class="text-xs text-gray-600 text-center">
                        {selectedSubmission.feedback[category]}
                      </p>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Extracted Code -->
          {#if selectedSubmission.extracted_code}
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Your Code (As Read by AI)</h3>
              <pre class="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                <code>{selectedSubmission.extracted_code}</code>
              </pre>
            </div>
          {/if}

          <!-- Detailed Feedback -->
          {#if selectedSubmission.feedback}
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-4">Detailed Feedback</h3>
              <div class="space-y-4">
                {#each Object.entries(selectedSubmission.feedback) as [category, feedback]}
                  <div class="border-l-4 border-blue-500 pl-4">
                    <h4 class="font-medium text-gray-900 capitalize mb-1">{category}</h4>
                    <p class="text-gray-700">{feedback}</p>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {:else}
          <div class="text-center py-8">
            <div class="text-yellow-600 mb-2">
              <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-gray-900 mb-1">Grading in Progress</h3>
            <p class="text-gray-600">Your teacher is reviewing this submission.</p>
          </div>
        {/if}

        <div class="mt-6 flex justify-end">
          <button onclick={closeDetails} class="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}