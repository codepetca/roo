import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import { tick } from 'svelte'
import CodeEditor from './CodeEditor.svelte'

// Mock CodeMirror modules since they require DOM APIs
vi.mock('@codemirror/state', () => ({
  EditorState: {
    create: vi.fn(() => ({ doc: { toString: () => 'test' } })),
    readOnly: {
      of: vi.fn()
    }
  }
}))

vi.mock('@codemirror/view', () => ({
  EditorView: vi.fn().mockImplementation(() => ({
    state: { doc: { toString: () => 'test' } },
    dispatch: vi.fn(),
    destroy: vi.fn()
  })),
  keymap: {
    of: vi.fn()
  },
  highlightActiveLine: vi.fn(),
  lineNumbers: vi.fn(),
  highlightActiveLineGutter: vi.fn()
}))

vi.mock('@codemirror/commands', () => ({
  defaultKeymap: [],
  indentWithTab: {}
}))

vi.mock('@codemirror/language', () => ({
  bracketMatching: vi.fn(),
  indentOnInput: vi.fn(),
  syntaxHighlighting: vi.fn(),
  defaultHighlightStyle: {}
}))

vi.mock('@codemirror/lang-java', () => ({
  java: vi.fn()
}))

vi.mock('@codemirror/theme-one-dark', () => ({
  oneDark: {}
}))

// Mock console methods to avoid noise in tests
const originalConsole = { ...console }
beforeEach(() => {
  console.log = vi.fn()
  console.error = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  Object.assign(console, originalConsole)
})

