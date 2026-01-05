/**
 * Reception Animation Optimizer
 * Provides optimized animations for all reception components
 * Ensures smooth, fast, and responsive performance
 */

import { useEffect, useRef } from 'react';
import { useOptimizedAnimation } from '../../hooks/useOptimizedAnimation';

// Optimized Loading Component
export const OptimizedLoadingSpinner = ({ size = 'md', color = 'blue' }) => {
  const { elementRef } = useOptimizedAnimation({ delay: 100 });
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };
  
  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600',
    purple: 'border-purple-600',
    yellow: 'border-yellow-600'
  };
  
  return (
    <div
      ref={elementRef}
      className={`spinner-optimized rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
    />
  );
};

// Optimized Card Component
export const OptimizedReceptionCard = ({ 
  children, 
  className = '', 
  animationType = 'fade-in',
  delay = 0,
  hoverEffect = true 
}) => {
  const { elementRef } = useOptimizedAnimation({ delay });
  
  return (
    <div
      ref={elementRef}
      className={`${className} ${hoverEffect ? 'card-animate' : ''} bg-white overflow-hidden shadow rounded-lg`}
    >
      {children}
    </div>
  );
};

// Optimized Button Component
export const OptimizedReceptionButton = ({ 
  children, 
  variant = 'primary',
  size = 'medium',
  className = '',
  ...props 
}) => {
  const buttonRef = useRef(null);
  
  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;
    
    button.classList.add('btn-optimized');
    
    return () => {
      button.classList.remove('btn-optimized');
    };
  }, []);
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-600 hover:bg-gray-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };
  
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1.5 text-sm';
      case 'large':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2';
    }
  };
  
  return (
    <button
      ref={buttonRef}
      className={`${getVariantClasses()} ${getSizeClasses()} text-white font-medium rounded-lg ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Optimized Icon Component
export const OptimizedIcon = ({ 
  icon: Icon, 
  className = '', 
  size = 'md',
  animated = true 
}) => {
  const iconRef = useRef(null);
  
  useEffect(() => {
    const icon = iconRef.current;
    if (!icon || !animated) return;
    
    icon.classList.add('icon-optimized');
    
    return () => {
      icon.classList.remove('icon-optimized');
    };
  }, [animated]);
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  };
  
  return (
    <Icon
      ref={iconRef}
      className={`${sizeClasses[size]} ${animated ? 'icon-optimized' : ''} ${className}`}
    />
  );
};

// Optimized Table Row Component
export const OptimizedTableRow = ({ 
  children, 
  className = '', 
  animated = true,
  ...props 
}) => {
  const rowRef = useRef(null);
  
  useEffect(() => {
    const row = rowRef.current;
    if (!row || !animated) return;
    
    row.classList.add('table-row-animate');
    
    return () => {
      row.classList.remove('table-row-animate');
    };
  }, [animated]);
  
  return (
    <tr
      ref={rowRef}
      className={`${className} ${animated ? 'table-row-animate' : ''}`}
      {...props}
    >
      {children}
    </tr>
  );
};

// Optimized Modal Component
export const OptimizedModal = ({ 
  isOpen, 
  onClose, 
  children, 
  title = '',
  size = 'md',
  className = '' 
}) => {
  const modalRef = useRef(null);
  
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal || !isOpen) return;
    
    modal.classList.add('modal-enter');
    
    return () => {
      modal.classList.remove('modal-enter');
    };
  }, [isOpen]);
  
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div
          ref={modalRef}
          className={`${sizeClasses[size]} ${className} inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full`}
        >
          {/* Header */}
          {title && (
            <div className="bg-gray-50 px-4 py-3 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {title}
              </h3>
            </div>
          )}
          
          {/* Content */}
          <div className="px-4 py-5 sm:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Optimized Form Field Component
export const OptimizedFormField = ({ 
  label, 
  children, 
  error = '', 
  required = false,
  className = '' 
}) => {
  const fieldRef = useRef(null);
  
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    
    field.classList.add('form-field-animate');
    
    return () => {
      field.classList.remove('form-field-animate');
    };
  }, []);
  
  return (
    <div ref={fieldRef} className={`${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600 slide-in">
          {error}
        </p>
      )}
    </div>
  );
};

// Optimized Status Badge Component
export const OptimizedStatusBadge = ({ 
  status, 
  className = '' 
}) => {
  const badgeRef = useRef(null);
  
  useEffect(() => {
    const badge = badgeRef.current;
    if (!badge) return;
    
    badge.classList.add('status-change');
    
    return () => {
      badge.classList.remove('status-change');
    };
  }, []);
  
  const getStatusClasses = () => {
    switch (status) {
      case 'confirmed':
      case 'checked_in':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'booked':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'checked_out':
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  return (
    <span
      ref={badgeRef}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusClasses()} ${className}`}
    >
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

// Optimized Progress Bar Component
export const OptimizedProgressBar = ({ 
  value, 
  max = 100, 
  color = 'blue',
  className = '' 
}) => {
  const progressRef = useRef(null);
  
  useEffect(() => {
    const progress = progressRef.current;
    if (!progress) return;
    
    progress.classList.add('progress-smooth');
    
    return () => {
      progress.classList.remove('progress-smooth');
    };
  }, []);
  
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600',
    purple: 'bg-purple-600'
  };
  
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        ref={progressRef}
        className={`h-2 rounded-full ${colorClasses[color]} transition-all duration-300 ease-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// Optimized Notification Component
export const OptimizedNotification = ({ 
  type = 'info', 
  message, 
  onClose,
  duration = 5000 
}) => {
  const notificationRef = useRef(null);
  
  useEffect(() => {
    const notification = notificationRef.current;
    if (!notification) return;
    
    notification.classList.add('notification-enter');
    
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const typeClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };
  
  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  return (
    <div
      ref={notificationRef}
      className={`border rounded-md p-4 ${typeClasses[type]} shadow-lg`}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <span className="text-lg font-bold">{typeIcons[type]}</span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
          >
            <span className="sr-only">Dismiss</span>
            <span className="text-lg">×</span>
          </button>
        )}
      </div>
    </div>
  );
};

// Hook for optimizing component animations
export const useReceptionAnimation = (options = {}) => {
  const {
    animationType = 'fade-in',
    delay = 0,
    threshold = 0.1,
    rootMargin = '0px'
  } = options;
  
  return useOptimizedAnimation({
    animationType,
    delay,
    threshold,
    rootMargin
  });
};

// Export all components
export default {
  OptimizedLoadingSpinner,
  OptimizedReceptionCard,
  OptimizedReceptionButton,
  OptimizedIcon,
  OptimizedTableRow,
  OptimizedModal,
  OptimizedFormField,
  OptimizedStatusBadge,
  OptimizedProgressBar,
  OptimizedNotification,
  useReceptionAnimation
};
