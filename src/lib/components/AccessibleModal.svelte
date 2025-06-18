<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { trapFocus } from '$lib/utils/accessibility.js'
  
  interface Props {
    isOpen: boolean
    title: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    closeOnBackdrop?: boolean
  }
  
  let {
    isOpen = false,
    title,
    size = 'md',
    closeOnBackdrop = true
  }: Props = $props()
  
  const dispatch = createEventDispatcher()
  
  let modal: HTMLDivElement
  let cleanup: (() => void) | null = null
  
  const sizeClasses = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl'
  }
  
  function closeModal() {
    dispatch('close')
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal()
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      closeModal()
    }
  }
  
  $effect(() => {
    if (isOpen && modal) {
      // Trap focus within modal
      cleanup = trapFocus(modal)
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      // Add event listeners
      document.addEventListener('keydown', handleKeydown)
      
      return () => {
        cleanup?.()
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleKeydown)
      }
    }
  })
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Backdrop overlay -->
      <div 
        class="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
        aria-hidden="true"
        onclick={handleBackdropClick}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (closeOnBackdrop) closeModal()
          }
        }}
        role="button"
        tabindex="-1"
      ></div>

      <!-- Modal panel -->
      <div 
        bind:this={modal}
        class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle {sizeClasses[size]} sm:w-full"
      >
        <!-- Header -->
        <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
          <div class="flex items-center justify-between mb-4">
            <h3 
              id="modal-title"
              class="text-lg leading-6 font-medium text-gray-900"
            >
              {title}
            </h3>
            <button
              onclick={closeModal}
              class="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Close modal"
            >
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Content slot -->
          <div class="mt-2">
            <slot name="content" />
          </div>
        </div>
        
        <!-- Footer -->
        {#if $$slots.footer}
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <slot name="footer" />
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure focus styles are visible */
  :global(.focus\:ring-2:focus) {
    outline: 2px solid transparent;
    outline-offset: 2px;
  }
</style>