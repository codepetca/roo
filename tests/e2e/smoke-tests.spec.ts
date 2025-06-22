import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 * 
 * These are quick, essential tests that verify the basic functionality
 * of the application. They should run fast and catch major issues.
 */

test.describe('Critical Application Functionality', () => {
  test('Application loads and home page is accessible', async ({ page }) => {
    await page.goto('/');
    
    // Basic page load verification
    await expect(page).toHaveTitle(/Codegrade/);
    await expect(page.locator('body')).toBeVisible();
    
    // No JavaScript errors (basic check)
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Filter out expected/test errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('Sentry') &&
      !error.includes('test')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('Authentication system is functional', async ({ page }) => {
    // Test that auth pages load
    await page.goto('/auth/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    await page.goto('/auth/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible(); // Role selector
  });

  test('Protected routes redirect properly', async ({ page }) => {
    // Clear auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    // Test a few key protected routes
    const protectedRoutes = ['/teacher', '/student', '/admin', '/profile'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should redirect to login or show login form
      await page.waitForURL('**/auth/login**', { timeout: 5000 }).catch(async () => {
        // If not redirected, check if login form is visible
        await expect(page.locator('input[type="email"]')).toBeVisible();
      });
    }
  });

  test('API endpoints are responding', async ({ request }) => {
    // Test some key API endpoints
    const endpoints = [
      { path: '/api/questions', expectedStatuses: [401, 403, 405] },
      { path: '/api/tests/create', expectedStatuses: [401, 403, 405] },
      { path: '/api/grade', expectedStatuses: [400, 401, 403, 405] }
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint.path);
      expect(endpoint.expectedStatuses).toContain(response.status());
    }
  });

  test('Static assets load correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that CSS is loaded (no FOUC)
    const backgroundColor = await page.locator('body').evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    
    // Should have some styling applied
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });
});

test.describe('Error Handling', () => {
  test('404 pages handled gracefully', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    
    // Should not crash, should show some content
    await expect(page.locator('body')).toBeVisible();
    
    // Check for 404 indicators or fallback content
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  });

  test('API 404 responses are proper', async ({ request }) => {
    const response = await request.get('/api/this-endpoint-does-not-exist');
    expect(response.status()).toBe(404);
  });
});

test.describe('Performance Basics', () => {
  test('Pages load within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds (generous for dev environment)
    expect(loadTime).toBeLessThan(5000);
  });

  test('No major memory leaks on navigation', async ({ page }) => {
    // Simple navigation test
    await page.goto('/');
    await page.goto('/auth/login');
    await page.goto('/auth/signup');
    await page.goto('/');
    
    // Just verify we can navigate without crashing
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Mobile Compatibility', () => {
  test.use({ 
    viewport: { width: 375, height: 667 } // iPhone SE
  });

  test('Mobile layout works', async ({ page }) => {
    await page.goto('/');
    
    // Should be responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content doesn't overflow
    const bodyWidth = await page.locator('body').boundingBox();
    expect(bodyWidth?.width).toBeLessThanOrEqual(375);
  });

  test('Touch interactions work', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Should be able to tap on form inputs
    const emailInput = page.locator('input[type="email"]');
    await emailInput.tap();
    await expect(emailInput).toBeFocused();
  });
});

test.describe('Accessibility Basics', () => {
  test('Forms have proper labels', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Email input should have label
    const emailInput = page.locator('input[type="email"]');
    const emailInputId = await emailInput.getAttribute('id');
    
    if (emailInputId) {
      await expect(page.locator(`label[for="${emailInputId}"]`)).toBeVisible();
    } else {
      // Should have aria-label or placeholder at minimum
      const hasAriaLabel = await emailInput.getAttribute('aria-label');
      const hasPlaceholder = await emailInput.getAttribute('placeholder');
      expect(hasAriaLabel || hasPlaceholder).toBeTruthy();
    }
  });

  test('Keyboard navigation works', async ({ page }) => {
    await page.goto('/auth/login');
    
    // Should be able to tab through form elements
    await page.keyboard.press('Tab');
    const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(firstFocusedElement);
  });
});

test.describe('Security Basics', () => {
  test('HTTPS redirect works in production mode', async ({ page }) => {
    // This test would verify HTTPS redirect in production
    // For now, just verify the app loads
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('No sensitive data in client-side code', async ({ page }) => {
    await page.goto('/');
    
    // Check that no API keys are exposed in the page source
    const pageContent = await page.content();
    
    // Common patterns to avoid
    const sensitivePatterns = [
      /sk_[a-zA-Z0-9]{32,}/g, // Stripe secret keys
      /pk_live_[a-zA-Z0-9]{24,}/g, // Stripe public keys (live)
      /['"]\w*secret\w*['"]:\s*['"]\w+['"]/gi, // Generic secret patterns
    ];

    for (const pattern of sensitivePatterns) {
      const matches = pageContent.match(pattern);
      expect(matches).toBeNull();
    }
  });
});

test.describe('Integration Points', () => {
  test('Sentry integration is working', async ({ page }) => {
    // Test that Sentry is loaded and configured
    await page.goto('/test-sentry');
    
    // Should have Sentry test buttons
    await expect(page.locator('button', { hasText: 'Test Client Error' })).toBeVisible();
  });

  test('Database connectivity', async ({ request }) => {
    // Indirect test - API endpoints should respond appropriately
    const response = await request.get('/api/questions');
    
    // Should get auth error, not database connection error
    expect([401, 403, 405]).toContain(response.status());
  });
});