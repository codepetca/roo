<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import AuthGuard from '$lib/components/auth/AuthGuard.svelte';

	let { children, data }: { children?: Snippet; data: LayoutData } = $props();

	// children is used in the {@render children?.()} below

	// Defense-in-depth: Server-side auth (via +layout.server.ts) + client-side auth guard
	// Authentication and user data comes from +layout.server.ts
	console.log('🎯 Teacher layout loaded with user:', data.user.email);
</script>

<!-- Client-side authentication guard for defense-in-depth protection -->
<AuthGuard requiredRole="teacher">
	{#snippet children()}
		<!-- Three-panel layout: Full viewport height, no padding needed at this level -->
		<div class="flex h-[calc(100vh-3rem)] flex-col">
			<!-- Child pages will implement the three-panel structure -->
			{@render children?.()}
		</div>
	{/snippet}
</AuthGuard>
