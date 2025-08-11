/**
 * Test the Load Test Data button functionality
 */
import { test } from '@playwright/test';
import { signInAsTeacher } from './test-helpers';

test('test Load Test Data button shows classroom data', async ({ page }) => {
  // Capture console messages to see store logs
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log(`BROWSER CONSOLE: ${msg.type()}: ${text}`);
    consoleMessages.push(text);
  });

  // Sign in first
  await signInAsTeacher(page);
  
  // Navigate to dashboard
  await page.goto('/dashboard/teacher');
  await page.waitForTimeout(3000);
  
  // Check that the Load Test Data button exists
  console.log('=== CHECKING FOR LOAD TEST DATA BUTTON ===');
  const testDataButton = page.getByRole('button', { name: /load test data/i });
  const buttonExists = await testDataButton.isVisible();
  console.log('Load Test Data button exists:', buttonExists);
  
  // Click the Load Test Data button
  console.log('=== CLICKING LOAD TEST DATA BUTTON ===');
  await testDataButton.click();
  
  // Wait a moment for the store to update
  await page.waitForTimeout(2000);
  
  // Check the debug state after clicking
  const bodyText = await page.textContent('body');
  console.log('\n=== DEBUG STATE AFTER TEST DATA LOAD ===');
  const debugMatch = bodyText?.match(/🐛 Store State:.*?classrooms=\d+/s);
  if (debugMatch) {
    console.log(debugMatch[0]);
  }
  
  // Check for specific test data in the UI
  const hasTestClassroom1 = bodyText?.includes('Test CS P1');
  const hasTestClassroom2 = bodyText?.includes('Test CS P2'); 
  const hasTestStats = bodyText?.includes('45') && bodyText?.includes('14'); // 45 students, 14 assignments
  
  console.log('=== TEST DATA VISIBILITY ===');
  console.log('Found Test CS P1:', hasTestClassroom1);
  console.log('Found Test CS P2:', hasTestClassroom2);
  console.log('Found test stats (45 students, 14 assignments):', hasTestStats);
  
  // Look for specific console messages from store
  console.log('\n=== STORE TEST DATA MESSAGES ===');
  const testDataMessages = consoleMessages.filter(msg => 
    msg.includes('Loading test data') || 
    msg.includes('Test data loaded') ||
    msg.includes('classroomCount: 2')
  );
  
  if (testDataMessages.length === 0) {
    console.log('❌ NO test data loading messages found!');
  } else {
    testDataMessages.forEach((msg, i) => console.log(`${i + 1}. ${msg}`));
  }
  
  // Take screenshot with test data
  await page.screenshot({ 
    path: 'test-data-button-result.png',
    fullPage: true 
  });
  
  console.log('\n=== FINAL RESULT ===');
  if (hasTestClassroom1 && hasTestClassroom2 && hasTestStats) {
    console.log('✅ SUCCESS: Test data is visible in the UI!');
  } else if (testDataMessages.length > 0) {
    console.log('🔄 PARTIAL: Store loaded test data but UI not updating');
  } else {
    console.log('❌ FAILURE: Test data button not working');
  }
});