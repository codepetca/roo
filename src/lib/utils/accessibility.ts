/**
 * Accessibility utilities and components
 */

// Generate unique IDs for form labels
export function generateId(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

// Screen reader only text utility
export function createScreenReaderText(text: string): HTMLElement {
  const span = document.createElement('span')
  span.textContent = text
  span.className = 'sr-only'
  span.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  `
  return span
}

// Keyboard navigation helper
export function handleKeyboardNavigation(event: KeyboardEvent, callback: () => void): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    callback()
  }
}

// Focus management
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>
  
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]
  
  function handleTabKey(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }
  
  container.addEventListener('keydown', handleTabKey)
  firstElement?.focus()
  
  return () => {
    container.removeEventListener('keydown', handleTabKey)
  }
}

// Announce changes to screen readers
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof window === 'undefined') return
  
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Color contrast checker (basic implementation)
export function checkColorContrast(foreground: string, background: string): {
  ratio: number
  wcagAA: boolean
  wcagAAA: boolean
} {
  // Convert hex to RGB
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  // Calculate relative luminance
  function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }
  
  const fg = hexToRgb(foreground)
  const bg = hexToRgb(background)
  
  if (!fg || !bg) {
    return { ratio: 0, wcagAA: false, wcagAAA: false }
  }
  
  const l1 = getLuminance(fg.r, fg.g, fg.b)
  const l2 = getLuminance(bg.r, bg.g, bg.b)
  
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  
  return {
    ratio,
    wcagAA: ratio >= 4.5,
    wcagAAA: ratio >= 7
  }
}

// Alternative text helper for images
export function generateAltText(context: string, description?: string): string {
  if (description) return description
  
  // Generate contextual alt text based on usage
  const contexts = {
    profile: 'User profile image',
    logo: 'Company logo',
    chart: 'Data visualization chart',
    icon: 'Decorative icon',
    sample: 'Code sample image'
  }
  
  return contexts[context as keyof typeof contexts] || 'Image'
}

// Form validation accessibility helper
export function createFormValidator() {
  const errors = new Map<string, string>()
  
  return {
    addError: (fieldId: string, message: string) => {
      errors.set(fieldId, message)
      
      // Update ARIA attributes
      const field = document.getElementById(fieldId)
      if (field) {
        field.setAttribute('aria-invalid', 'true')
        field.setAttribute('aria-describedby', `${fieldId}-error`)
        
        // Create or update error message element
        let errorElement = document.getElementById(`${fieldId}-error`)
        if (!errorElement) {
          errorElement = document.createElement('div')
          errorElement.id = `${fieldId}-error`
          errorElement.className = 'text-red-600 text-sm mt-1'
          errorElement.setAttribute('role', 'alert')
          field.parentNode?.appendChild(errorElement)
        }
        errorElement.textContent = message
      }
    },
    
    removeError: (fieldId: string) => {
      errors.delete(fieldId)
      
      const field = document.getElementById(fieldId)
      if (field) {
        field.setAttribute('aria-invalid', 'false')
        field.removeAttribute('aria-describedby')
        
        const errorElement = document.getElementById(`${fieldId}-error`)
        if (errorElement) {
          errorElement.remove()
        }
      }
    },
    
    hasErrors: () => errors.size > 0,
    getErrors: () => Array.from(errors.entries())
  }
}