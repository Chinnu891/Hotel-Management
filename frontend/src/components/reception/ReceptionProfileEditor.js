import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../config/api';
import { toast } from 'react-toastify';
import { FaUser, FaEnvelope, FaPhone, FaSave, FaTimes, FaEdit, FaBuilding } from 'react-icons/fa';

const ReceptionProfileEditor = ({ user, onClose, onProfileUpdated }) => {
  const { token, updateUser, refreshUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!profileData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (profileData.phone && !/^[\d\s\-\+\(\)]+$/.test(profileData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = () => {
    setIsEditing(true);
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    // Reset to original values
    setProfileData({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || ''
    });
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(buildApiUrl('auth/update_profile.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Profile updated successfully!');
        
        // Update the user object in AuthContext
        const updatedUser = {
          ...user,
          full_name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone
        };
        
        updateUser(updatedUser);
        
        // Refresh user profile from server
        try {
          await refreshUserProfile();
        } catch (error) {
          console.error('Error refreshing user profile:', error);
        }
        
        setIsEditing(false);
        
        // Notify parent component
        if (onProfileUpdated) {
          onProfileUpdated(updatedUser);
        }
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Network error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">User data not available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <FaBuilding className="mr-2 text-green-600" />
          Reception Profile
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Information Display */}
      {!isEditing ? (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                <div className="text-gray-900 font-medium">{user.full_name || 'Not set'}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                <div className="text-gray-900 font-medium">{user.username}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <div className="text-gray-900 font-medium flex items-center">
                  <FaEnvelope className="mr-2 text-gray-400" />
                  {user.email || 'Not set'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                <div className="text-gray-900 font-medium flex items-center">
                  <FaPhone className="mr-2 text-gray-400" />
                  {user.phone || 'Not set'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                <div className="text-gray-900 font-medium capitalize">{user.role}</div>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleEdit}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors flex items-center justify-center"
          >
            <FaEdit className="mr-2" />
            Edit Profile
          </button>
        </div>
      ) : (
        /* Edit Form */
        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.full_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter phone number"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            
            <div className="text-xs text-gray-500 bg-green-50 p-3 rounded-md">
              <p className="font-medium mb-1">Note:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Username and role cannot be changed</li>
                <li>Email must be unique across all users</li>
                <li>Phone number is optional</li>
              </ul>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                <>
                  <FaSave className="mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionProfileEditor;
