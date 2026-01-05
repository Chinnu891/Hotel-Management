import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for optimized animations with performance improvements
 * Prevents flickering and ensures smooth transitions
 */
export const useOptimizedAnimation = (options = {}) => {
  const {
    duration = 200,
    easing = 'cubic-bezier(0.4, 0, 0.2, 1)',
    delay = 0,
    threshold = 0.1,
    rootMargin = '0px'
  } = options;

  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add hardware acceleration classes
    element.classList.add('optimized-animation');
    
    // Intersection Observer for performance
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsVisible(true);
          setHasAnimated(true);
          
          // Add animation class with delay
          setTimeout(() => {
            element.classList.add('fade-in');
          }, delay);
        }
      },
      {
        threshold,
        rootMargin,
        root: null
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      element.classList.remove('optimized-animation', 'fade-in');
    };
  }, [delay, threshold, rootMargin, hasAnimated]);

  const triggerAnimation = () => {
    const element = elementRef.current;
    if (element && !hasAnimated) {
      setIsVisible(true);
      setHasAnimated(true);
      element.classList.add('fade-in');
    }
  };

  const resetAnimation = () => {
    const element = elementRef.current;
    if (element) {
      setIsVisible(false);
      setHasAnimated(false);
      element.classList.remove('fade-in');
    }
  };

  return {
    elementRef,
    isVisible,
    hasAnimated,
    triggerAnimation,
    resetAnimation
  };
};

/**
 * Hook for smooth scroll animations
 */
export const useSmoothScroll = () => {
  const scrollToElement = (elementRef, offset = 0) => {
    if (elementRef?.current) {
      const element = elementRef.current;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return { scrollToElement, scrollToTop };
};

/**
 * Hook for optimized loading states
 */
export const useOptimizedLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [loadingDelay, setLoadingDelay] = useState(false);

  useEffect(() => {
    let delayTimer;
    
    if (isLoading) {
      // Add a small delay to prevent flickering for fast operations
      delayTimer = setTimeout(() => {
        setLoadingDelay(true);
      }, 100);
    } else {
      setLoadingDelay(false);
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [isLoading]);

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  return {
    isLoading,
    loadingDelay,
    startLoading,
    stopLoading
  };
};

/**
 * Hook for smooth state transitions
 */
export const useSmoothTransition = (initialState, transitionDuration = 200) => {
  const [state, setState] = useState(initialState);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const transitionTo = (newState) => {
    if (state === newState) return;
    
    setIsTransitioning(true);
    
    setTimeout(() => {
      setState(newState);
      setIsTransitioning(false);
    }, transitionDuration);
  };

  return {
    state,
    isTransitioning,
    transitionTo
  };
};
