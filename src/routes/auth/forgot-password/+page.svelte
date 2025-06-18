<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  
  let email = $state('')
  let loading = $state(false)
  let error = $state('')
  let success = $state(false)

  async function handleSubmit() {
    if (!email) {
      error = 'Please enter your email address'
      return
    }

    loading = true
    error = ''
    success = false

    try {
      await authStore.resetPassword(email)
      success = true
      toastStore.addToast('Password reset email sent! Please check your inbox.', 'success')
    } catch (err: any) {
      error = err.message || 'Failed to send reset email'
    } finally {
      loading = false
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Reset Password</h2>
      <p class="mt-2 text-gray-600">Enter your email to receive a password reset link</p>
    </div>

    {#if success}
      <div class="text-center space-y-4">
        <div class="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-green-900">Email Sent!</h3>
        <p class="text-green-700">
          We've sent a password reset link to <strong>{email}</strong>. 
          Please check your email and follow the instructions to reset your password.
        </p>
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4 text-left">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-blue-700">
                <strong>Didn't receive the email?</strong><br>
                Check your spam folder or try requesting another reset email.
              </p>
            </div>
          </div>
        </div>
        <div class="space-y-2">
          <button
            onclick={() => { success = false; email = ''; }}
            class="w-full btn btn-secondary"
          >
            Send Another Email
          </button>
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
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            bind:value={email}
            class="input"
            placeholder="Enter your email"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full btn btn-primary"
        >
          {loading ? 'Sending...' : 'Send Reset Email'}
        </button>
      </form>

      <div class="text-center space-y-2">
        <p class="text-sm text-gray-600">
          Remember your password?
          <a href="/auth/login" class="text-blue-600 hover:text-blue-800">Sign in</a>
        </p>
        <p class="text-sm text-gray-600">
          Don't have an account?
          <a href="/auth/signup" class="text-blue-600 hover:text-blue-800">Sign up</a>
        </p>
      </div>
    {/if}
  </div>
</div>