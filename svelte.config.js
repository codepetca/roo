import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Production-ready Node.js adapter
		adapter: adapter({
			// Output directory for the production build
			out: 'build',
			// Precompress static assets with gzip and brotli
			precompress: true,
			// Configure environment variable prefix
			envPrefix: ''
		}),
		
		// Security headers and CSP
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'unsafe-inline'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'blob:', 'https:'],
				'font-src': ['self'],
				'connect-src': ['self', 'https:'],
				'frame-src': ['none']
			}
		},
		
		
		// Security headers
		typescript: {
			config: (config) => {
				return {
					...config,
					compilerOptions: {
						...config.compilerOptions,
						// Enable strict mode for production
						strict: true,
						noUncheckedIndexedAccess: true
					}
				}
			}
		}
	}
};

export default config;
