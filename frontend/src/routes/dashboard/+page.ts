import { redirect } from '@sveltejs/kit';

export function load({ url }) {
	// Redirect to login with current path as redirect parameter
	// This preserves the user's intent to access /dashboard
	const currentPath = url.pathname;
	redirect(308, `/login?redirect=${encodeURIComponent(currentPath)}`);
}
