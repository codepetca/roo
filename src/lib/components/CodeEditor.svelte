<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorState } from '@codemirror/state'
  import { EditorView, keymap, highlightActiveLine, lineNumbers, highlightActiveLineGutter } from '@codemirror/view'
  import { defaultKeymap, indentWithTab } from '@codemirror/commands'
  import { bracketMatching, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
  import { java } from '@codemirror/lang-java'
  import { oneDark } from '@codemirror/theme-one-dark'

  interface Props {
    value: string
    fontSize?: number
    theme?: 'light' | 'dark'
    readonly?: boolean
    placeholder?: string
    onUpdate?: (value: string) => void
  }

  let {
    value = '',
    fontSize = 14,
    theme = 'light',
    readonly = false,
    placeholder = 'Write your Java code here...',
    onUpdate
  }: Props = $props()

  let editorContainer: HTMLDivElement
  let editorView: EditorView | null = null

  const lightTheme = EditorView.theme({
    '&': {
      fontSize: `${fontSize}px`,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
    },
    '.cm-content': {
      padding: '16px',
      minHeight: '300px',
      lineHeight: '1.5'
    },
    '.cm-focused': {
      outline: 'none'
    },
    '.cm-editor': {
      borderRadius: '8px',
      border: '1px solid #d1d5db'
    },
    '.cm-scroller': {
      fontFamily: 'inherit'
    }
  })

  const darkTheme = EditorView.theme({
    '&': {
      fontSize: `${fontSize}px`,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
    },
    '.cm-content': {
      padding: '16px',
      minHeight: '300px',
      lineHeight: '1.5'
    },
    '.cm-focused': {
      outline: 'none'
    },
    '.cm-scroller': {
      fontFamily: 'inherit'
    }
  })

  function createEditor() {
    if (!editorContainer) return

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      bracketMatching(),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      java(),
      keymap.of([...defaultKeymap, indentWithTab]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onUpdate) {
          onUpdate(update.state.doc.toString())
        }
      }),
      EditorState.readOnly.of(readonly),
      theme === 'dark' ? oneDark : [],
      theme === 'dark' ? darkTheme : lightTheme
    ]

    const state = EditorState.create({
      doc: value,
      extensions
    })

    editorView = new EditorView({
      state,
      parent: editorContainer
    })
  }

  function updateEditor() {
    if (!editorView) return

    const currentValue = editorView.state.doc.toString()
    if (currentValue !== value) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value
        }
      })
    }
  }

  function updateFontSize() {
    if (!editorView) return

    const newTheme = EditorView.theme({
      '&': {
        fontSize: `${fontSize}px`
      }
    })

    editorView.dispatch({
      effects: EditorView.theme.reconfigure(
        theme === 'dark' ? [oneDark, darkTheme, newTheme] : [lightTheme, newTheme]
      )
    })
  }

  onMount(() => {
    createEditor()
  })

  onDestroy(() => {
    if (editorView) {
      editorView.destroy()
    }
  })

  // Watch for value changes
  $effect(() => {
    updateEditor()
  })

  // Watch for font size changes
  $effect(() => {
    updateFontSize()
  })

  // Watch for theme changes
  $effect(() => {
    if (editorView) {
      const themeExtensions = theme === 'dark' 
        ? [oneDark, darkTheme] 
        : [lightTheme]

      editorView.dispatch({
        effects: EditorView.theme.reconfigure(themeExtensions)
      })
    }
  })
</script>

<div class="code-editor">
  <div bind:this={editorContainer} class="editor-container"></div>
</div>

<style>
  .code-editor {
    width: 100%;
    height: 100%;
  }

  .editor-container {
    width: 100%;
    height: 100%;
  }

  :global(.cm-editor) {
    height: 100%;
  }

  :global(.cm-scroller) {
    height: 100%;
  }
</style>