<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'

  let isEditing = $state(false)
  let fullName = $state('')
  let email = $state('')
  let role = $state('')
  let isLoading = $state(false)
  let error = $state('')
  let success = $state('')

  // Reactive auth check and form initialization
  $effect(() => {
    // Wait for auth to be initialized
    if (!authStore.initialized) return

    // Redirect if not authenticated
    if (!authStore.isAuthenticated) {
      goto('/auth/login')
      return
    }

    // Initialize form values when user is available
    if (authStore.user && authStore.profile) {
      fullName = authStore.profile.full_name || ''
      email = authStore.user.email || ''
      role = authStore.profile.role || ''
    }
  })

  async function handleSave() {
    if (!authStore.user?.id) return

    isLoading = true
    error = ''
    success = ''

    try {
      // In a real app, you'd call an API endpoint to update the profile
      // For now, we'll just show a success message
      success = 'Profile updated successfully!'
      isEditing = false
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to update profile'
    } finally {
      isLoading = false
    }
  }

  function handleCancel() {
    // Reset form values
    fullName = authStore.profile?.full_name || ''
    email = authStore.user?.email || ''
    role = authStore.profile?.role || ''
    isEditing = false
    error = ''
  }
</script>

{#if !authStore.initialized}
  <div class="flex items-center justify-center min-h-screen">
    <div class="text-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      <p class="mt-2 text-gray-600">Loading...</p>
    </div>
  </div>
{:else if authStore.isAuthenticated}
<div class="max-w-4xl mx-auto p-6">
  <div class="bg-white rounded-lg shadow">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-gray-200">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-gray-900">Profile</h1>
        {#if !isEditing}
          <button
            onclick={() => isEditing = true}
            class="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Icon name="pencil" size="sm" color="active" class="mr-2" />
            Edit Profile
          </button>
        {/if}
      </div>
    </div>

    <!-- Content -->
    <div class="p-6">
      {#if error}
        <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700">{error}</p>
        </div>
      {/if}

      {#if success}
        <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-green-700">{success}</p>
        </div>
      {/if}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Profile Picture -->
        <div class="md:col-span-2">
          <div class="flex items-center space-x-4">
            <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
              <span class="text-2xl font-medium text-gray-700">
                {authStore.profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 class="text-lg font-medium text-gray-900">
                {authStore.profile?.full_name || 'User'}
              </h3>
              <p class="text-gray-500 capitalize">{authStore.profile?.role}</p>
            </div>
          </div>
        </div>

        <!-- Full Name -->
        <div>
          <label for="fullName" class="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          {#if isEditing}
            <input
              id="fullName"
              type="text"
              bind:value={fullName}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full name"
            />
          {:else}
            <p class="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
              {authStore.profile?.full_name || 'Not set'}
            </p>
          {/if}
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <p class="px-3 py-2 bg-gray-50 rounded-lg text-gray-900">
            {authStore.user?.email || 'Not set'}
          </p>
          <p class="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
        </div>

        <!-- Role -->
        <div>
          <label for="role" class="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <p class="px-3 py-2 bg-gray-50 rounded-lg text-gray-900 capitalize">
            {authStore.profile?.role || 'Not set'}
          </p>
          <p class="text-xs text-gray-500 mt-1">Role is assigned by administrators</p>
        </div>

        <!-- Account Status -->
        <div>
          <span class="block text-sm font-medium text-gray-700 mb-2">
            Account Status
          </span>
          <div class="space-y-2">
            <div class="flex items-center">
              <div class="w-2 h-2 rounded-full mr-2 {authStore.isEmailVerified ? 'bg-green-500' : 'bg-red-500'}"></div>
              <span class="text-sm {authStore.isEmailVerified ? 'text-green-700' : 'text-red-700'}">
                Email {authStore.isEmailVerified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
            {#if authStore.isTeacherPending}
              <div class="flex items-center">
                <div class="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                <span class="text-sm text-orange-700">Teacher Approval Pending</span>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Edit Actions -->
      {#if isEditing}
        <div class="mt-8 flex items-center space-x-4">
          <button
            onclick={handleSave}
            disabled={isLoading}
            class="flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {#if isLoading}
              <Icon name="arrow-path" size="sm" color="active" class="mr-2 animate-spin" />
              Saving...
            {:else}
              <Icon name="check" size="sm" color="active" class="mr-2" />
              Save Changes
            {/if}
          </button>
          <button
            onclick={handleCancel}
            disabled={isLoading}
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Additional Info -->
  <div class="mt-6 bg-white rounded-lg shadow p-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div>
        <span class="font-medium text-gray-700">Account Created:</span>
        <span class="text-gray-600 ml-2">
          {authStore.profile?.created_at ? new Date(authStore.profile.created_at).toLocaleDateString() : 'Unknown'}
        </span>
      </div>
      <div>
        <span class="font-medium text-gray-700">User ID:</span>
        <span class="text-gray-600 ml-2 font-mono text-xs">
          {authStore.user?.id || 'Not available'}
        </span>
      </div>
    </div>
  </div>
</div>
{/if}