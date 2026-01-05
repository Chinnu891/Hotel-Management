import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import './StaffManagement.css';

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'reception' // Default role
  });
  const [editingStaff, setEditingStaff] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStaff, setPasswordStaff] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await axios.get(buildApiUrl('admin/get_staff_new.php'));
      
      console.log('Fetch staff response:', response);
      
      if (response.data && response.data.success) {
        setStaff(response.data.staff);
      } else {
        setError(response.data?.error || 'Failed to fetch staff');
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setError('Failed to fetch staff members');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Adding staff:', newStaff);
      
      const response = await axios.post(buildApiUrl('admin/create_staff_new.php'), newStaff);
      
      console.log('Add staff response:', response);
      
      if (response.data && response.data.success) {
        setShowAddForm(false);
        setNewStaff({ username: '', password: '', full_name: '', email: '', phone: '', role: 'reception' });
        fetchStaff(); // Refresh the list
        alert(`${response.data.message}!`);
      } else {
        const errorMessage = response.data?.error || 'Unknown error occurred';
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.error || 'Server error occurred';
        alert(`Failed to add staff member: ${errorMessage}`);
      } else if (error.request) {
        alert('Failed to add staff member: No response from server');
      } else {
        alert(`Failed to add staff member: ${error.message}`);
      }
    }
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.put(buildApiUrl('admin/editStaff.php'), editingStaff);
      
      if (response.data && response.data.success) {
        setShowEditForm(false);
        setEditingStaff(null);
        fetchStaff(); // Refresh the list
        alert('Staff member updated successfully!');
      } else {
        alert(response.data?.error || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Failed to update staff member');
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return;
    }
    
    try {
      const response = await axios.delete(buildApiUrl(`admin/deleteStaff.php?id=${staffId}`));
      
      if (response.data && response.data.success) {
        fetchStaff(); // Refresh the list
        alert('Staff member deleted successfully!');
      } else {
        alert(response.data?.error || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!passwordStaff || !newPassword) {
      alert('Please fill in all fields');
      return;
    }
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    
    try {
      const response = await axios.put(buildApiUrl('admin/changeStaffPassword.php'), {
        staff_id: passwordStaff.id,
        new_password: newPassword
      });
      
      if (response.data && response.data.success) {
        setShowPasswordModal(false);
        setPasswordStaff(null);
        setNewPassword('');
        alert('Password changed successfully!');
      } else {
        alert(response.data?.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    try {
      const response = await axios.put(buildApiUrl('admin/updateStaffStatus.php'), {
        staff_id: staffId,
        is_active: !currentStatus
      });
      
      if (response.data && response.data.success) {
        fetchStaff(); // Refresh the list
        alert(`Staff member ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      } else {
        alert(response.data?.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const openEditForm = (staff) => {
    setEditingStaff({
      staff_id: staff.id,
      full_name: staff.full_name,
      email: staff.email || '',
      phone: staff.phone || ''
    });
    setShowEditForm(true);
  };

  const openPasswordModal = (staff) => {
    setPasswordStaff(staff);
    setShowPasswordModal(true);
  };

  if (loading) {
    return (
      <div className="staff-loading">
        <div className="staff-loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="staff-management-container">
      {/* Header */}
      <div className="staff-header">
        <div>
          <h2>Staff Management</h2>
          <p>Manage hotel staff members and their permissions</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="add-staff-btn bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Staff Member
        </button>
      </div>

      {/* Add New Staff Form */}
      {showAddForm && (
        <div className="staff-form bg-white rounded-lg shadow-lg">
          <h3>Add New Staff Member</h3>
          
          <form onSubmit={handleAddStaff} className="staff-modal-form">
            <div className="form-grid">
              <div className="form-group">
                <label>
                  Username *
                </label>
                <input
                  type="text"
                  value={newStaff.username}
                  onChange={(e) => setNewStaff({...newStaff, username: e.target.value})}
                  placeholder="Enter username"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>
                  Password *
                </label>
                <input
                  type="password"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                  placeholder="Enter password"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({...newStaff, full_name: e.target.value})}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>
                  Role *
                </label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                  required
                >
                  <option value="reception">Reception</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>
                  Phone
                </label>
                <input
                  type="tel"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({...newStaff, phone: e.target.value})}
                  placeholder="e.g., +1234567890"
                />
              </div>
              
              <div className="form-group">
                <label>
                  Email
                </label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                  placeholder="e.g., john@hotel.com"
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
              >
                Add Staff Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff List */}
      <div className="staff-list">
        <div className="staff-list-header">
          <h3>Existing Staff Members</h3>
        </div>
        
        {error && (
          <div className="staff-list-error">
            <p>{error}</p>
          </div>
        )}
        
        <div>
          {staff.map((member) => (
            <div key={member.id} className="staff-member">
              <div className="staff-member-content">
                <div className="staff-member-info">
                  <div className="staff-avatar">
                    <span>
                      {member.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="staff-details">
                    <div className="staff-name-row">
                      <span className="staff-name">{member.full_name}</span>
                      <span className="staff-username">@{member.username}</span>
                      <span className={`staff-role-badge ${member.role}`}>
                        {member.role}
                      </span>
                    </div>
                    
                    <div className="staff-contact-info">
                      {member.email && <span>{member.email}</span>}
                      {member.email && member.phone && <span> • </span>}
                      {member.phone && <span>{member.phone}</span>}
                    </div>
                    
                    <div className="staff-created-date">
                      Created: {new Date(member.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="staff-actions">
                  <div className="staff-status-row">
                    <span className={`staff-status ${member.is_active ? 'active' : 'inactive'}`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="staff-action-buttons">
                    <button
                      onClick={() => handleToggleStatus(member.id, member.is_active)}
                      className="staff-action-btn toggle-status"
                    >
                      {member.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button
                      onClick={() => openPasswordModal(member)}
                      className="staff-action-btn change-password"
                    >
                      Change Password
                    </button>
                    
                    <button
                      onClick={() => openEditForm(member)}
                      className="staff-action-btn edit"
                    >
                      Edit
                    </button>
                    
                    <button
                      onClick={() => handleDeleteStaff(member.id)}
                      className="staff-action-btn delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Staff Modal */}
      {showEditForm && editingStaff && (
        <div className="staff-modal">
          <div className="staff-modal-content">
            <div className="staff-modal-header">
              <h3>Edit Staff Member</h3>
            </div>
            
            <div className="staff-modal-body">
              <form onSubmit={handleEditStaff} className="staff-modal-form">
                <div className="form-group">
                  <label>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={editingStaff.full_name}
                    onChange={(e) => setEditingStaff({...editingStaff, full_name: e.target.value})}
                    placeholder="Enter full name"
                    required
                  />
                </div>
              
                <div className="form-group">
                  <label>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editingStaff.email}
                    onChange={(e) => setEditingStaff({...editingStaff, email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>
              
                <div className="form-group">
                  <label>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editingStaff.phone}
                    onChange={(e) => setEditingStaff({...editingStaff, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
              
                <div className="staff-modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                  >
                    Update Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && passwordStaff && (
        <div className="staff-modal">
          <div className="staff-modal-content">
            <div className="staff-modal-header">
              <h3>
                Change Password for {passwordStaff.full_name}
              </h3>
            </div>
            
            <div className="staff-modal-body">
              <form onSubmit={handleChangePassword} className="staff-modal-form">
                <div className="form-group">
                  <label>
                    New Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength="6"
                  />
                  <p className="form-help">Password must be at least 6 characters long</p>
                </div>
                
                <div className="staff-modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
