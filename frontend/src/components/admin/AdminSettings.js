import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const AdminSettings = ({ user, onClose }) => {
  const { token } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('admin/system_settings.php'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      } else {
        setMessage('Failed to load settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage('Error loading settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category].map(setting => 
        setting.setting_key === key 
          ? { ...setting, setting_value: value }
          : setting
      )
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setMessage('');

      // Flatten settings for API
      const flatSettings = Object.values(settings).flat().map(setting => ({
        key: setting.setting_key,
        value: setting.setting_value
      }));

      const response = await fetch(buildApiUrl('admin/system_settings.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          settings: flatSettings
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Profile Information Display (Read-only) */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="mb-3">
          <h4 className="font-medium text-gray-900">Profile Information</h4>
          <p className="text-sm text-gray-600">Profile editing is available in the profile dropdown menu</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Name:</span>
            <span className="ml-2 text-gray-900">{user?.full_name || 'Not set'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Username:</span>
            <span className="ml-2 text-gray-900">{user?.username}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Email:</span>
            <span className="ml-2 text-gray-900">{user?.email || 'Not set'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Role:</span>
            <span className="ml-2 text-gray-900 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">System Configuration</h4>
        
        {Object.entries(settings).map(([category, categorySettings]) => (
          <div key={category} className="bg-white border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-800 mb-3 capitalize">
              {category.replace('_', ' ')} Settings
            </h5>
            
            <div className="space-y-3">
              {categorySettings.map((setting) => (
                <div key={setting.setting_key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-2 sm:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                    {setting.description && (
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    )}
                  </div>
                  
                  <div className="sm:w-48">
                    {setting.is_editable ? (
                      <input
                        type="text"
                        value={setting.setting_value || ''}
                        onChange={(e) => handleSettingChange(category, setting.setting_key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Enter value"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md text-sm">
                        {setting.setting_value || 'Not set'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`text-sm p-3 rounded ${
          message.includes('successfully') 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default AdminSettings;
