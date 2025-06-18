<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  
  let refreshing = $state(false)
  
  async function checkApprovalStatus() {
    refreshing = true
    try {
      await authStore.refreshSession()
      
      if (authStore.isTeacher) {
        toastStore.addToast('Your teacher account has been approved! Welcome to the platform.', 'success')
        window.location.href = '/teacher'
      } else if (!authStore.isTeacherPending) {
        // Account was rejected or role changed
        toastStore.addToast('Account status changed. Please contact support if you have questions.', 'info')
        window.location.href = '/'
      } else {
        toastStore.addToast('Account still pending approval. Please check again later.', 'info')
      }
    } catch (error) {
      toastStore.addToast('Failed to check approval status', 'error')
    } finally {
      refreshing = false
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-lg w-full space-y-8 p-8">
    <div class="text-center">
      <div class="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
        <svg class="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      
      <h2 class="mt-6 text-3xl font-bold text-gray-900">Teacher Account Pending</h2>
      <p class="mt-2 text-gray-600">Your teacher account is awaiting administrator approval</p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div class="flex items-start space-x-3">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-medium text-gray-900">What happens next?</h3>
          <div class="mt-2 text-sm text-gray-700">
            <ol class="list-decimal list-inside space-y-1">
              <li>An administrator will review your teacher account request</li>
              <li>You'll receive an email notification when your account is approved</li>
              <li>Once approved, you'll have full access to teacher features</li>
            </ol>
          </div>
        </div>
      </div>
      
      <div class="border-t pt-4">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-900">Account Details</h3>
            <dl class="mt-2 text-sm text-gray-700">
              <div class="flex justify-between py-1">
                <dt class="font-medium">Name:</dt>
                <dd>{authStore.profile?.full_name}</dd>
              </div>
              <div class="flex justify-between py-1">
                <dt class="font-medium">Email:</dt>
                <dd>{authStore.user?.email}</dd>
              </div>
              <div class="flex justify-between py-1">
                <dt class="font-medium">Status:</dt>
                <dd>
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Pending Approval
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <button
        onclick={checkApprovalStatus}
        disabled={refreshing}
        class="w-full btn btn-primary"
      >
        {refreshing ? 'Checking...' : 'Check Approval Status'}
      </button>
      
      <div class="text-center">
        <button
          onclick={() => authStore.signOut()}
          class="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Sign out and use different account
        </button>
      </div>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <h4 class="text-sm font-medium text-blue-800">Need help?</h4>
          <p class="mt-1 text-sm text-blue-700">
            If you have questions about the approval process or need to update your account information, 
            please contact the administrator or technical support.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>