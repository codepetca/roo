<script lang="ts">
  import { signUpWithEmail } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  
  let email = $state('')
  let password = $state('')
  let fullName = $state('')
  let role = $state<'teacher' | 'student'>('student')
  let loading = $state(false)
  let error = $state('')
  let success = $state('')

  async function handleSubmit() {
    if (!email || !password || !fullName) {
      error = 'Please fill in all fields'
      return
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters'
      return
    }

    loading = true
    error = ''
    success = ''

    try {
      const result = await signUpWithEmail(email, password, fullName, role)
      
      if (result.user && !result.user.email_confirmed_at) {
        // Email confirmation required
        if (role === 'teacher') {
          toastStore.addToast('Teacher account created! Please verify your email, then wait for admin approval.', 'success')
        } else {
          toastStore.addToast('Account created! Please check your email to verify your account.', 'success')
        }
        goto('/auth/verify-email')
      } else if (result.user && result.user.email_confirmed_at) {
        // Email already confirmed (shouldn't happen in normal flow)
        if (role === 'teacher') {
          toastStore.addToast('Teacher account created! Waiting for admin approval.', 'success')
          goto('/auth/pending-approval')
        } else {
          toastStore.addToast('Account created and verified! Redirecting...', 'success')
          goto('/student')
        }
      } else {
        // Show verification page anyway
        goto('/auth/verify-email')
      }
    } catch (err: any) {
      error = err.message || 'Failed to create account'
    } finally {
      loading = false
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Create Account</h2>
      <p class="mt-2 text-gray-600">Join the Codegrade platform</p>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-md p-4">
          <p class="text-red-600 text-sm">{error}</p>
        </div>
      {/if}

      {#if success}
        <div class="bg-green-50 border border-green-200 rounded-md p-4">
          <p class="text-green-600 text-sm">{success}</p>
        </div>
      {/if}

      <div>
        <label for="fullName" class="block text-sm font-medium text-gray-700 mb-2">
          Full Name
        </label>
        <input
          id="fullName"
          type="text"
          bind:value={fullName}
          class="input"
          placeholder="Enter your full name"
          required
        />
      </div>

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

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          class="input"
          placeholder="Enter your password (min 6 characters)"
          required
        />
      </div>

      <div>
        <label for="role" class="block text-sm font-medium text-gray-700 mb-2">
          Account Type
        </label>
        <select
          id="role"
          bind:value={role}
          class="input"
          required
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher (requires approval)</option>
        </select>
        {#if role === 'teacher'}
          <div class="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-blue-700">
                  <strong>Teacher accounts require approval.</strong> After creating your account and verifying your email, 
                  an administrator will review and approve your teacher access. You'll be notified when approved.
                </p>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full btn btn-primary"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>

    <div class="text-center">
      <p class="text-sm text-gray-600">
        Already have an account?
        <a href="/auth/login" class="text-blue-600 hover:text-blue-800">Sign in</a>
      </p>
    </div>
  </div>
</div>