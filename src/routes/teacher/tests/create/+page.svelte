<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { questionsStore } from '$lib/stores/questions.svelte.js'
  import { testsStore } from '$lib/stores/tests.svelte.js'
  import { user } from '$lib/stores/auth.svelte.js'
  import Markdown from '$lib/components/Markdown.svelte'
  import type { Question, TestSettings } from '$lib/types/index.js'

  let formData = $state({
    title: '',
    description: '',
    timeLimitMinutes: 60,
    startDate: '',
    endDate: '',
    selectedQuestionIds: [] as string[]
  })

  let settings = $state<TestSettings>({
    timeLimitMinutes: 60,
    immediateeFeedback: false,
    fullscreenRequired: false,
    disableCopyPaste: false
  })

  let searchTerm = $state('')
  let selectedConcepts = $state<string[]>([])
  let showPreview = $state(false)
  let previewQuestions = $state<Question[]>([])
  let creating = $state(false)

  // Time limit options
  const timeLimitOptions = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 150, label: '2.5 hours' },
    { value: 180, label: '3 hours' }
  ]

  // Filter questions based on search and concepts - USING STATE INSTEAD
  let filteredQuestions = $state<Question[]>([])
  
  // Update filtered questions when dependencies change
  $effect(() => {
    console.log('EFFECT CALLED: questionsStore.activeQuestions.length =', questionsStore.activeQuestions.length)
    console.log('Search term:', searchTerm)
    console.log('Selected concepts:', selectedConcepts)
    
    if (questionsStore.activeQuestions.length === 0) {
      filteredQuestions = []
      return
    }

    const filtered = questionsStore.activeQuestions.filter(question => {
      // Check if question matches search term
      const matchesSearch = !searchTerm || 
        question.question_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (question.concepts && Array.isArray(question.concepts) && 
         question.concepts.some(concept => 
           concept.toLowerCase().includes(searchTerm.toLowerCase())
         ))

      // Check if question matches selected concepts (if any concepts are selected)
      const matchesConcepts = selectedConcepts.length === 0 ||
        (question.concepts && Array.isArray(question.concepts) &&
         selectedConcepts.some(concept => question.concepts.includes(concept)))

      console.log(`Question ${question.id}: search=${matchesSearch}, concepts=${matchesConcepts}, concepts=`, question.concepts)
      
      return matchesSearch && matchesConcepts
    })
    
    console.log('Filtered result:', filtered.length, 'questions')
    filteredQuestions = filtered
  })

  // Available Java concepts
  const javaConcepts = [
    'variables', 'data-types', 'conditionals', 'loops', 
    'methods', 'arrays', 'strings', 'input-output'
  ]

  function toggleQuestionSelection(questionId: string): void {
    const index = formData.selectedQuestionIds.indexOf(questionId)
    if (index === -1) {
      formData.selectedQuestionIds = [...formData.selectedQuestionIds, questionId]
    } else {
      formData.selectedQuestionIds = formData.selectedQuestionIds.filter(id => id !== questionId)
    }
  }

  function selectAllFilteredQuestions(): void {
    const allIds = filteredQuestions.map(q => q.id)
    formData.selectedQuestionIds = Array.from(new Set([...formData.selectedQuestionIds, ...allIds]))
  }

  function clearAllSelections(): void {
    formData.selectedQuestionIds = []
  }

  function openPreview(): void {
    previewQuestions = questionsStore.activeQuestions.filter(q => 
      formData.selectedQuestionIds.includes(q.id)
    )
    showPreview = true
  }

  function closePreview(): void {
    showPreview = false
    previewQuestions = []
  }

  async function createTest(): Promise<void> {
    if (!formData.title.trim()) {
      alert('Please enter a test title')
      return
    }

    if (formData.selectedQuestionIds.length === 0) {
      alert('Please select at least one question')
      return
    }

    if (!formData.endDate) {
      alert('Please set an end date for the test')
      return
    }

    creating = true

    try {
      if (!$user?.id) {
        alert('You must be logged in to create a test')
        return
      }

      const result = await testsStore.createTest({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        questionIds: formData.selectedQuestionIds,
        timeLimitMinutes: formData.timeLimitMinutes,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate,
        createdBy: $user.id,
        settings: {
          immediateeFeedback: settings.immediateeFeedback,
          fullscreenRequired: settings.fullscreenRequired,
          disableCopyPaste: settings.disableCopyPaste
        }
      })

      if (result.success && result.test) {
        alert('Test created successfully!')
        goto(`/teacher/tests/${result.test.id}`)
      } else {
        alert(`Failed to create test: ${result.error}`)
      }
    } catch (error) {
      console.error('Error creating test:', error)
      alert('Failed to create test. Please try again.')
    } finally {
      creating = false
    }
  }

  onMount(async () => {
    console.log('Loading questions...')
    await questionsStore.loadQuestions()
    console.log('Questions loaded:', questionsStore.questions.length)
    console.log('Active questions:', questionsStore.activeQuestions.length)
    console.log('Error:', questionsStore.error)
    
    // Set default end date to 1 week from now
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    // Format for datetime-local input (YYYY-MM-DDTHH:MM)
    formData.endDate = nextWeek.toISOString().slice(0, 16)
  })
