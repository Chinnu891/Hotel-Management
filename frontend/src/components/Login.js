import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin');
  
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/reception');
      }
    }
  }, [user, navigate]);

  // 3D Mouse movement effect
  useEffect(() => {
    const container = document.querySelector('.login-container');
    if (!container) return;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Click particle effects
  useEffect(() => {
    const handleClick = (e) => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = e.clientX + 'px';
      particle.style.top = e.clientY + 'px';
      particle.style.animation = 'float 2s ease-out forwards';
      particle.style.position = 'fixed';
      particle.style.zIndex = '9999';
      particle.style.pointerEvents = 'none';
      
      document.body.appendChild(particle);
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 2000);
    };

    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Entrance animations for form elements
  useEffect(() => {
    const elements = document.querySelectorAll('.animate-entrance');
    elements.forEach((el, index) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        el.style.transition = 'all 0.6s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 300 + (index * 100));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting login form...');
      const result = await login(username, password);
      console.log('Login result:', result);
      
      if (result.success) {
        console.log('Login successful, redirecting to:', result.user.role === 'admin' ? '/admin' : '/reception');
        if (result.user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/reception');
        }
      } else {
        console.log('Login failed with error:', result.error);
        setError(result.error);
      }
    } catch (error) {
      console.error('Unexpected error in handleSubmit:', error);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 overflow-hidden relative">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className="particle animate-float"
            style={{
              left: `${(i + 1) * 10}%`,
              animationDelay: `${i}s`,
              animationDuration: '6s'
            }}
          />
        ))}
      </div>

      <div className="login-container relative z-10 glass-effect rounded-3xl p-10 shadow-2xl w-96">
        <div className="text-center mb-8 animate-logo-float">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-white bg-clip-text text-transparent mb-2">
            Hotel Luxury Rooms
          </h2>
          <p className="mt-2 text-white/70">
            Sign in to your account
          </p>
        </div>

        {/* Role Selection */}
        <div className="mb-6 text-center">
          <div className="flex justify-center space-x-2">
            {['admin', 'reception'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 transform hover:translate-z-1 ${
                  selectedRole === role
                    ? 'bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-800 border-yellow-400 translate-z-2'
                    : 'bg-white/10 text-white/80 border-white/20 hover:border-yellow-400'
                }`}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-100 rounded-lg text-center">
            {error}
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative group">
              <input
                id="username"
                name="username"
                type="text"
                required
                className="input-focus-effect w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 animate-entrance"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-xl opacity-0 group-focus:opacity-20 transition-opacity duration-300 -z-10 blur-xl" />
            </div>
            
            <div className="relative group">
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-focus-effect w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 animate-entrance"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-xl opacity-0 group-focus:opacity-20 transition-opacity duration-300 -z-10 blur-xl" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-hover-effect shimmer-effect w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-800 font-bold rounded-xl relative overflow-hidden group animate-entrance"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-gray-800 border-t-transparent rounded-full animate-spin mr-2" />
                Signing in...
              </div>
            ) : (
              <>
                <span>Sign in</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              </>
            )}
          </button>
        </form>
        
        {/* Copyright and Rights */}
        <div className="mt-8 pt-6 border-t border-white/20 text-center">
          <p className="text-xs text-white/60">
            © 2024 Hotel Luxury Rooms. All rights reserved.
          </p>
          <p className="text-xs text-white/50 mt-1">
            Proprietary Hotel Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

