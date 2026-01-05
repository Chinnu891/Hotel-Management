import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

const RoomStatus = () => {
  const { token } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [updateForm, setUpdateForm] = useState({
    room_id: '',
    new_status: 'available',
    reason: ''
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ROOMS_GET_ALL), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch rooms' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.RECEPTION_UPDATE_ROOM_STATUS), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateForm)
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Room status updated successfully!' });
        setUpdateForm({
          room_id: '',
          new_status: 'available',
          reason: ''
        });
        setSelectedRoom(null);
        fetchRooms(); // Refresh the room list
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to update room status' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update room status. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setUpdateForm({
      room_id: room.id,
      new_status: room.status === 'occupied' ? 'cleaning' : 'available',
      reason: ''
    });
  };

  const handleCompleteCleaning = async (roomNumber) => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('/housekeeping/complete_cleaning.php'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ room_number: roomNumber })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Room ${roomNumber} cleaning completed successfully!` });
        fetchRooms(); // Refresh the room list
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to complete cleaning' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to complete cleaning. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'available': 'bg-green-100 text-green-800',
      'booked': 'bg-orange-100 text-orange-800',
      'occupied': 'bg-blue-100 text-blue-800',
      'cleaning': 'bg-yellow-100 text-yellow-800',
      'maintenance': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getStatusColor = (status) => {
    const colors = {
      'available': 'border-green-500',
      'booked': 'border-orange-500',
      'occupied': 'border-blue-500',
      'cleaning': 'border-yellow-500',
      'maintenance': 'border-red-500'
    };
    return colors[status] || 'border-gray-300';
  };

  const getNextStatusOptions = (currentStatus) => {
    switch (currentStatus) {
      case 'occupied':
        return ['cleaning'];
      case 'cleaning':
        return ['available', 'maintenance'];
      case 'maintenance':
        return ['available'];
      case 'available':
        return ['maintenance'];
      default:
        return ['available', 'cleaning', 'maintenance'];
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Room Status Management</h2>

      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Room Status Overview</h3>
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading rooms...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedRoom?.id === room.id ? 'ring-2 ring-blue-500' : ''
                      } ${getStatusColor(room.status)}`}
                      onClick={() => handleRoomSelect(room)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-medium text-gray-900">Room {room.room_number}</h4>
                        {getStatusBadge(room.status)}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">Type: {room.room_type_name}</p>
                      <p className="text-sm text-gray-600">Floor: {room.floor}</p>
                      
                      {room.status === 'booked' && (
                        <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                          <p className="text-xs text-orange-800 font-medium">Booked - Awaiting Check-in</p>
                        </div>
                      )}
                      
                      {room.status === 'occupied' && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs text-blue-800 font-medium">Currently Occupied</p>
                        </div>
                      )}
                      
                                        {room.status === 'cleaning' && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs text-yellow-800 font-medium">Under Cleaning</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteCleaning(room.room_number);
                        }}
                        className="mt-2 w-full bg-yellow-600 text-white text-xs py-1 px-2 rounded hover:bg-yellow-700"
                      >
                        Complete Cleaning
                      </button>
                    </div>
                  )}
                      
                      {room.status === 'maintenance' && (
                        <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                          <p className="text-xs text-red-800 font-medium">Under Maintenance</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Update Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Update Room Status</h3>
            </div>
            
            <div className="p-6">
              {selectedRoom ? (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900">Selected Room</h4>
                    <p className="text-sm text-gray-600">Room {selectedRoom.room_number}</p>
                    <p className="text-sm text-gray-600">Current Status: {selectedRoom.status}</p>
                  </div>
                  
                  <form onSubmit={handleStatusUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                      <select
                        value={updateForm.new_status}
                        onChange={(e) => setUpdateForm({...updateForm, new_status: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {getNextStatusOptions(selectedRoom.status).map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                      <textarea
                        value={updateForm.reason}
                        onChange={(e) => setUpdateForm({...updateForm, reason: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows="3"
                        placeholder="Enter reason for status change..."
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Update Status'}
                    </button>
                  </form>
                  
                  <button
                    onClick={() => {
                      setSelectedRoom(null);
                      setUpdateForm({
                        room_id: '',
                        new_status: 'available',
                        reason: ''
                      });
                    }}
                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                  >
                    Clear Selection
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Select a room to update its status</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Status Legend</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Available</p>
                <p className="text-sm text-gray-600">Ready for new guests</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Booked</p>
                <p className="text-sm text-gray-600">Reserved, awaiting check-in</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Occupied</p>
                <p className="text-sm text-gray-600">Currently has guests</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Cleaning</p>
                <p className="text-sm text-gray-600">Under housekeeping</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Maintenance</p>
                <p className="text-sm text-gray-600">Repairs or inspection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomStatus;
