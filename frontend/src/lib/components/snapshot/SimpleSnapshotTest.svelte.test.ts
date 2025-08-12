/**
 * Simple test to verify component testing works
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TestComponent from '../TestComponent.svelte';

describe('Simple Component Test', () => {
	it('should render without errors', async () => {
		const screen = render(TestComponent, { props: { message: 'Hello Test' } });
		expect(screen).toBeDefined();

		// Check if the content is rendered
		const element = screen.getByText('Hello Test');
		expect(element).toBeInTheDocument();
	});

	it('should handle basic mocking', () => {
		const mockFn = vi.fn();
		mockFn('test');
		expect(mockFn).toHaveBeenCalledWith('test');
	});
});
