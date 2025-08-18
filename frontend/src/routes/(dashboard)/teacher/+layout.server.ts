import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	PUBLIC_USE_EMULATORS,
	PUBLIC_FUNCTIONS_EMULATOR_URL,
	PUBLIC_FIREBASE_PROJECT_ID
} from '$env/static/public';

// API base URL - use same configuration as frontend API client
const API_BASE_URL =
	PUBLIC_USE_EMULATORS === 'true'
		? PUBLIC_FUNCTIONS_EMULATOR_URL
		: `https://us-central1-${PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

/**
 * Validate Firebase auth token against backend API
 * This ensures proper token verification using Firebase Admin SDK
 */
async function validateAuthToken(token: string): Promise<{ uid: string; email: string; role: string; displayName?: string } | null> {
	try {
		console.log('🔐 Validating auth token with backend API...');
		
		// Call backend API to validate token (uses Firebase Admin SDK)
		const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			console.log('❌ Token validation failed:', response.status, response.statusText);
			return null;
		}

		const result = await response.json();
		
		if (result.success && result.data) {
			console.log('✅ Token validation successful:', { uid: result.data.uid, email: result.data.email, role: result.data.role });
			return result.data;
		} else {
			console.log('❌ Token validation returned unsuccessful result:', result);
			return null;
		}
	} catch (error) {
		console.error('❌ Token validation error:', error);
		return null;
	}
}

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	console.log('🔐 Secure server-side teacher route access check...');

	// Check for authentication token with brief retry for race condition handling
	let authToken = cookies.get('auth-token') || cookies.get('firebase-auth-token');
	
	// If no token found, wait briefly and try once more (handles race condition)
	if (!authToken) {
		console.log('⏰ No auth token found on first attempt, retrying after brief delay...');
		await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
		authToken = cookies.get('auth-token') || cookies.get('firebase-auth-token');
	}

	if (!authToken) {
		console.log('❌ No auth token found after retry, redirecting to login');
		const redirectUrl = `/login?redirect=${encodeURIComponent(url.pathname)}`;
		throw redirect(302, redirectUrl);
	}

	// Validate token against backend API (uses Firebase Admin SDK)
	const validatedUser = await validateAuthToken(authToken);

	if (!validatedUser) {
		console.log('❌ Token validation failed, redirecting to login');
		// Clear invalid token
		cookies.delete('auth-token', { path: '/' });
		cookies.delete('firebase-auth-token', { path: '/' });
		const redirectUrl = `/login?redirect=${encodeURIComponent(url.pathname)}`;
		throw redirect(302, redirectUrl);
	}

	// Ensure user is actually a teacher
	if (validatedUser.role !== 'teacher') {
		console.log('❌ User is not a teacher, redirecting to appropriate dashboard');
		if (validatedUser.role === 'student') {
			throw redirect(302, '/student');
		} else {
			throw redirect(302, '/login');
		}
	}

	console.log('✅ Valid teacher token confirmed, allowing access');

	// Return validated user data
	return {
		user: {
			id: validatedUser.uid,
			email: validatedUser.email,
			name: validatedUser.displayName || validatedUser.email.split('@')[0],
			role: 'teacher' as const,
			schoolEmail: '', // Will be loaded client-side
			classroomIds: [],
			totalStudents: 0,
			totalClassrooms: 0,
			createdAt: new Date(),
			updatedAt: new Date()
		}
	};
};
