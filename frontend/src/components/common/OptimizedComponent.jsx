import React, { forwardRef, useEffect, useRef } from 'react';
import { useOptimizedAnimation } from '../../hooks/useOptimizedAnimation';

/**
 * Optimized Component Wrapper
 * Provides smooth animations and prevents flickering
 */
const OptimizedComponent = forwardRef(({
  children,
  className = '',
  animationType = 'fade-in',
  delay = 0,
  threshold = 0.1,
  rootMargin = '0px',
  style = {},
  ...props
}, ref) => {
  const { elementRef, isVisible, hasAnimated } = useOptimizedAnimation({
    delay,
    threshold,
    rootMargin
  });

  const combinedRef = (node) => {
    elementRef.current = node;
    if (ref) {
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };

  const getAnimationClasses = () => {
    const baseClasses = ['optimized-animation'];
    
    if (hasAnimated) {
      baseClasses.push(animationType);
    }
    
    if (className) {
      baseClasses.push(className);
    }
    
    return baseClasses.join(' ');
  };

  return (
    <div
      ref={combinedRef}
      className={getAnimationClasses()}
      style={{
        opacity: hasAnimated ? 1 : 0,
        transform: hasAnimated ? 'translateY(0) translateZ(0)' : 'translateY(10px) translateZ(0)',
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
});

OptimizedComponent.displayName = 'OptimizedComponent';

export default OptimizedComponent;

/**
 * Optimized Card Component
 */
export const OptimizedCard = forwardRef(({
  children,
  className = '',
  hoverEffect = true,
  ...props
}, ref) => {
  const cardRef = useRef(null);
  
  const combinedRef = (node) => {
    cardRef.current = node;
    if (ref) {
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !hoverEffect) return;

    card.classList.add('card-animate');
    
    return () => {
      card.classList.remove('card-animate');
    };
  }, [hoverEffect]);

  return (
    <div
      ref={combinedRef}
      className={`${className} ${hoverEffect ? 'card-animate' : ''}`}
      {...props}
    >
      {children}
    </div>
  );
});

OptimizedCard.displayName = 'OptimizedCard';

/**
 * Optimized Button Component
 */
export const OptimizedButton = forwardRef(({
  children,
  className = '',
  variant = 'primary',
  size = 'medium',
  ...props
}, ref) => {
  const buttonRef = useRef(null);
  
  const combinedRef = (node) => {
    buttonRef.current = node;
    if (ref) {
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    button.classList.add('btn-optimized');
    
    return () => {
      button.classList.remove('btn-optimized');
    };
  }, []);

  const getButtonClasses = () => {
    const baseClasses = ['btn-optimized'];
    
    // Add variant classes
    switch (variant) {
      case 'secondary':
        baseClasses.push('bg-gray-600 hover:bg-gray-700');
        break;
      case 'success':
        baseClasses.push('bg-green-600 hover:bg-green-700');
        break;
      case 'danger':
        baseClasses.push('bg-red-600 hover:bg-red-700');
        break;
      default:
        baseClasses.push('bg-blue-600 hover:bg-blue-700');
    }
    
    // Add size classes
    switch (size) {
      case 'small':
        baseClasses.push('px-3 py-1.5 text-sm');
        break;
      case 'large':
        baseClasses.push('px-6 py-3 text-lg');
        break;
      default:
        baseClasses.push('px-4 py-2');
    }
    
    baseClasses.push('text-white font-medium rounded-lg transition-all duration-200');
    
    if (className) {
      baseClasses.push(className);
    }
    
    return baseClasses.join(' ');
  };

  return (
    <button
      ref={combinedRef}
      className={getButtonClasses()}
      {...props}
    >
      {children}
    </button>
  );
});

OptimizedButton.displayName = 'OptimizedButton';

/**
 * Optimized Table Row Component
 */
export const OptimizedTableRow = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => {
  const rowRef = useRef(null);
  
  const combinedRef = (node) => {
    rowRef.current = node;
    if (ref) {
      if (typeof ref === 'function') {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    row.classList.add('table-row-animate');
    
    return () => {
      row.classList.remove('table-row-animate');
    };
  }, []);

  return (
    <tr
      ref={combinedRef}
      className={`${className} table-row-animate`}
      {...props}
    >
      {children}
    </tr>
  );
});

OptimizedTableRow.displayName = 'OptimizedTableRow';