</script>

<div class="max-w-6xl mx-auto p-6">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Create Online Coding Test</h1>
    <p class="text-gray-600 mt-2">Select questions, configure settings, and create a timed test for students</p>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <!-- Test Configuration -->
    <div class="lg:col-span-1 space-y-6">
      <!-- Basic Info -->
      <div class="card">
        <h2 class="text-xl font-semibold mb-4">Test Information</h2>
        
        <div class="space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
              Test Title *
            </label>
            <input
              id="title"
              type="text"
              bind:value={formData.title}
              placeholder="e.g., Java Fundamentals Quiz"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              bind:value={formData.description}
              placeholder="Optional description for students"
              rows="3"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div>
            <label for="timeLimit" class="block text-sm font-medium text-gray-700 mb-2">
              Time Limit *
            </label>
            <select
              id="timeLimit"
              bind:value={formData.timeLimitMinutes}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {#each timeLimitOptions as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <!-- Scheduling -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Schedule</h3>
        
        <div class="space-y-4">
          <div>
            <label for="startDate" class="block text-sm font-medium text-gray-700 mb-2">
              Start Date (optional)
            </label>
            <input
              id="startDate"
              type="datetime-local"
              bind:value={formData.startDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p class="text-xs text-gray-500 mt-1">Leave empty for immediate access</p>
          </div>

          <div>
            <label for="endDate" class="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              id="endDate"
              type="datetime-local"
              bind:value={formData.endDate}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <!-- Test Settings -->
      <div class="card">
        <h3 class="text-lg font-semibold mb-4">Test Settings</h3>
        
        <div class="space-y-3">
          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={settings.immediateeFeedback}
              class="rounded"
            />
            <span class="ml-2 text-sm">Immediate feedback after submission</span>
          </label>

          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={settings.fullscreenRequired}
              class="rounded"
            />
            <span class="ml-2 text-sm">Require fullscreen mode</span>
          </label>

          <label class="flex items-center">
            <input
              type="checkbox"
              bind:checked={settings.disableCopyPaste}
              class="rounded"
            />
            <span class="ml-2 text-sm">Disable copy/paste</span>
          </label>
        </div>
      </div>

      <!-- Actions -->
      <div class="card">
        <div class="flex flex-col gap-3">
          <button
            onclick={createTest}
            disabled={creating || formData.selectedQuestionIds.length === 0}
            class="btn btn-primary w-full disabled:opacity-50"
          >
            {creating ? 'Creating Test...' : 'Create Test'}
          </button>

          <button
            onclick={openPreview}
            disabled={formData.selectedQuestionIds.length === 0}
            class="btn btn-secondary w-full"
          >
            Preview Selected Questions ({formData.selectedQuestionIds.length})
          </button>
        </div>
      </div>
    </div>

    <!-- Question Selection -->
    <div class="lg:col-span-2">
      <div class="card">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-semibold">Select Questions</h2>
          <div class="text-sm text-gray-600">
            {formData.selectedQuestionIds.length} selected
          </div>
        </div>

        <!-- Debug Info (remove this later) -->
        <div class="mb-4 p-4 bg-red-100 border-2 border-red-500 rounded text-sm font-bold">
          🐛 DEBUG: 
          Loading: {questionsStore.loading} | 
          Total: {questionsStore.questions.length} | 
          Active: {questionsStore.activeQuestions.length} | 
          Filtered: {filteredQuestions.length} | 
          Error: {questionsStore.error || 'None'}
        </div>

        <!-- Search and Filters -->
        <div class="mb-6 space-y-4">
          <div>
            <input
              type="text"
              bind:value={searchTerm}
              placeholder="Search questions..."
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Filter by concepts:</label>
            <div class="flex flex-wrap gap-2">
              {#each javaConcepts as concept}
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    bind:group={selectedConcepts}
                    value={concept}
                    class="rounded"
                  />
                  <span class="ml-1 text-sm">{concept}</span>
                </label>
              {/each}
            </div>
          </div>

          <div class="flex gap-2">
            <button
              onclick={selectAllFilteredQuestions}
              class="btn btn-secondary text-sm"
            >
              Select All Filtered
            </button>
            <button
              onclick={clearAllSelections}
              class="btn btn-secondary text-sm"
            >
              Clear All
            </button>
          </div>
        </div>

        <!-- Questions List -->
        {#if questionsStore.loading}
          <div class="text-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p class="text-gray-600">Loading questions...</p>
          </div>
        {:else if questionsStore.error}
          <div class="text-center py-8">
            <p class="text-red-600 mb-2">Error loading questions:</p>
            <p class="text-red-500 text-sm">{questionsStore.error}</p>
            <button 
              onclick={() => questionsStore.loadQuestions()} 
              class="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        {:else if questionsStore.questions.length === 0}
          <div class="text-center py-8">
            <p class="text-gray-500 mb-2">No questions available</p>
            <p class="text-gray-400 text-sm">Create some questions first in the Question Generator</p>
            <a href="/teacher/generate" class="inline-block mt-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Generate Questions
            </a>
          </div>
        {:else if filteredQuestions.length === 0}
          <div class="text-center py-8">
            <p class="text-gray-500 mb-2">No questions match your filters</p>
            <p class="text-gray-400 text-sm">
              Total questions: {questionsStore.activeQuestions.length} | 
              Search: "{searchTerm}" | 
              Concepts: {selectedConcepts.join(', ') || 'None'}
            </p>
            <button 
              onclick={() => { searchTerm = ''; selectedConcepts = [] }}
              class="mt-3 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Filters
            </button>
          </div>
        {:else}
          <div class="space-y-3 max-h-96 overflow-y-auto">
            {#each filteredQuestions as question}
              <div 
                class="border rounded-lg p-4 cursor-pointer transition-colors {
                  formData.selectedQuestionIds.includes(question.id) 
                    ? 'bg-blue-50 border-blue-300' 
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }"
                onclick={() => toggleQuestionSelection(question.id)}
              >
                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.selectedQuestionIds.includes(question.id)}
                    class="mt-1 rounded"
                    readonly
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 mb-2">
                      <Markdown content={question.question_text} />
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-500">
                      <span>Concepts: {question.concepts.join(', ')}</span>
                      <span>Created: {new Date(question.created_at || '').toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Preview Modal -->
  {#if showPreview}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-gray-900">Test Preview</h3>
            <button 
              onclick={closePreview}
              class="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          
          <div class="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 class="font-medium text-gray-700 mb-2">Test Information</h4>
            <div class="text-sm text-gray-600 space-y-1">
              <p><strong>Title:</strong> {formData.title || 'Untitled Test'}</p>
              <p><strong>Time Limit:</strong> {formData.timeLimitMinutes} minutes</p>
              <p><strong>Questions:</strong> {previewQuestions.length}</p>
              {#if formData.description}
                <p><strong>Description:</strong> {formData.description}</p>
              {/if}
            </div>
          </div>

          <div class="space-y-6">
            {#each previewQuestions as question, index}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-3">
                  <span class="bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded">
                    Question {index + 1}
                  </span>
                  <span class="text-xs text-gray-500">
                    {question.java_concepts.join(', ')}
                  </span>
                </div>
                <div class="text-sm">
                  <Markdown content={question.question_text} />
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .btn {
    @apply px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-primary {
    @apply bg-blue-500 text-white hover:bg-blue-600;
  }
  
  .btn-secondary {
    @apply bg-gray-500 text-white hover:bg-gray-600;
  }

  .card {
    @apply bg-white rounded-lg shadow p-6;
  }
</style>