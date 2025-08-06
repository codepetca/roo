<!--
Client-side authentication guard component
Location: frontend/src/lib/components/auth/AuthGuard.svelte
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth.svelte';
	import { LoadingSpinner } from '$lib/components/ui';

	// Props
	interface Props {
		requiredRole?: 'teacher' | 'student';
	}

	let { requiredRole }: Props = $props();

	// Reactive state
	let loading = $state(true);
	let redirecting = $state(false);

	// Check auth state and handle redirects
	$effect(() => {
		if (!auth.loading) {
			loading = false;

			// Not authenticated - redirect to login
			if (!auth.isAuthenticated()) {
				if (!redirecting) {
					redirecting = true;
					const currentPath = $page.url.pathname;
					goto(`/login?redirect=${encodeURIComponent(currentPath)}`);
				}
				return;
			}

			// Check role requirements
			if (requiredRole && auth.user?.role !== requiredRole) {
				if (!redirecting) {
					redirecting = true;
					// Redirect to appropriate dashboard based on user's actual role
					if (auth.user?.role === 'teacher') {
						goto('/dashboard/teacher');
					} else {
						goto('/dashboard/student');
					}
				}
				return;
			}

			// All checks passed
			redirecting = false;
		}
	});
</script>

{#if loading || redirecting}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<LoadingSpinner size="lg" />
			<p class="mt-4 text-gray-600">
				{loading ? 'Checking authentication...' : 'Redirecting...'}
			</p>
		</div>
	</div>
{:else if auth.isAuthenticated() && (!requiredRole || auth.user?.role === requiredRole)}
	<!-- Render protected content -->
	<slot />
{:else}
	<!-- Fallback - should not normally be reached due to redirects -->
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<p class="text-gray-600">Authentication required...</p>
		</div>
	</div>
{/if}
