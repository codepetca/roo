<script lang="ts">
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  
  let password = $state('')
  let confirmPassword = $state('')
  let loading = $state(false)
  let error = $state('')
  let validToken = $state(false)
  let checkingToken = $state(true)

  onMount(async () => {
    // Check if we have a valid reset token
    const { searchParams } = $page.url
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (!accessToken || !refreshToken) {
      error = 'Invalid or missing reset token. Please request a new password reset.'
      checkingToken = false
      return
    }
    
    try {
      // Set the session with the provided tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (sessionError) {
        throw sessionError
      }
      
      validToken = true
      checkingToken = false
    } catch (err: any) {
      error = 'Invalid or expired reset token. Please request a new password reset.'
      checkingToken = false
    }
  })

  async function handleSubmit() {
    if (!password || !confirmPassword) {
      error = 'Please fill in all fields'
      return
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters'
      return
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match'
      return
    }

    loading = true
    error = ''

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      toastStore.addToast('Password updated successfully! You can now sign in with your new password.', 'success')
      
      // Sign out and redirect to login
      await supabase.auth.signOut()
      goto('/auth/login')
    } catch (err: any) {
      error = err.message || 'Failed to update password'
    } finally {
      loading = false
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Reset Password</h2>
      <p class="mt-2 text-gray-600">Enter your new password</p>
    </div>

    {#if checkingToken}
      <div class="text-center space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600">Verifying reset token...</p>
      </div>
    {:else if !validToken}
      <div class="text-center space-y-4">
        <div class="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-red-900">Invalid Reset Link</h3>
        <p class="text-red-700">{error}</p>
        <div class="space-y-2">
          <a href="/auth/forgot-password" class="block w-full btn btn-primary">
            Request New Reset Link
          </a>
          <a href="/auth/login" class="block text-center text-sm text-blue-600 hover:text-blue-800">
            Back to Sign In
          </a>
        </div>
      </div>
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
        {#if error}
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <p class="text-red-600 text-sm">{error}</p>
          </div>
        {/if}

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            class="input"
            placeholder="Enter your new password (min 6 characters)"
            required
          />
        </div>

        <div>
          <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            class="input"
            placeholder="Confirm your new password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full btn btn-primary"
        >
          {loading ? 'Updating Password...' : 'Update Password'}
        </button>
      </form>

      <div class="text-center">
        <a href="/auth/login" class="text-sm text-blue-600 hover:text-blue-800">
          Back to Sign In
        </a>
      </div>
    {/if}
  </div>
</div>