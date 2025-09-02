import { defineConfig, devices } from '@playwright/test';

// Environment configuration for three-stage testing
const TEST_ENVIRONMENT = process.env.TEST_ENVIRONMENT || 'emulator';
const isEmulator = TEST_ENVIRONMENT === 'emulator';
const isStaging = TEST_ENVIRONMENT === 'staging';
const isProduction = TEST_ENVIRONMENT === 'production';

export default defineConfig({
	// Environment-aware server configuration
	webServer: {
		command: isEmulator ? 'npm run dev' : `TEST_ENVIRONMENT=${TEST_ENVIRONMENT} npm run dev`,
		port: 5173,
		reuseExistingServer: !process.env.CI,
		timeout: isEmulator ? 60000 : 120000, // Emulators start faster
		env: {
			TEST_ENVIRONMENT
		}
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
	// Environment-aware retry and performance configuration
	retries: isProduction ? 0 : (process.env.CI ? 2 : 1), // No retries in production (read-only)
	reporter: process.env.CI ? [['github'], ['html']] : 'html',
	timeout: isEmulator ? 30000 : (isStaging ? 60000 : 45000), // Emulators are faster
	workers: isEmulator ? undefined : (process.env.CI ? 2 : 1), // More parallel on emulators
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
