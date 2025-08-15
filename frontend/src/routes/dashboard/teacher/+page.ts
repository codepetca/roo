import { redirect } from '@sveltejs/kit';

export function load() {
	// Redirect old teacher route to new route structure
	redirect(308, '/(dashboard)/teacher');
}
