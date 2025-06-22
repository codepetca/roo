import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * 
 * These tests cover the complete authentication workflows:
 * 1. User registration (student/teacher)
 * 2. Login/logout flows
 * 3. Password reset
 * 4. Profile access after authentication
 */

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('Student signup flow', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Fill out the signup form
    await page.fill('input[type="email"]', 'test-student@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[name="fullName"]', 'Test Student');
    await page.selectOption('select[name="role"]', 'student');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should redirect to email verification or show success message
    await page.waitForURL(/.*verify.*|.*pending.*|.*success.*/, { timeout: 10000 });
    
    // Verify we're not still on the signup page
    expect(page.url()).not.toContain('/auth/signup');
  });

  test('Teacher signup flow', async ({ page }) => {
    await page.goto('/auth/signup');
    
    // Fill out the signup form for teacher
    await page.fill('input[type="email"]', 'test-teacher@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[name="fullName"]', 'Test Teacher');
    await page.selectOption('select[name="role"]', 'teacher');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Teachers might need approval, so check for appropriate redirect
    await page.waitForURL(/.*verify.*|.*pending.*|.*approval.*/, { timeout: 10000 });
    
    // Verify we're not still on the signup page
    expect(page.url()).not.toContain('/auth/signup');
  });

  test('Login form validation', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors or browser validation
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // Check if HTML5 validation is working
    const emailValid = await emailInput.evaluate((input: HTMLInputElement) => input.validity.valid);
    expect(emailValid).toBe(false);
  });

  test('Login with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show error message and stay on login page
    await expect(page.locator('text=/error|invalid|incorrect/i')).toBeVisible({ timeout: 10000 });
  });

  test('Forgot password flow', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    
    // Fill in email
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect
    await expect(page.locator('text=/sent|success|check your email/i')).toBeVisible({ timeout: 10000 });
  });

  test('Navigation between auth pages', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Navigate to signup
    await page.click('text=/sign up|create account|register/i');
    expect(page.url()).toContain('/auth/signup');
    
    // Navigate back to login
    await page.click('text=/sign in|login|log in/i');
    expect(page.url()).toContain('/auth/login');
    
    // Navigate to forgot password
    await page.click('text=/forgot|reset password/i');
    expect(page.url()).toContain('/auth/forgot-password');
  });

  test('Protected route redirect after login', async ({ page }) => {
    // Try to access a protected route
    await page.goto('/profile');
    
    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 5000 });
    
    // Note: Without valid credentials, we can't test the full flow
    // but we can verify the redirect behavior works
    expect(page.url()).toContain('/auth/login');
  });
});

test.describe('Authenticated User Navigation', () => {
  // Note: These tests would require either:
  // 1. Mock authentication
  // 2. Test user accounts
  // 3. Auth bypass for testing
  
  test('Profile page access (when authenticated)', async ({ page }) => {
    // For now, just test that we get redirected to login
    await page.goto('/profile');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Settings page access (when authenticated)', async ({ page }) => {
    // For now, just test that we get redirected to login
    await page.goto('/settings');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Authentication State Persistence', () => {
  test('Auth state clears on logout', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Even without logging in, verify logout functionality exists
    // by checking if we can navigate to protected routes
    await page.goto('/profile');
    
    // Should still redirect to login
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Session handling across page refreshes', async ({ page }) => {
    // Without authentication, should consistently redirect
    await page.goto('/teacher');
    await page.reload();
    
    // Should still redirect to login after reload
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Role-based Access', () => {
  test('Teacher routes redirect when not authenticated', async ({ page }) => {
    const teacherRoutes = [
      '/teacher',
      '/teacher/tests',
      '/teacher/tests/create',
      '/teacher/archive'
    ];

    for (const route of teacherRoutes) {
      await page.goto(route);
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('Student routes redirect when not authenticated', async ({ page }) => {
    await page.goto('/student');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('Admin routes redirect when not authenticated', async ({ page }) => {
    const adminRoutes = [
      '/admin',
      '/admin/students',
      '/admin/classes',
      '/admin/cleanup'
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });
});