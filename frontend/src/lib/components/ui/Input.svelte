<script lang="ts">
	interface Props {
		id?: string;
		type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		required?: boolean;
		readonly?: boolean;
		maxlength?: number;
		class?: string;
	}

	let {
		id,
		type = 'text',
		value = $bindable(''),
		placeholder,
		disabled = false,
		required = false,
		readonly = false,
		maxlength,
		class: className = ''
	}: Props = $props();

	// Enhanced debugging for Input component
	$effect(() => {
		console.log(`🔵 Input[${id || type}] - Value changed:`, JSON.stringify(value));
		console.log(`🔵 Input[${id || type}] - Value type:`, typeof value);
		console.log(`🔵 Input[${id || type}] - Value length:`, value?.length || 0);
	});

	// Debug input events
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		console.log(`🟡 Input[${id || type}] - Input event:`, target.value);
		console.log(`🟡 Input[${id || type}] - Event type:`, event.type);
	}

	function handleChange(event: Event) {
		const target = event.target as HTMLInputElement;
		console.log(`🟢 Input[${id || type}] - Change event:`, target.value);
	}
</script>

<input
	{id}
	{type}
	bind:value
	{placeholder}
	{disabled}
	{required}
	{readonly}
	{maxlength}
	oninput={handleInput}
	onchange={handleChange}
	class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6 {className}"
/>
