<script lang="ts">
	let { message = 'Hello Test' }: { message?: string } = $props();
</script>

<div data-testid="test-component">{message}</div>
