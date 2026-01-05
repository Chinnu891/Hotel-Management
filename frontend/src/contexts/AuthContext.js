import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user'); // Also remove user data from localStorage
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  const updateUser = useCallback((userData) => {
    console.log('AuthContext updateUser called with:', userData);
    console.log('Previous user state:', user);
    
    // Update the local user state
    setUser(userData);
    
    // If we have a token, also update the user data in localStorage for persistence
    if (token) {
      try {
        // Store the updated user data in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('User data stored in localStorage');
        
        // Also update the authorization header if the token is still valid
        if (userData && userData.token) {
          setToken(userData.token);
          localStorage.setItem('token', userData.token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
        }
      } catch (error) {
        console.error('Error persisting user data:', error);
      }
    } else {
      console.log('No token available, skipping localStorage update');
    }
  }, [token, user]);

  // Function to load user data from localStorage
  const loadUserFromStorage = useCallback(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        return userData;
      }
    } catch (error) {
      console.error('Error loading user data from localStorage:', error);
      localStorage.removeItem('user'); // Remove corrupted data
    }
    return null;
  }, []);

  // Function to fetch and merge latest user profile data
  const fetchAndMergeUserProfile = useCallback(async (token) => {
    try {
      // Fetch latest user profile from server
      const response = await axios.get(buildApiUrl('auth/get_profile.php'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success && response.data.user) {
        const serverUserData = response.data.user;
        
        // Get stored user data (which might have profile updates)
        const storedUser = localStorage.getItem('user');
        let finalUserData = serverUserData;
        
        if (storedUser) {
          try {
            const storedUserData = JSON.parse(storedUser);
            // Merge server data with stored data, prioritizing stored data for profile fields
            finalUserData = {
              ...serverUserData, // Server data (id, role, etc.)
              full_name: storedUserData.full_name || serverUserData.full_name,
              username: storedUserData.username || serverUserData.username,
              email: storedUserData.email || serverUserData.email,
              phone: storedUserData.phone || serverUserData.phone
            };
            console.log('Merged user profile data:', finalUserData);
          } catch (error) {
            console.error('Error merging stored user data:', error);
          }
        }
        
        // Update user state and localStorage
        setUser(finalUserData);
        localStorage.setItem('user', JSON.stringify(finalUserData));
        
        return finalUserData;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return null;
  }, []);

  // Function to manually refresh user profile (for components to call)
  const refreshUserProfile = useCallback(async () => {
    if (token) {
      return await fetchAndMergeUserProfile(token);
    }
    return null;
  }, [token, fetchAndMergeUserProfile]);

  const refreshAccessToken = useCallback(async () => {
    try {
      if (!refreshToken) {
        return false;
      }

      const response = await axios.post(buildApiUrl('auth/refresh_token.php'), {
        refresh_token: refreshToken
      });

      if (response.data.success) {
        const { token: newToken, refresh_token: newRefreshToken, user: userData } = response.data;
        
        // Set token and refresh token first
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Fetch and merge latest user profile data
        const finalUserData = await fetchAndMergeUserProfile(newToken);
        
        // If profile fetch failed, use the refresh response data
        if (!finalUserData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, [refreshToken]);

  const verifyToken = useCallback(async (tokenToVerify) => {
    try {
      // Set the token in axios headers for this request
      const config = {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      };

      // Call the dedicated token verification endpoint
      const response = await axios.get(buildApiUrl('auth/verify_token.php'), config);
      
      if (response.data.success) {
        // Token is valid, set user info from response
        const userData = response.data.user;
        
        // Set token first
        setToken(tokenToVerify);
        
        // Set default authorization header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokenToVerify}`;
        
        // Fetch and merge latest user profile data
        const finalUserData = await fetchAndMergeUserProfile(tokenToVerify);
        
        // If profile fetch failed, use the verification response data
        if (!finalUserData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token verification failed:', error);
      
      // If it's a 401 error, token is invalid/expired
      if (error.response && error.response.status === 401) {
        return false;
      }
      
      // For other errors (network issues, etc.), we'll assume token is still valid
      // This prevents logout due to temporary server issues
      return true;
    }
  }, []);

  const login = async (username, password) => {
    try {
      console.log('Attempting login for:', username);
      
      const loginUrl = buildApiUrl('auth/login.php');
      console.log('Login URL:', loginUrl);
      
      // Configure axios with timeout
      const axiosConfig = {
        timeout: 10000, // 10 seconds timeout
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      console.log('Axios config:', axiosConfig);
      console.log('Request payload:', { username, password: '[HIDDEN]' });
      
      const response = await axios.post(loginUrl, {
        username,
        password
      }, axiosConfig);

      if (response.data.success) {
        const { token: newToken, refresh_token: newRefreshToken, user: userData } = response.data;
        
        console.log('Login successful for user:', userData.username);
        
        // Set token and refresh token first
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Set default authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        // Fetch and merge latest user profile data
        const finalUserData = await fetchAndMergeUserProfile(newToken);
        
        // If profile fetch failed, use the login response data
        if (!finalUserData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        return { success: true, user: finalUserData || userData };
      } else {
        console.log('Login failed:', response.data.error);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // Check for network errors
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        return { 
          success: false, 
          error: 'Cannot connect to server. Please check if XAMPP is running and the backend is accessible.' 
        };
      }
      
      // Check for timeout errors
      if (error.code === 'ECONNABORTED') {
        return { 
          success: false, 
          error: 'Request timeout. Server might be slow or unresponsive.' 
        };
      }
      
      // Check for HTTP errors
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          return { success: false, error: data.error || 'Invalid credentials' };
        } else if (status === 500) {
          return { success: false, error: 'Server error. Please try again later.' };
        } else {
          return { success: false, error: data.error || `HTTP ${status} error` };
        }
      }
      
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Set up axios interceptor for automatic token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshSuccess = await refreshAccessToken();
            if (refreshSuccess) {
              // Retry the original request with new token
              const currentToken = localStorage.getItem('token');
              originalRequest.headers['Authorization'] = `Bearer ${currentToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('Auto-refresh failed:', refreshError);
            logout();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshAccessToken, logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Try to verify the stored token
          const isValid = await verifyToken(token);
          
          if (!isValid) {
            // Token is invalid, try to refresh it
            console.log('Stored token is invalid, attempting refresh...');
            const refreshSuccess = await refreshAccessToken();
            
            if (!refreshSuccess) {
              // Refresh failed, clear everything and redirect to login
              console.log('Token refresh failed, logging out');
              logout();
            }
          } else {
            // Token is valid, load user data from localStorage if available
            loadUserFromStorage();
          }
        } catch (error) {
          console.error('Error during token verification:', error);
          // On error, assume token is invalid
          logout();
        }
      } else {
        // No token, try to load user data from localStorage (for cases where user refreshed page)
        loadUserFromStorage();
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, [token, verifyToken, refreshAccessToken, logout, loadUserFromStorage]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    verifyToken,
    refreshAccessToken,
    updateUser,
    fetchAndMergeUserProfile,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
