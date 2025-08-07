import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// Use the dev server instead of preview for real Firebase testing
	webServer: {
		command: 'npm run dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: 120000 // Longer timeout for dev server startup
	},
	testDir: 'e2e',
	// Longer timeouts for real Firebase network calls
	use: {
		baseURL: 'http://localhost:5173',
		actionTimeout: 30000,
		navigationTimeout: 30000,
		// Collect trace on failure for debugging
		trace: 'on-first-retry',
		// Screenshot on failure
		screenshot: 'only-on-failure'
	},
	// Configure projects for different test scenarios
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],
	// Retry failed tests once
	retries: process.env.CI ? 2 : 1,
	// Reporter configuration
	reporter: process.env.CI ? 'github' : 'html',
	// Global timeout for each test
	timeout: 60000
});
