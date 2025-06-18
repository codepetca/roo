<script lang="ts">
  import { onMount } from 'svelte'
  import { authStore } from '$lib/stores/auth.svelte.js'
  import { toastStore } from '$lib/stores/toast.svelte.js'
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  
  let loading = $state(false)
  let cleanupResults = $state<{
    profiles: number
    questions: number  
    tests: number
    submissions: number
    attempts: number
  } | null>(null)
  
  onMount(() => {
    // Check if user is admin
    if (!authStore.isAdmin) {
      toastStore.addToast('Access denied. Admin privileges required.', 'error')
      goto('/admin')
      return
    }
  })
  
  async function cleanupTestData() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL test data including:\n\n• Test accounts (except admin accounts)\n• Test questions\n• Test submissions\n• Coding tests\n• Test attempts\n\nThis action cannot be undone. Are you sure?')) {
      return
    }
    
    if (!confirm('🚨 FINAL CONFIRMATION: You are about to delete ALL test data. This is irreversible. Continue?')) {
      return
    }
    
    loading = true
    const results = {
      profiles: 0,
      questions: 0,
      tests: 0,
      submissions: 0,
      attempts: 0
    }
    
    try {
      // Delete in correct order to avoid foreign key constraints
      
      // 1. Delete test answers and answer history
      const { count: answersCount } = await supabase
        .from('test_answers')
        .delete()
        .neq('id', 'never-match') // Delete all
        .select('*', { count: 'exact', head: true })
      
      // 2. Delete test attempts 
      const { count: attemptsCount } = await supabase
        .from('test_attempts')
        .delete()
        .neq('id', 'never-match')
        .select('*', { count: 'exact', head: true })
      results.attempts = attemptsCount || 0
      
      // 3. Delete test questions (junction table)
      await supabase
        .from('test_questions')
        .delete()
        .neq('id', 'never-match')
      
      // 4. Delete coding tests
      const { count: testsCount } = await supabase
        .from('coding_tests')
        .delete()
        .neq('id', 'never-match')
        .select('*', { count: 'exact', head: true })
      results.tests = testsCount || 0
      
      // 5. Delete submissions
      const { count: submissionsCount } = await supabase
        .from('submissions')
        .delete()
        .neq('id', 'never-match')
        .select('*', { count: 'exact', head: true })
      results.submissions = submissionsCount || 0
      
      // 6. Delete questions
      const { count: questionsCount } = await supabase
        .from('questions')
        .delete()
        .neq('id', 'never-match')
        .select('*', { count: 'exact', head: true })
      results.questions = questionsCount || 0
      
      // 7. Delete non-admin profiles (keep current admin)
      const { count: profilesCount } = await supabase
        .from('profiles')
        .delete()
        .neq('role', 'admin')
        .neq('id', authStore.user?.id || 'current-admin')
        .select('*', { count: 'exact', head: true })
      results.profiles = profilesCount || 0
      
      cleanupResults = results
      toastStore.addToast('Test data cleanup completed successfully!', 'success')
      
    } catch (error: any) {
      console.error('Cleanup error:', error)
      toastStore.addToast(`Cleanup failed: ${error.message}`, 'error')
    } finally {
      loading = false
    }
  }
  
  async function cleanupSpecificData(type: string) {
    let confirmMessage = ''
    let action: () => Promise<any>
    
    switch (type) {
      case 'test-accounts':
        confirmMessage = 'Delete all non-admin user accounts?'
        action = async () => {
          const { count } = await supabase
            .from('profiles')
            .delete()
            .neq('role', 'admin')
            .neq('id', authStore.user?.id || 'current-admin')
            .select('*', { count: 'exact', head: true })
          return { profiles: count || 0 }
        }
        break
      case 'questions':
        confirmMessage = 'Delete all questions?'
        action = async () => {
          const { count } = await supabase
            .from('questions')
            .delete()
            .neq('id', 'never-match')
            .select('*', { count: 'exact', head: true })
          return { questions: count || 0 }
        }
        break
      case 'tests':
        confirmMessage = 'Delete all coding tests and related data?'
        action = async () => {
          // Delete test answers first
          await supabase.from('test_answers').delete().neq('id', 'never-match')
          // Delete test attempts
          await supabase.from('test_attempts').delete().neq('id', 'never-match')
          // Delete test questions junction
          await supabase.from('test_questions').delete().neq('id', 'never-match')
          // Delete coding tests
          const { count } = await supabase
            .from('coding_tests')
            .delete()
            .neq('id', 'never-match')
            .select('*', { count: 'exact', head: true })
          return { tests: count || 0 }
        }
        break
      case 'submissions':
        confirmMessage = 'Delete all submissions?'
        action = async () => {
          const { count } = await supabase
            .from('submissions')
            .delete()
            .neq('id', 'never-match')
            .select('*', { count: 'exact', head: true })
          return { submissions: count || 0 }
        }
        break
      default:
        return
    }
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    loading = true
    try {
      const result = await action()
      cleanupResults = { ...cleanupResults, ...result } as any
      toastStore.addToast(`${type} cleanup completed!`, 'success')
    } catch (error: any) {
      toastStore.addToast(`${type} cleanup failed: ${error.message}`, 'error')
    } finally {
      loading = false
    }
  }
