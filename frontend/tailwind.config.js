/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#f8fafc',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'logo-float': 'logo-float 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'slide-in': 'slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'bounce-soft': 'bounceSoft 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-smooth': 'pulseSmooth 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { 
            transform: 'translateY(100vh) rotate(0deg)', 
            opacity: '0' 
          },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { 
            transform: 'translateY(-100px) rotate(360deg)', 
            opacity: '0' 
          }
        },
        'logo-float': {
          '0%, 100%': { transform: 'translateZ(0px)' },
          '50%': { transform: 'translateZ(20px)' }
        },
        fadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(10px) translateZ(0)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) translateZ(0)'
          }
        },
        slideIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateX(-20px) translateZ(0)'
          },
          '100%': { 
            opacity: '1',
            transform: 'translateX(0) translateZ(0)'
          }
        },
        scaleIn: {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95) translateZ(0)'
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1) translateZ(0)'
          }
        },
        bounceSoft: {
          '0%, 20%, 53%, 80%, 100%': {
            transform: 'translate3d(0,0,0) translateZ(0)'
          },
          '40%, 43%': {
            transform: 'translate3d(0,-8px,0) translateZ(0)'
          },
          '70%': {
            transform: 'translate3d(0,-4px,0) translateZ(0)'
          },
          '90%': {
            transform: 'translate3d(0,-2px,0) translateZ(0)'
          }
        },
        pulseSmooth: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%) translateZ(0)' },
          '100%': { transform: 'translateX(100%) translateZ(0)' }
        }
      },
      transformStyle: {
        'preserve-3d': 'preserve-3d',
      },
      perspective: {
        '1000': '1000px',
      },
      rotate: {
        'y-1': 'rotateY(5deg)',
        'x-1': 'rotateX(5deg)',
      },
      translate: {
        'z-1': 'translateZ(10px)',
        'z-2': 'translateZ(20px)',
      }
    },
  },
  plugins: [],
}
