/**
 * SvelteKit server hooks for authentication and route protection
 * Location: frontend/src/hooks.server.ts
 */

import { redirect, type Handle } from '@sveltejs/kit';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { PUBLIC_FIREBASE_PROJECT_ID, PUBLIC_USE_EMULATORS } from '$env/static/public';

// Initialize Firebase Admin SDK
let adminApp: App;
let adminAuth: Auth;

try {
	if (getApps().length === 0) {
		if (PUBLIC_USE_EMULATORS === 'true') {
			// Use emulator in development
			process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
			adminApp = initializeApp({
				projectId: PUBLIC_FIREBASE_PROJECT_ID
			});
		} else {
			// Use service account in production
			adminApp = initializeApp({
				credential: cert({
					projectId: PUBLIC_FIREBASE_PROJECT_ID
					// Add other credential fields as needed
				})
			});
		}
		adminAuth = getAuth(adminApp);
	} else {
		adminApp = getApps()[0]!;
		adminAuth = getAuth(adminApp);
	}
} catch (error) {
	console.warn('Firebase Admin initialization warning:', error);
}

/**
 * Determine user role based on email domain or custom claims
 */
function getUserRole(decodedToken: any): 'teacher' | 'student' {
	// First check custom claims
	if (decodedToken.role === 'teacher' || decodedToken.role === 'student') {
		return decodedToken.role;
	}

	// Fallback to email-based role detection
	if (decodedToken.email) {
		if (
			decodedToken.email.endsWith('@teacher.edu') ||
			decodedToken.email.includes('teacher') ||
			decodedToken.email === 'teacher@test.com'
		) {
			return 'teacher';
		}
	}

	return 'student';
}

/**
 * Verify Firebase ID token and extract user info
 */
async function verifyToken(
	token: string
): Promise<{ uid: string; email?: string; role: 'teacher' | 'student' } | null> {
	try {
		const decodedToken = await adminAuth.verifyIdToken(token);
		return {
			uid: decodedToken.uid,
			email: decodedToken.email,
			role: getUserRole(decodedToken)
		};
	} catch (error) {
		console.error('Token verification failed:', error);
		return null;
	}
}

/**
 * Handle authentication and route protection
 */
export const handle: Handle = async ({ event, resolve }) => {
	const { url, cookies } = event;

	// Get auth token from cookies or Authorization header
	const authToken =
		cookies.get('auth-token') || event.request.headers.get('authorization')?.replace('Bearer ', '');

	// Initialize user in locals
	event.locals.user = null;

	// Verify token if present
	if (authToken && adminAuth) {
		const user = await verifyToken(authToken);
		if (user) {
			event.locals.user = user;
		}
	}

	// Protected routes that require authentication
	const protectedPaths = ['/dashboard'];
	const isProtectedRoute = protectedPaths.some((path) => url.pathname.startsWith(path));

	// Redirect unauthenticated users from protected routes
	if (isProtectedRoute && !event.locals.user) {
		throw redirect(302, '/login?redirect=' + encodeURIComponent(url.pathname));
	}

	// Role-based route protection and redirects
	if (event.locals.user && url.pathname.startsWith('/dashboard')) {
		const userRole = event.locals.user.role;

		// Teacher-only routes
		if (url.pathname.startsWith('/dashboard/teacher') && userRole !== 'teacher') {
			throw redirect(302, '/dashboard/student');
		}

		// Student-only routes
		if (url.pathname.startsWith('/dashboard/student') && userRole !== 'student') {
			throw redirect(302, '/dashboard/teacher');
		}

		// Redirect base dashboard to role-specific dashboard
		if (url.pathname === '/dashboard' || url.pathname === '/dashboard/') {
			if (userRole === 'teacher') {
				throw redirect(302, '/dashboard/teacher');
			} else {
				throw redirect(302, '/dashboard/student');
			}
		}
	}

	// Redirect authenticated users from login page to their role-specific dashboard
	if (url.pathname === '/login' && event.locals.user) {
		const userRole = event.locals.user.role;
		if (userRole === 'teacher') {
			throw redirect(302, '/dashboard/teacher');
		} else {
			throw redirect(302, '/dashboard/student');
		}
	}

	return resolve(event);
};
