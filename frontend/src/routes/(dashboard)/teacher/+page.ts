import type { PageLoad } from './$types';
import {
	PUBLIC_ENVIRONMENT,
	PUBLIC_EMULATOR_FUNCTIONS_URL,
	PUBLIC_FIREBASE_PROJECT_ID
} from '$env/static/public';

// Firebase Functions base URL
const API_BASE_URL =
	PUBLIC_ENVIRONMENT === 'development'
		? PUBLIC_EMULATOR_FUNCTIONS_URL
		: `https://us-central1-${PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;

export const load: PageLoad = async ({ fetch, parent }) => {
	console.log('📦 Loading teacher dashboard data...');

	// Get placeholder user from parent layout (real user data comes from API)
	const { user: placeholderUser } = await parent();

	try {
		// Load dashboard and assignments data in parallel
		console.log('📡 Calling Firebase Functions for dashboard data...');
		console.log('🌐 Using API base URL:', API_BASE_URL);

		// Prepare headers for authentication
		// Note: In browser context, the API client will handle auth tokens automatically
		// In server context, we'd need to pass cookies, but for now we'll make the calls without auth
		// and let the client-side API handle authentication separately

		// Load assignments data (no auth required)
		const assignmentsResponse = await fetch(`${API_BASE_URL}/api/assignments`, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		console.log('📡 Assignments API response status:', assignmentsResponse.status);

		// Handle assignments response
		let assignmentsData = [];
		if (assignmentsResponse.ok) {
			const assignmentsResult = await assignmentsResponse.json();
			assignmentsData = assignmentsResult.data || [];
			console.log('✅ Assignments data loaded:', assignmentsData.length);
		} else {
			console.warn('⚠️ Assignments API failed:', assignmentsResponse.status);
		}

		// Dashboard data will be loaded client-side where we have auth tokens
		console.log('📝 Dashboard data will be loaded client-side with authentication');

		return {
			dashboard: null, // Will be loaded client-side
			classrooms: [], // Will be loaded client-side
			assignments: assignmentsData,
			recentActivity: [], // Will be loaded client-side
			user: placeholderUser
		};
	} catch (error) {
		console.error('❌ Failed to load dashboard data:', error);

		// Return empty data instead of failing completely
		return {
			dashboard: null,
			classrooms: [],
			assignments: [],
			recentActivity: [],
			user: placeholderUser,
			error: 'Failed to load dashboard data'
		};
	}
};
