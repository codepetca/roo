<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'

  let isLoading = $state(false)
  let error = $state('')
  let success = $state('')

  // UI Preferences
  let darkMode = $state(false)
  let emailNotifications = $state(true)
  let pushNotifications = $state(false)
  let autoSave = $state(true)

  // Code Editor Preferences
  let fontSize = $state(14)
  let tabSize = $state(2)
  let wordWrap = $state(true)
  let lineNumbers = $state(true)

  // Reactive auth check
  $effect(() => {
    // Wait for auth to be initialized
    if (!authStore.initialized) return

    // Redirect if not authenticated
    if (!authStore.isAuthenticated) {
      goto('/auth/login')
      return
    }

    // Load user preferences from localStorage once authenticated
    loadPreferences()
  })

  function loadPreferences() {
    try {
      const saved = localStorage.getItem('userPreferences')
      if (saved) {
        const prefs = JSON.parse(saved)
        darkMode = prefs.darkMode ?? false
        emailNotifications = prefs.emailNotifications ?? true
        pushNotifications = prefs.pushNotifications ?? false
        autoSave = prefs.autoSave ?? true
        fontSize = prefs.fontSize ?? 14
        tabSize = prefs.tabSize ?? 2
        wordWrap = prefs.wordWrap ?? true
        lineNumbers = prefs.lineNumbers ?? true
      }
    } catch (err) {
      // Ignore errors loading preferences
    }
  }

  async function savePreferences() {
    isLoading = true
    error = ''
    success = ''

    try {
      const preferences = {
        darkMode,
        emailNotifications,
        pushNotifications,
        autoSave,
        fontSize,
        tabSize,
        wordWrap,
        lineNumbers
      }

      localStorage.setItem('userPreferences', JSON.stringify(preferences))
      
      // In a real app, you'd also save to the server
      // await fetch('/api/user/preferences', { method: 'POST', body: JSON.stringify(preferences) })
      
      success = 'Settings saved successfully!'
      
      // Clear success message after 3 seconds
      setTimeout(() => success = '', 3000)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to save settings'
    } finally {
      isLoading = false
    }
  }

  function resetToDefaults() {
    darkMode = false
    emailNotifications = true
    pushNotifications = false
    autoSave = true
    fontSize = 14
    tabSize = 2
    wordWrap = true
    lineNumbers = true
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
      <h1 class="text-2xl font-semibold text-gray-900">Settings</h1>
      <p class="text-gray-600 mt-1">Customize your experience</p>
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

      <div class="space-y-8">
        <!-- UI Preferences -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Interface</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label for="darkMode" class="text-sm font-medium text-gray-700">Dark Mode</label>
                <p class="text-xs text-gray-500">Use dark theme throughout the application</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  id="darkMode"
                  type="checkbox"
                  bind:checked={darkMode}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label for="autoSave" class="text-sm font-medium text-gray-700">Auto Save</label>
                <p class="text-xs text-gray-500">Automatically save your work while coding</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  id="autoSave"
                  type="checkbox"
                  bind:checked={autoSave}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        <!-- Notifications -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Notifications</h2>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <label for="emailNotifications" class="text-sm font-medium text-gray-700">Email Notifications</label>
                <p class="text-xs text-gray-500">Receive updates about grades and assignments via email</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  id="emailNotifications"
                  type="checkbox"
                  bind:checked={emailNotifications}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label for="pushNotifications" class="text-sm font-medium text-gray-700">Push Notifications</label>
                <p class="text-xs text-gray-500">Get notified in your browser</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  id="pushNotifications"
                  type="checkbox"
                  bind:checked={pushNotifications}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        <!-- Code Editor -->
        <section>
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Code Editor</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="fontSize" class="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <select
                id="fontSize"
                bind:value={fontSize}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10px</option>
                <option value={11}>11px</option>
                <option value={12}>12px</option>
                <option value={13}>13px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
                <option value={20}>20px</option>
              </select>
            </div>

            <div>
              <label for="tabSize" class="block text-sm font-medium text-gray-700 mb-2">
                Tab Size
              </label>
              <select
                id="tabSize"
                bind:value={tabSize}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label for="wordWrap" class="text-sm font-medium text-gray-700">Word Wrap</label>
                <p class="text-xs text-gray-500">Wrap long lines of code</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  id="wordWrap"
                  type="checkbox"
                  bind:checked={wordWrap}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label for="lineNumbers" class="text-sm font-medium text-gray-700">Line Numbers</label>
                <p class="text-xs text-gray-500">Show line numbers in code editor</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  id="lineNumbers"
                  type="checkbox"
                  bind:checked={lineNumbers}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        <!-- Actions -->
        <section class="pt-6 border-t border-gray-200">
          <div class="flex items-center space-x-4">
            <button
              onclick={savePreferences}
              disabled={isLoading}
              class="flex items-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {#if isLoading}
                <Icon name="arrow-path" size="sm" color="active" class="mr-2 animate-spin" />
                Saving...
              {:else}
                <Icon name="check" size="sm" color="active" class="mr-2" />
                Save Settings
              {/if}
            </button>
            
            <button
              onclick={resetToDefaults}
              disabled={isLoading}
              class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>

  <!-- Account Actions -->
  <div class="mt-6 bg-white rounded-lg shadow p-6">
    <h2 class="text-lg font-semibold text-gray-900 mb-4">Account Actions</h2>
    <div class="space-y-4">
      <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
        <div>
          <h3 class="font-medium text-gray-900">Change Password</h3>
          <p class="text-sm text-gray-500">Update your account password</p>
        </div>
        <button class="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
          Change Password
        </button>
      </div>

      <div class="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
        <div>
          <h3 class="font-medium text-red-900">Delete Account</h3>
          <p class="text-sm text-red-700">Permanently delete your account and all data</p>
        </div>
        <button class="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-100 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  </div>
</div>
{/if}