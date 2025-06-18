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

<!-- Page Header -->
<div class="page-header">
  <div class="page-content py-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="heading-xl">Admin Dashboard</h1>
        <p class="text-body mt-1">Manage teacher approvals and platform administration</p>
      </div>
      <button
        onclick={loadPendingTeachers}
        disabled={loading}
        class="btn btn-secondary btn-sm"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
  </div>
</div>

<!-- Main Content -->
<div class="page-content py-8 space-y-8">
  <!-- Statistics Overview -->
  <div class="stat-group">
    <div class="stat-item">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-caption text-gray-500 uppercase tracking-wide">Pending Approvals</p>
          <p class="text-2xl font-semibold text-gray-900 mt-1">{pendingTeachers.length}</p>
        </div>
        <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="stat-item">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-caption text-gray-500 uppercase tracking-wide">Platform Status</p>
          <p class="text-lg font-medium text-green-600 mt-1">Online</p>
        </div>
        <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="stat-item">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-caption text-gray-500 uppercase tracking-wide">Access Level</p>
          <p class="text-lg font-medium text-gray-900 mt-1">Administrator</p>
        </div>
        <div class="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.586-2H4.414A1.414 1.414 0 003 3.414v.172A1.414 1.414 0 004.414 5h10.172A1.414 1.414 0 0016 3.586v-.172A1.414 1.414 0 0014.586 2z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <div class="stat-item">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-caption text-gray-500 uppercase tracking-wide">Last Updated</p>
          <p class="text-lg font-medium text-gray-900 mt-1">Just now</p>
        </div>
        <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <h2 class="heading-md">Quick Actions</h2>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <a
        href="/admin/students"
        class="group flex items-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-25 transition-all"
      >
        <div class="w-10 h-10 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center mr-3 transition-colors">
          <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
          </svg>
        </div>
        <div>
          <p class="font-medium text-gray-900">Students</p>
          <p class="text-caption text-gray-500">Manage enrollment</p>
        </div>
      </a>
      
      <a
        href="/admin/classes"
        class="group flex items-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-25 transition-all"
      >
        <div class="w-10 h-10 bg-purple-50 group-hover:bg-purple-100 rounded-lg flex items-center justify-center mr-3 transition-colors">
          <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
        </div>
        <div>
          <p class="font-medium text-gray-900">Classes</p>
          <p class="text-caption text-gray-500">Organize groups</p>
        </div>
      </a>
      
      <a
        href="/admin/cleanup"
        class="group flex items-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-25 transition-all"
      >
        <div class="w-10 h-10 bg-red-50 group-hover:bg-red-100 rounded-lg flex items-center justify-center mr-3 transition-colors">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </div>
        <div>
          <p class="font-medium text-gray-900">Cleanup</p>
          <p class="text-caption text-gray-500">Database maintenance</p>
        </div>
      </a>
    </div>
  </div>

  <!-- Teacher Approvals -->
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <h2 class="heading-md">Teacher Approvals</h2>
      {#if pendingTeachers.length > 0}
        <span class="badge badge-warning">{pendingTeachers.length} pending</span>
      {/if}
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p class="text-body mt-3">Loading approvals...</p>
        </div>
      </div>
    {:else if pendingTeachers.length === 0}
      <div class="text-center py-12">
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="heading-sm mb-2">All caught up!</h3>
        <p class="text-body">No pending teacher applications to review.</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each pendingTeachers as teacher}
          <div class="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <span class="text-sm font-medium text-gray-700">
                  {teacher.full_name?.charAt(0)?.toUpperCase() || 'T'}
                </span>
              </div>
              <div>
                <p class="font-medium text-gray-900">{teacher.full_name || 'No name provided'}</p>
                <p class="text-caption text-gray-500">
                  Applied {new Date(teacher.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div class="action-group">
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
        {/each}
      </div>
    {/if}
  </div>
</div>