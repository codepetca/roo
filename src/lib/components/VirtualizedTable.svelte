<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import { createVirtualList, throttle } from '$lib/utils/performance.js'
  
  interface TableColumn {
    key: string
    label: string
    width?: string
    render?: (item: any) => string
  }
  
  interface Props {
    items: any[]
    columns: TableColumn[]
    itemHeight?: number
    containerHeight?: number
    emptyMessage?: string
  }
  
  let {
    items,
    columns,
    itemHeight = 60,
    containerHeight = 400,
    emptyMessage = 'No items found'
  }: Props = $props()
  
  const dispatch = createEventDispatcher()
  
  let container: HTMLDivElement
  let scrollTop = $state(0)
  
  const virtualList = $derived(() => 
    createVirtualList(items, itemHeight, containerHeight)
  )
  
  const visibleData = $derived(() => 
    virtualList.getVisibleItems(scrollTop)
  )
  
  const throttledScroll = throttle((e: Event) => {
    const target = e.target as HTMLElement
    scrollTop = target.scrollTop
  }, 16) // ~60fps
  
  function handleRowClick(item: any, index: number) {
    dispatch('rowClick', { item, index })
  }
  
  onMount(() => {
    container.addEventListener('scroll', throttledScroll)
    return () => {
      container.removeEventListener('scroll', throttledScroll)
    }
  })
</script>

<div class="overflow-hidden border border-gray-200 rounded-lg">
  <!-- Table Header -->
  <div class="bg-gray-50 border-b border-gray-200">
    <div class="grid gap-4 px-6 py-3" style="grid-template-columns: {columns.map(c => c.width || '1fr').join(' ')}">
      {#each columns as column}
        <div class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          {column.label}
        </div>
      {/each}
    </div>
  </div>
  
  <!-- Virtualized Table Body -->
  <div 
    bind:this={container}
    class="overflow-auto bg-white"
    style="height: {containerHeight}px"
  >
    {#if items.length === 0}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8h.01M6 8h.01"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">{emptyMessage}</h3>
        </div>
      </div>
    {:else}
      <!-- Virtual spacer -->
      <div style="height: {visibleData.totalHeight}px; position: relative;">
        <div style="transform: translateY({visibleData.offsetY}px); position: absolute; width: 100%;">
          {#each visibleData.items as item, index}
            <div 
              class="border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
              style="height: {itemHeight}px; min-height: {itemHeight}px;"
              on:click={() => handleRowClick(item, visibleData.startIndex + index)}
              role="row"
              tabindex="0"
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleRowClick(item, visibleData.startIndex + index)
                }
              }}
            >
              <div class="grid gap-4 px-6 py-3 items-center h-full" style="grid-template-columns: {columns.map(c => c.width || '1fr').join(' ')}">
                {#each columns as column}
                  <div class="text-sm text-gray-900">
                    {#if column.render}
                      {@html column.render(item)}
                    {:else}
                      {item[column.key] || '-'}
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>