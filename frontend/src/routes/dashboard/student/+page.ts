import { redirect } from '@sveltejs/kit';

export function load() {
	// Redirect old student route to new route structure
	redirect(308, '/(dashboard)/student');
}
