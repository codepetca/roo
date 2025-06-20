<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  
  let loadingTimeout = $state(false)
  let debugInfo = $state('')
  
  // Auto-redirect authenticated users to their dashboard
  $effect(() => {
    console.log('Effect triggered:', { 
      user: authStore.user?.id, 
      profile: authStore.profile?.role, 
      profileFull: authStore.profile,
      loading: authStore.loading, 
      url: $page.url.pathname 
    })
    
    // Only redirect if we're on the landing page (/)
    if (!authStore.loading && authStore.user && authStore.profile && $page.url.pathname === '/') {
      console.log('Redirecting to dashboard:', authStore.profile.role)
      if (authStore.profile.role === 'teacher') {
        goto('/teacher')
      } else if (authStore.profile.role === 'student') {
        goto('/student')
      }
    }
  })
  
  // Set timeout for loading state to prevent infinite loading
  onMount(() => {
    const timeout = setTimeout(() => {
      if (authStore.user && !authStore.profile) {
        loadingTimeout = true
        debugInfo = `User: ${authStore.user.id}, Profile: ${authStore.profile}, Loading: ${authStore.loading}`
      }
    }, 8000) // 8 second timeout
    
    return () => clearTimeout(timeout)
  })
  
  function forceRedirect() {
    console.log('Force redirecting to teacher dashboard')
    goto('/teacher')
  }
  
  function clearAuth() {
    console.log('Clearing auth state')
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }
</script>

<div class="min-h-screen flex items-center justify-center">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-2">Codegrade</h1>
      <p class="text-gray-600 mb-8">
        AI-powered grading for handwritten Java code submissions
      </p>
      
      {#if !authStore.user}
        <div class="space-y-4">
          <a href="/auth/login" class="block w-full btn btn-primary text-center">
            Sign In
          </a>
          <a href="/auth/signup" class="block w-full btn btn-secondary text-center">
            Create Account
          </a>
        </div>
        
        <div class="mt-8 text-sm text-gray-500">
          <p class="mb-2">For Teachers:</p>
          <ul class="text-left space-y-1">
            <li>• Generate Java coding questions</li>
            <li>• Upload photos of student work</li>
            <li>• Get detailed AI feedback</li>
          </ul>
          
          <p class="mb-2 mt-4">For Students:</p>
          <ul class="text-left space-y-1">
            <li>• View your submission scores</li>
            <li>• Get detailed feedback</li>
            <li>• Track your progress</li>
          </ul>
        </div>
      {:else}
        <div class="text-center">
          {#if authStore.loading && !loadingTimeout}
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p class="mt-2 text-gray-600">Loading...</p>
            <p class="mt-1 text-xs text-gray-400">User: {authStore.user ? 'Yes' : 'No'} | Profile: {authStore.profile ? 'Yes' : 'No'}</p>
          {:else}
            <div class="space-y-4">
              <p class="text-gray-600">Authentication issue detected</p>
              {#if debugInfo}
                <p class="text-xs text-gray-500">{debugInfo}</p>
              {/if}
              <div class="space-y-2">
                <button onclick={forceRedirect} class="btn btn-primary w-full">
                  Continue to Dashboard
                </button>
                <button onclick={clearAuth} class="btn btn-secondary w-full">
                  Clear Auth & Restart
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
