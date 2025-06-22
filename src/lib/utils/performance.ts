/**
 * Performance utilities for optimization
 */

// Debounce function for search inputs and API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Lazy loading utility for components
export function createIntersectionObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver((entries) => {
    entries.forEach(callback);
  }, defaultOptions);
}

// Memory management for large lists
export function createVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 3
) {
  const itemsPerView = Math.ceil(containerHeight / itemHeight);
  const totalItems = items.length;
  
  return {
    getVisibleItems: (scrollTop: number) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + itemsPerView + overscan, totalItems);
      const visibleStartIndex = Math.max(0, startIndex - overscan);
      
      return {
        items: items.slice(visibleStartIndex, endIndex),
        startIndex: visibleStartIndex,
        endIndex,
        offsetY: visibleStartIndex * itemHeight,
        totalHeight: totalItems * itemHeight
      };
    }
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number> = new Map();
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  startMeasurement(name: string): void {
    this.measurements.set(name, performance.now());
  }
  
  endMeasurement(name: string): number {
    const startTime = this.measurements.get(name);
    if (!startTime) {
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.measurements.delete(name);
    
    
    return duration;
  }
  
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    return fn().finally(() => {
      this.endMeasurement(name);
    });
  }
}

// Resource loading optimization
export function preloadResource(href: string, as: 'script' | 'style' | 'image' | 'font'): void {
  if (typeof window === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  
  if (as === 'font') {
    link.crossOrigin = 'anonymous';
  }
  
  document.head.appendChild(link);
}

// Image optimization
export function createOptimizedImageLoader() {
  const imageCache = new Map<string, string>();
  
  return {
    loadImage: async (src: string, quality = 85): Promise<string> => {
      if (imageCache.has(src)) {
        return imageCache.get(src)!;
      }
      
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality / 100);
            imageCache.set(src, optimizedDataUrl);
            resolve(optimizedDataUrl);
          };
          
          img.onerror = reject;
          img.src = src;
        });
      } catch (error) {
        // Image optimization failed
        return src;
      }
    },
    
    clearCache: (): void => {
      imageCache.clear();
    }
  };
}

// Memory cleanup utilities
export function createCleanupManager() {
  const cleanupFunctions: (() => void)[] = [];
  
  return {
    register: (cleanupFn: () => void): void => {
      cleanupFunctions.push(cleanupFn);
    },
    
    cleanup: (): void => {
      cleanupFunctions.forEach(fn => {
        try {
          fn();
        } catch (error) {
          // Cleanup function failed
        }
      });
      cleanupFunctions.length = 0;
    }
  };
}