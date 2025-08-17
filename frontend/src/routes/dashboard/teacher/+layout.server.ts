import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	console.log('🔐 Simple server-side teacher route access check...');

	// Check for basic authentication cookie presence
	const authToken = cookies.get('auth-token') || cookies.get('firebase-auth-token');
	
	if (!authToken) {
		console.log('❌ No auth token found, redirecting to login');
		throw redirect(302, '/login?redirect=/dashboard/teacher');
	}

	console.log('✅ Auth token found, allowing access to teacher routes');
	
	// Return minimal user data - real user validation happens client-side
	// This is a simplified approach that just checks for token presence
	return {
		user: {
			id: 'placeholder',
			email: 'placeholder@example.com',
			name: 'Loading...',
			role: 'teacher' as const,
			schoolEmail: '',
			classroomIds: [],
			totalStudents: 0,
			totalClassrooms: 0,
			createdAt: new Date(),
			updatedAt: new Date()
		}
	};
};