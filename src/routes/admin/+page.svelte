<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { goto } from '$app/navigation'
  import type { UserProfile } from '$lib/types/index.js'
  
  let pendingTeachers = $state<UserProfile[]>([])
  let loading = $state(true)
  let actionLoading = $state<string | null>(null)
  
  onMount(async () => {
    // Check if user is admin
    if (!authStore.isAdmin) {
      toastStore.addToast('Access denied. Admin privileges required.', 'error')
      goto('/')
      return
    }
    
    await loadPendingTeachers()
  })
  
  async function loadPendingTeachers() {
    loading = true
    try {
      pendingTeachers = await authStore.getPendingTeachers()
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to load pending teachers', 'error')
    } finally {
      loading = false
    }
  }
  
  async function approveTeacher(teacherId: string, teacherName: string) {
    actionLoading = teacherId
    try {
      await authStore.approveTeacher(teacherId)
      toastStore.addToast(`${teacherName} has been approved as a teacher`, 'success')
      await loadPendingTeachers()
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to approve teacher', 'error')
    } finally {
      actionLoading = null
    }
  }
  
  async function rejectTeacher(teacherId: string, teacherName: string) {
    if (!confirm(`Are you sure you want to reject ${teacherName}? This will delete their account permanently.`)) {
      return
    }
    
    actionLoading = teacherId
    try {
      await authStore.rejectTeacher(teacherId)
      toastStore.addToast(`${teacherName}'s application has been rejected`, 'info')
      await loadPendingTeachers()
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to reject teacher', 'error')
    } finally {
      actionLoading = null
    }
  }
</script>

<div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
    <p class="mt-2 text-gray-600">Manage teacher account approvals and platform administration</p>
  </div>

  <!-- Pending Teacher Approvals Section -->
  <div class="bg-white shadow rounded-lg">
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-medium text-gray-900">Pending Teacher Approvals</h2>
        <button
          onclick={loadPendingTeachers}
          disabled={loading}
          class="btn btn-secondary btn-sm"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>

    <div class="divide-y divide-gray-200">
      {#if loading}
        <div class="p-6 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p class="mt-2 text-gray-600">Loading pending approvals...</p>
        </div>
      {:else if pendingTeachers.length === 0}
        <div class="p-6 text-center">
          <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
          <p class="mt-1 text-sm text-gray-500">All teacher applications have been processed.</p>
        </div>
      {:else}
        {#each pendingTeachers as teacher}
          <div class="p-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span class="text-sm font-medium text-gray-700 uppercase">
                      {teacher.full_name?.charAt(0) || 'T'}
                    </span>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-sm font-medium text-gray-900 truncate">
                    {teacher.full_name || 'No name provided'}
                  </h3>
                  <p class="text-sm text-gray-500">
                    Applied on {new Date(teacher.created_at || '').toLocaleDateString()}
                  </p>
                  <div class="mt-1">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Teacher Application
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex space-x-2">
                <button
                  onclick={() => approveTeacher(teacher.id, teacher.full_name || 'Teacher')}
                  disabled={actionLoading === teacher.id}
                  class="btn btn-success btn-sm"
                >
                  {actionLoading === teacher.id ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onclick={() => rejectTeacher(teacher.id, teacher.full_name || 'Teacher')}
                  disabled={actionLoading === teacher.id}
                  class="btn btn-danger btn-sm"
                >
                  {actionLoading === teacher.id ? 'Processing...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="mt-8 bg-white shadow rounded-lg">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-lg font-medium text-gray-900">Quick Actions</h2>
    </div>
    <div class="p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/admin/students"
          class="flex items-center justify-center px-4 py-3 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
          Manage Students
        </a>
        
        <a
          href="/admin/classes"
          class="flex items-center justify-center px-4 py-3 border border-purple-300 rounded-md text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
          Manage Classes
        </a>
        
        <a
          href="/admin/cleanup"
          class="flex items-center justify-center px-4 py-3 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Database Cleanup
        </a>
        
        <button
          onclick={loadPendingTeachers}
          disabled={loading}
          class="flex items-center justify-center px-4 py-3 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          Refresh Approvals
        </button>
      </div>
    </div>
  </div>

  <!-- Admin Statistics -->
  <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Pending Approvals</p>
          <p class="text-2xl font-semibold text-gray-900">{pendingTeachers.length}</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Platform Status</p>
          <p class="text-lg font-semibold text-green-600">Active</p>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <div class="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
            <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </div>
        </div>
        <div class="ml-4">
          <p class="text-sm font-medium text-gray-600">Your Role</p>
          <p class="text-lg font-semibold text-purple-600">Administrator</p>
        </div>
      </div>
    </div>
  </div>
</div>