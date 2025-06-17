<script lang="ts">
  import { onMount } from 'svelte'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { archivedQuestionsStore } from '$lib/stores/archived-questions.svelte'
  import { questionsStore } from '$lib/stores/questions.svelte'
  import Markdown from '$lib/components/Markdown.svelte'

  function toggleQuestion(questionId: string): void {
    archivedQuestionsStore.toggleQuestionSelection(questionId)
  }

  function toggleSelectAll(): void {
    archivedQuestionsStore.toggleSelectAll()
  }

  async function deleteSelectedQuestions(): Promise<void> {
    if (archivedQuestionsStore.selectedCount === 0) {
      toastStore.addToast('No questions selected', 'error')
      return
    }

    if (!confirm(`Are you sure you want to permanently delete ${archivedQuestionsStore.selectedCount} question(s)? This action cannot be undone.`)) {
      return
    }

    try {
      const result = await archivedQuestionsStore.deleteSelectedQuestions()
      toastStore.addToast(`${result.deletedCount} question(s) deleted permanently`, 'success')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toastStore.addToast('Error deleting questions: ' + errorMessage, 'error')
    }
  }

  async function restoreSelectedQuestions(): Promise<void> {
    if (archivedQuestionsStore.selectedCount === 0) {
      toastStore.addToast('No questions selected', 'error')
      return
    }

    try {
      const result = await archivedQuestionsStore.restoreSelectedQuestions()
      toastStore.addToast(`${result.restoredCount} question(s) restored`, 'success')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toastStore.addToast('Error restoring questions: ' + errorMessage, 'error')
    }
  }

  onMount(() => {
    // Always reload archived questions to get latest from database
    archivedQuestionsStore.loadArchivedQuestions()
  })
</script>

<div class="container mx-auto p-8">
  <div class="mb-6">
    <h1 class="text-3xl font-bold mb-2">Question Archive</h1>
    <p class="text-gray-600">Manage archived questions - restore or permanently delete them.</p>
  </div>

  <!-- Action Controls -->
  {#if archivedQuestionsStore.hasQuestions}
    <div class="bg-white p-4 rounded-lg shadow mb-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <label class="flex items-center">
            <input 
              type="checkbox" 
              checked={archivedQuestionsStore.allSelected}
              onchange={toggleSelectAll}
              class="mr-2"
            />
            <span class="text-sm font-medium">
              Select All ({archivedQuestionsStore.totalCount} questions)
            </span>
          </label>
          
          <span class="text-sm text-gray-500">
            {archivedQuestionsStore.selectedCount} selected
          </span>
        </div>

        <div class="flex gap-2">
          <button
            onclick={restoreSelectedQuestions}
            disabled={archivedQuestionsStore.selectedCount === 0}
            class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Restore Selected
          </button>
          
          <button
            onclick={deleteSelectedQuestions}
            disabled={archivedQuestionsStore.selectedCount === 0}
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
      <h2 class="text-xl font-semibold mb-4">Archived Questions ({archivedQuestionsStore.totalCount})</h2>
      
      {#if archivedQuestionsStore.loading}
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p class="text-gray-600">Loading archived questions...</p>
        </div>
      {:else if !archivedQuestionsStore.hasQuestions}
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No archived questions found.</p>
          <a href="/teacher" class="text-blue-600 hover:underline">
            ← Back to Teacher Dashboard
          </a>
        </div>
      {:else}
        <div class="space-y-4">
          {#each archivedQuestionsStore.questions as question}
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 relative">
              <div class="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  checked={archivedQuestionsStore.selectedQuestionIds.includes(question.id)}
                  onchange={() => toggleQuestion(question.id)}
                  class="mt-1"
                />
                
                <div class="flex-1">
                  <div class="font-medium text-gray-900 mb-2">
                    <Markdown content={question.question_text} />
                  </div>
                  <div class="flex items-center justify-between text-sm text-gray-600">
                    <span>Concepts: {question.java_concepts?.join(', ') || 'N/A'}</span>
                    <span>Archived: {question.created_at ? new Date(question.created_at).toLocaleDateString() : 'N/A'}</span>
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