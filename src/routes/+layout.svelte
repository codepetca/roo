<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { user, profile } from '$lib/stores/auth.js'
  import { supabase } from '$lib/supabase.js'
  import { signOut } from '$lib/stores/auth.js'
  import { goto } from '$app/navigation'

  onMount(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      user.set(session?.user ?? null)
    })
  })

  async function handleSignOut() {
    await signOut()
    goto('/')
  }
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Navigation -->
  {#if $user}
    <nav class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <h1 class="text-xl font-semibold text-gray-900">Java Code Grader</h1>
          </div>
          <div class="flex items-center space-x-4">
            {#if $profile}
              <span class="text-sm text-gray-700">
                {$profile.full_name} ({$profile.role})
              </span>
            {/if}
            {#if $profile?.role === 'teacher'}
              <a href="/teacher" class="text-blue-600 hover:text-blue-800">Dashboard</a>
            {:else if $profile?.role === 'student'}
              <a href="/student" class="text-blue-600 hover:text-blue-800">My Submissions</a>
            {/if}
            <button onclick={handleSignOut} class="btn btn-secondary">Sign Out</button>
          </div>
        </div>
      </div>
    </nav>
  {/if}

  <!-- Main Content -->
  <main class="{$user ? 'pt-4' : ''}">
    <slot />
  </main>
</div>