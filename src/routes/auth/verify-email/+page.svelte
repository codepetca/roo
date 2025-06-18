<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  
  let verificationStatus = $state<'loading' | 'success' | 'error' | 'waiting'>('waiting')
  let errorMessage = $state('')
  let resendLoading = $state(false)
  
  onMount(() => {
    // Check if this is a redirect from email verification
    const { searchParams } = $page.url
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    
    if (accessToken && refreshToken) {
      verificationStatus = 'loading'
      handleEmailVerification()
    }
  })
  
  async function handleEmailVerification() {
    try {
      // The session should be automatically updated when redirected from email
      // Wait a moment for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (authStore.isAuthenticated && authStore.isEmailVerified) {
        verificationStatus = 'success'
        
        if (authStore.isTeacherPending) {
          toastStore.addToast('Email verified! Your teacher account is now awaiting approval.', 'success')
          setTimeout(() => {
            goto('/auth/pending-approval')
          }, 2000)
        } else {
          toastStore.addToast('Email verified successfully! Welcome to the platform.', 'success')
          setTimeout(() => {
            if (authStore.isTeacher) {
              goto('/teacher')
            } else {
              goto('/student')
            }
          }, 2000)
        }
      } else {
        verificationStatus = 'error'
        errorMessage = 'Email verification failed. Please try again.'
      }
    } catch (error) {
      verificationStatus = 'error'
      errorMessage = 'An error occurred during verification.'
    }
  }
  
  async function resendVerification() {
    if (!authStore.user?.email) {
      toastStore.addToast('No email address found. Please sign up again.', 'error')
      goto('/auth/signup')
      return
    }
    
    resendLoading = true
    try {
      await authStore.resendVerificationEmail()
      toastStore.addToast('Verification email sent! Please check your inbox.', 'success')
    } catch (error: any) {
      toastStore.addToast(error.message || 'Failed to resend verification email', 'error')
    } finally {
      resendLoading = false
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-md w-full space-y-8 p-8">
    <div class="text-center">
      <h2 class="text-3xl font-bold text-gray-900">Email Verification</h2>
    </div>

    {#if verificationStatus === 'loading'}
      <div class="text-center space-y-4">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p class="text-gray-600">Verifying your email...</p>
      </div>
    {:else if verificationStatus === 'success'}
      <div class="text-center space-y-4">
        <div class="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-green-900">Email Verified!</h3>
        <p class="text-green-700">Your email has been successfully verified. Redirecting you to the platform...</p>
      </div>
    {:else if verificationStatus === 'error'}
      <div class="text-center space-y-4">
        <div class="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-red-900">Verification Failed</h3>
        <p class="text-red-700">{errorMessage}</p>
        <div class="space-y-2">
          <button
            onclick={resendVerification}
            disabled={resendLoading}
            class="w-full btn btn-primary"
          >
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </button>
          <a href="/auth/signup" class="block text-center text-sm text-blue-600 hover:text-blue-800">
            Sign up again
          </a>
        </div>
      </div>
    {:else}
      <!-- Waiting for verification -->
      <div class="text-center space-y-6">
        <div class="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.45a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
          </svg>
        </div>
        
        <div class="space-y-2">
          <h3 class="text-lg font-medium text-gray-900">Check Your Email</h3>
          <p class="text-gray-600">
            We've sent a verification link to your email address. Please click the link to verify your account and complete your registration.
          </p>
        </div>
        
        <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h4 class="text-sm font-medium text-blue-800">Tips:</h4>
              <ul class="mt-2 text-sm text-blue-700 list-disc list-inside">
                <li>Check your spam/junk folder if you don't see the email</li>
                <li>The verification link will expire in 24 hours</li>
                <li>You can request a new link if needed</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div class="space-y-3">
          <button
            onclick={resendVerification}
            disabled={resendLoading}
            class="w-full btn btn-secondary"
          >
            {resendLoading ? 'Sending...' : 'Resend Verification Email'}
          </button>
          
          <div class="text-sm text-gray-500">
            Wrong email? 
            <a href="/auth/signup" class="text-blue-600 hover:text-blue-800">Sign up again</a>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>