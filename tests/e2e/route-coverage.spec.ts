import { test, expect } from '@playwright/test';

/**
 * Route Coverage Tests
 * 
 * These tests visit every route in the application to ensure:
 * 1. Pages load without errors
 * 2. Basic layout elements are present
 * 3. No JavaScript errors in console
 * 4. Proper redirects work
 */

test.describe('Public Routes', () => {
  test('Home page loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Codegrade/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Signup page loads correctly', async ({ page }) => {
    await page.goto('/auth/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible(); // Role selector
  });

  test('Forgot password page loads correctly', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Reset password page loads correctly', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('Email verification page loads correctly', async ({ page }) => {
    await page.goto('/auth/verify-email');
    await expect(page.locator('text=Email Verification')).toBeVisible();
  });

  test('Pending approval page loads correctly', async ({ page }) => {
    await page.goto('/auth/pending-approval');
    await expect(page.locator('text=Approval Pending')).toBeVisible();
  });
});

test.describe('Test Routes (Sentry Integration)', () => {
  test('Sentry example page loads correctly', async ({ page }) => {
    await page.goto('/sentry-example-page');
    await expect(page.locator('button')).toBeVisible();
  });

  test('Test Sentry page loads correctly', async ({ page }) => {
    await page.goto('/test-sentry');
    await expect(page.locator('button', { hasText: 'Test Client Error' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Test Server Error' })).toBeVisible();
  });

  test('Test 404 page loads correctly', async ({ page }) => {
    await page.goto('/test-404');
    await expect(page.locator('button', { hasText: 'Test Client 404' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Test API 404' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Test JS Error' })).toBeVisible();
  });
});

test.describe('Protected Routes (Should Redirect)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  const protectedRoutes = [
    '/profile',
    '/settings',
    '/teacher',
    '/teacher/tests',
    '/teacher/tests/create',
    '/teacher/archive',
    '/teacher/print',
    '/teacher/test-samples',
    '/student',
    '/admin',
    '/admin/students',
    '/admin/classes',
    '/admin/cleanup'
  ];

  protectedRoutes.forEach(route => {
    test(`${route} redirects to login when not authenticated`, async ({ page }) => {
      await page.goto(route);
      
      // Should either be redirected to login or show login form
      await page.waitForURL('**/auth/login**', { timeout: 5000 }).catch(() => {
        // If not redirected, check if login form is visible
        return expect(page.locator('input[type="email"]')).toBeVisible();
      });
    });
  });
});

test.describe('API Routes', () => {
  test('API endpoints return proper responses', async ({ request }) => {
    // Test some basic API endpoints that should return 401 for unauthenticated requests
    const apiRoutes = [
      '/api/questions',
      '/api/tests/create',
      '/api/submissions'
    ];

    for (const route of apiRoutes) {
      const response = await request.get(route);
      // Should get 401 Unauthorized or 404 Not Found, not 500 Internal Server Error
      expect([401, 404, 405]).toContain(response.status());
    }
  });
});

test.describe('Non-existent Routes', () => {
  test('404 page handling', async ({ page }) => {
    await page.goto('/this-route-definitely-does-not-exist');
    
    // Should show some kind of error state, not crash
    // The exact behavior depends on your 404 handling
    await expect(page.locator('body')).toBeVisible();
  });

  test('API 404 handling', async ({ request }) => {
    const response = await request.get('/api/this-endpoint-does-not-exist');
    expect(response.status()).toBe(404);
  });
});

test.describe('Console Error Detection', () => {
  test('No console errors on public pages', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const publicRoutes = [
      '/',
      '/auth/login',
      '/auth/signup',
      '/auth/forgot-password'
    ];

    for (const route of publicRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Filter out known test errors or expected errors
      const unexpectedErrors = consoleErrors.filter(error => 
        !error.includes('Sentry') && 
        !error.includes('test') &&
        !error.includes('favicon')
      );
      
      expect(unexpectedErrors).toHaveLength(0);
      consoleErrors.length = 0; // Clear for next iteration
    }
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE size
  });

  test('Home page is mobile responsive', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content doesn't overflow
    const bodyWidth = await page.locator('body').boundingBox();
    expect(bodyWidth?.width).toBeLessThanOrEqual(375);
  });

  test('Login page is mobile responsive', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Form should be usable on mobile
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await emailInput.click();
    await expect(emailInput).toBeFocused();
  });
});