/**
 * SvelteKit server hooks for authentication and route protection
 * Location: frontend/src/hooks.server.ts
 */

import { type Handle } from '@sveltejs/kit';
import { PUBLIC_ENVIRONMENT } from '$env/static/public';

// Firebase Admin SDK initialization is no longer needed in frontend
// Authentication is handled client-side and verified by backend API

// Set Firebase emulator environment variables for development
if (PUBLIC_ENVIRONMENT === 'development') {
	process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
	process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

// getUserRole function removed as authentication is now handled client-side

// Token verification is now handled by the backend API
// The verifyToken function has been removed as it's not used in production

/**
 * Handle requests and set security headers
 * Note: Authentication is now handled client-side due to production Firebase limitations
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Initialize user in locals (for any server-side code that might need it)
	event.locals.user = null;

	const response = await resolve(event);

	// Set security headers that allow OAuth popups to work
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
	response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');

	return response;
};
