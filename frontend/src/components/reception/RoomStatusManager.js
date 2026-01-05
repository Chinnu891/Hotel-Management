import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../config/api';
import { toast } from 'react-toastify';

const RoomStatusManager = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadRoomStatuses();
  }, []);

  const loadRoomStatuses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${buildApiUrl('reception/room_status_api.php')}?action=room_statuses`);
      const data = await response.json();
      
      if (data.success) {
        setRooms(data.data);
      } else {
        toast.error('Failed to load room statuses');
      }
    } catch (error) {
      console.error('Error loading room statuses:', error);
      toast.error('Failed to load room statuses');
    } finally {
      setLoading(false);
    }
  };

  const syncRoomStatuses = async () => {
    try {
      setSyncing(true);
      const response = await fetch(`${buildApiUrl('reception/room_status_api.php')}?action=sync_room_statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Room statuses synchronized successfully!');
        loadRoomStatuses(); // Refresh the data
      } else {
        toast.error(data.message || 'Failed to sync room statuses');
      }
    } catch (error) {
      console.error('Error syncing room statuses:', error);
      toast.error('Failed to sync room statuses');
    } finally {
      setSyncing(false);
    }
  };

  const updateRoomStatus = async (roomNumber, newStatus, reason = '') => {
    try {
      const response = await fetch(`${buildApiUrl('reception/room_status_api.php')}?action=update_room_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_number: roomNumber,
          status: newStatus,
          reason: reason || `Manual update to ${newStatus}`
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Room ${roomNumber} status updated to ${newStatus}`);
        loadRoomStatuses(); // Refresh the data
      } else {
        toast.error(data.message || 'Failed to update room status');
      }
    } catch (error) {
      console.error('Error updating room status:', error);
      toast.error('Failed to update room status');
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'available': 'bg-green-100 text-green-800 border-green-200',
      'booked': 'bg-orange-100 text-orange-800 border-orange-200',
      'occupied': 'bg-blue-100 text-blue-800 border-blue-200',
      'cleaning': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'maintenance': 'bg-red-100 text-red-800 border-red-200'
    };
    
    const statusLabels = {
      'available': 'Available',
      'booked': 'Booked',
      'occupied': 'Occupied',
      'cleaning': 'Cleaning',
      'maintenance': 'Maintenance'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getEffectiveStatusBadge = (effectiveStatus) => {
    const statusClasses = {
      'available': 'bg-green-100 text-green-800 border-green-200',
      'booked': 'bg-orange-100 text-orange-800 border-orange-200',
      'occupied': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusClasses[effectiveStatus] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {effectiveStatus}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Room Status Management</h1>
          <p className="mt-2 text-gray-600">Monitor and manage room statuses across the hotel</p>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Actions</h2>
          </div>
          <div className="px-6 py-4">
            <div className="flex space-x-4">
              <button
                onClick={syncRoomStatuses}
                disabled={syncing}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? 'Syncing...' : 'Sync Room Statuses'}
              </button>
              <button
                onClick={loadRoomStatuses}
                disabled={loading}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Sync room statuses with current booking statuses to ensure consistency
            </p>
          </div>
        </div>

        {/* Room Status Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Room Statuses</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Room {room.room_number}
                        </div>
                        <div className="text-sm text-gray-500">Floor {room.floor}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{room.room_type_name}</div>
                        <div className="text-sm text-gray-500">₹{room.price}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(room.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEffectiveStatusBadge(room.effective_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {room.first_name && room.last_name ? (
                        <div>
                          <div className="text-sm text-gray-900">
                            {room.first_name} {room.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {room.booking_status ? room.booking_status.replace('_', ' ') : 'N/A'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No guest</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {room.status !== 'available' && (
                          <button
                            onClick={() => updateRoomStatus(room.room_number, 'available', 'Manual reset to available')}
                            className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200 transition-colors"
                          >
                            Set Available
                          </button>
                        )}
                        {room.status !== 'cleaning' && (
                          <button
                            onClick={() => updateRoomStatus(room.room_number, 'cleaning', 'Set for cleaning')}
                            className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs hover:bg-yellow-200 transition-colors"
                          >
                            Set Cleaning
                          </button>
                        )}
                        {room.status !== 'maintenance' && (
                          <button
                            onClick={() => updateRoomStatus(room.room_number, 'maintenance', 'Set for maintenance')}
                            className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs hover:bg-red-200 transition-colors"
                          >
                            Set Maintenance
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Rooms Message */}
        {!loading && rooms.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No rooms found</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomStatusManager;
