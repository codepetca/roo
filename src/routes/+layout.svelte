<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import type { Snippet } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import Toast from '$lib/components/Toast.svelte'
  import Sidebar from '$lib/components/Sidebar.svelte'
  import Icon from '$lib/components/Icon.svelte'

  let { children }: { children: Snippet } = $props()
  let sidebarOpen = $state(false)

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen
  }

  async function handleSignOut() {
    await authStore.signOut()
    goto('/')
  }
  
  // Track if we've already attempted refresh
  let refreshAttempted = $state(false)
  
  // Handle auth state and provide user feedback
  $effect(() => {
    // Only try refresh once per session
    if (authStore.error && authStore.user && !refreshAttempted) {
      refreshAttempted = true
      authStore.refreshSession()
    }
    
    // Check if user needs email verification
    const currentPath = $page.url.pathname
    const isAuthPage = currentPath.startsWith('/auth/')
    const isPublicPage = currentPath === '/'
    const isPendingApprovalPage = currentPath === '/auth/pending-approval'
    
    if (authStore.user && !authStore.isEmailVerified && !isAuthPage && !isPublicPage && authStore.initialized) {
      goto('/auth/verify-email')
    } else if (authStore.user && authStore.isEmailVerified && authStore.isTeacherPending && !isAuthPage && !isPublicPage && !isPendingApprovalPage && authStore.initialized) {
      goto('/auth/pending-approval')
    }
  })
  
  // Show loading state for auth
  const showAuthLoading = $derived(authStore.loading && !authStore.initialized)
  
  // Only show sidebar when we have a confirmed authenticated user
  const shouldShowSidebar = $derived(authStore.initialized && authStore.isAuthenticated)
</script>

<div class="min-h-screen bg-gray-50">
  {#if shouldShowSidebar}
    <div class="flex h-screen">
      <!-- Sidebar -->
      <Sidebar isOpen={sidebarOpen} onClose={() => sidebarOpen = false} />
      
      <!-- Main content area -->
      <div class="flex-1 flex flex-col lg:ml-0 min-w-0">
        <!-- Mobile header -->
        <header class="lg:hidden bg-white border-b border-gray-200 px-4 py-3">
          <div class="flex items-center justify-between">
            <button
              onclick={toggleSidebar}
              class="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Icon name="bars-3" size="md" />
            </button>
            <h1 class="text-lg font-semibold text-gray-900">Codegrade</h1>
            <div class="w-10"></div> <!-- Spacer for centering -->
          </div>
        </header>
        
        <!-- Page content -->
        <main class="flex-1 overflow-auto bg-gray-50">
          {@render children?.()}
        </main>
      </div>
    </div>
  {:else}
    <!-- Unauthenticated layout -->
    <main>
      {@render children?.()}
    </main>
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

  
  <!-- Toast notifications -->
  <Toast />
</div>