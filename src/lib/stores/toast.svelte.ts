export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

class ToastStore {
  toasts = $state<Toast[]>([])

  addToast(message: string, type: Toast['type'] = 'info', duration = 3000): string {
    const id = Math.random().toString(36).substring(2, 9)
    const toast: Toast = { id, message, type, duration }
    
    this.toasts = [...this.toasts, toast]
    
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(id)
      }, duration)
    }
    
    return id
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id)
  }

  clearAllToasts(): void {
    this.toasts = []
  }

  // Convenience methods
  success(message: string, duration?: number): string {
    return this.addToast(message, 'success', duration)
  }

  error(message: string, duration?: number): string {
    return this.addToast(message, 'error', duration)
  }

  info(message: string, duration?: number): string {
    return this.addToast(message, 'info', duration)
  }

  warning(message: string, duration?: number): string {
    return this.addToast(message, 'warning', duration)
  }

  // Computed values
  get hasToasts(): boolean {
    return this.toasts.length > 0
  }

  get count(): number {
    return this.toasts.length
  }
}

// Export singleton instance
export const toastStore = new ToastStore()

// Export for backwards compatibility
export const { toasts } = toastStore
export const { addToast, removeToast } = toastStore