</script>

<!-- Page Header -->
<div class="page-header">
  <div class="page-content py-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="heading-xl">Database Cleanup</h1>
        <p class="text-body mt-1">Remove test data and prepare for production deployment</p>
      </div>
      <a href="/admin" class="btn btn-secondary btn-sm">
        ← Back to Admin
      </a>
    </div>
  </div>
</div>

<!-- Main Content -->
<div class="page-content py-8 space-y-8 max-w-4xl">

  <!-- Warning Banner -->
  <div class="alert alert-danger">
    <div class="flex">
      <div class="flex-shrink-0">
        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">
          ⚠️ Danger Zone - Production Deployment Preparation
        </h3>
        <div class="mt-2 text-sm text-red-700">
          <p class="mb-2">
            <strong>These operations permanently delete data and cannot be undone.</strong>
          </p>
          <ul class="list-disc list-inside space-y-1">
            <li>Only use before production deployment</li>
            <li>Admin accounts will be preserved</li>
            <li>All test data will be permanently removed</li>
            <li>Make sure you have backups if needed</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Full Cleanup Section -->
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="heading-md">Complete Database Cleanup</h2>
        <p class="text-body text-gray-600 mt-1">Remove all test data in the correct order</p>
      </div>
    </div>
    <div class="space-y-4">
      <button
        onclick={cleanupTestData}
        disabled={loading}
        class="btn btn-danger"
      >
        {loading ? 'Cleaning...' : '🗑️ Clean All Test Data'}
      </button>
      <p class="text-caption text-gray-500">
        This will remove: user accounts, questions, tests, submissions, and attempts
      </p>
    </div>
  </div>

  <!-- Selective Cleanup Section -->
  <div class="card">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="heading-md">Selective Cleanup</h2>
        <p class="text-body text-gray-600 mt-1">Clean specific types of data</p>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button
        onclick={() => cleanupSpecificData('test-accounts')}
        disabled={loading}
        class="btn btn-danger btn-sm"
      >
        {loading ? 'Cleaning...' : 'Clean Test Accounts'}
      </button>
      
      <button
        onclick={() => cleanupSpecificData('questions')}
        disabled={loading}
        class="btn btn-danger btn-sm"
      >
        {loading ? 'Cleaning...' : 'Clean Questions'}
      </button>
      
      <button
        onclick={() => cleanupSpecificData('tests')}
        disabled={loading}
        class="btn btn-danger btn-sm"
      >
        {loading ? 'Cleaning...' : 'Clean Coding Tests'}
      </button>
      
      <button
        onclick={() => cleanupSpecificData('submissions')}
        disabled={loading}
        class="btn btn-danger btn-sm"
      >
        {loading ? 'Cleaning...' : 'Clean Submissions'}
      </button>
    </div>
  </div>

  <!-- Results Section -->
  {#if cleanupResults}
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h2 class="heading-md">Cleanup Results</h2>
      </div>
      
      <div class="stat-group mb-6">
        <div class="stat-item">
          <div class="text-center">
            <p class="text-2xl font-semibold text-red-600">{cleanupResults.profiles}</p>
            <p class="text-caption text-gray-500 uppercase tracking-wide">Profiles</p>
          </div>
        </div>
        <div class="stat-item">
          <div class="text-center">
            <p class="text-2xl font-semibold text-red-600">{cleanupResults.questions}</p>
            <p class="text-caption text-gray-500 uppercase tracking-wide">Questions</p>
          </div>
        </div>
        <div class="stat-item">
          <div class="text-center">
            <p class="text-2xl font-semibold text-red-600">{cleanupResults.tests}</p>
            <p class="text-caption text-gray-500 uppercase tracking-wide">Tests</p>
          </div>
        </div>
        <div class="stat-item">
          <div class="text-center">
            <p class="text-2xl font-semibold text-red-600">{cleanupResults.submissions}</p>
            <p class="text-caption text-gray-500 uppercase tracking-wide">Submissions</p>
          </div>
        </div>
        <div class="stat-item">
          <div class="text-center">
            <p class="text-2xl font-semibold text-red-600">{cleanupResults.attempts}</p>
            <p class="text-caption text-gray-500 uppercase tracking-wide">Attempts</p>
          </div>
        </div>
      </div>
      
      <div class="alert alert-success">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-green-700">
              Cleanup completed successfully! The database is now ready for production deployment.
            </p>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>