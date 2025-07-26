<script lang="ts">
	import { page } from '$app/stores';
	import { auth } from '$lib/stores';
	import LogoutButton from '$lib/components/auth/LogoutButton.svelte';
	import { Badge } from '$lib/components/ui';
	import type { Snippet } from 'svelte';

	// Accept children snippet
	let { children }: { children?: Snippet } = $props();

	// NavItem interface removed - unused

	// Role-based navigation items
	let navItems = $derived(() => {
		const userRole = auth.user?.role;

		if (userRole === 'teacher') {
			return [
				{
					href: '/dashboard/teacher',
					label: 'Overview',
					icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
				},
				{
					href: '/dashboard/teacher/assignments',
					label: 'Assignments',
					icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
				},
				{
					href: '/dashboard/teacher/grades',
					label: 'Grades',
					icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
				}
			];
		} else {
			// Student navigation
			return [
				{
					href: '/dashboard/student',
					label: 'Overview',
					icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z'
				},
				{
					href: '/dashboard/student/grades',
					label: 'My Grades',
					icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
				}
			];
		}
	});

	let sidebarOpen = $state(false);

	function isActivePath(href: string): boolean {
		if (href.endsWith('/teacher') || href.endsWith('/student')) {
			return $page.url.pathname === href;
		}
		return $page.url.pathname.startsWith(href);
	}

	function closeSidebar() {
		sidebarOpen = false;
	}
</script>

<svelte:head>
	<title>Dashboard - Roo</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Mobile sidebar overlay -->
	{#if sidebarOpen}
		<button
			type="button"
			class="fixed inset-0 z-40 lg:hidden"
			onclick={closeSidebar}
			onkeydown={(e) => e.key === 'Escape' && closeSidebar()}
			aria-label="Close sidebar"
		>
			<div class="absolute inset-0 bg-gray-600 opacity-75"></div>
		</button>
	{/if}

	<!-- Sidebar -->
	<div
		class="fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'} transition-transform duration-300 ease-in-out lg:static lg:inset-0 lg:translate-x-0"
	>
		<div
			class="flex h-16 items-center justify-center bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
		>
			<div class="flex items-center space-x-2">
				<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
				<h1 class="text-xl font-bold">Roo</h1>
			</div>
		</div>

		<nav class="mt-8">
			<div class="space-y-2 px-4">
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						class="group flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors {isActivePath(
							item.href
						)
							? 'bg-blue-100 text-blue-700'
							: 'text-gray-700 hover:bg-gray-100'}"
						onclick={closeSidebar}
					>
						<svg class="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon} />
						</svg>
						{item.label}
					</a>
				{/each}
			</div>
		</nav>

		<!-- User info and logout -->
		<div class="absolute right-0 bottom-0 left-0 border-t border-gray-200 bg-gray-50 p-4">
			<div class="flex items-center justify-between">
				<div class="text-sm">
					<p class="font-medium text-gray-900">{auth.user?.email || 'User'}</p>
					<div class="mt-1 flex items-center gap-2">
						<Badge variant={auth.user?.role === 'teacher' ? 'info' : 'default'} size="sm">
							{auth.user?.role || 'Student'}
						</Badge>
					</div>
				</div>
				<LogoutButton variant="link" size="sm" />
			</div>
		</div>
	</div>

	<!-- Main content -->
	<div class="lg:pl-64">
		<!-- Top bar -->
		<div class="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
			<div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
				<!-- Mobile menu button -->
				<button
					type="button"
					class="p-2 text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset lg:hidden"
					onclick={() => (sidebarOpen = !sidebarOpen)}
					aria-label="Open navigation menu"
				>
					<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>

				<!-- Page title -->
				<div class="flex-1 lg:flex-none">
					<h2 class="text-lg font-semibold text-gray-900">
						{#if $page.url.pathname.includes('/teacher') || $page.url.pathname.includes('/student')}
							{#if $page.url.pathname.endsWith('/teacher') || $page.url.pathname.endsWith('/student')}
								Overview
							{:else if $page.url.pathname.includes('/assignments')}
								Assignments
							{:else if $page.url.pathname.includes('/grades')}
								{auth.user?.role === 'teacher' ? 'Grades' : 'My Grades'}
							{:else}
								Dashboard
							{/if}
						{:else}
							Dashboard
						{/if}
					</h2>
				</div>

				<!-- Right side actions -->
				<div class="flex items-center space-x-4">
					<!-- Welcome message -->
					<span class="hidden text-sm text-gray-600 sm:block">
						Welcome, {auth.user?.email?.split('@')[0] || 'User'}
					</span>

					<!-- Logout button for desktop -->
					<div class="hidden lg:block">
						<LogoutButton size="sm" />
					</div>
				</div>
			</div>
		</div>

		<!-- Page content -->
		<main class="py-6">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				{@render children?.()}
			</div>
		</main>
	</div>
</div>
