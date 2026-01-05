import React from 'react';
import './FaviconLogo.css';

const FaviconLogo = ({ size = 32, className = '' }) => {
  return (
    <div className={`favicon-logo ${className}`} style={{ width: size, height: size }}>
      <div className="favicon-crown">
        <div className="favicon-crown-point"></div>
        <div className="favicon-crown-jewel"></div>
      </div>
      <div className="favicon-text">
        <span className="favicon-s">S</span>
        <span className="favicon-v">V</span>
      </div>
    </div>
  );
};

export default FaviconLogo;
