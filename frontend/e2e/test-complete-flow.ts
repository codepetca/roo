/**
 * Complete E2E Flow Test: Auth → Profile Setup → Import → Dashboard
 * Location: frontend/e2e/test-complete-flow.ts
 * 
 * This test ensures the complete user journey works end-to-end
 */

import { test, expect } from '@playwright/test';
import { 
  signInAsTeacher, 
  setupTestTeacherProfile,
  gotoSnapshotImport,
  uploadSnapshotFile,
  waitForImportSuccess,
  verifyDashboardData,
  TEST_TEACHER_PROFILE,
  debugPage 
} from './test-helpers';

test.describe('Complete E2E Flow', () => {

  test('complete flow: auth → profile → import → dashboard', async ({ page }) => {
    console.log('=== STARTING COMPLETE E2E FLOW TEST ===');
    
    try {
      // Step 1: Sign in as teacher
      console.log('Step 1: Signing in as teacher...');
      await signInAsTeacher(page);
      console.log('✅ Authentication successful');

      // Step 2: Ensure teacher profile exists for API access
      console.log('Step 2: Setting up teacher profile for API access...');
      const profileSetup = await setupTestTeacherProfile(page);
      if (profileSetup) {
        console.log('✅ Teacher profile ready - API access enabled');
      } else {
        console.log('⚠️ Teacher profile setup failed - continuing anyway (may already exist)');
      }

      // Step 3: Test import flow
      console.log('Step 3: Testing classroom snapshot import...');
      await gotoSnapshotImport(page);
      await uploadSnapshotFile(page);
      
      // Wait for import to complete
      await page.waitForTimeout(5000);
      const importSuccess = await waitForImportSuccess(page);
      
      if (importSuccess) {
        console.log('✅ Import completed successfully');
      } else {
        console.log('❌ Import failed - checking errors...');
        await page.screenshot({ path: 'import-failure.png', fullPage: true });
        
        // Look for specific error messages
        const validationError = await page.locator('text=/validation.*failed/i').isVisible({ timeout: 2000 }).catch(() => false);
        const networkError = await page.locator('text=/403.*network.*error/i').isVisible({ timeout: 2000 }).catch(() => false);
        
        if (validationError) {
          console.log('❌ Import failed: Validation error');
        }
        if (networkError) {
          console.log('❌ Import failed: 403 Network error (authentication/permission issue)');
        }
      }

      // Step 4: Test dashboard data display
      console.log('Step 4: Testing dashboard data display...');
      await page.goto('/dashboard/teacher');
      await page.waitForTimeout(3000);

      const hasRealData = await verifyDashboardData(page);
      
      if (hasRealData) {
        console.log('✅ Dashboard shows imported classroom data');
        console.log('🎉 COMPLETE E2E FLOW SUCCESSFUL!');
      } else {
        console.log('❌ Dashboard does not show imported data');
        await page.screenshot({ path: 'dashboard-no-data.png', fullPage: true });
        
        // Check for specific error messages on dashboard
        const apiError = await page.locator('text=/403.*network.*error/i').isVisible({ timeout: 2000 }).catch(() => false);
        const noDataMsg = await page.locator('text=/no.*data.*available/i').isVisible({ timeout: 2000 }).catch(() => false);
        
        if (apiError) {
          console.log('❌ Dashboard failed: 403 API error (authentication/permission issue)');
        }
        if (noDataMsg) {
          console.log('❌ Dashboard shows empty state - no imported data persisted');
        }
        
        console.log('❌ COMPLETE E2E FLOW FAILED - Data not flowing through');
      }

      console.log('=== COMPLETE E2E FLOW TEST FINISHED ===');

      // Final assertion - this test should pass only if real data is shown
      expect(hasRealData).toBe(true);

    } catch (error) {
      console.log('❌ E2E Flow failed:', error.message);
      await debugPage(page, 'complete-flow-failure');
      throw error;
    }
  });

});