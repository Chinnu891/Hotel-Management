import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { useRealTime } from '../../contexts/RealTimeContext';
import { FaTools, FaClock, FaCheckCircle, FaExclamationTriangle, FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import './AdminMaintenance.css';

const AdminMaintenance = () => {
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isConnected, notifications } = useRealTime();

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  // Listen for real-time maintenance updates
  useEffect(() => {
    const maintenanceNotifications = notifications.filter(
      notification => notification.type === 'maintenance_update'
    );
    
    if (maintenanceNotifications.length > 0) {
      // Refresh data when we receive maintenance updates
      fetchMaintenanceData();
    }
  }, [notifications]);

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

  const handleCreateMaintenance = async (maintenanceData) => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_CREATE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(maintenanceData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowForm(false);
        fetchMaintenanceData(); // Refresh data
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
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_UPDATE), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updateData }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEditingItem(null);
        fetchMaintenanceData(); // Refresh data
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
      const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_DELETE), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();
      
      if (result.success) {
        fetchMaintenanceData(); // Refresh data
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
      'in_progress': 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100'
    };
    return colors[status] || colors.pending;
  };

  const filteredData = maintenanceData.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch = item.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.issue_type?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <FaExclamationTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Maintenance Management</h2>
          <p className="text-gray-600 mt-1">Monitor and manage all maintenance requests across the hotel</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Real-time Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={() => setShowForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
          >
            <FaPlus className="mr-2" />
            Create Request
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FaClock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.pending || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaTools className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.in_progress || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FaCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.completed || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FaExclamationTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.urgent || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'all' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'pending' 
                  ? 'bg-yellow-100 text-yellow-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'in_progress' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'completed' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by room, description, or issue type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Maintenance Requests ({filteredData.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredData.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <FaTools className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' ? 'No maintenance requests found.' : `No ${filter} maintenance requests found.`}
              </p>
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Room {item.room_number} - {item.issue_type}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                      <span>Created: {formatDate(item.created_at)}</span>
                      {item.assigned_to && <span>Assigned to: {item.assigned_to}</span>}
                      {item.estimated_completion && <span>ETA: {formatDate(item.estimated_completion)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                      title="View Details"
                    >
                      <FaEye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Edit"
                    >
                      <FaEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMaintenance(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Delete"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <MaintenanceFormModal
          onSubmit={handleCreateMaintenance}
          onClose={() => setShowForm(false)}
          title="Create Maintenance Request"
        />
      )}

      {/* Edit Form Modal */}
      {editingItem && (
        <MaintenanceFormModal
          onSubmit={(data) => handleUpdateMaintenance(editingItem.id, data)}
          onClose={() => setEditingItem(null)}
          title="Edit Maintenance Request"
          initialData={editingItem}
        />
      )}

      {/* View Details Modal */}
      {selectedItem && (
        <MaintenanceDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

// Maintenance Form Modal Component
const MaintenanceFormModal = ({ onSubmit, onClose, title, initialData = {} }) => {
  const [formData, setFormData] = useState({
    room_id: initialData.room_id || '',
    issue_type: initialData.issue_type || '',
    description: initialData.description || '',
    priority: initialData.priority || 'medium',
    assigned_to: initialData.assigned_to || '',
    estimated_duration: initialData.estimated_duration || '',
    notes: initialData.notes || ''
  });
  
  const [rooms, setRooms] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
    fetchStaff();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      console.log('Admin Maintenance: Fetching rooms from:', buildApiUrl('rooms/getAll.php'));
      const response = await fetch(buildApiUrl('rooms/getAll.php'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Admin Maintenance: Rooms API response:', data);
      
      if (data.success) {
        console.log('Admin Maintenance: Setting rooms:', data.rooms);
        setRooms(data.rooms || []);
      } else {
        console.error('Admin Maintenance: Rooms API error:', data.message);
        setRooms([]);
      }
    } catch (error) {
      console.error('Admin Maintenance: Error fetching rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch(buildApiUrl('maintenance/get_staff_list.php'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setStaff(data.data || []);
      } else {
        console.error('Staff API error:', data.message);
        setStaff([]);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setStaff([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Admin Maintenance: Form submitted with data:', formData);
    console.log('Admin Maintenance: Selected room_id:', formData.room_id);
    console.log('Admin Maintenance: Available rooms:', rooms);
    
    const result = await onSubmit(formData);
    if (result.success) {
      onClose();
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Room</label>
              <select
                value={formData.room_id}
                onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a room</option>
                {loading ? (
                  <option value="">Loading rooms...</option>
                ) : rooms.length === 0 ? (
                  <option value="">No rooms available</option>
                ) : (
                  rooms.map(room => {
                    console.log('Admin Maintenance: Rendering room option:', room);
                    return (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Issue Type</label>
              <select
                value={formData.issue_type}
                onChange={(e) => setFormData({...formData, issue_type: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select issue type</option>
                <option value="repair">Repair</option>
                <option value="cleaning">Cleaning</option>
                <option value="inspection">Inspection</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Assigned To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a staff member</option>
                {loading ? (
                  <option value="">Loading staff...</option>
                ) : staff.length === 0 ? (
                  <option value="">No staff members available</option>
                ) : (
                  staff.map(staffMember => (
                    <option key={staffMember.id} value={staffMember.name}>
                      {staffMember.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estimated Duration (hours)</label>
              <input
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({...formData, estimated_duration: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0.5"
                step="0.5"
                placeholder="e.g., 2.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Any additional information..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                {initialData.id ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Maintenance Details Modal Component
const MaintenanceDetailsModal = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Room:</span>
              <span className="ml-2 text-sm text-gray-900">Room {item.room_number}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Issue Type:</span>
              <span className="ml-2 text-sm text-gray-900">{item.issue_type}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Description:</span>
              <p className="mt-1 text-sm text-gray-900">{item.description}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Priority:</span>
              <span className="ml-2 text-sm text-gray-900 capitalize">{item.priority}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <span className="ml-2 text-sm text-gray-900 capitalize">{item.status.replace('_', ' ')}</span>
            </div>
            {item.assigned_to && (
              <div>
                <span className="text-sm font-medium text-gray-700">Assigned To:</span>
                <span className="ml-2 text-sm text-gray-900">{item.assigned_to}</span>
              </div>
            )}
            <div>
              <span className="text-sm font-medium text-gray-700">Created:</span>
              <span className="ml-2 text-sm text-gray-900">
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
            {item.estimated_duration && (
              <div>
                <span className="text-sm font-medium text-gray-700">Estimated Duration:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {item.estimated_duration} hours
                </span>
              </div>
            )}
            {item.notes && (
              <div>
                <span className="text-sm font-medium text-gray-700">Notes:</span>
                <p className="mt-1 text-sm text-gray-900">{item.notes}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMaintenance;
