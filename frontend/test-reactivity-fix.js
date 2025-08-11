/**
 * Quick test script to manually check the reactivity fix
 * Run this in browser console after dashboard loads
 */

// Check current store state
console.log('=== BEFORE TEST DATA ===');
console.log('Store loading:', window.teacherDashboardStore?.loading);
console.log('Store hasData:', !!window.teacherDashboardStore?.dashboardData);
console.log('Store classrooms:', window.teacherDashboardStore?.classrooms?.length || 0);

// Load test data
console.log('\n=== LOADING TEST DATA ===');
window.teacherDashboardStore?.loadTestData();

// Check after test data
console.log('\n=== AFTER TEST DATA ===');
console.log('Store loading:', window.teacherDashboardStore?.loading);
console.log('Store hasData:', !!window.teacherDashboardStore?.dashboardData);
console.log('Store classrooms:', window.teacherDashboardStore?.classrooms?.length || 0);

// Check what's actually in the DOM
console.log('\n=== DOM STATE ===');
const debugDiv = document.querySelector('[class*="bg-yellow-100"]');
console.log('Debug div text:', debugDiv?.textContent);

// Look for classroom cards
const classroomCards = document.querySelectorAll('[class*="grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3"] > div');
console.log('Classroom cards found:', classroomCards.length);

// Look for classroom names in DOM
const hasTestCS1 = document.body.textContent.includes('Test CS P1');
const hasTestCS2 = document.body.textContent.includes('Test CS P2');
console.log('Found Test CS P1 in DOM:', hasTestCS1);
console.log('Found Test CS P2 in DOM:', hasTestCS2);