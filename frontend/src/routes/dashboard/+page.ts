import { redirect } from '@sveltejs/kit';

export function load({ url }) {
	// Redirect to the appropriate dashboard based on role
	// Since we don't have role info here, redirect to root and let auth handle it
	redirect(308, '/');
}
