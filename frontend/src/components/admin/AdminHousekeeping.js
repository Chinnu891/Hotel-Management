import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import { useRealTime } from '../../contexts/RealTimeContext';
import { FaBroom, FaClipboardCheck, FaEye, FaEdit, FaTrash, FaPlus, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';
import './AdminHousekeeping.css';

const AdminHousekeeping = () => {
  const [housekeepingData, setHousekeepingData] = useState([]);
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
    fetchHousekeepingData();
  }, []);

  // Listen for real-time housekeeping updates
  useEffect(() => {
    const housekeepingNotifications = notifications.filter(
      notification => notification.type === 'housekeeping_update'
    );
    
    if (housekeepingNotifications.length > 0) {
      // Refresh data when we receive housekeeping updates
      fetchHousekeepingData();
    }
  }, [notifications]);

  const fetchHousekeepingData = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_GET_TASKS));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setHousekeepingData(data.data.tasks || []);
        setStatistics(data.data.statistics || {});
      } else {
        setError(data.message || 'Failed to fetch housekeeping data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_CREATE_TASK), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();
      
      if (result.success) {
        setShowForm(false);
        fetchHousekeepingData(); // Refresh data
        return { success: true, message: 'Housekeeping task created successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to create housekeeping task' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const handleUpdateTask = async (id, updateData) => {
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_UPDATE_TASK), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updateData }),
      });

      const result = await response.json();
      
      if (result.success) {
        setEditingItem(null);
        fetchHousekeepingData(); // Refresh data
        return { success: true, message: 'Housekeeping task updated successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to update housekeeping task' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this housekeeping task?')) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_DELETE_TASK), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();
      
      if (result.success) {
        fetchHousekeepingData(); // Refresh data
        return { success: true, message: 'Housekeeping task deleted successfully' };
      } else {
        return { success: false, message: result.message || 'Failed to delete housekeeping task' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const getTaskTypeColor = (taskType) => {
    const colors = {
      daily_cleaning: 'text-blue-600 bg-blue-100',
      deep_cleaning: 'text-purple-600 bg-purple-100',
      post_checkout: 'text-orange-600 bg-orange-100',
      pre_checkin: 'text-green-600 bg-green-100',
      inspection: 'text-indigo-600 bg-indigo-100'
    };
    return colors[taskType] || colors.daily_cleaning;
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

  const filteredData = housekeepingData.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch = item.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.task_type?.toLowerCase().includes(searchTerm.toLowerCase());
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
          <h2 className="text-2xl font-bold text-gray-900">Admin Housekeeping Management</h2>
          <p className="text-gray-600 mt-1">Monitor and manage all housekeeping tasks across the hotel</p>
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
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
          >
            <FaPlus className="mr-2" />
            Create Task
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
              <FaBroom className="h-6 w-6 text-blue-600" />
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <FaClipboardCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Inspections</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.inspections || 0}
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
                  ? 'bg-primary-100 text-primary-700' 
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
              placeholder="Search by room, description, or task type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Housekeeping Tasks List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Housekeeping Tasks ({filteredData.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredData.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <FaBroom className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No housekeeping tasks</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' ? 'No housekeeping tasks found.' : `No ${filter} housekeeping tasks found.`}
              </p>
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Room {item.room_number} - {item.task_type?.replace('_', ' ')}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTaskTypeColor(item.task_type)}`}>
                        {item.task_type?.replace('_', ' ')}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                      <span>Created: {formatDate(item.created_at)}</span>
                      {item.assigned_to && <span>Assigned to: {item.assigned_to}</span>}
                      {item.estimated_completion && <span>ETA: {formatDate(item.estimated_completion)}</span>}
                      {item.overall_rating && <span>Rating: {item.overall_rating}/5</span>}
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
                      onClick={() => handleDeleteTask(item.id)}
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
        <HousekeepingFormModal
          onSubmit={handleCreateTask}
          onClose={() => setShowForm(false)}
          title="Create Housekeeping Task"
        />
      )}

      {/* Edit Form Modal */}
      {editingItem && (
        <HousekeepingFormModal
          onSubmit={(data) => handleUpdateTask(editingItem.id, data)}
          onClose={() => setEditingItem(null)}
          title="Edit Housekeeping Task"
          initialData={editingItem}
        />
      )}

      {/* View Details Modal */}
      {selectedItem && (
        <HousekeepingDetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

// Housekeeping Form Modal Component
const HousekeepingFormModal = ({ onSubmit, onClose, title, initialData = {} }) => {
  const [formData, setFormData] = useState({
    room_id: initialData.room_id || '',
    task_type: initialData.task_type || '',
    description: initialData.description || '',
    priority: initialData.priority || 'medium',
    assigned_to: initialData.assigned_to || '',
    estimated_completion: initialData.estimated_completion || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
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
              <label className="block text-sm font-medium text-gray-700">Room ID</label>
              <input
                type="number"
                value={formData.room_id}
                onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Task Type</label>
              <select
                value={formData.task_type}
                onChange={(e) => setFormData({...formData, task_type: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="">Select task type</option>
                <option value="daily_cleaning">Daily Cleaning</option>
                <option value="deep_cleaning">Deep Cleaning</option>
                <option value="post_checkout">Post Checkout</option>
                <option value="pre_checkin">Pre Check-in</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
              <input
                type="text"
                value={formData.assigned_to}
                onChange={(e) => setFormData({...formData, assigned_to: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Estimated Completion</label>
              <input
                type="datetime-local"
                value={formData.estimated_completion}
                onChange={(e) => setFormData({...formData, estimated_completion: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md"
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

// Housekeeping Details Modal Component
const HousekeepingDetailsModal = ({ item, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Housekeeping Task Details</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Room:</span>
              <span className="ml-2 text-sm text-gray-900">Room {item.room_number}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Task Type:</span>
              <span className="ml-2 text-sm text-gray-900">{item.task_type?.replace('_', ' ')}</span>
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
              <span className="ml-2 text-sm text-gray-900 capitalize">{item.status?.replace('_', ' ')}</span>
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
            {item.estimated_completion && (
              <div>
                <span className="text-sm font-medium text-gray-700">Estimated Completion:</span>
                <span className="ml-2 text-sm text-gray-900">
                  {new Date(item.estimated_completion).toLocaleDateString()}
                </span>
              </div>
            )}
            {item.overall_rating && (
              <div>
                <span className="text-sm font-medium text-gray-700">Rating:</span>
                <span className="ml-2 text-sm text-gray-900">{item.overall_rating}/5</span>
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

export default AdminHousekeeping;
