/**
 * Test script to verify Svelte 5 reactivity in the new store architecture
 * Run this in the browser console on the dashboard page
 */

// Test 1: Load test data and verify reactivity
console.log('🧪 Testing Store Reactivity...');

// Access the appState from the window (for testing)
// First, let's check if the store is accessible
console.log('Step 1: Checking store access...');
const testButton = document.querySelector('[onclick*="loadTestData"]');
if (testButton) {
    console.log('✅ Found test data button');
    
    // Click the test data button
    console.log('Step 2: Clicking test data button...');
    testButton.click();
    
    // Wait a moment then check DOM updates
    setTimeout(() => {
        console.log('Step 3: Checking DOM updates...');
        
        // Check if classroom cards appeared
        const classroomCards = document.querySelectorAll('[onclick*="handleClassroomSelect"]');
        console.log(`Found ${classroomCards.length} classroom cards`);
        
        // Check if stats updated
        const statsElements = document.querySelectorAll('.text-2xl.font-semibold');
        console.log('Stats values:');
        statsElements.forEach((el, i) => {
            console.log(`  Stat ${i + 1}: ${el.textContent}`);
        });
        
        // Check debug display
        const debugDiv = document.querySelector('.bg-yellow-100');
        if (debugDiv) {
            console.log('Debug state:', debugDiv.textContent);
        }
        
        if (classroomCards.length > 0) {
            console.log('✅ REACTIVITY WORKING: DOM updated with test data');
        } else {
            console.log('❌ REACTIVITY ISSUE: DOM did not update');
        }
    }, 1000);
} else {
    console.log('❌ Test button not found - make sure you are on the dashboard page');
}

// Test 2: Clear data and verify reactivity
setTimeout(() => {
    console.log('\nStep 4: Testing refresh button...');
    const refreshButton = document.querySelector('[onclick*="refresh"]');
    if (refreshButton) {
        refreshButton.click();
        console.log('Clicked refresh - data should reload');
    }
}, 3000);