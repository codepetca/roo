import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');
	const isProduction = mode === 'production';
	
	return {
		plugins: [sveltekit()],
		define: {
			'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
			'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.SUPABASE_SERVICE_ROLE_KEY),
			'process.env.ANTHROPIC_API_KEY': JSON.stringify(env.ANTHROPIC_API_KEY),
			'process.env.NODE_ENV': JSON.stringify(mode),
		},
		build: {
			target: 'es2020',
			minify: isProduction ? 'esbuild' : false,
			sourcemap: !isProduction,
			rollupOptions: {
				output: {
					manualChunks: (id) => {
						// Only chunk client-side modules
						if (id.includes('node_modules')) {
							if (id.includes('@supabase/supabase-js')) {
								return 'vendor-supabase'
							}
							if (id.includes('@anthropic-ai/sdk')) {
								return 'vendor-anthropic'
							}
							if (id.includes('@codemirror/')) {
								return 'vendor-codemirror'
							}
							if (id.includes('marked') || id.includes('dotenv')) {
								return 'vendor-utils'
							}
							return 'vendor'
						}
					}
				}
			}
		},
		optimizeDeps: {
			include: [
				'@supabase/supabase-js',
				'@anthropic-ai/sdk',
				'codemirror',
				'marked'
			]
		},
		server: {
			port: 5173,
			strictPort: false,
		},
		preview: {
			port: 4173,
			strictPort: false,
		}
	};
});