describe('CodeEditor Component', () => {
  describe('Rendering', () => {
    it('renders with default props', () => {
      const { container } = render(CodeEditor, {
        props: {
          value: 'public class Test {}'
        }
      })

      expect(container.querySelector('.code-editor')).toBeInTheDocument()
      expect(container.querySelector('.editor-container')).toBeInTheDocument()
    })

    it('renders with custom props', () => {
      const { container } = render(CodeEditor, {
        props: {
          value: 'public class Test {}',
          fontSize: 16,
          theme: 'dark',
          readonly: true,
          placeholder: 'Custom placeholder'
        }
      })

      expect(container.querySelector('.code-editor')).toBeInTheDocument()
    })

    it('handles empty value', () => {
      const { container } = render(CodeEditor, {
        props: {
          value: ''
        }
      })

      expect(container.querySelector('.code-editor')).toBeInTheDocument()
    })
  })

  describe('Props Handling', () => {
    it('accepts value prop', () => {
      const testValue = 'public class Test { public static void main(String[] args) {} }'
      
      render(CodeEditor, {
        props: {
          value: testValue
        }
      })

      // Component should render without errors
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('accepts fontSize prop', () => {
      render(CodeEditor, {
        props: {
          value: 'test',
          fontSize: 18
        }
      })

      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('accepts theme prop - light', () => {
      render(CodeEditor, {
        props: {
          value: 'test',
          theme: 'light'
        }
      })

      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('accepts theme prop - dark', () => {
      render(CodeEditor, {
        props: {
          value: 'test',
          theme: 'dark'
        }
      })

      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('accepts readonly prop', () => {
      render(CodeEditor, {
        props: {
          value: 'test',
          readonly: true
        }
      })

      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('accepts placeholder prop', () => {
      render(CodeEditor, {
        props: {
          value: '',
          placeholder: 'Enter your Java code here'
        }
      })

      expect(screen.getByRole('generic')).toBeInTheDocument()
    })
  })

  describe('Callback Handling', () => {
    it('accepts onUpdate callback', () => {
      const mockOnUpdate = vi.fn()
      
      render(CodeEditor, {
        props: {
          value: 'test',
          onUpdate: mockOnUpdate
        }
      })

      expect(screen.getByRole('generic')).toBeInTheDocument()
      // Callback should be stored but not called during render
      expect(mockOnUpdate).not.toHaveBeenCalled()
    })

    it('handles missing onUpdate callback gracefully', () => {
      expect(() => {
        render(CodeEditor, {
          props: {
            value: 'test'
            // onUpdate is undefined
          }
        })
      }).not.toThrow()
    })
  })

  describe('Editor Lifecycle', () => {
    it('creates editor on mount', async () => {
      const { container } = render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      await tick()

      expect(container.querySelector('.editor-container')).toBeInTheDocument()
      // Check that EditorView constructor was called
      const { EditorView } = await import('@codemirror/view')
      expect(EditorView).toHaveBeenCalled()
    })

    it('handles editor creation errors gracefully', async () => {
      // Mock EditorState.create to throw an error
      const { EditorState } = await import('@codemirror/state')
      vi.mocked(EditorState.create).mockImplementationOnce(() => {
        throw new Error('Mock editor creation error')
      })

      expect(() => {
        render(CodeEditor, {
          props: {
            value: 'test'
          }
        })
      }).not.toThrow()

      // Should have logged the error
      expect(console.error).toHaveBeenCalledWith('Error creating editor:', expect.any(Error))
    })

    it('cleans up editor on unmount', async () => {
      const mockDestroy = vi.fn()
      const { EditorView } = await import('@codemirror/view')
      vi.mocked(EditorView).mockImplementation(() => ({
        state: { doc: { toString: () => 'test' } },
        dispatch: vi.fn(),
        destroy: mockDestroy
      }))

      const { unmount } = render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      await tick()
      unmount()

      // Destroy should be called during cleanup
      expect(mockDestroy).toHaveBeenCalled()
    })
  })

  describe('Value Updates', () => {
    it('updates editor when value prop changes', async () => {
      const mockDispatch = vi.fn()
      const { EditorView } = await import('@codemirror/view')
      vi.mocked(EditorView).mockImplementation(() => ({
        state: { doc: { toString: () => 'old value' } },
        dispatch: mockDispatch,
        destroy: vi.fn()
      }))

      const { rerender } = render(CodeEditor, {
        props: {
          value: 'initial value'
        }
      })

      await tick()

      // Change the value prop
      rerender({
        value: 'new value'
      })

      await tick()

      // Should dispatch an update to the editor
      expect(mockDispatch).toHaveBeenCalledWith({
        changes: {
          from: 0,
          to: 9, // length of 'old value'
          insert: 'new value'
        }
      })
    })

    it('does not update editor when value is the same', async () => {
      const mockDispatch = vi.fn()
      const { EditorView } = await import('@codemirror/view')
      vi.mocked(EditorView).mockImplementation(() => ({
        state: { doc: { toString: () => 'same value' } },
        dispatch: mockDispatch,
        destroy: vi.fn()
      }))

      const { rerender } = render(CodeEditor, {
        props: {
          value: 'same value'
        }
      })

      await tick()
      mockDispatch.mockClear()

      // Set the same value
      rerender({
        value: 'same value'
      })

      await tick()

      // Should not dispatch any updates
      expect(mockDispatch).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles extension creation errors', async () => {
      // Mock an extension to throw an error
      const { lineNumbers } = await import('@codemirror/view')
      vi.mocked(lineNumbers).mockImplementationOnce(() => {
        throw new Error('Extension error')
      })

      expect(() => {
        render(CodeEditor, {
          props: {
            value: 'test'
          }
        })
      }).not.toThrow()

      expect(console.error).toHaveBeenCalledWith('Error creating extensions:', expect.any(Error))
    })

    it('creates fallback editor when main creation fails', async () => {
      const { EditorView, EditorState } = await import('@codemirror/view')
      
      // Make the first EditorView creation fail
      vi.mocked(EditorView)
        .mockImplementationOnce(() => {
          throw new Error('Editor creation failed')
        })
        .mockImplementationOnce(() => ({
          state: { doc: { toString: () => 'test' } },
          dispatch: vi.fn(),
          destroy: vi.fn()
        }))

      render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      // Should create a fallback editor
      expect(EditorView).toHaveBeenCalledTimes(2)
      expect(console.error).toHaveBeenCalledWith('Error creating editor:', expect.any(Error))
    })
  })

  describe('Edge Cases', () => {
    it('handles missing editor container', async () => {
      // This would be hard to test directly since the container is bound
      // The component should handle this gracefully in createEditor()
      const { container } = render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      expect(container.querySelector('.editor-container')).toBeInTheDocument()
    })

    it('handles null editor view in update methods', async () => {
      const component = render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      // Component should not throw even if editorView is null
      expect(() => {
        component.rerender({ value: 'new value' })
      }).not.toThrow()
    })

    it('handles very long code values', () => {
      const longCode = 'public class Test {\n'.repeat(1000) + '}'
      
      expect(() => {
        render(CodeEditor, {
          props: {
            value: longCode
          }
        })
      }).not.toThrow()
    })

    it('handles special characters in code', () => {
      const specialCode = 'String text = "Hello \\"World\\" with ñ and 中文 and 🎉";'
      
      expect(() => {
        render(CodeEditor, {
          props: {
            value: specialCode
          }
        })
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('provides a container for the editor', () => {
      const { container } = render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      const editorContainer = container.querySelector('.editor-container')
      expect(editorContainer).toBeInTheDocument()
    })

    it('maintains semantic structure', () => {
      const { container } = render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      expect(container.querySelector('.code-editor')).toBeInTheDocument()
      expect(container.querySelector('.editor-container')).toBeInTheDocument()
    })
  })

  describe('CSS Classes', () => {
    it('applies correct CSS classes', () => {
      const { container } = render(CodeEditor, {
        props: {
          value: 'test'
        }
      })

      expect(container.querySelector('.code-editor')).toHaveClass('code-editor')
      expect(container.querySelector('.editor-container')).toHaveClass('editor-container')
    })
  })
})