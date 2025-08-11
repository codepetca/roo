/**
 * Test the Refresh button functionality
 */
import { test } from '@playwright/test';
import { signInAsTeacher } from './test-helpers';

test('test refresh button triggers data load', async ({ page }) => {
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
  
  // Check initial state
  const initialText = await page.textContent('body');
  console.log('\n=== INITIAL DEBUG STATE ===');
  const debugMatch = initialText?.match(/🐛 DEBUG STORE STATE:.*?quickStats: .*?null/s);
  if (debugMatch) {
    console.log(debugMatch[0]);
  }
  
  // Click the Refresh button
  console.log('\n=== CLICKING REFRESH BUTTON ===');
  const refreshButton = page.getByRole('button', { name: /refresh/i });
  await refreshButton.click();
  
  // Wait for the API call to complete
  console.log('Waiting 15 seconds for refresh to complete...');
  await page.waitForTimeout(15000);
  
  // Check final state
  const finalText = await page.textContent('body');
  console.log('\n=== FINAL DEBUG STATE ===');
  const finalDebugMatch = finalText?.match(/🐛 DEBUG STORE STATE:.*?quickStats: .*?(\w+|null)/s);
  if (finalDebugMatch) {
    console.log(finalDebugMatch[0]);
  }
  
  // Look for specific console messages from store
  console.log('\n=== STORE CONSOLE MESSAGES ===');
  const storeMessages = consoleMessages.filter(msg => 
    msg.includes('Starting dashboard load') || 
    msg.includes('API returned result') ||
    msg.includes('Dashboard load completed') ||
    msg.includes('Dashboard load failed') ||
    msg.includes('API call timeout')
  );
  
  if (storeMessages.length === 0) {
    console.log('❌ NO store loading messages found!');
  } else {
    storeMessages.forEach((msg, i) => console.log(`${i + 1}. ${msg}`));
  }
  
  // Take final screenshot
  await page.screenshot({ 
    path: 'debug-refresh-button-test.png',
    fullPage: true 
  });
  
  console.log('Refresh button test completed!');
});