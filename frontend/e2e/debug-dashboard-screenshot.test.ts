/**
 * Debug test to capture dashboard screenshot
 */
import { test } from '@playwright/test';
import { signInAsTeacher } from './test-helpers';

test('capture dashboard screenshot for analysis', async ({ page }) => {
  // Sign in first
  await signInAsTeacher(page);
  
  // Navigate to dashboard
  await page.goto('/dashboard/teacher');
  await page.waitForTimeout(3000);
  
  // Take full page screenshot
  await page.screenshot({ 
    path: 'dashboard-current-state.png',
    fullPage: true 
  });
  
  // Also capture just the main content
  const mainContent = page.locator('main, .dashboard-content, [data-testid="dashboard-main"]').first();
  if (await mainContent.isVisible({ timeout: 2000 }).catch(() => false)) {
    await mainContent.screenshot({ 
      path: 'dashboard-main-content.png'
    });
  }
  
  // Log what text we can see
  const allText = await page.locator('body').textContent();
  console.log('=== DASHBOARD TEXT CONTENT ===');
  console.log(allText?.substring(0, 1000) + '...');
  
  // Log specific elements we find
  const headings = await page.locator('h1, h2, h3').allTextContents();
  console.log('=== HEADINGS ===', headings);
  
  const buttons = await page.locator('button').allTextContents();
  console.log('=== BUTTONS ===', buttons.slice(0, 10)); // First 10 buttons
  
  console.log('Dashboard screenshots saved!');
});