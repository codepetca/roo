<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import Toast from '$lib/components/Toast.svelte'

  async function handleSignOut() {
    await authStore.signOut()
    goto('/')
  }
  
  // Track if we've already attempted refresh
  let refreshAttempted = $state(false)
  
  // Handle auth state and provide user feedback
  $effect(() => {
    console.log('Layout - User:', authStore.user?.id, 'Profile:', authStore.profile?.role, 'Loading:', authStore.loading)
    
    // Only try refresh once per session
    if (authStore.error && authStore.user && !refreshAttempted) {
      console.log('Auth error detected, attempting session refresh...')
      refreshAttempted = true
      authStore.refreshSession()
    }
  })
  
  // Show loading state for auth
  const showAuthLoading = $derived(authStore.loading && !authStore.initialized)
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Navigation -->
  {#if authStore.user}
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">Java Code Grader</h1>
          </div>
          <div class="flex items-center space-x-4">
            {#if authStore.profile?.role === 'teacher'}
              <div class="flex items-center space-x-3">
                <a href="/teacher" class="text-blue-600 hover:text-blue-800">Dashboard</a>
                <a href="/teacher/archive" class="text-blue-600 hover:text-blue-800">Archive</a>
                <a href="/teacher/tests" class="text-blue-600 hover:text-blue-800">Online Tests</a>
                <a href="/teacher/tests/create" class="text-blue-600 hover:text-blue-800">Create Test</a>
              </div>
            {:else if authStore.profile?.role === 'student'}
              <div class="flex items-center space-x-3">
                <a href="/student" class="text-blue-600 hover:text-blue-800">Dashboard</a>
              </div>
            {/if}
            
            {#if authStore.profile}
              <span class="text-sm text-gray-700 border-l border-gray-300 pl-4">
                {authStore.profile.full_name} ({authStore.profile.role})
              </span>
            {/if}
            
            <button onclick={handleSignOut} class="btn btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>
    </nav>
  {/if}

  <!-- Auth Loading State -->
  {#if showAuthLoading}
    <div class="fixed inset-0 bg-gray-50 flex items-center justify-center z-50">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  {/if}

  <!-- Auth Error State -->
  {#if authStore.error}
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div class="bg-red-50 border border-red-200 rounded-md p-4 max-w-md">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-800">{authStore.error}</p>
            <button onclick={() => authStore.refreshSession()} class="mt-2 text-xs text-red-600 hover:text-red-800 underline">
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  <main class="{authStore.user ? 'pt-4' : ''}">
    <slot />
  </main>
  
  <!-- Toast notifications -->
  <Toast />
</div>