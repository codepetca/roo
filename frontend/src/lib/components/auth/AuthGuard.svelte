<!--
Client-side authentication guard component
Location: frontend/src/lib/components/auth/AuthGuard.svelte
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { LoadingSpinner } from '$lib/components/ui';
	import type { Snippet } from 'svelte';

	// Props
	interface Props {
		requiredRole?: 'teacher' | 'student';
		children?: Snippet;
	}

	let { requiredRole, children }: Props = $props();

	// Reactive state
	let loading = $state(true);
	let redirecting = $state(false);
	let authInitialized = $state(false);

	// Wait for auth initialization on component mount
	$effect(() => {
		async function initializeAuthGuard() {
			console.log('🛡️ AuthGuard: Waiting for auth initialization...');

			try {
				// Wait for auth store to be fully initialized
				await auth.waitForInitialization();
				console.log('✅ AuthGuard: Auth initialization complete');
				authInitialized = true;
			} catch (error) {
				console.error('❌ AuthGuard: Auth initialization failed:', error);
				// Proceed anyway to prevent infinite loading
				authInitialized = true;
			} finally {
				loading = false;
			}
		}

		// Only initialize once
		if (!authInitialized) {
			initializeAuthGuard();
		}
	});

	// Check auth state and handle redirects only after initialization
	$effect(() => {
		if (!authInitialized || redirecting) {
			return; // Skip checks until properly initialized
		}

		console.log('🛡️ AuthGuard: Checking auth state', {
			isAuthenticated: auth.isAuthenticated(),
			userRole: auth.user?.role,
			requiredRole
		});

		// Not authenticated - redirect to login
		if (!auth.isAuthenticated()) {
			console.log('🛡️ AuthGuard: User not authenticated, redirecting to login');
			redirecting = true;
			const currentPath = $page.url.pathname;
			goto(`/login?redirect=${encodeURIComponent(currentPath)}`);
			return;
		}

		// Check role requirements
		if (requiredRole && auth.user?.role !== requiredRole) {
			console.log('🛡️ AuthGuard: Role mismatch, redirecting to appropriate dashboard', {
				userRole: auth.user?.role,
				requiredRole
			});
			redirecting = true;
			// Redirect to appropriate dashboard based on user's actual role
			if (auth.user?.role === 'teacher') {
				goto('/teacher');
			} else {
				goto('/student');
			}
			return;
		}

		// All checks passed
		console.log('✅ AuthGuard: Authentication checks passed');
		redirecting = false;
	});
</script>

{#if loading || redirecting || !authInitialized}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<LoadingSpinner size="lg" />
			<p class="mt-4 text-gray-600">
				{#if !authInitialized}
					Initializing authentication...
				{:else if loading}
					Checking authentication...
				{:else}
					Redirecting...
				{/if}
			</p>
		</div>
	</div>
{:else if auth.isAuthenticated() && (!requiredRole || auth.user?.role === requiredRole)}
	<!-- Render protected content -->
	{@render children?.()}
{:else}
	<!-- Fallback - should not normally be reached due to redirects -->
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<LoadingSpinner size="sm" />
			<p class="mt-4 text-gray-600">Verifying access...</p>
		</div>
	</div>
{/if}
