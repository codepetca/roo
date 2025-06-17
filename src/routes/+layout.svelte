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
  
  // Debug logging
  $effect(() => {
    console.log('Layout - User:', authStore.user?.id)
    console.log('Layout - Profile:', authStore.profile?.role)
  })
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

  <!-- Main Content -->
  <main class="{authStore.user ? 'pt-4' : ''}">
    <slot />
  </main>
  
  <!-- Toast notifications -->
  <Toast />
</div>