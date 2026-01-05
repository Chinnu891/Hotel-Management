import React, { useState } from 'react';
import { buildApiUrl } from '../../config/api';

const BackendConnectivityTest = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const testEndpoints = [
    { name: 'CORS Test', url: 'config/cors.php', method: 'GET' },
    { name: 'Database Connection Test', url: 'check_database.php', method: 'GET' },
    { name: 'Token Verification', url: 'auth/verify_token.php', method: 'GET', requiresAuth: true },
    { name: 'Rooms List (Public)', url: 'rooms/getAll.php', method: 'GET' },
    { name: 'Room Types (Auth Required)', url: 'rooms/getRoomTypes.php', method: 'GET', requiresAuth: true },
    { name: 'Login Test', url: 'auth/login.php', method: 'POST' }
  ];

  const runConnectivityTest = async () => {
    setLoading(true);
    setResults({});

    for (const endpoint of testEndpoints) {
      console.log(`Testing ${endpoint.name}: ${buildApiUrl(endpoint.url)}`);
      
      try {
        let response;
        const config = {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          }
        };

        // Add authentication header if required
        if (endpoint.requiresAuth) {
          const token = localStorage.getItem('token');
          if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
          } else {
            setResults(prev => ({
              ...prev,
              [endpoint.name]: { status: 'SKIPPED', message: 'No authentication token available' }
            }));
            continue;
          }
        }

        if (endpoint.method === 'GET') {
          response = await fetch(buildApiUrl(endpoint.url), config);
        } else if (endpoint.method === 'POST') {
          // For POST requests, we'll just test if the endpoint exists
          response = await fetch(buildApiUrl(endpoint.url), {
            method: 'OPTIONS'
          });
        }

        const status = response.status;
        let message = `HTTP ${status}`;
        
        if (status === 200) {
          message += ' - Success';
        } else if (status === 401) {
          message += ' - Unauthorized (Authentication required)';
        } else if (status === 403) {
          message += ' - Forbidden (Insufficient permissions)';
        } else if (status === 404) {
          message += ' - Not Found';
        } else if (status === 500) {
          message += ' - Server Error';
        }

        setResults(prev => ({
          ...prev,
          [endpoint.name]: { status, message }
        }));

      } catch (error) {
        console.error(`Error testing ${endpoint.name}:`, error);
        setResults(prev => ({
          ...prev,
          [endpoint.name]: { status: 'ERROR', message: error.message }
        }));
      }
    }

    setLoading(false);
  };

  const getStatusColor = (status) => {
    if (status === 200) return 'text-green-600';
    if (status === 'SKIPPED') return 'text-yellow-600';
    if (status === 'ERROR') return 'text-red-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Backend Connectivity Test</h2>
      
      <button
        onClick={runConnectivityTest}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Run Connectivity Test'}
      </button>

      <div className="space-y-3">
        {testEndpoints.map((endpoint) => (
          <div key={endpoint.name} className="border-b pb-2">
            <div className="font-semibold">{endpoint.name}</div>
            <div className="text-sm text-gray-600 mb-1">
              {endpoint.method} {buildApiUrl(endpoint.url)}
              {endpoint.requiresAuth && <span className="text-orange-600 ml-2">(Auth Required)</span>}
            </div>
            {results[endpoint.name] && (
              <div className={`text-sm ${getStatusColor(results[endpoint.name].status)}`}>
                {results[endpoint.name].message}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Test Results Summary:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ <strong>Success (200):</strong> Endpoint is working correctly</li>
          <li>🔒 <strong>Unauthorized (401):</strong> Authentication required - this is normal for protected endpoints</li>
          <li>🚫 <strong>Forbidden (403):</strong> Insufficient permissions</li>
          <li>❌ <strong>Not Found (404):</strong> Endpoint doesn't exist</li>
          <li>💥 <strong>Server Error (500):</strong> Backend issue</li>
          <li>⚠️ <strong>Skipped:</strong> Test skipped due to missing authentication</li>
        </ul>
      </div>
    </div>
  );
};

export default BackendConnectivityTest;

