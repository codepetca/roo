/**
 * Simple test to verify component testing works
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@vitest/browser/context';

// Mock UI components
vi.mock('$lib/components/ui', () => ({
  Card: vi.fn(({ children }) => `<div class="card">${children?.() || ''}</div>`),
  Badge: vi.fn(({ children }) => `<span class="badge">${children?.() || ''}</span>`)
}));

describe('Simple Component Test', () => {
  it('should render without errors', async () => {
    // Simple inline component to test rendering
    const TestComponent = () => `<div>Hello Test</div>`;
    
    const result = render(TestComponent);
    expect(result).toBeDefined();
  });

  it('should handle basic mocking', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});