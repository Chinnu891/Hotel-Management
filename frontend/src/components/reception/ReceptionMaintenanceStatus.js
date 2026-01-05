import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { FaEye, FaEdit, FaCheckCircle, FaClock, FaExclamationTriangle, FaTools, FaUser, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import './ReceptionMaintenanceStatus.css';

const ReceptionMaintenanceStatus = () => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_GET_ALL));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMaintenanceData(data.data.maintenance_items || []);
      } else {
        setError(data.message || 'Failed to fetch maintenance data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, notes = '') => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_UPDATE), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id, 
          status: newStatus,
          notes: notes ? `${notes}\n\nStatus updated to: ${newStatus} on ${new Date().toLocaleString()}` : `Status updated to: ${newStatus} on ${new Date().toLocaleString()}`
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        fetchMaintenanceData();
        setShowUpdateModal(false);
        return { success: true, message: 'Status updated successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to update status' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
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

  const getPriorityColor = (priority) => {
    const colors = {
      urgent: 'text-red-600 bg-red-100',
      high: 'text-orange-600 bg-orange-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-green-600 bg-green-100'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <FaClock className="status-icon" />,
      assigned: <FaUser className="status-icon" />,
      in_progress: <FaTools className="status-icon" />,
      completed: <FaCheckCircle className="status-icon" />,
      cancelled: <FaExclamationTriangle className="status-icon" />
    };
    return icons[status] || icons.pending;
  };

  const getTimeSinceCreated = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInHours = Math.floor((now - created) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than 1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  const filteredAndSortedData = maintenanceData
    .filter(item => {
      const matchesFilter = filter === 'all' || item.status === filter;
      const matchesSearch = searchTerm === '' || 
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `Room ${item.room_number}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.assigned_to_name && item.assigned_to_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'room_number':
          aValue = parseInt(a.room_number);
          bValue = parseInt(b.room_number);
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

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
    <div className="maintenance-status-container">
      {/* Header */}
      <div className="status-header">
        <div className="header-content">
          <h1 className="status-title">
            <FaTools className="title-icon" />
            Maintenance Status Tracker
          </h1>
          <p className="status-subtitle">
            Monitor and update maintenance request progress in real-time
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-number">{maintenanceData.length}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item urgent">
            <span className="stat-number">
              {maintenanceData.filter(item => item.priority === 'urgent').length}
            </span>
            <span className="stat-label">Urgent</span>
          </div>
          <div className="stat-item in-progress">
            <span className="stat-number">
              {maintenanceData.filter(item => item.status === 'in_progress').length}
            </span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="controls-section">
        <div className="search-and-filters">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by room, description, or assigned staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-controls">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="created_at">Sort by Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="room_number">Sort by Room</option>
              <option value="status">Sort by Status</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="status-grid">
        {filteredAndSortedData.length === 0 ? (
          <div className="empty-state">
            <FaTools className="empty-icon" />
            <p className="empty-text">No maintenance requests found</p>
            <p className="empty-subtext">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          filteredAndSortedData.map((item) => (
            <div key={item.id} className="status-card">
              <div className="card-header">
                <div className="card-id">#{item.id}</div>
                <div className="card-priority">
                  <span className={`priority-badge ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
              </div>
              
              <div className="card-content">
                <div className="room-info">
                  <FaMapMarkerAlt className="room-icon" />
                  <span className="room-number">Room {item.room_number}</span>
                </div>
                
                <h4 className="issue-title">{item.issue_type}</h4>
                <p className="issue-description">{item.description}</p>
                
                <div className="status-info">
                  <div className="status-display">
                    {getStatusIcon(item.status)}
                    <span className={`status-badge ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="time-info">
                    <FaCalendarAlt className="time-icon" />
                    <span className="time-text">{getTimeSinceCreated(item.created_at)}</span>
                  </div>
                </div>
                
                {item.assigned_to_name && (
                  <div className="assignment-info">
                    <FaUser className="user-icon" />
                    <span className="assigned-text">Assigned to: {item.assigned_to_name}</span>
                  </div>
                )}
                
                {item.estimated_duration && (
                  <div className="duration-info">
                    <FaClock className="duration-icon" />
                    <span className="duration-text">Estimated: {item.estimated_duration} hours</span>
                  </div>
                )}
              </div>
              
              <div className="card-actions">
                <button
                  onClick={() => setSelectedItem(item)}
                  className="btn btn-secondary btn-sm"
                >
                  <FaEye className="btn-icon" />
                  View Details
                </button>
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setShowUpdateModal(true);
                  }}
                  className="btn btn-primary btn-sm"
                >
                  <FaEdit className="btn-icon" />
                  Update Status
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Update Modal */}
      {showUpdateModal && selectedItem && (
        <div className="modal-overlay">
          <div className="modal-content">
            <StatusUpdateModal
              maintenance={selectedItem}
              onUpdate={handleStatusUpdate}
              onClose={() => {
                setShowUpdateModal(false);
                setSelectedItem(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedItem && !showUpdateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <MaintenanceDetailsModal
              maintenance={selectedItem}
              onClose={() => setSelectedItem(null)}
              onUpdateStatus={() => {
                setShowUpdateModal(true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Status Update Modal Component
const StatusUpdateModal = ({ maintenance, onUpdate, onClose }) => {
  const [newStatus, setNewStatus] = useState(maintenance.status);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'pending', label: 'Pending', description: 'Request is waiting to be assigned' },
    { value: 'assigned', label: 'Assigned', description: 'Request has been assigned to staff' },
    { value: 'in_progress', label: 'In Progress', description: 'Work is currently being done' },
    { value: 'completed', label: 'Completed', description: 'Maintenance work is finished' },
    { value: 'cancelled', label: 'Cancelled', description: 'Request has been cancelled' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newStatus === maintenance.status && !notes.trim()) {
      onClose();
      return;
    }
    
    setLoading(true);
    try {
      const result = await onUpdate(maintenance.id, newStatus, notes);
      if (result.success) {
        onClose();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="status-update-modal">
      <div className="modal-header">
        <h3>Update Maintenance Status</h3>
        <button type="button" className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="modal-body">
        <div className="maintenance-summary">
          <h4>Room {maintenance.room_number} - {maintenance.issue_type}</h4>
          <p className="current-status">
            Current Status: <span className={`status-badge ${getStatusColor(maintenance.status)}`}>
              {maintenance.status.replace('_', ' ')}
            </span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="update-form">
          <div className="form-group">
            <label>New Status</label>
            <div className="status-options">
              {statusOptions.map(option => (
                <label key={option.value} className="status-option">
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={newStatus === option.value}
                    onChange={(e) => setNewStatus(e.target.value)}
                  />
                  <div className="option-content">
                    <span className="option-label">{option.label}</span>
                    <span className="option-description">{option.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>Additional Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this status update..."
              rows="4"
              className="notes-input"
            />
          </div>
          
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Maintenance Details Modal Component
const MaintenanceDetailsModal = ({ maintenance, onClose, onUpdateStatus }) => {
  return (
    <div className="maintenance-details-modal">
      <div className="modal-header">
        <h3>Maintenance Request Details</h3>
        <button type="button" className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="modal-body">
        <div className="details-section">
          <h4>Basic Information</h4>
          <div className="details-grid">
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
              <span className="detail-value">
                <span className={`priority-badge ${getPriorityColor(maintenance.priority)}`}>
                  {maintenance.priority}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status:</span>
              <span className="detail-value">
                <span className={`status-badge ${getStatusColor(maintenance.status)}`}>
                  {maintenance.status.replace('_', ' ')}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Created:</span>
              <span className="detail-value">
                {new Date(maintenance.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="details-section">
          <h4>Description</h4>
          <p className="detail-description">{maintenance.description}</p>
        </div>
        
        {maintenance.notes && (
          <div className="details-section">
            <h4>Notes</h4>
            <p className="detail-notes">{maintenance.notes}</p>
          </div>
        )}
        
        {maintenance.assigned_to_name && (
          <div className="details-section">
            <h4>Assignment</h4>
            <p className="detail-assignment">
              <FaUser className="detail-icon" />
              Assigned to: {maintenance.assigned_to_name}
            </p>
          </div>
        )}
        
        {maintenance.estimated_duration && (
          <div className="details-section">
            <h4>Timeline</h4>
            <p className="detail-timeline">
              <FaClock className="detail-icon" />
              Estimated Duration: {maintenance.estimated_duration} hours
            </p>
          </div>
        )}
      </div>
      
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={onUpdateStatus}>
          Update Status
        </button>
      </div>
    </div>
  );
};

// Helper functions for the modal components
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

const getPriorityColor = (priority) => {
  const colors = {
    urgent: 'text-red-600 bg-red-100',
    high: 'text-orange-600 bg-orange-100',
    medium: 'text-yellow-600 bg-yellow-100',
    low: 'text-green-600 bg-green-100'
  };
  return colors[priority] || colors.medium;
};

export default ReceptionMaintenanceStatus;
