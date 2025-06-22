# Testing Documentation

This directory contains the comprehensive test suite for the Codegrade application.

## Test Structure

### E2E Tests (`/tests/e2e/`)
End-to-end tests using Playwright that verify the complete user workflows:

- **`route-coverage.spec.ts`** - Tests that all routes load correctly and handle authentication
- **`auth-flows.spec.ts`** - Authentication workflows (login, signup, password reset)
- **`teacher-workflows.spec.ts`** - Teacher-specific functionality (test creation, grading)
- **`student-workflows.spec.ts`** - Student-specific functionality (taking tests, viewing results)
- **`admin-workflows.spec.ts`** - Admin functionality (user management, system administration)
- **`smoke-tests.spec.ts`** - Critical functionality verification and quick health checks

### Unit Tests (`/src/**/*.test.ts`)
Component and utility tests using Vitest:
- Located alongside the source code they test
- Cover individual functions, components, and modules

## Running Tests

### Prerequisites
```bash
npm install
npx playwright install
```

### E2E Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI (interactive)
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug

# Run E2E tests in CI mode
npm run test:e2e:ci
```

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run unit tests once
npm run test:run

# Run unit tests with UI
npm run test:ui

# Run with coverage
npm run test:coverage
```

### All Tests
```bash
# Run complete test suite (what CI runs)
npm run deploy:build
```

## Test Development

### Writing E2E Tests

1. **Authentication State**: Most tests clear auth state and verify redirect behavior
2. **Responsive Testing**: Include mobile viewport tests for critical flows
3. **Error Scenarios**: Test both happy path and error conditions
4. **Accessibility**: Include basic accessibility checks

Example test structure:
```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should handle feature correctly', async ({ page }) => {
    await page.goto('/feature-page');
    await expect(page.locator('selector')).toBeVisible();
  });
});
```

### Writing Unit Tests

1. **Test Components**: Focus on component behavior and props
2. **Test Utilities**: Cover edge cases and error conditions
3. **Mock Dependencies**: Use Vitest mocking for external dependencies

## Test Configuration

### Playwright Configuration
- **`playwright.config.ts`** - Development configuration with all browsers
- **`playwright.ci.config.ts`** - CI-optimized configuration (single browser, sequential)

### Key Settings
- **Base URL**: `http://127.0.0.1:5173` (development server)
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Timeouts**: 60 seconds for test operations
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Video**: On failure only

## CI/CD Integration

The test suite is integrated into GitHub Actions:

1. **TypeScript Check** - Validates type safety
2. **Unit Tests** - Runs Vitest test suite
3. **E2E Tests** - Runs Playwright tests
4. **Build Verification** - Ensures production build works
5. **Deployment** - Deploys on successful tests (main branch only)

## Debugging Tests

### E2E Test Debugging
```bash
# Run with browser visible
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e -- auth-flows.spec.ts

# Run specific test
npm run test:e2e -- --grep "should login successfully"

# Debug mode with Playwright Inspector
npm run test:e2e:debug
```

### Unit Test Debugging
```bash
# Run specific test file
npm run test -- auth.test.ts

# Run tests matching pattern
npm run test -- --grep "authentication"

# Watch mode
npm run test -- --watch
```

## Test Reports

### Playwright Reports
After running E2E tests, view the HTML report:
```bash
npx playwright show-report
```

### Coverage Reports
After running unit tests with coverage:
```bash
npm run test:coverage
open coverage/index.html
```

## Authentication in Tests

Currently, tests focus on redirect behavior for unauthenticated users. To test authenticated workflows:

1. **Option A**: Create test user accounts and use real authentication
2. **Option B**: Mock authentication in test environment
3. **Option C**: Use Playwright's `page.route()` to intercept auth API calls

Example for future authenticated tests:
```typescript
test.describe('Authenticated Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Mock successful authentication
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ user: { id: 'test-user' } })
      });
    });
  });
});
```

## Best Practices

1. **Keep Tests Independent**: Each test should work in isolation
2. **Use Page Object Model**: For complex pages, create page objects
3. **Test User Flows**: Focus on complete user journeys, not just individual features
4. **Mobile Testing**: Include mobile viewport tests for responsive behavior
5. **Performance Testing**: Include basic performance checks in smoke tests
6. **Accessibility Testing**: Include keyboard navigation and screen reader tests

## Troubleshooting

### Common Issues

1. **"Timed out waiting for webServer"**
   - Ensure dev server isn't already running
   - Check if port 5173 is available
   - Verify package.json scripts are correct

2. **"Test failed: Browser closed unexpectedly"**
   - Update Playwright: `npx playwright install`
   - Check system resources
   - Run tests with `--headed` to see what's happening

3. **"Element not found"**
   - Check if element exists in current state
   - Add wait conditions: `await page.waitForSelector()`
   - Verify the page loaded correctly

4. **Flaky Tests**
   - Add proper wait conditions
   - Increase timeouts for slow operations
   - Check for race conditions
   - Use `page.waitForLoadState('networkidle')`