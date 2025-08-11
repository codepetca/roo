<!--
  Raw Data Display Debug Component
  Location: frontend/src/lib/components/debug/RawDataDisplay.svelte
  
  Purpose: Bypass all validation and show raw API responses
  This helps identify if the issue is authentication, data conversion, or validation
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { firebaseAuth } from '$lib/firebase';
  import { API_BASE_URL } from '$lib/api';
  import { appState } from '$lib/stores';

  // State for debugging
  let authStatus = $state<string>('checking');
  let userInfo = $state<any>(null);
  let rawApiResponse = $state<any>(null);
  let apiError = $state<string | null>(null);
  let loading = $state(false);
  let storeAttemptResult = $state<string>('not attempted');

  // Direct API call without validation
  async function fetchRawDashboardData() {
    loading = true;
    apiError = null;
    rawApiResponse = null;

    try {
      // Check authentication first
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        authStatus = 'not authenticated';
        apiError = 'No authenticated user found';
        return;
      }

      authStatus = 'authenticated';
      userInfo = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        emailVerified: currentUser.emailVerified
      };

      // Get auth token
      const token = await currentUser.getIdToken();
      console.log('🔑 Got auth token for debug request');

      // Make direct API call
      const response = await fetch(`${API_BASE_URL}/api/teacher/dashboard`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Raw API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      rawApiResponse = data;
      
      console.log('✅ Raw API data received:', data);

      // Now try loading with the dashboard store to see what fails
      console.log('🧪 Testing dashboard store validation...');
      try {
        await appState.loadDashboard();
        const storeData = appState.teacher;
        if (storeData) {
          storeAttemptResult = `✅ Store loaded successfully: ${storeData.classrooms.length} classrooms`;
        } else {
          storeAttemptResult = `❌ Store returned null despite raw API success. Error: ${appState.error || 'none'}`;
        }
      } catch (storeError) {
        storeAttemptResult = `❌ Store failed: ${storeError instanceof Error ? storeError.message : String(storeError)}`;
        console.error('Store validation failed:', storeError);
      }

    } catch (error) {
      console.error('❌ Raw API call failed:', error);
      apiError = error instanceof Error ? error.message : String(error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    console.log('🔍 RawDataDisplay component mounted');
    
    // Check current auth state immediately
    const currentUser = firebaseAuth.currentUser;
    if (currentUser) {
      console.log('🔑 Current user already authenticated:', currentUser.email);
      authStatus = 'authenticated';
      userInfo = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        emailVerified: currentUser.emailVerified
      };
      // Don't auto-fetch on mount, let user click the button
    } else {
      console.log('❌ No current user on mount');
      authStatus = 'not authenticated';
    }
    
    // Check auth state changes
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (user) {
        console.log('🔑 Auth state changed - user detected:', user.email);
        authStatus = 'authenticated';
        userInfo = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          emailVerified: user.emailVerified
        };
      } else {
        console.log('❌ Auth state changed - no user');
        authStatus = 'not authenticated';
        userInfo = null;
      }
    });

    return unsubscribe;
  });

  function formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }
</script>

<div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 space-y-4">
  <h3 class="text-lg font-bold text-yellow-800">🔍 Raw Data Debug Panel</h3>
  
  <!-- Authentication Status -->
  <div class="space-y-2">
    <h4 class="font-semibold text-gray-700">Authentication Status:</h4>
    <div class="bg-white p-2 rounded border">
      <div class="text-sm">
        Status: <span class="font-mono {authStatus === 'authenticated' ? 'text-green-600' : 'text-red-600'}">{authStatus}</span>
      </div>
      {#if userInfo}
        <div class="text-xs text-gray-600 mt-1">
          <div>UID: {userInfo.uid}</div>
          <div>Email: {userInfo.email}</div>
          <div>Display Name: {userInfo.displayName || 'none'}</div>
          <div>Email Verified: {userInfo.emailVerified}</div>
        </div>
      {/if}
    </div>
  </div>

  <!-- API Call Controls -->
  <div>
    <button 
      onclick={fetchRawDashboardData}
      disabled={loading || authStatus !== 'authenticated'}
      class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {loading ? 'Loading...' : 'Fetch Raw Dashboard Data'}
    </button>
  </div>

  <!-- Error Display -->
  {#if apiError}
    <div class="bg-red-100 border border-red-300 text-red-700 p-3 rounded">
      <h4 class="font-semibold">API Error:</h4>
      <pre class="text-sm mt-1 whitespace-pre-wrap">{apiError}</pre>
    </div>
  {/if}

  <!-- Raw Response Display -->
  {#if rawApiResponse}
    <div class="space-y-2">
      <h4 class="font-semibold text-gray-700">Raw API Response:</h4>
      <div class="bg-white border rounded p-2 max-h-96 overflow-auto">
        <pre class="text-xs">{formatJson(rawApiResponse)}</pre>
      </div>
      
      <!-- Quick Stats from Raw Data -->
      {#if rawApiResponse.success && rawApiResponse.data}
        {@const data = rawApiResponse.data}
        <div class="bg-green-100 border border-green-300 text-green-700 p-2 rounded">
          <h5 class="font-semibold">Quick Analysis:</h5>
          <div class="text-sm space-y-1">
            <div>Success: {rawApiResponse.success ? '✅' : '❌'}</div>
            <div>Has Teacher: {data.teacher ? '✅' : '❌'}</div>
            <div>Teacher Email: {data.teacher?.email || 'none'}</div>
            <div>Teacher School Email: {data.teacher?.schoolEmail || 'none'}</div>
            <div>Classrooms: {data.classrooms?.length || 0}</div>
            <div>Total Students: {data.stats?.totalStudents || 0}</div>
            <div>Total Assignments: {data.stats?.totalAssignments || 0}</div>
            <div>Recent Activity: {data.recentActivity?.length || 0}</div>
          </div>
        </div>
        
        <!-- Dashboard Store Validation Result -->
        <div class="bg-blue-100 border border-blue-300 text-blue-700 p-2 rounded">
          <h5 class="font-semibold">Dashboard Store Test:</h5>
          <div class="text-sm">{storeAttemptResult}</div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  pre {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }
</style>