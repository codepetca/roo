<script lang="ts">
/**
 * Simple reactivity test to debug Svelte 5 $derived issues
 */
import { appState } from '$lib/stores';

// Test reactive access to store state with proper $derived
let loading = $derived(appState.loading);
let hasData = $derived(appState.hasData);
let classroomCount = $derived(appState.classrooms.length);
let dashboardStats = $derived(appState.dashboardStats);

$effect(() => {
    console.log('🔄 Effect triggered - store state changed:', {
        loading: loading,
        hasData: hasData,
        classroomCount: classroomCount,
        quickStats: dashboardStats ? 'Exists' : 'Null'
    });
});

async function testLoad() {
    console.log('🚀 Manual test load triggered');
    await appState.loadDashboard();
    console.log('✅ Manual test load completed');
}
</script>

<div class="p-4 border border-blue-200 bg-blue-50 rounded">
    <h3 class="text-lg font-bold text-blue-800">Reactivity Test</h3>
    
    <div class="mt-2 text-sm">
        <div><strong>Loading:</strong> {loading}</div>
        <div><strong>Has Data:</strong> {hasData}</div>
        <div><strong>Classrooms Length:</strong> {classroomCount}</div>
        <div><strong>Quick Stats:</strong> {dashboardStats ? 'Exists' : 'Null'}</div>
        <div><strong>Total Students:</strong> {dashboardStats?.totalStudents || 'N/A'}</div>
    </div>

    <button 
        class="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        onclick={testLoad}
    >
        Test Manual Load
    </button>
</div>