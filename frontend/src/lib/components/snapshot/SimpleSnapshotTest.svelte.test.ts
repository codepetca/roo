/**
 * Simple test to verify component testing works
 */

import { describe, it, expect, vi } from 'vitest';

// Mock UI components
vi.mock('$lib/components/ui', () => ({
	Card: vi.fn(({ children }) => `<div class="card">${children?.() || ''}</div>`),
	Badge: vi.fn(({ children }) => `<span class="badge">${children?.() || ''}</span>`)
}));

describe('Simple Component Test', () => {
	it('should work with basic testing', async () => {
		// Just test that basic vitest functionality works
		const result = { message: 'Hello Test' };
		expect(result).toBeDefined();
		expect(result.message).toBe('Hello Test');
	});

	it('should handle basic mocking', () => {
		const mockFn = vi.fn();
		mockFn('test');
		expect(mockFn).toHaveBeenCalledWith('test');
	});
});
