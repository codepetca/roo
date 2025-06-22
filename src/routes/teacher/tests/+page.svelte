<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { testsStore } from '$lib/stores/tests.svelte.js'
  import type { CodingTest } from '$lib/types/index.js'

  let searchTerm = $state('')
  let statusFilter = $state<'all' | 'draft' | 'active' | 'ended'>('all')
  let sortBy = $state<'created' | 'title' | 'status'>('created')
  let sortOrder = $state<'asc' | 'desc'>('desc')

  // Computed filtered and sorted tests
  const filteredTests = $derived.by(() => {
    let tests = [...testsStore.tests] // Create a copy to avoid mutation


    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      tests = tests.filter(test => 
        test.title.toLowerCase().includes(term) ||
        (test.description && test.description.toLowerCase().includes(term))
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      tests = tests.filter(test => test.status === statusFilter)
    }

    // Sort tests
    tests = tests.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'created':
        default:
          comparison = new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return tests
  })

  function getStatusColor(status: string): string {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'ended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  function formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  async function duplicateTest(test: CodingTest): Promise<void> {
    if (!confirm(`Create a copy of "${test.title}"?`)) return

    try {
      // Get test details first
      const response = await fetch(`/api/tests/${test.id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load test details')
      }

      const questionIds = result.questions?.map((q: any) => q.question_id) || []

      // Create new test with same settings
      const createResult = await testsStore.createTest({
        title: `${test.title} (Copy)`,
        description: test.description || undefined,
        questionIds,
        timeLimitMinutes: test.time_limit_minutes,
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
        settings: {
          immediateeFeedback: test.immediate_feedback || false,
          fullscreenRequired: test.fullscreen_required || false,
          disableCopyPaste: test.disable_copy_paste || false
        }
      })

      if (createResult.success) {
        alert('Test duplicated successfully!')
      } else {
        alert(`Failed to duplicate test: ${createResult.error}`)
      }
    } catch (error) {
      // Error duplicating test
      alert('Failed to duplicate test')
    }
  }

  async function deleteTest(test: CodingTest): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${test.title}"? This action cannot be undone.`)) {
      return
    }

    const result = await testsStore.deleteTest(test.id)
    
    if (!result.success) {
      alert(`Failed to delete test: ${result.error}`)
    }
  }

  async function publishTest(test: CodingTest): Promise<void> {
    if (!confirm(`Publish "${test.title}"? Students will be able to take this test.`)) {
      return
    }

    const result = await testsStore.publishTest(test.id)
    
    if (result.success) {
      alert('Test published successfully!')
    } else {
      alert(`Failed to publish test: ${result.error}`)
    }
  }

  onMount(() => {
    testsStore.loadTests()
  })
</script>

<svelte:head>
  <title>Tests - Teacher Dashboard</title>
</svelte:head>

<div class="max-w-7xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Online Tests</h1>
        <p class="text-gray-600 mt-1">Create and manage coding tests for your students</p>
      </div>
      
      <button
        onclick={() => goto('/teacher/tests/create')}
        class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2"
      >
        <span>+</span>
        <span>Create New Test</span>
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">Total Tests</div>
        <div class="text-2xl font-semibold text-gray-900">{testsStore.tests.length}</div>
        <div class="text-xs text-gray-400 mt-1">Filtered: {filteredTests.length}</div>
      </div>
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">Draft Tests</div>
        <div class="text-2xl font-semibold text-gray-600">{testsStore.draftTests.length}</div>
      </div>
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">Active Tests</div>
        <div class="text-2xl font-semibold text-green-600">{testsStore.activeTests.length}</div>
      </div>
      <div class="bg-white rounded-lg border p-4">
        <div class="text-sm text-gray-500">Ended Tests</div>
        <div class="text-2xl font-semibold text-red-600">{testsStore.endedTests.length}</div>
      </div>
    </div>
  </div>

  <!-- Filters and Search -->
  <div class="bg-white rounded-lg border p-6 mb-6">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Search -->
      <div>
        <label for="search" class="block text-sm font-medium text-gray-700 mb-2">
          Search Tests
        </label>
        <input
          id="search"
          type="text"
          bind:value={searchTerm}
          placeholder="Search by title or description..."
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Status Filter -->
      <div>
        <label for="status" class="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          id="status"
          bind:value={statusFilter}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="ended">Ended</option>
        </select>
      </div>

      <!-- Sort By -->
      <div>
        <label for="sortBy" class="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <select
          id="sortBy"
          bind:value={sortBy}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="created">Created Date</option>
          <option value="title">Title</option>
          <option value="status">Status</option>
        </select>
      </div>

      <!-- Sort Order -->
      <div>
        <label for="sortOrder" class="block text-sm font-medium text-gray-700 mb-2">
          Order
        </label>
        <select
          id="sortOrder"
          bind:value={sortOrder}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Tests List -->
  {#if testsStore.loading}
    <div class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p class="text-gray-600">Loading tests...</p>
    </div>
  {:else if testsStore.error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-6">
      <p class="text-red-800">{testsStore.error}</p>
      <button
        onclick={() => testsStore.loadTests()}
        class="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Retry
      </button>
    </div>
  {:else if filteredTests.length === 0}
    <div class="text-center py-12 bg-white rounded-lg border">
      {#if testsStore.tests.length === 0}
        <div class="text-6xl mb-4">📝</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No tests yet</h3>
        <p class="text-gray-600 mb-6">Create your first online coding test to get started</p>
        <button
          onclick={() => goto('/teacher/tests/create')}
          class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          Create Your First Test
        </button>
      {:else}
        <div class="text-4xl mb-4">🔍</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No tests match your filters</h3>
        <p class="text-gray-600">Try adjusting your search or filters</p>
      {/if}
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
                Duration
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Questions
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each filteredTests as test}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      <button
                        onclick={() => goto(`/teacher/tests/${test.id}`)}
                        class="hover:text-blue-600 transition-colors"
                      >
                        {test.title}
                      </button>
                    </div>
                    {#if test.description}
                      <div class="text-sm text-gray-500 mt-1">
                        {test.description.length > 60 ? test.description.slice(0, 60) + '...' : test.description}
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(test.status)}">
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(test.time_limit_minutes)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {test.question_count || 0}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(test.created_at)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(test.end_date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div class="flex items-center space-x-2">
                    <button
                      onclick={() => goto(`/teacher/tests/${test.id}`)}
                      class="text-blue-600 hover:text-blue-800"
                      title="View details"
                    >
                      View
                    </button>
                    
                    <button
                      onclick={() => goto(`/teacher/tests/${test.id}/submissions`)}
                      class="text-purple-600 hover:text-purple-800"
                      title="View submissions"
                    >
                      Submissions
                    </button>
                    
                    {#if test.status === 'draft'}
                      <button
                        onclick={() => publishTest(test)}
                        class="text-green-600 hover:text-green-800"
                        title="Publish test"
                      >
                        Publish
                      </button>
                    {/if}
                    
                    <button
                      onclick={() => duplicateTest(test)}
                      class="text-gray-600 hover:text-gray-800"
                      title="Duplicate test"
                    >
                      Copy
                    </button>
                    
                    <button
                      onclick={() => deleteTest(test)}
                      class="text-red-600 hover:text-red-800"
                      title="Delete test"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Results summary -->
    <div class="mt-4 text-sm text-gray-600 text-center">
      Showing {filteredTests.length} of {testsStore.tests.length} tests
    </div>
  {/if}
</div>