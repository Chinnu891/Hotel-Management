import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';

const RoomTypeManagement = () => {
  const { token } = useAuth();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [newRoomType, setNewRoomType] = useState({
    name: '',
    description: '',
    final_price: '',
    capacity: ''
  });

  useEffect(() => {
    if (token) {
      fetchRoomTypes();
    }
  }, [token]);

  const fetchRoomTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(buildApiUrl('admin/room_types.php'));
      
      if (response.data.success) {
        setRoomTypes(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch room types');
      }
    } catch (error) {
      console.error('Error fetching room types:', error);
      setError('Failed to fetch room types');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoomType = async (e) => {
    e.preventDefault();
    
    try {
      const roomTypeData = {
        name: newRoomType.name.trim(),
        description: newRoomType.description.trim(),
        final_price: parseFloat(newRoomType.final_price),
        capacity: parseInt(newRoomType.capacity)
      };
      
      const response = await axios.post(buildApiUrl('admin/room_types.php'), roomTypeData);
      
      if (response.data.success) {
        setShowAddForm(false);
        setNewRoomType({ name: '', description: '', final_price: '', capacity: '' });
        alert('Room type added successfully!');
        await fetchRoomTypes();
      } else {
        alert(response.data.message || 'Failed to add room type');
      }
    } catch (error) {
      console.error('Error adding room type:', error);
      alert('Failed to add room type');
    }
  };

  const handleEditRoomType = async (e) => {
    e.preventDefault();
    
    if (!editingRoomType) return;
    
    try {
      const roomTypeData = {
        id: editingRoomType.id,
        name: editingRoomType.name.trim(),
        description: editingRoomType.description.trim(),
        final_price: parseFloat(editingRoomType.final_price),
        capacity: parseInt(editingRoomType.capacity)
      };
      
      const response = await axios.put(buildApiUrl('admin/room_types.php'), roomTypeData);
      
      if (response.data.success) {
        setShowEditForm(false);
        setEditingRoomType(null);
        alert('Room type updated successfully!');
        await fetchRoomTypes();
      } else {
        alert(response.data.message || 'Failed to update room type');
      }
    } catch (error) {
      console.error('Error updating room type:', error);
      alert('Failed to update room type');
    }
  };

  const handleDeleteRoomType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room type?')) {
      return;
    }
    
    try {
      const response = await axios.delete(buildApiUrl('admin/room_types.php'), {
        data: { id }
      });
      
      if (response.data.success) {
        alert('Room type deleted successfully!');
        await fetchRoomTypes();
      } else {
        alert(response.data.message || 'Failed to delete room type');
      }
    } catch (error) {
      console.error('Error deleting room type:', error);
      alert('Failed to delete room type');
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Room Type Management</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Add New Room Type
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Room Types Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Room Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {roomTypes.map((roomType) => (
                <tr key={roomType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{roomType.name}</div>
                      <div className="text-sm text-gray-500">{roomType.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`font-bold ${roomType.has_custom_price ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatCurrency(roomType.final_price)}
                    </span>
                    {roomType.has_custom_price && (
                      <div className="text-xs text-gray-500">
                        Custom price active
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {roomType.capacity} guest{roomType.capacity > 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingRoomType(roomType);
                          setShowEditForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRoomType(roomType.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Room Type Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Room Type</h2>
              <form onSubmit={handleAddRoomType}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      value={newRoomType.name}
                      onChange={(e) => setNewRoomType({...newRoomType, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={newRoomType.description}
                      onChange={(e) => setNewRoomType({...newRoomType, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Final Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newRoomType.final_price}
                      onChange={(e) => setNewRoomType({...newRoomType, final_price: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      placeholder="Enter the price customers will pay"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is the price that customers will see and pay
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity *</label>
                    <input
                      type="number"
                      min="1"
                      value={newRoomType.capacity}
                      onChange={(e) => setNewRoomType({...newRoomType, capacity: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Room Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Room Type Modal */}
        {showEditForm && editingRoomType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Room Type</h2>
              <form onSubmit={handleEditRoomType}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      value={editingRoomType.name}
                      onChange={(e) => setEditingRoomType({...editingRoomType, name: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={editingRoomType.description}
                      onChange={(e) => setEditingRoomType({...editingRoomType, description: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Final Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingRoomType.final_price || editingRoomType.custom_price || editingRoomType.base_price}
                      onChange={(e) => setEditingRoomType({...editingRoomType, final_price: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                      placeholder="Enter the price customers will pay"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is the price that customers will see and pay
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity *</label>
                    <input
                      type="number"
                      min="1"
                      value={editingRoomType.capacity}
                      onChange={(e) => setEditingRoomType({...editingRoomType, capacity: e.target.value})}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingRoomType(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Update Room Type
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomTypeManagement;
