import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { FaTools, FaClock, FaCheckCircle, FaExclamationTriangle, FaPlus, FaEdit, FaTrash, FaEye, FaFilter, FaDownload } from 'react-icons/fa';
import './ReceptionMaintenance.css';

const ReceptionMaintenance = () => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    fetchMaintenanceData();
    fetchRooms();
    fetchStaff();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.RECEPTION_MAINTENANCE_LIST));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceData(data.data.maintenance_items || []);
        setStatistics(data.data.statistics || {});
      } else {
        setError(data.message || 'Failed to fetch maintenance data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch(buildApiUrl('rooms/getAll.php'));
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRooms(data.rooms || []);
        }
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(buildApiUrl('maintenance/get_maintenance_staff.php'));
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStaff(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleCreateMaintenance = async (maintenanceData) => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.RECEPTION_MAINTENANCE_CREATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowForm(false);
        fetchMaintenanceData();
        return { success: true, message: 'Maintenance request created successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to create maintenance request' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const handleUpdateMaintenance = async (id, updateData) => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.RECEPTION_MAINTENANCE_UPDATE), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updateData }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEditingItem(null);
        fetchMaintenanceData();
        return { success: true, message: 'Maintenance request updated successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to update maintenance request' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const handleDeleteMaintenance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this maintenance request?')) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.RECEPTION_MAINTENANCE_DELETE), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();
      
      if (result.success) {
        fetchMaintenanceData();
        return { success: true, message: 'Maintenance request deleted successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to delete maintenance request' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-green-600 bg-green-100'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      assigned: 'text-blue-600 bg-blue-100',
      in_progress: 'text-orange-600 bg-orange-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || colors.pending;
  };

  const filteredData = maintenanceData.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch = searchTerm === '' || 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `Room ${item.room_number}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const exportMaintenanceReport = () => {
    const csvContent = [
      ['ID', 'Room', 'Issue Type', 'Description', 'Priority', 'Status', 'Created Date', 'Assigned To'],
      ...filteredData.map(item => [
        item.id,
        `Room ${item.room_number}`,
        item.issue_type,
        item.description,
        item.priority,
        item.status,
        new Date(item.created_at).toLocaleDateString(),
        item.assigned_to_name || 'Unassigned'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <FaExclamationTriangle className="text-red-400 text-xl" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reception-maintenance-container">
      {/* Header */}
      <div className="maintenance-header">
        <div className="header-content">
          <h1 className="maintenance-title">
            <FaTools className="title-icon" />
            Reception Maintenance Dashboard
          </h1>
          <p className="maintenance-subtitle">
            Manage maintenance requests and track room status
          </p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <FaPlus className="btn-icon" />
            Create Request
          </button>
          <button
            onClick={exportMaintenanceReport}
            className="btn btn-secondary"
          >
            <FaDownload className="btn-icon" />
            Export Report
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-icon pending">
            <FaClock />
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{statistics.pending_count || 0}</h3>
            <p className="stat-label">Pending Requests</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon in-progress">
            <FaTools />
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{statistics.in_progress_count || 0}</h3>
            <p className="stat-label">In Progress</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon completed">
            <FaCheckCircle />
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{statistics.completed_count || 0}</h3>
            <p className="stat-label">Completed</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon urgent">
            <FaExclamationTriangle />
          </div>
          <div className="stat-content">
            <h3 className="stat-number">{statistics.urgent_count || 0}</h3>
            <p className="stat-label">Urgent</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="filter-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search maintenance requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-buttons">
            <button
              onClick={() => setFilter('all')}
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            >
              Completed
            </button>
          </div>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="maintenance-list-container">
        <div className="list-header">
          <h3 className="list-title">Maintenance Requests ({filteredData.length})</h3>
        </div>
        
        <div className="maintenance-list">
          {filteredData.length === 0 ? (
            <div className="empty-state">
              <FaTools className="empty-icon" />
              <p className="empty-text">No maintenance requests found</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
              >
                Create First Request
              </button>
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="maintenance-item">
                <div className="item-header">
                  <div className="item-id">#{item.id}</div>
                  <div className="item-priority">
                    <span className={`priority-badge ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                  </div>
                </div>
                
                <div className="item-content">
                  <div className="item-main">
                    <h4 className="item-title">
                      Room {item.room_number} - {item.issue_type}
                    </h4>
                    <p className="item-description">{item.description}</p>
                    <div className="item-meta">
                      <span className="meta-item">
                        <FaClock className="meta-icon" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      {item.assigned_to_name && (
                        <span className="meta-item">
                          <FaTools className="meta-icon" />
                          {item.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="item-status">
                    <span className={`status-badge ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="item-actions">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="btn btn-sm btn-secondary"
                  >
                    <FaEye className="btn-icon" />
                    View
                  </button>
                  <button
                    onClick={() => setEditingItem(item)}
                    className="btn btn-sm btn-primary"
                  >
                    <FaEdit className="btn-icon" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMaintenance(item.id)}
                    className="btn btn-sm btn-danger"
                  >
                    <FaTrash className="btn-icon" />
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Maintenance Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <MaintenanceForm
              onSubmit={handleCreateMaintenance}
              onCancel={() => setShowForm(false)}
              rooms={rooms}
              staff={staff}
            />
          </div>
        </div>
      )}

      {/* Edit Maintenance Modal */}
      {editingItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <MaintenanceForm
              onSubmit={handleUpdateMaintenance}
              onCancel={() => setEditingItem(null)}
              initialData={editingItem}
              isEdit={true}
              rooms={rooms}
              staff={staff}
            />
          </div>
        </div>
      )}

      {/* View Maintenance Modal */}
      {selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <MaintenanceDetails
              maintenance={selectedItem}
              onClose={() => setSelectedItem(null)}
              onEdit={() => {
                setSelectedItem(null);
                setEditingItem(selectedItem);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Maintenance Form Component
const MaintenanceForm = ({ onSubmit, onCancel, initialData = null, isEdit = false, rooms, staff }) => {
  const [formData, setFormData] = useState({
    room_id: '',
    issue_type: '',
    description: '',
    priority: 'medium',
    estimated_duration: '',
    assigned_to: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const issueTypes = [
    'repair',
    'cleaning',
    'inspection',
    'upgrade',
    'replacement',
    'other'
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'green' },
    { value: 'medium', label: 'Medium', color: 'orange' },
    { value: 'high', label: 'High', color: 'red' },
    { value: 'urgent', label: 'Urgent', color: 'darkred' }
  ];

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.room_id) newErrors.room_id = 'Room is required';
    if (!formData.issue_type) newErrors.issue_type = 'Issue type is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.priority) newErrors.priority = 'Priority is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const result = await onSubmit(formData);
      if (result.success) {
        onCancel();
      } else {
        setErrors({ general: result.message });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="maintenance-form-container">
      <div className="form-header">
        <h3>{isEdit ? 'Edit Maintenance Request' : 'Create Maintenance Request'}</h3>
        <button type="button" className="close-btn" onClick={onCancel}>×</button>
      </div>
      
      <form onSubmit={handleSubmit} className="maintenance-form">
        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="room_id">Room *</label>
            <select
              id="room_id"
              name="room_id"
              value={formData.room_id}
              onChange={handleInputChange}
              className={errors.room_id ? 'error' : ''}
            >
              <option value="">Select a room</option>
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  Room {room.room_number} - {room.room_type} ({room.status})
                </option>
              ))}
            </select>
            {errors.room_id && <span className="error-text">{errors.room_id}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="issue_type">Issue Type *</label>
            <select
              id="issue_type"
              name="issue_type"
              value={formData.issue_type}
              onChange={handleInputChange}
              className={errors.issue_type ? 'error' : ''}
            >
              <option value="">Select issue type</option>
              {issueTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
            {errors.issue_type && <span className="error-text">{errors.issue_type}</span>}
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Priority *</label>
            <div className="priority-selector">
              {priorities.map(priority => (
                <label key={priority.value} className="priority-option">
                  <input
                    type="radio"
                    name="priority"
                    value={priority.value}
                    checked={formData.priority === priority.value}
                    onChange={handleInputChange}
                  />
                  <span className="priority-label">{priority.label}</span>
                </label>
              ))}
            </div>
            {errors.priority && <span className="error-text">{errors.priority}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="estimated_duration">Estimated Duration (hours)</label>
            <input
              type="number"
              id="estimated_duration"
              name="estimated_duration"
              value={formData.estimated_duration}
              onChange={handleInputChange}
              min="0.5"
              step="0.5"
              placeholder="e.g., 2.5"
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className={errors.description ? 'error' : ''}
            rows="4"
            placeholder="Describe the issue in detail..."
          />
          {errors.description && <span className="error-text">{errors.description}</span>}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="assigned_to">Assign To</label>
            <select
              id="assigned_to"
              name="assigned_to"
              value={formData.assigned_to}
              onChange={handleInputChange}
            >
              <option value="">Select staff member</option>
              {staff.map(member => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.specialization}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Additional Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Any additional information..."
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
          </button>
        </div>
      </form>
    </div>
  );
};

// Maintenance Details Component
const MaintenanceDetails = ({ maintenance, onClose, onEdit }) => {
  return (
    <div className="maintenance-details-container">
      <div className="details-header">
        <h3>Maintenance Request Details</h3>
        <button type="button" className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="details-content">
        <div className="detail-section">
          <h4>Basic Information</h4>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Request ID:</span>
              <span className="detail-value">#{maintenance.id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Room:</span>
              <span className="detail-value">Room {maintenance.room_number}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Issue Type:</span>
              <span className="detail-value">{maintenance.issue_type}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Priority:</span>
              <span className="detail-value">{maintenance.priority}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value">{maintenance.status}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created:</span>
              <span className="detail-value">
                {new Date(maintenance.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="detail-section">
          <h4>Description</h4>
          <p className="detail-description">{maintenance.description}</p>
        </div>
        
        {maintenance.notes && (
          <div className="detail-section">
            <h4>Additional Notes</h4>
            <p className="detail-notes">{maintenance.notes}</p>
          </div>
        )}
        
        {maintenance.assigned_to_name && (
          <div className="detail-section">
            <h4>Assignment</h4>
            <p className="detail-assignment">
              Assigned to: {maintenance.assigned_to_name}
            </p>
          </div>
        )}
      </div>
      
      <div className="details-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          Edit Request
        </button>
      </div>
    </div>
  );
};

export default ReceptionMaintenance;
