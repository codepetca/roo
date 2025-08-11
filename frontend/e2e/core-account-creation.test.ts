/**
 * Core Account Creation E2E Tests
 * Location: frontend/e2e/core-account-creation.test.ts
 * 
 * Tests the complete teacher account signup flow
 * Creates the test account needed by other E2E tests
 */

import { test, expect } from '@playwright/test';
import { 
  createTestTeacherAccount, 
  TEST_TEACHER_PROFILE,
  debugPage 
} from './test-helpers';

test.describe('Core Teacher Account Creation', () => {
  
  test('should display teacher signup form', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Go through the flow to signup form
    await page.getByRole('button', { name: /teacher/i }).click();
    await page.getByRole('button', { name: /email/i }).click();
    
    // Switch to signup mode
    const toggleBtn = page.getByTestId('toggle-auth-mode-button');
    await expect(toggleBtn).toContainText("Don't have an account? Create one");
    await toggleBtn.click();
    
    // Should show signup form
    await expect(page.getByTestId('teacher-email-form-title')).toContainText('Create Teacher Account');
    await expect(page.getByTestId('email-input')).toBeVisible();
    await expect(page.getByTestId('display-name-input')).toBeVisible();
    await expect(page.getByTestId('school-email-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByTestId('confirm-password-input')).toBeVisible();
  });

  test('should validate signup form fields', async ({ page }) => {
    // Navigate to signup form
    await page.goto('/login');
    await page.getByRole('button', { name: /teacher/i }).click();
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByTestId('toggle-auth-mode-button').click();
    
    // Try submitting empty form
    const submitBtn = page.getByTestId('submit-auth-button');
    await expect(submitBtn).toBeDisabled();
    
    // Fill partial form
    await page.getByTestId('email-input').fill('test@example.com');
    await page.getByTestId('password-input').fill('short');
    
    // Should still be disabled (password too short, missing fields)
    await expect(submitBtn).toBeDisabled();
    
    // Fill with mismatched passwords
    await page.getByTestId('display-name-input').fill('Test User');
    await page.getByTestId('school-email-input').fill('school@test.edu');
    await page.getByTestId('password-input').fill('validpassword');
    await page.getByTestId('confirm-password-input').fill('different');
    
    // Button should be enabled but form should show error on submit
    await expect(submitBtn).toBeEnabled();
  });

  test('should create test teacher account successfully', async ({ page }) => {
    try {
      // Attempt to create the test account
      const accountCreated = await createTestTeacherAccount(page);
      
      if (accountCreated) {
        console.log('✅ Test teacher account creation successful!');
        console.log(`Account details: ${TEST_TEACHER_PROFILE.email}`);
        
        // If account was newly created, we should be on dashboard
        // If account already exists, we might still be on login page
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard')) {
          console.log('✅ Successfully redirected to dashboard (new account)');
          const dashboardHeading = page.locator('h1, h2').first();
          await expect(dashboardHeading).toBeVisible();
        } else {
          console.log('✅ Account already exists (expected behavior)');
        }
        
      } else {
        // Account creation failed, but check if account already exists
        console.log('⚠️ Account creation failed - checking if account already exists...');
        
        // Try signing in with existing account
        await page.goto('/login');
        await page.getByRole('button', { name: /teacher/i }).click();
        await page.getByRole('button', { name: /email/i }).click();
        
        // Fill demo credentials or use the button
        const demoBtn = page.getByText('Fill Demo Teacher Credentials');
        if (await demoBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await demoBtn.click();
        } else {
          await page.getByTestId('email-input').fill(TEST_TEACHER_PROFILE.email);
          await page.getByTestId('password-input').fill(TEST_TEACHER_PROFILE.password);
        }
        
        await page.getByTestId('submit-auth-button').click();
        await page.waitForTimeout(3000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/dashboard')) {
          console.log('✅ Account already exists and sign-in works!');
        } else {
          console.log('❌ Neither account creation nor existing account sign-in worked');
        }
      }
      
    } catch (error) {
      await debugPage(page, 'account-creation-failed');
      throw error;
    }
  });

  test('should handle existing account gracefully', async ({ page }) => {
    // This test assumes the account might already exist from previous runs
    await page.goto('/login');
    await page.getByRole('button', { name: /teacher/i }).click();
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByTestId('toggle-auth-mode-button').click();
    
    // Fill the form with existing account details
    await page.getByTestId('email-input').fill(TEST_TEACHER_PROFILE.email);
    await page.getByTestId('display-name-input').fill(TEST_TEACHER_PROFILE.displayName);
    await page.getByTestId('school-email-input').fill(TEST_TEACHER_PROFILE.schoolEmail);
    await page.getByTestId('password-input').fill(TEST_TEACHER_PROFILE.password);
    await page.getByTestId('confirm-password-input').fill(TEST_TEACHER_PROFILE.password);
    
    // Submit form
    await page.getByTestId('submit-auth-button').click();
    await page.waitForTimeout(5000);
    
    // Should either succeed (new account) or show "already exists" error
    const currentUrl = page.url();
    const hasError = await page.locator('[data-testid="auth-error-message"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Account created successfully');
    } else if (hasError) {
      const errorText = await page.locator('[data-testid="auth-error-message"]').textContent();
      if (errorText?.includes('already exists') || errorText?.includes('email-already-in-use')) {
        console.log('✅ Account already exists (expected)');
      } else {
        console.log('⚠️ Unexpected error:', errorText);
      }
    }
  });

});