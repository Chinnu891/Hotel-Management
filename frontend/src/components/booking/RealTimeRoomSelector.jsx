import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../../config/api';
import { 
    FaSync, 
    FaClock, 
    FaCheckCircle, 
    FaTimesCircle, 
    FaExclamationTriangle,
    FaInfoCircle,
    FaWifi,
    FaSnowflake,
    FaTv,
    FaBed
} from 'react-icons/fa';

const RealTimeRoomSelector = ({ 
    checkIn, 
    checkOut, 
    guests, 
    roomTypeId, 
    onRoomSelect, 
    selectedRoom = null 
}) => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
    const [statusChanges, setStatusChanges] = useState([]);
    
    const intervalRef = useRef(null);
    const lastCheckRef = useRef(null);

    // Fetch room availability
    const fetchRoomAvailability = async () => {
        if (!checkIn || !checkOut) return;
        
        try {
            setLoading(true);
            setError('');
            
            const params = new URLSearchParams({
                action: 'availability',
                check_in: checkIn,
                check_out: checkOut,
                guests: guests || 1
            });
            
            if (roomTypeId) {
                params.append('room_type_id', roomTypeId);
            }
            
            const response = await fetch(buildApiUrl(`api/real_time_room_status.php?${params}`));
            const data = await response.json();
            
            if (data.success) {
                setRooms(data.data.rooms);
                setLastUpdate(data.data.last_updated);
                lastCheckRef.current = data.data.last_updated;
            } else {
                setError(data.message || 'Failed to fetch room availability');
            }
        } catch (error) {
            console.error('Error fetching room availability:', error);
            setError('Network error while fetching room availability');
        } finally {
            setLoading(false);
        }
    };

    // Fetch room status changes
    const fetchStatusChanges = async () => {
        if (!lastCheckRef.current) return;
        
        try {
            const params = new URLSearchParams({
                action: 'status_changes',
                last_check: lastCheckRef.current
            });
            
            const response = await fetch(buildApiUrl(`api/real_time_room_status.php?${params}`));
            const data = await response.json();
            
            if (data.success && data.data.changes.length > 0) {
                setStatusChanges(prev => [...data.data.changes, ...prev].slice(0, 10));
                lastCheckRef.current = data.data.last_updated;
            }
        } catch (error) {
            console.error('Error fetching status changes:', error);
        }
    };

    // Auto-refresh functionality
    useEffect(() => {
        if (autoRefresh) {
            intervalRef.current = setInterval(() => {
                fetchRoomAvailability();
                fetchStatusChanges();
            }, refreshInterval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [autoRefresh, refreshInterval, checkIn, checkOut, guests, roomTypeId]);

    // Initial fetch
    useEffect(() => {
        fetchRoomAvailability();
    }, [checkIn, checkOut, guests, roomTypeId]);

    // Manual refresh
    const handleManualRefresh = () => {
        fetchRoomAvailability();
        fetchStatusChanges();
    };

    // Toggle auto-refresh
    const toggleAutoRefresh = () => {
        setAutoRefresh(!autoRefresh);
    };

    // Handle room selection
    const handleRoomSelect = (room) => {
        if (room.is_available) {
            onRoomSelect(room);
        }
    };

    // Get status badge
    const getStatusBadge = (room) => {
        const statusConfig = {
            available: {
                text: 'Available',
                color: 'bg-green-100 text-green-800 border-green-200',
                icon: <FaCheckCircle className="text-green-600" />
            },
            booked: {
                text: 'Booked',
                color: 'bg-orange-100 text-orange-800 border-orange-200',
                icon: <FaClock className="text-orange-600" />
            },
            occupied: {
                text: 'Occupied',
                color: 'bg-red-100 text-red-800 border-red-200',
                icon: <FaTimesCircle className="text-red-600" />
            },
            cleaning: {
                text: 'Cleaning',
                color: 'bg-blue-100 text-blue-800 border-blue-200',
                icon: <FaSnowflake className="text-blue-600" />
            },
            maintenance: {
                text: 'Maintenance',
                color: 'bg-gray-100 text-gray-800 border-gray-200',
                icon: <FaExclamationTriangle className="text-gray-600" />
            }
        };

        const config = statusConfig[room.availability_status] || statusConfig.available;
        
        return (
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                {config.icon}
                <span className="ml-1">{config.text}</span>
            </div>
        );
    };

    // Get amenities icons
    const getAmenitiesIcons = (room) => {
        const amenities = [];
        
        // Add basic amenities (you can customize based on your room types)
        amenities.push(<FaBed key="bed" className="text-gray-400" title="Bed" />);
        amenities.push(<FaTv key="tv" className="text-gray-400" title="TV" />);
        amenities.push(<FaWifi key="wifi" className="text-gray-400" title="WiFi" />);
        
        return (
            <div className="flex space-x-2">
                {amenities}
            </div>
        );
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Format time
    const formatTime = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Select Room</h3>
                    <p className="text-sm text-gray-600">Real-time availability updates</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={toggleAutoRefresh}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            autoRefresh 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                        {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
                    </button>
                    <button
                        onClick={handleManualRefresh}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FaSync className={`inline mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Now
                    </button>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                    <FaInfoCircle className="text-blue-600" />
                    <span className="text-sm text-gray-700">
                        {loading ? 'Updating availability...' : 'Real-time status active'}
                    </span>
                </div>
                <div className="text-xs text-gray-500">
                    Last updated: {formatTime(lastUpdate)}
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-3 bg-red-50 border-b border-red-200">
                    <div className="flex items-center text-red-700 text-sm">
                        <FaExclamationTriangle className="mr-2" />
                        {error}
                    </div>
                </div>
            )}

            {/* Status Changes (if any) */}
            {statusChanges.length > 0 && (
                <div className="p-3 bg-blue-50 border-b border-blue-200">
                    <div className="text-xs text-blue-700">
                        <strong>Recent changes:</strong> {statusChanges.length} room(s) updated
                    </div>
                </div>
            )}

            {/* Room List */}
            <div className="max-h-96 overflow-y-auto">
                {rooms.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        {loading ? 'Loading rooms...' : 'No rooms available for selected criteria'}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {rooms.map((room) => (
                            <div
                                key={room.room_number}
                                onClick={() => handleRoomSelect(room)}
                                className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                                    selectedRoom?.room_number === room.room_number 
                                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                                        : ''
                                } ${!room.is_available ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3">
                                            <h4 className="text-lg font-semibold text-gray-900">
                                                Room {room.room_number}
                                            </h4>
                                            {getStatusBadge(room)}
                                        </div>
                                        
                                        <div className="mt-2 space-y-1">
                                            <p className="text-sm text-gray-600">
                                                Floor {room.floor} • {room.room_type_name}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Capacity: {room.capacity} guest(s)
                                            </p>
                                            <div className="flex items-center space-x-4">
                                                <span className="text-lg font-bold text-green-600">
                                                    {formatCurrency(room.pricing.price_per_night)}/night
                                                </span>
                                                <span className="text-sm text-gray-500">
                                                    Total: {formatCurrency(room.pricing.total_price)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3">
                                            {getAmenitiesIcons(room)}
                                        </div>
                                    </div>
                                    
                                    <div className="ml-4">
                                        {room.is_available ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRoomSelect(room);
                                                }}
                                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                                            >
                                                Select
                                            </button>
                                        ) : (
                                            <span className="text-sm text-gray-500">
                                                {room.availability_text}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                    <p>Real-time updates every {refreshInterval / 1000} seconds</p>
                    <p className="mt-1">
                        {autoRefresh ? 'Auto-refresh is active' : 'Auto-refresh is disabled - use manual refresh'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RealTimeRoomSelector;
