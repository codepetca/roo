<script lang="ts">
	import type { Snippet } from 'svelte';

	interface ModalProps {
		open: boolean;
		title?: string;
		onClose: () => void;
		children?: Snippet;
		actions?: Snippet;
		maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
	}

	let { open, title, onClose, children, actions, maxWidth = 'lg' }: ModalProps = $props();

	const maxWidthClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		'2xl': 'max-w-2xl'
	};

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			onClose();
		}
	}

	function handleEscapeKey(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}

	function handleModalKeyDown(e: KeyboardEvent) {
		// Handle keyboard events for modal interaction
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleEscapeKey} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto"
		onclick={handleBackdropClick}
		onkeydown={handleModalKeyDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby={title ? 'modal-title' : undefined}
		tabindex="-1"
	>
		<!-- Backdrop -->
		<div class="bg-opacity-50 fixed inset-0 bg-black transition-opacity"></div>

		<!-- Modal Content -->
		<div class="relative w-full {maxWidthClasses[maxWidth]} mx-auto my-6">
			<div class="relative rounded-lg bg-white shadow-xl">
				<!-- Header -->
				{#if title}
					<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
						<h2 id="modal-title" class="text-lg font-semibold text-gray-900">
							{title}
						</h2>
						<button
							onclick={onClose}
							class="text-gray-400 transition-colors hover:text-gray-600 focus:text-gray-600 focus:outline-none"
							aria-label="Close modal"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				{/if}

				<!-- Body -->
				<div class="px-6 py-4">
					{@render children?.()}
				</div>

				<!-- Actions -->
				{#if actions}
					<div class="flex items-center justify-end space-x-2 border-t border-gray-200 px-6 py-4">
						{@render actions()}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
