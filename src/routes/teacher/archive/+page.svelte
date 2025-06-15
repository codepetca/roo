<script lang="ts">
  import { onMount } from 'svelte'
  import { addToast } from '$lib/stores/toast.js'
  import Markdown from '$lib/components/Markdown.svelte'
  
  let archivedQuestions = $state([])
  let selectedQuestions = $state([])
  let loading = $state(false)
  let selectAll = $state(false)

  async function loadArchivedQuestions() {
    loading = true
    try {
      const response = await fetch('/api/questions/archived')
      const data = await response.json()
      archivedQuestions = data.questions || []
    } catch (error) {
      console.error('Failed to load archived questions:', error)
      addToast('Failed to load archived questions', 'error')
    } finally {
      loading = false
    }
  }

  function toggleQuestion(questionId) {
    if (selectedQuestions.includes(questionId)) {
      selectedQuestions = selectedQuestions.filter(id => id !== questionId)
    } else {
      selectedQuestions = [...selectedQuestions, questionId]
    }
    
    // Update selectAll state
    selectAll = selectedQuestions.length === archivedQuestions.length && archivedQuestions.length > 0
  }

  function toggleSelectAll() {
    if (selectAll) {
      selectedQuestions = []
    } else {
      selectedQuestions = archivedQuestions.map(q => q.id)
    }
    selectAll = !selectAll
  }

  async function deleteSelectedQuestions() {
    if (selectedQuestions.length === 0) {
      addToast('No questions selected', 'error')
      return
    }

    if (!confirm(`Are you sure you want to permanently delete ${selectedQuestions.length} question(s)? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch('/api/questions/archive/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: selectedQuestions })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete questions')
      }

      // Remove deleted questions from local state
      const deletedCount = selectedQuestions.length
      archivedQuestions = archivedQuestions.filter(q => !selectedQuestions.includes(q.id))
      selectedQuestions = []
      selectAll = false
      
      addToast(`${deletedCount} question(s) deleted permanently`, 'success')
    } catch (error) {
      addToast('Error deleting questions: ' + error.message, 'error')
    }
  }

  async function restoreSelectedQuestions() {
    if (selectedQuestions.length === 0) {
      addToast('No questions selected', 'error')
      return
    }

    try {
      const response = await fetch('/api/questions/archive/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionIds: selectedQuestions })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restore questions')
      }

      // Remove restored questions from archive
      const restoredCount = selectedQuestions.length
      archivedQuestions = archivedQuestions.filter(q => !selectedQuestions.includes(q.id))
      selectedQuestions = []
      selectAll = false
      
      // Signal to dashboard that questions were updated
      localStorage.setItem('questions-updated', 'true')
      
      addToast(`${restoredCount} question(s) restored`, 'success')
    } catch (error) {
      addToast('Error restoring questions: ' + error.message, 'error')
    }
  }

  onMount(() => {
    loadArchivedQuestions()
  })
</script>

<div class="container mx-auto p-8">
  <div class="mb-6">
    <h1 class="text-3xl font-bold mb-2">Question Archive</h1>
    <p class="text-gray-600">Manage archived questions - restore or permanently delete them.</p>
  </div>

  <!-- Action Controls -->
  {#if archivedQuestions.length > 0}
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <label class="flex items-center">
            <input 
              type="checkbox" 
              bind:checked={selectAll}
              onchange={toggleSelectAll}
              class="mr-2"
            />
            <span class="text-sm font-medium">
              Select All ({archivedQuestions.length} questions)
            </span>
          </label>
          
          <span class="text-sm text-gray-500">
            {selectedQuestions.length} selected
          </span>
        </div>

        <div class="flex gap-2">
          <button
            onclick={restoreSelectedQuestions}
            disabled={selectedQuestions.length === 0}
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Restore Selected
          </button>
          
          <button
            onclick={deleteSelectedQuestions}
            disabled={selectedQuestions.length === 0}
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Archived Questions List -->
  <div class="bg-white rounded-lg shadow">
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Archived Questions ({archivedQuestions.length})</h2>
      
      {#if loading}
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p class="text-gray-600">Loading archived questions...</p>
        </div>
      {:else if archivedQuestions.length === 0}
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No archived questions found.</p>
          <a href="/teacher" class="text-blue-600 hover:underline">
            ← Back to Teacher Dashboard
          </a>
        </div>
      {:else}
        <div class="space-y-4">
          {#each archivedQuestions as question}
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 relative">
              <div class="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={selectedQuestions.includes(question.id)}
                  onchange={() => toggleQuestion(question.id)}
                  class="mt-1"
                />
                
                <div class="flex-1">
                  <div class="font-medium text-gray-900 mb-2">
                    <Markdown content={question.question_text} />
                  </div>
                  <div class="flex items-center justify-between text-sm text-gray-600">
                    <span>Concepts: {question.java_concepts?.join(', ') || 'N/A'}</span>
                    <span>Archived: {new Date(question.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Back Navigation -->
  <div class="mt-6">
    <a 
      href="/teacher" 
      class="inline-flex items-center text-blue-600 hover:underline"
    >
      ← Back to Teacher Dashboard
    </a>
  </div>
</div>