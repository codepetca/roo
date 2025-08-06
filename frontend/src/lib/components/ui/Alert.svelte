<script lang="ts">
	interface Props {
		variant?: 'success' | 'warning' | 'error' | 'info';
		title?: string;
		dismissible?: boolean;
		onDismiss?: () => void;
		class?: string;
		children: import('svelte').Snippet;
	}

	let {
		variant = 'info',
		title,
		dismissible = false,
		onDismiss,
		class: className = '',
		children
	}: Props = $props();

	let visible = $state(true);

	let alertClasses = $derived(() => {
		const base = 'rounded-lg p-4 border';

		const variants = {
			success: 'bg-green-50 border-green-200 text-green-800',
			warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
			error: 'bg-red-50 border-red-200 text-red-800',
			info: 'bg-blue-50 border-blue-200 text-blue-800'
		};

		return `${base} ${variants[variant]} ${className}`;
	});

	let iconPath = $derived(() => {
		const icons = {
			success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			warning:
				'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.734-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z',
			error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
			info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		};
		return icons[variant];
	});

	function handleDismiss() {
		visible = false;
		if (onDismiss) {
			onDismiss();
		}
	}
</script>

{#if visible}
	<div class={alertClasses} role="alert">
		<div class="flex items-start">
			<svg
				class="mt-0.5 mr-3 h-5 w-5 flex-shrink-0"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={iconPath} />
			</svg>

			<div class="flex-1">
				{#if title}
					<h3 class="mb-1 font-medium">{title}</h3>
				{/if}
				<div class="text-sm">
					{@render children()}
				</div>
			</div>

			{#if dismissible}
				<button
					onclick={handleDismiss}
					class="hover:bg-opacity-10 ml-4 flex-shrink-0 rounded-md p-1 transition-colors hover:bg-black"
					aria-label="Dismiss alert"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			{/if}
		</div>
	</div>
{/if}
