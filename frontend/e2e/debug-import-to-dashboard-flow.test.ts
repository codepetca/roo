/**
 * Debug test to run complete import → dashboard flow
 */
import { test } from '@playwright/test';
import { 
  signInAsTeacher, 
  gotoSnapshotImport,
  uploadSnapshotFile,
  CLASSROOM_SNAPSHOT_PATH 
} from './test-helpers';

test('complete import to dashboard flow', async ({ page }) => {
  console.log('=== STARTING IMPORT TO DASHBOARD FLOW ===');
  
  // Step 1: Sign in
  console.log('Step 1: Signing in...');
  await signInAsTeacher(page);
  
  // Step 2: Go to import page
  console.log('Step 2: Navigating to import...');
  await gotoSnapshotImport(page);
  await page.screenshot({ path: 'debug-import-page.png' });
  
  // Step 3: Upload file
  console.log('Step 3: Uploading snapshot file...');
  await uploadSnapshotFile(page, CLASSROOM_SNAPSHOT_PATH);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'debug-after-upload.png' });
  
  // Step 4: Look for and click any import/submit buttons
  console.log('Step 4: Looking for import buttons...');
  const importButtons = [
    'button:has-text("Import")',
    'button:has-text("Confirm")', 
    'button:has-text("Continue")',
    'button:has-text("Submit")',
    '[data-testid="confirm-import-btn"]',
    '[data-testid="import-button"]'
  ];
  
  let importClicked = false;
  for (const buttonSelector of importButtons) {
    if (await page.locator(buttonSelector).isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log(`Found button: ${buttonSelector}`);
      await page.locator(buttonSelector).click();
      importClicked = true;
      console.log('✓ Clicked import button');
      break;
    }
  }
  
  if (!importClicked) {
    console.log('⚠ No import button found, checking if import auto-proceeds');
  }
  
  // Step 5: Wait for import to complete
  console.log('Step 5: Waiting for import processing...');
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'debug-after-import-wait.png' });
  
  // Step 6: Check for success/error messages
  const successSelectors = [
    'text=/import.*success|success.*import/i',
    'text=/complete|finished/i',
    'button:has-text("Go to Dashboard")',
    '[data-testid="import-success"]'
  ];
  
  const errorSelectors = [
    'text=/error|failed|invalid/i',
    '[data-testid="import-error"]'
  ];
  
  let foundSuccess = false;
  let foundError = false;
  
  for (const selector of successSelectors) {
    if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await page.locator(selector).textContent();
      console.log(`✓ Import success indicator: ${text}`);
      foundSuccess = true;
    }
  }
  
  for (const selector of errorSelectors) {
    if (await page.locator(selector).isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await page.locator(selector).textContent();
      console.log(`❌ Import error indicator: ${text}`);
      foundError = true;
    }
  }
  
  // Step 7: Navigate to dashboard immediately
  console.log('Step 7: Navigating to dashboard...');
  await page.goto('/dashboard/teacher');
  await page.waitForTimeout(5000);
  
  // Step 8: Take dashboard screenshot after import
  await page.screenshot({ 
    path: 'debug-dashboard-after-import.png',
    fullPage: true 
  });
  
  // Step 9: Check if dashboard shows data now
  console.log('Step 9: Checking dashboard content...');
  
  // Check for API errors
  const apiError = page.locator('text=/error.*loading|403|404|500/i');
  if (await apiError.isVisible({ timeout: 2000 }).catch(() => false)) {
    const errorText = await apiError.textContent();
    console.log(`❌ Dashboard API Error: ${errorText}`);
  }
  
  // Check for "No Data Available" 
  const noDataMsg = page.locator('text=/no.*data.*available/i');
  if (await noDataMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('❌ Dashboard still shows "No Data Available"');
  }
  
  // Check for actual classroom data indicators
  const dataIndicators = [
    'text=/CS.*101|Programming/i', // Specific classroom names
    'text=/student.*count.*[0-9]/i', // Student counts
    'text=/assignment.*[0-9]/i', // Assignment counts
    'text=/classroom.*[0-9]/i' // Classroom counts
  ];
  
  let foundData = false;
  for (const indicator of dataIndicators) {
    if (await page.locator(indicator).isVisible({ timeout: 3000 }).catch(() => false)) {
      const text = await page.locator(indicator).textContent();
      console.log(`✓ Found data indicator: ${text}`);
      foundData = true;
    }
  }
  
  if (!foundData) {
    console.log('❌ No actual classroom data found on dashboard');
  }
  
  console.log('=== IMPORT TO DASHBOARD FLOW COMPLETE ===');
  console.log(`Import success: ${foundSuccess}, Import error: ${foundError}, Dashboard data: ${foundData}`);
});