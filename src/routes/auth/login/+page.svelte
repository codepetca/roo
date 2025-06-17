<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  
  let email = $state('')
  let password = $state('')
  let loading = $state(false)
  let error = $state('')

  async function handleSubmit() {
    if (!email || !password) {
      error = 'Please fill in all fields'
      return
    }

    loading = true
    error = ''

    try {
      await authStore.signInWithEmail(email, password)
      toastStore.addToast('Welcome back!', 'success')
      
      // Wait for profile to load, then redirect based on role
      let attempts = 0
      const maxAttempts = 50 // 5 seconds max wait
      
      const checkProfile = () => {
        attempts++
        console.log('Checking profile, attempt:', attempts, 'Profile:', authStore.profile?.role)
        
        if (authStore.profile?.role) {
          loading = false
          if (authStore.profile.role === 'teacher') {
            goto('/teacher')
          } else if (authStore.profile.role === 'student') {
            goto('/student')
          } else {
            goto('/')
          }
        } else if (attempts < maxAttempts) {
          setTimeout(checkProfile, 100)
        } else {
          console.log('Profile load timeout, redirecting to home')
          loading = false
          goto('/')
        }
      }
      
      checkProfile()
    } catch (err: any) {
      error = err.message || 'Failed to sign in'
      loading = false
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Sign In</h2>
      <p class="mt-2 text-gray-600">Access your Java Code Grader account</p>
    </div>

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

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          class="input"
          placeholder="Enter your password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full btn btn-primary"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <div class="text-center">
      <p class="text-sm text-gray-600">
        Don't have an account?
        <a href="/auth/signup" class="text-blue-600 hover:text-blue-800">Sign up</a>
      </p>
    </div>
  </div>
</div>