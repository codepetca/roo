import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// Use the dev server for testing against real Firebase
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 90000 // Reasonable timeout for dev server startup
	},
	testDir: 'e2e',
	// Optimized project configuration
	projects: [
		{
			name: 'chromium',
			use: { 
				...devices['Desktop Chrome'],
				// Optimize for test performance
				launchOptions: {
					args: ['--disable-dev-shm-usage', '--disable-extensions']
				}
			}
		}
	],
	// Balanced retry strategy
	retries: process.env.CI ? 2 : 1,
	// Use appropriate reporter
	reporter: process.env.CI ? [['github'], ['html']] : 'html',
	// Reasonable global timeout
	timeout: 45000,
	// Run tests in parallel for better performance
	workers: process.env.CI ? 2 : undefined,
	// Fail fast in CI
	forbidOnly: !!process.env.CI,
	// Global configuration for all tests
	use: {
		baseURL: 'http://localhost:5173',
		actionTimeout: 20000,
		navigationTimeout: 20000,
		// Collect trace only on retry for debugging
		trace: 'on-first-retry',
		// Screenshot only on failure
		screenshot: 'only-on-failure',
		// Video for debugging failed tests
		video: 'retain-on-failure',
		// Reduce console log noise
		ignoreHTTPSErrors: true
	}
});
