<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		content,
		position = 'top',
		delay = 200
	}: {
		children: Snippet;
		content?: Snippet;
		position?: 'top' | 'bottom' | 'left' | 'right' | 'cursor-follow' | 'center-overlay';
		delay?: number;
	} = $props();

	// Reactive state using Svelte 5 runes
	let isVisible = $state(false);
	let timeoutId = $state<NodeJS.Timeout | null>(null);
	let tooltipElement = $state<HTMLDivElement>();
	let triggerElement = $state<HTMLDivElement>();
	let mouseX = $state(0);
	let mouseY = $state(0);

	// Position classes for different tooltip positions
	const positionClasses = $derived(() => {
		switch (position) {
			case 'top':
				return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
			case 'bottom':
				return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
			case 'left':
				return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
			case 'right':
				return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
			case 'cursor-follow':
				return 'fixed pointer-events-none z-[9999]';
			case 'center-overlay':
				return 'fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none';
			default:
				return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
		}
	});

	// Dynamic positioning styles for cursor-follow mode
	const dynamicStyles = $derived(() => {
		if (position === 'cursor-follow') {
			// Position to the right of cursor with some margin
			// Add viewport boundary checks to prevent offscreen positioning
			const rightOffset = 20;
			const topOffset = -10;
			let left = mouseX + rightOffset;
			let top = mouseY + topOffset;
			
			// Ensure tooltip doesn't go off the right edge of the screen
			const tooltipWidth = 450; // Approximate width for max-w-md
			if (left + tooltipWidth > window.innerWidth) {
				left = mouseX - tooltipWidth - rightOffset; // Position to the left instead
			}
			
			// Ensure tooltip doesn't go off the bottom of the screen
			const tooltipHeight = 200; // Approximate height
			if (top + tooltipHeight > window.innerHeight) {
				top = mouseY - tooltipHeight - Math.abs(topOffset);
			}
			
			// Ensure tooltip doesn't go above the top of the screen
			if (top < 0) {
				top = 10;
			}
			
			return `left: ${left}px; top: ${top}px;`;
		}
		return '';
	});

	// Check if we need a backdrop for center-overlay
	const needsBackdrop = $derived(position === 'center-overlay');

	// Arrow classes for different positions
	const arrowClasses = $derived(() => {
		switch (position) {
			case 'top':
				return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900';
			case 'bottom':
				return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-900';
			case 'left':
				return 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-900';
			case 'right':
				return 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-900';
			case 'cursor-follow':
				return 'hidden'; // No arrow for cursor-follow mode
			case 'center-overlay':
				return 'hidden'; // No arrow for center-overlay mode
			default:
				return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900';
		}
	});

	// Show arrow only for standard tooltip modes
	const showArrow = $derived(position !== 'cursor-follow' && position !== 'center-overlay');

	function showTooltip() {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			isVisible = true;
		}, delay);
	}

	function hideTooltip() {
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = null;
		}
		isVisible = false;
	}

	// Handle mouse events
	function handleMouseEnter() {
		showTooltip();
	}

	function handleMouseLeave() {
		hideTooltip();
	}

	function handleMouseMove(event: MouseEvent) {
		if (position === 'cursor-follow') {
			mouseX = event.clientX;
			mouseY = event.clientY;
		}
	}

	// Handle focus events for accessibility
	function handleFocus() {
		showTooltip();
	}

	function handleBlur() {
		hideTooltip();
	}
</script>

<div
	bind:this={triggerElement}
	class="relative block w-full"
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	onmousemove={handleMouseMove}
	onfocus={handleFocus}
	onblur={handleBlur}
	role="presentation"
>
	<!-- Trigger content -->
	{@render children()}

	<!-- Tooltip -->
	{#if isVisible}
		<div
			bind:this={tooltipElement}
			class="{positionClasses} {needsBackdrop ? 'pointer-events-auto' : 'pointer-events-none'}"
			style={dynamicStyles}
			role="tooltip"
			aria-hidden="false"
		>
			<!-- Backdrop for center-overlay mode -->
			{#if needsBackdrop}
				<div 
					class="absolute inset-0 bg-black bg-opacity-20 backdrop-blur-sm"
					onclick={hideTooltip}
					onkeydown={(e) => e.key === 'Escape' && hideTooltip()}
					role="button"
					tabindex="0"
					aria-label="Close tooltip"
				></div>
			{/if}

			<!-- Tooltip content -->
			<div
				class="rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl transition-opacity duration-200 max-w-lg min-w-fit {needsBackdrop ? 'relative z-10' : ''}"
			>
				{#if content}
					{@render content()}
				{/if}
			</div>

			<!-- Tooltip arrow -->
			{#if showArrow}
				<div class="absolute {arrowClasses}"></div>
			{/if}
		</div>
	{/if}
</div>
