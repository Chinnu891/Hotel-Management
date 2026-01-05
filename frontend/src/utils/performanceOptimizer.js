/**
 * Performance Optimization Utilities
 * Helps maintain smooth animations and prevent flickering
 */

// Debounce function for performance
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function for performance
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Request Animation Frame wrapper
export const requestAnimationFramePolyfill = () => {
  return (
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) {
      window.setTimeout(callback, 1000 / 60);
    }
  );
};

// Optimized scroll handler
export const createOptimizedScrollHandler = (callback, options = {}) => {
  const {
    throttleMs = 16, // ~60fps
    passive = true
  } = options;

  let ticking = false;
  let lastScrollTop = 0;

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFramePolyfill()(() => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Only call callback if scroll position actually changed
        if (Math.abs(scrollTop - lastScrollTop) > 1) {
          callback(scrollTop, lastScrollTop);
          lastScrollTop = scrollTop;
        }
        
        ticking = false;
      });
      ticking = true;
    }
  };

  return handleScroll;
};

// Intersection Observer with performance options
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
    ...options
  };

  if ('IntersectionObserver' in window) {
    return new IntersectionObserver(callback, defaultOptions);
  }

  // Fallback for older browsers
  return {
    observe: (element) => {
      // Simulate intersection for older browsers
      setTimeout(() => {
        callback([{ isIntersecting: true, target: element }]);
      }, 100);
    },
    unobserve: () => {},
    disconnect: () => {}
  };
};

// Performance monitoring
export const performanceMonitor = {
  marks: new Map(),
  
  mark(name) {
    if ('performance' in window && window.performance.mark) {
      window.performance.mark(name);
      this.marks.set(name, performance.now());
    }
  },
  
  measure(name, startMark, endMark) {
    if ('performance' in window && window.performance.measure) {
      window.performance.measure(name, startMark, endMark);
    }
  },
  
  getDuration(startMark, endMark) {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    return end && start ? end - start : 0;
  }
};

// Memory management for large lists
export const createVirtualListOptimizer = (itemHeight, containerHeight, overscan = 5) => {
  return {
    getVisibleRange(scrollTop) {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
        startIndex + overscan
      );
      
      return {
        start: Math.max(0, startIndex - overscan),
        end: endIndex
      };
    },
    
    getItemStyle(index) {
      return {
        position: 'absolute',
        top: `${index * itemHeight}px`,
        height: `${itemHeight}px`,
        width: '100%'
      };
    }
  };
};

// Smooth state transitions
export const createSmoothTransition = (duration = 200) => {
  return {
    enter: (element, className = 'fade-in') => {
      if (!element) return;
      
      element.style.opacity = '0';
      element.style.transform = 'translateY(10px) translateZ(0)';
      element.style.transition = `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      
      // Force reflow
      element.offsetHeight;
      
      element.style.opacity = '1';
      element.style.transform = 'translateY(0) translateZ(0)';
      element.classList.add(className);
    },
    
    exit: (element, className = 'fade-out') => {
      if (!element) return;
      
      element.style.opacity = '0';
      element.style.transform = 'translateY(-10px) translateZ(0)';
      element.classList.add(className);
    }
  };
};

// Prevent layout thrashing
export const batchDOMUpdates = (updates) => {
  // Force a reflow to batch all updates
  document.body.offsetHeight;
  
  updates.forEach(update => {
    if (typeof update === 'function') {
      update();
    }
  });
  
  // Force another reflow to apply all changes
  document.body.offsetHeight;
};

// Optimized event listeners
export const addOptimizedEventListener = (element, event, handler, options = {}) => {
  const defaultOptions = {
    passive: true,
    capture: false,
    ...options
  };
  
  element.addEventListener(event, handler, defaultOptions);
  
  return () => {
    element.removeEventListener(event, handler, defaultOptions);
  };
};

// Performance warning system
export const performanceWarning = {
  checkFrameRate(callback, threshold = 30) {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const countFrames = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        if (fps < threshold) {
          console.warn(`Low frame rate detected: ${fps} FPS`);
          callback?.(fps);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFramePolyfill()(countFrames);
    };
    
    requestAnimationFramePolyfill()(countFrames);
  }
};

export default {
  debounce,
  throttle,
  requestAnimationFramePolyfill,
  createOptimizedScrollHandler,
  createIntersectionObserver,
  performanceMonitor,
  createVirtualListOptimizer,
  createSmoothTransition,
  batchDOMUpdates,
  addOptimizedEventListener,
  performanceWarning
};
