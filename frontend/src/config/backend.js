// Backend configuration
// Use absolute URLs since proxy isn't working with simple HTTP server
const getBackendBaseUrl = () => {
  // Check if we're accessing from network IP or localhost
  const hostname = window.location.hostname;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Local development
    return 'http://localhost/hotel-management/backend';
  } else {
    // Network access - use the current hostname
    return `http://${hostname}/hotel-management/backend`;
  }
};

const BACKEND_CONFIG = {
  // Development environment (when running npm start)
  development: {
    baseURL: getBackendBaseUrl()
  },
  // Production environment (when running npm run build)
  production: {
    baseURL: getBackendBaseUrl()
  }
};

// Determine current environment
const isDevelopment = process.env.NODE_ENV === 'development';
const config = isDevelopment ? BACKEND_CONFIG.development : BACKEND_CONFIG.production;

export const BACKEND_BASE_URL = config.baseURL;

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  return `${BACKEND_BASE_URL}/${endpoint}`;
};

export default BACKEND_CONFIG;
