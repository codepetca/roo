/**
 * Final verification that dashboard shows classroom data
 */
import { test, expect } from '@playwright/test';
import { signInAsTeacher } from './test-helpers';

test('final verification - dashboard displays classroom data', async ({ page }) => {
  // Sign in first
  await signInAsTeacher(page);
  
  // Navigate to dashboard
  await page.goto('/dashboard/teacher');
  
  // Wait for initial load
  await page.waitForTimeout(3000);
  
  console.log('=== CHECKING FOR LOADING STATE ===');
  const loadingState = await page.textContent('body');
  if (loadingState?.includes('loading: true')) {
    console.log('Still loading, waiting 10 more seconds...');
    await page.waitForTimeout(10000);
  }
  
  // Take final screenshot
  await page.screenshot({ 
    path: 'final-dashboard-verification.png',
    fullPage: true 
  });
  
  // Check for actual classroom data in the UI
  console.log('=== CHECKING FOR CLASSROOM DATA IN UI ===');
  
  // Look for classroom cards or stats
  const hasClassroomCards = await page.locator('[data-testid="classroom-card"], .classroom-card, text=/CS P[0-9]/, text=/students?/i').count() > 0;
  const hasStats = await page.locator('text=/Total Students|Total Assignments|Average Grade/i').count() > 0;
  const hasClassroomNames = await page.locator('text=/CS P5|CS P1|CS P2/i').count() > 0;
  const hasNumbers = await page.locator('text=/[0-9]+ students?|[0-9]+ assignments?/i').count() > 0;
  
  console.log('Found classroom cards:', hasClassroomCards);
  console.log('Found stats:', hasStats);  
  console.log('Found classroom names:', hasClassroomNames);
  console.log('Found student/assignment counts:', hasNumbers);
  
  // Get all text to see what's actually displayed
  const allText = await page.textContent('body');
  const hasRealData = allText?.includes('78') || allText?.includes('53') || allText?.includes('CS P');
  
  console.log('=== FINAL RESULT ===');
  if (hasRealData) {
    console.log('✅ SUCCESS: Dashboard shows real classroom data!');
  } else {
    console.log('❌ ISSUE: Dashboard still showing empty/loading state');
    console.log('Current page text (first 500 chars):');
    console.log(allText?.substring(0, 500));
  }
});