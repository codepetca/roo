import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
	// Load environment based on PUBLIC_ENVIRONMENT if set, otherwise use mode
	const env = process.env.PUBLIC_ENVIRONMENT || mode;
	const envDir = process.cwd();
	
	// Load environment variables
	const envVars = loadEnv(env, envDir, '');
	
	console.log(`🌍 Frontend Environment: ${env}`);
	if (env === 'development') {
		console.log('🔧 Frontend configured for emulators');
	}
	
	return {
		plugins: [tailwindcss(), sveltekit()],
		resolve: {
			alias: {
				'@shared': path.resolve(__dirname, '../functions/shared')
			}
		},
		envDir: envDir,
		test: {
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts'],
					globals: true
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					globals: true
				}
			}
		]
		}
	};
});
