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
	class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-blue-600 focus:ring-inset sm:text-sm sm:leading-6 {className}"
/>
