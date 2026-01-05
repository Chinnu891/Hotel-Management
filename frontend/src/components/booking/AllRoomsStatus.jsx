import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/api';
import './AllRoomsStatus.css';

const AllRoomsStatus = ({ checkInDate, checkOutDate, onRoomSelect }) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({});

    useEffect(() => {
        if (checkInDate && checkOutDate) {
            fetchAllRoomsStatus();
        }
    }, [checkInDate, checkOutDate]);

    const fetchAllRoomsStatus = async () => {
        setLoading(true);
        setError('');

        try {
            const checkIn = checkInDate.toISOString().split('T')[0];
            const checkOut = checkOutDate.toISOString().split('T')[0];

            const response = await fetch(
                `${buildApiUrl('booking/get_all_rooms_with_status.php')}?check_in_date=${checkIn}&check_out_date=${checkOut}`
            );

            const data = await response.json();

            if (data.success) {
                setRooms(data.data.rooms);
                setStats({
                    total: data.data.total_rooms,
                    available: data.data.available_rooms,
                    prebooked: data.data.prebooked_rooms,
                    occupied: data.data.occupied_rooms,
                    maintenance: data.data.maintenance_rooms,
                    cleaning: data.data.cleaning_rooms
                });
            } else {
                setError(data.message || 'Failed to fetch room status');
            }
        } catch (error) {
            console.error('Error fetching room status:', error);
            setError('Error fetching room status');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            available: { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
            prebooked: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Pre-booked' },
            booked: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Booked' },
            occupied: { bg: 'bg-red-100', text: 'text-red-800', label: 'Occupied' },
            maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Maintenance' },
            cleaning: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Cleaning' },
            unknown: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Unknown' }
        };

        const config = statusConfig[status] || statusConfig.unknown;
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const handleRoomClick = (room) => {
        if (room.is_available && onRoomSelect) {
            onRoomSelect(room);
        } else if (room.is_prebooked) {
            alert(`Room ${room.room_number} is pre-booked for ${room.next_booking_date}. Please select a different room or date.`);
        } else {
            alert(`Room ${room.room_number} is not available: ${room.status_description}`);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading room status...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
            </div>
        );
    }

    return (
        <div className="all-rooms-status">
            {/* Statistics */}
            <div className="stats-grid mb-6">
                <div className="stat-card bg-green-50 border border-green-200">
                    <div className="stat-number text-green-600">{stats.available || 0}</div>
                    <div className="stat-label text-green-800">Available</div>
                </div>
                <div className="stat-card bg-orange-50 border border-orange-200">
                    <div className="stat-number text-orange-600">{stats.prebooked || 0}</div>
                    <div className="stat-label text-orange-800">Pre-booked</div>
                </div>
                <div className="stat-card bg-red-50 border border-red-200">
                    <div className="stat-number text-red-600">{stats.occupied || 0}</div>
                    <div className="stat-label text-red-800">Occupied</div>
                </div>
                <div className="stat-card bg-yellow-50 border border-yellow-200">
                    <div className="stat-number text-yellow-600">{stats.maintenance || 0}</div>
                    <div className="stat-label text-yellow-800">Maintenance</div>
                </div>
                <div className="stat-card bg-blue-50 border border-blue-200">
                    <div className="stat-number text-blue-600">{stats.cleaning || 0}</div>
                    <div className="stat-label text-blue-800">Cleaning</div>
                </div>
                <div className="stat-card bg-gray-50 border border-gray-200">
                    <div className="stat-number text-gray-600">{stats.total || 0}</div>
                    <div className="stat-label text-gray-800">Total</div>
                </div>
            </div>

            {/* Date Range Info */}
            <div className="date-info mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-1">Checking availability for:</h3>
                <p className="text-sm text-blue-700">
                    {formatDate(checkInDate)} to {formatDate(checkOutDate)}
                </p>
            </div>

            {/* Rooms Grid Grouped by Floor */}
            <div className="space-y-8">
                {(() => {
                    // Group rooms by floor
                    const roomsByFloor = rooms.reduce((acc, room) => {
                        const floor = room.floor || 'Unknown';
                        if (!acc[floor]) {
                            acc[floor] = [];
                        }
                        acc[floor].push(room);
                        return acc;
                    }, {});

                    // Sort floors numerically
                    const sortedFloors = Object.keys(roomsByFloor).sort((a, b) => {
                        const floorA = parseInt(a) || 0;
                        const floorB = parseInt(b) || 0;
                        return floorA - floorB;
                    });

                    return sortedFloors.map((floor) => (
                        <div key={floor} className="space-y-4">
                            {/* Floor Header */}
                            <div className="border-t border-b border-gray-300 py-3">
                                <h4 className="text-center text-lg font-bold text-gray-800">
                                    {floor === '1' ? '1st FLOOR' : 
                                     floor === '2' ? '2nd FLOOR' : 
                                     floor === '3' ? '3rd FLOOR' : 
                                     `${floor}th FLOOR`}
                                </h4>
                            </div>
                            
                            {/* Rooms for this floor */}
                            <div className="rooms-grid">
                                {roomsByFloor[floor].map((room) => (
                                    <div
                                        key={room.room_number}
                                        className={`room-card ${
                                            room.is_available 
                                                ? 'cursor-pointer hover:shadow-lg hover:scale-105 border-green-300' 
                                                : 'cursor-not-allowed border-gray-300'
                                        } ${
                                            room.is_prebooked ? 'bg-orange-50' : 
                                            room.availability_status === 'occupied' ? 'bg-red-50' :
                                            room.availability_status === 'maintenance' ? 'bg-yellow-50' :
                                            room.availability_status === 'cleaning' ? 'bg-blue-50' :
                                            'bg-white'
                                        }`}
                                        onClick={() => handleRoomClick(room)}
                                    >
                                        <div className="room-header">
                                            <h4 className="room-number">Room {room.room_number}</h4>
                                            <div className="room-price">₹{room.actual_price?.toLocaleString() || 'N/A'}</div>
                                        </div>
                                        
                                        <div className="room-details">
                                            <p className="room-type">{room.room_type_name}</p>
                                            <p className="room-capacity">{room.capacity} guests • Floor {room.floor}</p>
                                        </div>

                                        {room.is_prebooked && room.next_booking_date && (
                                            <div className="prebooked-info">
                                                <div className="mb-2">
                                                    {getStatusBadge(room.availability_status)}
                                                </div>
                                                <p className="text-xs text-orange-700">
                                                    Pre-booked for: {formatDate(room.next_booking_date)}
                                                </p>
                                                {room.next_booking && (
                                                    <p className="text-xs text-orange-600">
                                                        {room.next_booking}
                                                    </p>
                                                )}
                                                {room.current_guest_name && (
                                                    <p className="text-sm text-orange-600 font-semibold">
                                                        Guest: {room.current_guest_name}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {!room.is_prebooked && (
                                            <div className="room-status">
                                                {getStatusBadge(room.availability_status)}
                                                {room.availability_status === 'booked' && room.current_guest_name && (
                                                    <p className="text-sm text-yellow-600 font-semibold mt-1">
                                                        Guest: {room.current_guest_name}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {room.availability_status === 'occupied' && (
                                            <div className="occupied-info">
                                                <p className="text-xs text-red-700">
                                                    Currently occupied
                                                </p>
                                                {room.current_guest_name && (
                                                    <p className="text-sm text-red-600 font-semibold">
                                                        Guest: {room.current_guest_name}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {room.availability_status === 'maintenance' && (
                                            <div className="maintenance-info">
                                                <p className="text-xs text-yellow-700">
                                                    Under maintenance
                                                </p>
                                            </div>
                                        )}

                                        {room.availability_status === 'cleaning' && (
                                            <div className="cleaning-info">
                                                <p className="text-xs text-blue-700">
                                                    Under cleaning
                                                </p>
                                            </div>
                                        )}

                                        {room.is_available && (
                                            <div className="available-info">
                                                <p className="text-xs text-green-700">
                                                    Click to select this room
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ));
                })()}
            </div>

            {rooms.length === 0 && (
                <div className="no-rooms-message">
                    <p className="text-gray-500 text-center py-8">
                        No rooms found. Please check your search criteria.
                    </p>
                </div>
            )}
        </div>
    );
};

export default AllRoomsStatus;
