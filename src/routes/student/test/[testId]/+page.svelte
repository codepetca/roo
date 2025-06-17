<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { testAttemptStore } from '$lib/stores/test-attempt.svelte.js'
  import { user } from '$lib/stores/auth.js'
  import CodeEditor from '$lib/components/CodeEditor.svelte'
  import TestTimer from '$lib/components/TestTimer.svelte'
  import Markdown from '$lib/components/Markdown.svelte'

  const testId = $derived($page.params.testId)
  let startingTest = $state(false)
  let confirmSubmit = $state(false)
  let showInstructions = $state(true)

  // Security warnings
  let fullscreenWarning = $state(false)
  let copyPasteWarning = $state(false)

  // Navigation state
  let showQuestionList = $state(false)

  async function startTest(): Promise<void> {
    console.log('startTest called with user:', $user?.id, 'testId:', testId)
    
    if (!$user?.id || !testId) {
      console.error('Missing user or testId')
      alert('Authentication required')
      goto('/auth/login')
      return
    }

    startingTest = true
    try {
      console.log('Calling testAttemptStore.startTest...')
      const result = await testAttemptStore.startTest(testId, $user.id)
      console.log('testAttemptStore.startTest result:', result)
      
      if (result.success) {
        showInstructions = false
        
        // Show security warnings if needed
        if (testAttemptStore.test?.fullscreen_required && !testAttemptStore.fullscreenActive) {
          fullscreenWarning = true
        }
        
        if (testAttemptStore.test?.disable_copy_paste) {
          copyPasteWarning = true
        }
      } else {
        alert(`Cannot start test: ${result.error}`)
      }
    } catch (error) {
      console.error('Error starting test:', error)
      alert('Failed to start test. Please try again.')
    } finally {
      startingTest = false
    }
  }

  async function submitTest(): Promise<void> {
    if (!confirmSubmit) {
      confirmSubmit = true
      return
    }

    const result = await testAttemptStore.submitTest()
    
    if (result.success) {
      alert('Test submitted successfully!')
      goto('/student')
    } else {
      alert(`Failed to submit test: ${result.error}`)
    }
    
    confirmSubmit = false
  }

  function handleTimeExpired(): void {
    alert('Time has expired! Your test will be submitted automatically.')
  }

  function handleCodeChange(code: string): void {
    testAttemptStore.updateCurrentCode(code)
  }

  function dismissFullscreenWarning(): void {
    fullscreenWarning = false
  }

  function dismissCopyPasteWarning(): void {
    copyPasteWarning = false
  }

  function toggleQuestionList(): void {
    showQuestionList = !showQuestionList
  }

  // Security: Prevent page navigation during test
  function handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (testAttemptStore.attempt?.status === 'in_progress') {
      event.preventDefault()
      event.returnValue = 'You have an active test. Are you sure you want to leave?'
    }
  }

  // Security: Warn about fullscreen exit
  function handleFullscreenChange(): void {
    if (testAttemptStore.test?.fullscreen_required && !document.fullscreenElement) {
      if (testAttemptStore.attempt?.status === 'in_progress') {
        fullscreenWarning = true
      }
    }
  }

  onMount(async () => {
    // Load basic test information for the instructions screen
    if (testId) {
      console.log('Loading test info for:', testId)
      try {
        const response = await fetch(`/api/tests/${testId}`)
        const result = await response.json()
        
        if (response.ok) {
          testAttemptStore.test = result.test
          console.log('Test info loaded:', result.test)
        } else {
          console.error('Failed to load test info:', result.error)
          testAttemptStore.error = result.error || 'Failed to load test'
        }
      } catch (error) {
        console.error('Error loading test info:', error)
        testAttemptStore.error = 'Failed to load test'
      }
    }
    
    // Set up security event listeners
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  })

  onDestroy(() => {
    // Clean up event listeners
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    
    // Reset store if test not completed
    if (testAttemptStore.attempt?.status === 'in_progress') {
      testAttemptStore.reset()
    }
  })
</script>

<svelte:head>
  <title>
    {testAttemptStore.test?.title || 'Online Test'} - Student Portal
  </title>
</svelte:head>

