import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import './GlobalEmailSuccess.css';

const GlobalEmailSuccess = ({ show, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(), 500); // Wait for animation to complete
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className={`global-email-success ${isVisible ? 'show' : 'hide'}`}>
      <div className="success-content">
        <div className="success-icon">
          <CheckIcon className="w-6 h-6 text-white" />
        </div>
        <div className="success-text">
          <h3 className="success-title">Email Sent Successfully! 📧</h3>
          <p className="success-subtitle">Confirmation email delivered to guest</p>
        </div>
        <button 
          className="close-button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 500);
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default GlobalEmailSuccess;
