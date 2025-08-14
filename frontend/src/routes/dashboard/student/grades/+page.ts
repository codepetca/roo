import { redirect } from '@sveltejs/kit';

export function load() {
	redirect(308, '/(dashboard)/student/grades');
}