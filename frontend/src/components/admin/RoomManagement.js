import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import EditPopup from '../common/EditPopup';

const RoomManagement = () => {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomTypesLoading, setRoomTypesLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_number: '',
    room_type_id: '',
    floor: '',
    price: ''
  });

  // Test API connectivity
  const testApiConnection = async () => {
    try {
      console.log('Testing API connection...');
      const testUrl = buildApiUrl('rooms/getRoomTypes.php');
      console.log('Test URL:', testUrl);
      
      const response = await axios.get(testUrl, { timeout: 5000 });
      console.log('API test successful:', response.status);
      return true;
    } catch (error) {
      console.error('API test failed:', error);
      if (error.code === 'ERR_NETWORK') {
        console.error('Network error - possible CORS or connectivity issue');
      } else if (error.response) {
        console.error('Server responded with error:', error.response.status, error.response.data);
      }
      return false;
    }
  };

  useEffect(() => {
    console.log('RoomManagement component mounted');
    console.log('Current token:', token);
    console.log('Auth headers:', axios.defaults.headers.common['Authorization']);
    
    if (token) {
      // Test API connection first
      testApiConnection().then(isConnected => {
        if (isConnected) {
          fetchRooms();
          fetchRoomTypes();
        } else {
          setError('Cannot connect to server. Please check if the backend is running and accessible.');
          setLoading(false);
          setRoomTypesLoading(false);
        }
      });
    } else {
      console.error('No authentication token available');
      setError('Authentication required');
      setLoading(false);
      setRoomTypesLoading(false);
    }
  }, [token]);

  const fetchRoomTypes = async (retryCount = 0) => {
    try {
      setRoomTypesLoading(true);
      console.log('Fetching room types... (attempt ' + (retryCount + 1) + ')');
      console.log('API URL:', buildApiUrl('rooms/getRoomTypes.php'));
      
      const response = await axios.get(buildApiUrl('rooms/getRoomTypes.php'), { timeout: 10000 });
      console.log('Room types response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      
      if (response.data && response.data.success && response.data.room_types) {
        setRoomTypes(response.data.room_types);
        console.log('Room types set:', response.data.room_types);
      } else {
        console.error('Invalid room types response structure:', response.data);
        setRoomTypes([]); // Ensure it's always an array
      }
    } catch (error) {
      console.error('Error fetching room types:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      // Retry logic for network errors
      if (error.code === 'ERR_NETWORK' && retryCount < 2) {
        console.log('Network error, retrying...');
        setTimeout(() => fetchRoomTypes(retryCount + 1), 2000);
        return;
      }
      
      setRoomTypes([]); // Ensure it's always an array on error
    } finally {
      setRoomTypesLoading(false);
    }
  };

  const fetchRooms = async (retryCount = 0) => {
    try {
      setLoading(true);
      console.log('Fetching rooms... (attempt ' + (retryCount + 1) + ')');
      console.log('API URL:', buildApiUrl('rooms/getAll.php'));
      
      const response = await axios.get(buildApiUrl('rooms/getAll.php'), { timeout: 10000 });
      console.log('Rooms response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      
      if (response.data && response.data.success && response.data.rooms) {
        setRooms(response.data.rooms);
        console.log('Rooms set:', response.data.rooms);
      } else {
        console.error('Invalid rooms response structure:', response.data);
        setError(response.data?.error || 'Invalid response structure');
        setRooms([]); // Ensure it's always an array
      }
    } catch (error) {
      setError('Failed to fetch rooms');
      console.error('Error fetching rooms:', error);
      console.error('Error response:', error.response);
      console.error('Error message:', error.message);
      
      // Retry logic for network errors
      if (error.code === 'ERR_NETWORK' && retryCount < 2) {
        console.log('Network error, retrying...');
        setTimeout(() => fetchRooms(retryCount + 1), 2000);
        return;
      }
      
      setRooms([]); // Ensure it's always an array on error
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    
    // Ensure proper data types
    const roomData = {
      room_number: newRoom.room_number.trim(),
      room_type_id: parseInt(newRoom.room_type_id),
      floor: parseInt(newRoom.floor),
      price: newRoom.price ? parseFloat(newRoom.price) : 0
    };
    
    console.log('Sending room data:', roomData);
    console.log('Token:', token);
    console.log('Authorization header:', axios.defaults.headers.common['Authorization']);
    
    try {
      const response = await axios.post(buildApiUrl('rooms/add.php'), roomData);
      
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      console.log('Response status:', response.status);
      
      if (response.data && response.data.success) {
        setShowAddForm(false);
        setNewRoom({ room_number: '', room_type_id: '', floor: '', price: '' });
        
        // Show success message
        alert('Room added successfully!');
        
        // Refresh the room list
        await fetchRooms();
      } else {
        console.log('Response indicates failure:', response.data);
        alert(response.data.error || 'Failed to add room');
      }
    } catch (error) {
      console.error('Full error object:', error);
      console.error('Error response:', error.response);
      if (error.response && error.response.data) {
        console.error('Server error message:', error.response.data.error);
        alert(`Failed to add room: ${error.response.data.error}`);
      } else {
        alert('Failed to add room');
      }
      console.error('Error adding room:', error);
    }
  };

  const handleEditRoom = async () => {
    if (!editingRoom) return;
    
    setEditLoading(true);
    
    const roomData = {
      id: editingRoom.id,
      room_number: editingRoom.room_number.trim(),
      room_type_id: parseInt(editingRoom.room_type_id),
      floor: parseInt(editingRoom.floor),
      price: editingRoom.price ? parseFloat(editingRoom.price) : 0
    };
    
    try {
      const response = await axios.put(buildApiUrl('rooms/edit.php'), roomData);
      
      if (response.data && response.data.success) {
        setShowEditModal(false);
        setEditingRoom(null);
        alert('Room updated successfully!');
        await fetchRooms();
      } else {
        alert(response.data.error || 'Failed to update room');
      }
    } catch (error) {
      if (error.response && error.response.data) {
        alert(`Failed to update room: ${error.response.data.error}`);
      } else {
        alert('Failed to update room');
      }
      console.error('Error updating room:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await axios.post(buildApiUrl('rooms/delete.php'), {
        id: roomId
      });
      
      if (response.data && response.data.success) {
        alert('Room deleted successfully!');
        await fetchRooms();
      } else {
        alert(response.data.error || 'Failed to delete room');
      }
    } catch (error) {
      if (error.response && error.response.data) {
        // Check if this is a room with active bookings that needs confirmation
        if (error.response.data.requires_confirmation && error.response.data.warning) {
          const confirmed = window.confirm(error.response.data.warning + '\n\nThis action will delete the room and may affect active bookings.');
          
          if (confirmed) {
            // User confirmed, use force delete
            try {
              const forceResponse = await axios.post(buildApiUrl('rooms/forceDelete.php'), {
                id: roomId,
                confirmed: true
              });
              
              if (forceResponse.data && forceResponse.data.success) {
                let message = 'Room force deleted successfully!';
                if (forceResponse.data.warning) {
                  message += '\n\nWarning: ' + forceResponse.data.warning;
                }
                alert(message);
                await fetchRooms();
              } else {
                alert(forceResponse.data.error || 'Failed to force delete room');
              }
            } catch (forceError) {
              if (forceError.response && forceError.response.data) {
                alert(`Failed to force delete room: ${forceError.response.data.error}`);
              } else {
                alert('Failed to force delete room');
              }
            }
          }
        } else {
          // Regular error
          alert(`Failed to delete room: ${error.response.data.error}`);
        }
      } else {
        alert('Failed to delete room');
      }
    }
  };

  const openEditForm = (room) => {
    // Ensure room types are loaded before opening edit form
    if (!roomTypes || roomTypes.length === 0) {
      alert('Room types are still loading. Please wait a moment and try again.');
      return;
    }
    
    console.log('Opening edit form for room:', room);
    
    setEditingRoom({
      id: room.id,
      room_number: room.room_number,
      room_type_id: room.room_type_id, // Now we have this directly from the API
      floor: room.floor,
      price: room.price || room.base_price
    });
    setShowEditModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'booked':
        return 'bg-orange-100 text-orange-800';
      case 'occupied':
        return 'bg-red-100 text-red-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'cleaning':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || roomTypesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Loading rooms...' : 'Loading room types...'}
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 text-lg">Authentication required</p>
          <p className="text-gray-600">Please log in to access room management</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Room Management
        </h2>
        {roomTypes && roomTypes.length > 0 ? (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
          >
            {showAddForm ? 'Cancel' : 'Add New Room'}
          </button>
        ) : (
          <div className="text-sm text-gray-500">
            No room types available
          </div>
        )}
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <strong>Error:</strong> {error}
          </div>
          <button 
            onClick={() => {
              setError('');
              if (token) {
                testApiConnection().then(isConnected => {
                  if (isConnected) {
                    fetchRooms();
                    fetchRoomTypes();
                  }
                });
              }
            }}
            className="mt-2 text-red-600 underline hover:text-red-800 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Warning Messages */}
      {roomTypes && roomTypes.length === 0 && !roomTypesLoading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center">
            <span className="text-yellow-500 mr-2">⚠️</span>
            <strong>Warning:</strong> No room types are available. Please add room types first before adding rooms.
          </div>
        </div>
      )}

      {/* Add Room Form */}
      {showAddForm && !roomTypesLoading && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg border border-gray-100 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Room</h3>
          {roomTypes.length === 0 ? (
            <div className="text-red-600 text-sm">
              No room types available. Please add room types first.
            </div>
          ) : (
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Number
                  </label>
                  <input
                    type="text"
                    value={newRoom.room_number}
                    onChange={(e) => setNewRoom({...newRoom, room_number: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="e.g., 777 (must be unique)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type
                  </label>
                  <select
                    value={newRoom.room_type_id}
                    onChange={(e) => setNewRoom({...newRoom, room_type_id: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  >
                    <option value="">Select Type</option>
                    {roomTypes && roomTypes.length > 0 ? roomTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    )) : (
                      <option value="" disabled>No room types available</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor
                  </label>
                  <input
                    type="number"
                    value={newRoom.floor}
                    onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newRoom.price}
                    onChange={(e) => setNewRoom({...newRoom, price: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Leave empty to use room type base price"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Set a custom price for this room, or leave empty to use the room type's base price
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  Add Room
                </button>
              </div>
            </form>
          )}
        </div>
      )}



      {/* Rooms List */}
      <div className="bg-white shadow-lg rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Room List</h3>
          <p className="text-sm text-gray-600 mt-1">Manage all your hotel rooms</p>
        </div>
        <ul className="divide-y divide-gray-200">
          {rooms && rooms.length > 0 ? rooms.map((room) => (
            <li key={room.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm">
                      <span className="text-blue-700 font-bold text-lg sm:text-xl">
                        {room.room_number}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg sm:text-xl font-semibold text-gray-900">
                        Room {room.room_number}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                        {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600">🏠</span>
                        <span>{room.room_type}</span>
                        <span className="text-gray-400">•</span>
                        <span>Floor {room.floor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">💰</span>
                        <span className="font-medium">₹{room.price || room.base_price}/night</span>
                        {room.price && room.price !== room.base_price && (
                          <span className="text-xs text-gray-400 ml-2">
                            (Base: ₹{room.base_price})
                          </span>
                        )}
                      </div>
                      {room.amenities && (
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600">✨</span>
                          <span className="text-xs">{room.amenities}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                  <button 
                    onClick={() => openEditForm(room)}
                    className="px-3 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg text-sm font-medium transition-colors border border-blue-200 hover:border-blue-300"
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteRoom(room.id)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors border border-red-200 hover:border-red-300"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </li>
          )) : (
            <li className="px-4 sm:px-6 py-8 text-center text-gray-500">
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                  <span>Loading rooms...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <span className="text-4xl mb-2">🏨</span>
                  <span>No rooms found.</span>
                </div>
              )}
            </li>
          )}
        </ul>
      </div>

      {rooms.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-6xl mb-4 block">🏨</span>
          <p className="text-gray-500 text-lg">No rooms found.</p>
          <p className="text-gray-400 text-sm mt-1">Start by adding your first room above.</p>
        </div>
      )}

      {/* Edit Room Modal */}
      <EditPopup
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRoom(null);
        }}
        title="Edit Room"
        onSave={handleEditRoom}
        loading={editLoading}
        saveButtonText="Update Room"
        size="lg"
      >
        {editingRoom && roomTypes.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Number
                </label>
                <input
                  type="text"
                  value={editingRoom.room_number}
                  onChange={(e) => setEditingRoom({...editingRoom, room_number: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type
                </label>
                <select
                  value={editingRoom.room_type_id || ''}
                  onChange={(e) => setEditingRoom({...editingRoom, room_type_id: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                >
                  <option value="">Select Type</option>
                  {roomTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor
                </label>
                <input
                  type="number"
                  value={editingRoom.floor}
                  onChange={(e) => setEditingRoom({...editingRoom, floor: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingRoom.price}
                  onChange={(e) => setEditingRoom({...editingRoom, price: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Leave empty to use room type base price"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Set a custom price for this room, or leave empty to use the room type's base price
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-red-600 text-sm">
            No room types available. Please add room types first.
          </div>
        )}
      </EditPopup>
    </div>
  );
};

export default RoomManagement;
