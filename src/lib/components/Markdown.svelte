<script lang="ts">
  import { marked } from 'marked'
  
  export let content: string
  
  // Configure marked for safe HTML rendering
  marked.setOptions({
    breaks: true,
    gfm: true
  })
  
  $: htmlContent = marked(content || '')
</script>

<div class="markdown-content">
  {@html htmlContent}
</div>

<style>
  :global(.markdown-content h1) {
    @apply text-xl font-bold mb-4;
  }
  
  :global(.markdown-content h2) {
    @apply text-lg font-semibold mb-3;
  }
  
  :global(.markdown-content h3) {
    @apply text-base font-medium mb-2;
  }
  
  :global(.markdown-content p) {
    @apply mb-3;
  }
  
  :global(.markdown-content ul) {
    @apply list-disc pl-6 mb-3;
  }
  
  :global(.markdown-content ol) {
    @apply list-decimal pl-6 mb-3;
  }
  
  :global(.markdown-content li) {
    @apply mb-1;
  }
  
  :global(.markdown-content code) {
    @apply bg-gray-100 px-2 py-1 rounded text-sm font-mono text-blue-800;
  }
  
  :global(.markdown-content pre) {
    @apply bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto mb-4;
  }
  
  :global(.markdown-content pre code) {
    @apply bg-transparent p-0 text-green-400;
  }
  
  :global(.markdown-content strong) {
    @apply font-semibold;
  }
  
  :global(.markdown-content em) {
    @apply italic;
  }
  
  :global(.markdown-content blockquote) {
    @apply border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4;
  }
</style>