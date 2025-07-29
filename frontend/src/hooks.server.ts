/**
 * SvelteKit server hooks for authentication and route protection
 * Location: frontend/src/hooks.server.ts
 */

import { redirect, type Handle } from '@sveltejs/kit';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { PUBLIC_FIREBASE_PROJECT_ID, PUBLIC_USE_EMULATORS } from '$env/static/public';

// Initialize Firebase Admin SDK
let adminApp: App | null = null;
let adminAuth: Auth | null = null;

try {
	if (getApps().length === 0) {
		if (PUBLIC_USE_EMULATORS === 'true') {
			// Use emulator in development
			process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
			process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
			adminApp = initializeApp({
				projectId: PUBLIC_FIREBASE_PROJECT_ID
			});
			adminAuth = getAuth(adminApp);
		} else {
			// In production, don't initialize Admin SDK in frontend
			// Token verification will be handled by the backend API
			console.log('Production mode - skipping Firebase Admin initialization in frontend');
		}
	} else {
		adminApp = getApps()[0]!;
		adminAuth = getAuth(adminApp);
	}
} catch (error) {
	console.warn('Firebase Admin initialization warning:', error);
}

/**
 * Determine user role - now checks Firestore user profile first
 */
async function getUserRole(decodedToken: {
	uid: string;
	role?: string;
	email?: string;
}): Promise<'teacher' | 'student'> {
	try {
		// First check custom claims (fastest)
		if (decodedToken.role === 'teacher' || decodedToken.role === 'student') {
			return decodedToken.role;
		}

		// Get Firestore instance (import here to avoid circular dependencies)
		const { initializeApp, getApps, cert } = await import('firebase-admin/app');
		const { getFirestore } = await import('firebase-admin/firestore');

		let app;
		if (getApps().length === 0) {
			if (PUBLIC_USE_EMULATORS === 'true') {
				process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
				app = initializeApp({
					projectId: PUBLIC_FIREBASE_PROJECT_ID
				});
			} else {
				// In production, don't try to initialize admin SDK
				console.log('Production mode - cannot check user role from frontend');
				return 'student'; // Default fallback
			}
		} else {
			app = getApps()[0];
		}

		const db = getFirestore(app);

		// Try to get user profile from Firestore
		const userDoc = await db.collection('users').doc(decodedToken.uid).get();

		if (userDoc.exists) {
			const userData = userDoc.data();
			if (userData?.role === 'teacher' || userData?.role === 'student') {
				return userData.role;
			}
		}

		// User profile doesn't exist - they need to complete onboarding
		console.error('User profile not found for UID:', decodedToken.uid);
		throw new Error('User profile required - please complete onboarding');
	} catch (error) {
		console.error('Failed to get user role from Firestore:', error);
		throw error;
	}
}

/**
 * Verify Firebase ID token and extract user info
 */
async function verifyToken(
	token: string
): Promise<{ uid: string; email?: string; role: 'teacher' | 'student' } | null> {
	try {
		// In production mode, we don't have adminAuth initialized in frontend
		if (!adminAuth) {
			console.log('Admin auth not available - skipping token verification in production frontend');
			return null;
		}

		const decodedToken = await adminAuth.verifyIdToken(token);
		const role = await getUserRole(decodedToken);
		return {
			uid: decodedToken.uid,
			email: decodedToken.email,
			role: role
		};
	} catch (error) {
		console.error('Token verification or user profile retrieval failed:', error);
		return null;
	}
}

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
