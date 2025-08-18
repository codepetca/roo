<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';

	let { children, data }: { children?: Snippet; data: LayoutData } = $props();

	// Defense-in-depth: Server-side auth (via +layout.server.ts) + client-side auth guard
	// Authentication and user data comes from +layout.server.ts
	console.log('🎯 Teacher layout loaded with user:', data.user.email);
</script>

<!-- Client-side authentication guard for defense-in-depth protection -->
<AuthGuard requiredRole="teacher">
	{#snippet children()}
		<!-- Simple layout without sidebar complexity -->
		<div class="flex h-[calc(100vh-4rem)]">
			<div class="flex-1 overflow-auto">
				<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
					{@render children?.()}
				</div>
			</div>
		</div>
	{/snippet}
</AuthGuard>
