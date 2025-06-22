import adapter from '@sveltejs/adapter-netlify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Auto adapter - detects deployment platform
		adapter: adapter(),
		
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
