import React from 'react';
import logoImage from '../assets/logo.svg';
import './Logo.css';

const Logo = ({ size = 'medium', className = '', showText = true, useImage = true }) => {
  const sizeClasses = {
    small: 'logo-small',
    medium: 'logo-medium',
    large: 'logo-large'
  };

  const sizeDimensions = {
    small: { width: 80, height: 60 },
    medium: { width: 120, height: 90 },
    large: { width: 200, height: 150 }
  };

  const currentSize = sizeDimensions[size];

  if (useImage) {
    return (
      <div className={`logo-container ${sizeClasses[size]} ${className}`}>
        <div className="logo-graphic">
          <img 
            src={logoImage} 
            alt="SV ROYAL LUXURY ROOMS Logo"
            width={currentSize.width}
            height={currentSize.height}
            className="logo-image"
          />
        </div>
        
        {showText && (
          <div className="logo-text">
            <div className="logo-line-1">
              <span className="text-sv">SV </span>
              <span className="text-royal">ROYAL</span>
            </div>
            <div className="logo-line-2">
              <span className="text-luxury-rooms">LUXURY ROOMS</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback to CSS-based logo if image fails to load
  return (
    <div className={`logo-container ${sizeClasses[size]} ${className}`}>
      <div className="logo-graphic">
        <div className="logo-svg-fallback">
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#FF8C00;stop-opacity:1" />
              </linearGradient>
              
              <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#C0C0C0;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#A0A0A0;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#808080;stop-opacity:1" />
              </linearGradient>
              
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
              </filter>
            </defs>
            
            <rect width="400" height="200" fill="#000000"/>
            
            <g filter="url(#shadow)">
              <path d="M 180 40 L 200 20 L 220 40 L 240 35 L 235 50 L 165 50 L 160 35 Z" fill="url(#goldGradient)"/>
              <circle cx="200" cy="25" r="3" fill="url(#goldGradient)"/>
              <circle cx="185" cy="45" r="2" fill="url(#goldGradient)"/>
              <circle cx="215" cy="45" r="2" fill="url(#goldGradient)"/>
            </g>
            
            <g font-family="serif" font-size="48" font-weight="bold">
              <text x="160" y="90" fill="url(#goldGradient)" text-anchor="middle">S</text>
              <text x="200" y="90" fill="url(#silverGradient)" text-anchor="middle">V</text>
            </g>
            
            <g font-family="serif" font-size="24" font-weight="bold">
              <text x="200" y="120" text-anchor="middle">
                <tspan fill="url(#goldGradient)">SV </tspan>
                <tspan fill="url(#silverGradient)">ROYAL</tspan>
              </text>
            </g>
            
            <g font-family="serif" font-size="24" font-weight="bold">
              <text x="200" y="150" text-anchor="middle" fill="url(#goldGradient)">LUXURY ROOMS</text>
            </g>
          </svg>
        </div>
      </div>
      
      {showText && (
        <div className="logo-text">
          <div className="logo-line-1">
            <span className="text-sv">SV </span>
            <span className="text-royal">ROYAL</span>
          </div>
          <div className="logo-line-2">
            <span className="text-luxury-rooms">LUXURY ROOMS</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logo;
