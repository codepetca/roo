<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores';
	import LogoutButton from '$lib/components/auth/LogoutButton.svelte';
	import { Badge } from '$lib/components/ui';

	// Navigation items
	let navItems = $derived.by(() => {
		const userRole = auth.user?.role;

		if (userRole === 'teacher') {
			return [{ href: '/teacher/onboarding', label: 'Sheet Setup' }];
		} else {
			return [];
		}
	});

	function isActivePath(href: string): boolean {
		if (href.endsWith('/teacher') || href.endsWith('/student')) {
			return $page.url.pathname === href;
		}
		return $page.url.pathname.startsWith(href);
	}
</script>

<header class="fixed top-0 right-0 left-0 z-50 border-b border-gray-200 bg-white shadow-sm">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-12 items-center justify-between">
			<!-- Logo and Brand -->
			<div class="flex items-center space-x-3">
				<div class="flex items-center space-x-2">
					<svg class="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
					<h1 class="text-xl font-bold text-gray-900">Roo</h1>
				</div>
			</div>

			<!-- Navigation Links -->
			<nav class="hidden items-center space-x-1 md:flex">
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActivePath(
							item.href
						)
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}"
					>
						{item.label}
					</a>
				{/each}
			</nav>

			<!-- User Info & Actions -->
			<div class="flex items-center space-x-4">
				<div class="hidden items-center space-x-2 text-sm sm:flex">
					<span class="text-gray-600">{auth.user?.email || 'User'}</span>
					<Badge variant={auth.user?.role === 'teacher' ? 'info' : 'default'} size="sm">
						{#snippet children()}
							{auth.user?.role || 'Student'}
						{/snippet}
					</Badge>
				</div>
				<LogoutButton size="sm" />
			</div>
		</div>
	</div>

	<!-- Mobile Navigation -->
	<nav class="border-t border-gray-200 md:hidden">
		<div class="space-y-1 px-2 py-1">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="block rounded-md px-3 py-2 text-base font-medium {isActivePath(item.href)
						? 'bg-blue-100 text-blue-700'
						: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}"
				>
					{item.label}
				</a>
			{/each}
		</div>
	</nav>
</header>
