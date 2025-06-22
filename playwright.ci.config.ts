import { defineConfig, devices } from '@playwright/test';

/**
 * CI-specific Playwright configuration
 * Optimized for GitHub Actions and automated testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential execution for CI stability
  forbidOnly: true, // Fail if test.only is found
  retries: 2, // Retry failed tests
  workers: 1, // Single worker for CI
  reporter: [
    ['html'],
    ['github'], // GitHub Actions integration
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false, // Always start fresh in CI
    timeout: 120 * 1000, // 2 minutes timeout
  },
});