{#if showInstructions}
  <!-- Test Instructions Screen -->
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">
          {testAttemptStore.test?.title || 'Loading Test...'}
        </h1>
        {#if testAttemptStore.test?.description}
          <p class="text-gray-600">{testAttemptStore.test.description}</p>
        {/if}
      </div>

      {#if testAttemptStore.loading}
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-600">Loading test...</p>
        </div>
      {:else if testAttemptStore.error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p class="text-red-800">{testAttemptStore.error}</p>
        </div>
      {:else if testAttemptStore.test}
        <!-- Test Information -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 class="text-lg font-semibold text-blue-900 mb-4">Test Information</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-blue-800">Time Limit:</span>
              <span class="ml-2 text-blue-700">{testAttemptStore.test.time_limit_minutes} minutes</span>
            </div>
            <div>
              <span class="font-medium text-blue-800">Questions:</span>
              <span class="ml-2 text-blue-700">{testAttemptStore.questions.length}</span>
            </div>
            <div>
              <span class="font-medium text-blue-800">Auto-save:</span>
              <span class="ml-2 text-blue-700">Every 10 seconds</span>
            </div>
            <div>
              <span class="font-medium text-blue-800">Submission:</span>
              <span class="ml-2 text-blue-700">Manual or automatic at time expiry</span>
            </div>
          </div>
        </div>

        <!-- Security Requirements -->
        {#if testAttemptStore.test.fullscreen_required || testAttemptStore.test.disable_copy_paste}
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-yellow-900 mb-3">Security Requirements</h3>
            <ul class="space-y-2 text-sm text-yellow-800">
              {#if testAttemptStore.test.fullscreen_required}
                <li class="flex items-center">
                  <span class="mr-2">🔒</span>
                  <span>Fullscreen mode will be enabled during the test</span>
                </li>
              {/if}
              {#if testAttemptStore.test.disable_copy_paste}
                <li class="flex items-center">
                  <span class="mr-2">🚫</span>
                  <span>Copy, paste, and context menu will be disabled</span>
                </li>
              {/if}
            </ul>
          </div>
        {/if}

        <!-- Instructions -->
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
          <ul class="space-y-2 text-sm text-gray-700">
            <li>• Read each question carefully before writing your Java code</li>
            <li>• Your work is automatically saved every 10 seconds</li>
            <li>• You can navigate between questions using the question navigator</li>
            <li>• Make sure to submit your test before the time expires</li>
            <li>• If time expires, your test will be submitted automatically</li>
            {#if testAttemptStore.test.immediate_feedback}
              <li>• You will receive immediate feedback after submission</li>
            {/if}
          </ul>
        </div>

        <!-- Start Button -->
        <div class="text-center">
          <button
            onclick={startTest}
            disabled={startingTest}
            class="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
          >
            {startingTest ? 'Starting Test...' : 'Start Test'}
          </button>
        </div>
      {/if}
    </div>
  </div>

{:else}
  <!-- Test Interface -->
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="text-xl font-semibold text-gray-900">
            {testAttemptStore.test?.title}
          </h1>
          <div class="text-sm text-gray-500">
            Question {testAttemptStore.currentQuestionIndex + 1} of {testAttemptStore.questions.length}
          </div>
        </div>

        <div class="flex items-center space-x-4">
          <!-- Progress -->
          <div class="text-sm text-gray-600">
            Progress: {testAttemptStore.progress.answered}/{testAttemptStore.progress.total}
            ({Math.round(testAttemptStore.progress.percentage)}%)
          </div>

          <!-- Timer -->
          <TestTimer
            timeRemaining={testAttemptStore.timer.timeRemaining}
            isRunning={testAttemptStore.timer.isRunning}
            isExpired={testAttemptStore.timer.isExpired}
            onTimeExpired={handleTimeExpired}
          />

          <!-- Font Size Controls -->
          <div class="flex items-center space-x-1">
            <button
              onclick={() => testAttemptStore.decreaseFontSize()}
              class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              title="Decrease font size"
            >
              A-
            </button>
            <span class="text-xs text-gray-500 px-1">{testAttemptStore.fontSize}px</span>
            <button
              onclick={() => testAttemptStore.increaseFontSize()}
              class="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              title="Increase font size"
            >
              A+
            </button>
          </div>

          <!-- Question Navigator -->
          <button
            onclick={toggleQuestionList}
            class="px-3 py-1 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 rounded"
          >
            Questions
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex">
      <!-- Question Panel -->
      <div class="w-1/2 p-6 bg-white border-r border-gray-200 overflow-y-auto">
        {#if testAttemptStore.currentQuestion}
          <div class="mb-4">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-lg font-semibold text-gray-900">
                Question {testAttemptStore.currentQuestionIndex + 1}
              </h2>
              <div class="text-sm text-gray-500">
                Concepts: {testAttemptStore.currentQuestion.concepts?.join(', ') || 'N/A'}
              </div>
            </div>
            
            <div class="prose prose-sm max-w-none">
              <Markdown content={testAttemptStore.currentQuestion.question_text || ''} />
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex items-center justify-between mt-8">
            <button
              onclick={() => testAttemptStore.previousQuestion()}
              disabled={testAttemptStore.isFirstQuestion}
              class="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              ← Previous
            </button>

            <div class="text-sm text-gray-500">
              {testAttemptStore.currentQuestionIndex + 1} / {testAttemptStore.questions.length}
            </div>

            <button
              onclick={() => testAttemptStore.nextQuestion()}
              disabled={testAttemptStore.isLastQuestion}
              class="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Next →
            </button>
          </div>
        {:else}
          <div class="flex items-center justify-center h-64">
            <div class="text-center">
              <p class="text-gray-500 mb-4">No question selected</p>
              <div class="text-xs text-left bg-gray-100 p-3 rounded max-w-md">
                <strong>Debug Info:</strong><br/>
                Questions: {testAttemptStore.questions.length}<br/>
                Current Index: {testAttemptStore.currentQuestionIndex}<br/>
                Current Question: {testAttemptStore.currentQuestion ? 'exists' : 'null'}<br/>
                {#if testAttemptStore.questions.length > 0}
                  Sample: {JSON.stringify({
                    id: testAttemptStore.questions[0].id,
                    question_id: testAttemptStore.questions[0].question_id,
                    text: testAttemptStore.questions[0].question_text?.slice(0, 50) + '...'
                  })}
                {/if}
              </div>
            </div>
          </div>
        {/if}
      </div>

      <!-- Code Editor Panel -->
      <div class="w-1/2 p-6 bg-gray-50 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900">Your Code</h3>
          
          <div class="flex items-center space-x-2">
            {#if testAttemptStore.autoSave.isSaving}
              <span class="text-xs text-blue-600 font-medium">⏳ Saving...</span>
            {:else if testAttemptStore.autoSave.lastSaved}
              <span class="text-xs text-green-600 font-medium">
                ✅ Saved {new Date(testAttemptStore.autoSave.lastSaved).toLocaleTimeString()}
              </span>
            {:else if testAttemptStore.autoSave.isDirty}
              <span class="text-xs text-red-600 font-medium">⚠️ Unsaved changes</span>
            {:else}
              <span class="text-xs text-gray-400">Ready to save</span>
            {/if}
            
            {#if testAttemptStore.autoSave.isDirty && testAttemptStore.currentQuestion}
              <button
                onclick={() => testAttemptStore.saveAnswer(testAttemptStore.currentQuestion.question_id, testAttemptStore.currentCode)}
                disabled={testAttemptStore.autoSave.isSaving}
                class="text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-2 py-1 rounded"
              >
                Save Now
              </button>
            {/if}
          </div>
        </div>

        <div class="flex-1 min-h-0">
          <CodeEditor
            value={testAttemptStore.currentCode}
            fontSize={testAttemptStore.fontSize}
            theme="light"
            readonly={false}
            placeholder="Write your Java code here..."
            onUpdate={handleCodeChange}
          />
        </div>

        <!-- Submit Button -->
        <div class="mt-4 pt-4 border-t border-gray-200">
          <button
            onclick={submitTest}
            disabled={testAttemptStore.submitting}
            class="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {#if confirmSubmit}
              Click again to confirm submission
            {:else if testAttemptStore.submitting}
              Submitting...
            {:else}
              Submit Test
            {/if}
          </button>
          
          {#if confirmSubmit}
            <p class="text-xs text-center text-gray-500 mt-2">
              This action cannot be undone
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Question List Modal -->
    {#if showQuestionList}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-semibold text-gray-900">Question Navigator</h3>
              <button
                onclick={toggleQuestionList}
                class="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div class="space-y-2">
              {#each testAttemptStore.questions as question, index}
                <button
                  onclick={() => {
                    testAttemptStore.goToQuestion(index)
                    toggleQuestionList()
                  }}
                  class="w-full text-left p-3 rounded border {
                    index === testAttemptStore.currentQuestionIndex
                      ? 'bg-blue-50 border-blue-300'
                      : testAttemptStore.answers[question.question_id!]?.answer_code?.trim()
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                  } hover:bg-opacity-75 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-medium">Question {index + 1}</span>
                    <div class="flex items-center space-x-1">
                      {#if index === testAttemptStore.currentQuestionIndex}
                        <span class="text-blue-600 text-xs">Current</span>
                      {/if}
                      {#if testAttemptStore.answers[question.question_id!]?.answer_code?.trim()}
                        <span class="text-green-600 text-xs">✓</span>
                      {/if}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {question.concepts?.join(', ') || 'N/A'}
                  </div>
                </button>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Security Warnings -->
    {#if fullscreenWarning}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg max-w-md w-full mx-4 p-6">
          <div class="text-center">
            <div class="text-4xl mb-4">⚠️</div>
            <h3 class="text-xl font-semibold text-gray-900 mb-2">Fullscreen Required</h3>
            <p class="text-gray-600 mb-6">
              This test requires fullscreen mode. Please return to fullscreen to continue.
            </p>
            <button
              onclick={() => {
                document.documentElement.requestFullscreen()
                dismissFullscreenWarning()
              }}
              class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
            >
              Return to Fullscreen
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if copyPasteWarning}
      <div class="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded z-40">
        <div class="flex items-center justify-between">
          <span class="text-sm">Copy/paste is disabled for this test</span>
          <button
            onclick={dismissCopyPasteWarning}
            class="ml-4 text-yellow-600 hover:text-yellow-800"
          >
            ×
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}