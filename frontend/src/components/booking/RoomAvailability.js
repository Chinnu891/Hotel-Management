import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import './RoomAvailability.css';

const RoomAvailability = () => {
    const { check_in_date, check_out_date, guests } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Detect if we're in admin context
    const isAdminContext = location.pathname.includes('/admin') || 
                          location.search.includes('admin=true') ||
                          window.location.pathname.includes('/admin');
    
    const [availability, setAvailability] = useState(null);
    const [allRoomsData, setAllRoomsData] = useState(null);
    const [roomTypes, setRoomTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState('available');
    const [guestDetails, setGuestDetails] = useState(null);
    const [loadingGuestDetails, setLoadingGuestDetails] = useState(false);

    const [filters, setFilters] = useState({
        check_in_date: (() => {
            if (check_in_date) {
                const date = new Date(check_in_date);
                return isNaN(date.getTime()) ? new Date() : date;
            }
            return new Date(); // Default to today
        })(),
        check_out_date: (() => {
            if (check_out_date) {
                const date = new Date(check_out_date);
                return isNaN(date.getTime()) ? (() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    return tomorrow;
                })() : date;
            }
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow; // Default to tomorrow
        })(),
        guests: guests || 1,
        room_type: ''
    });

    // Helper function to safely render room cards - memoized to prevent unnecessary re-renders
    const renderRoomCard = useCallback((room, index, isAvailable = true) => {
        // console.log(`renderRoomCard called for index ${index}:`, { room, isAvailable });
        
        // CRITICAL: Never render objects directly
        if (!room || typeof room !== 'object') {
            console.error(`Invalid room object at index ${index}:`, room);
            return (
                <div key={`invalid-${index}`} className="border rounded-lg p-4 bg-red-50">
                    <p className="text-red-800 text-sm">Invalid room data</p>
                </div>
            );
        }

        // CRITICAL: Check if it's already a React element
        if (React.isValidElement(room)) {
            console.error(`Room at index ${index} is already a React element:`, room);
            return room;
        }

        // CRITICAL: Ensure it's a plain object
        if (room.constructor !== Object && room.constructor !== undefined) {
            console.error(`Room at index ${index} is not a plain object:`, room);
            return (
                <div key={`not-object-${index}`} className="border rounded-lg p-4 bg-red-50">
                    <p className="text-red-800 text-sm">Invalid room type</p>
                </div>
            );
        }

        try {
            // Extract safe values with fallbacks
            const roomNumber = String(room.room_number || room.room_id || 'Unknown');
            const roomTypeName = String(room.room_type_name || 'Unknown Type');
            const price = Number(room.price || room.base_price || room.custom_price || 0);
            const capacity = Number(room.capacity || 0);
            const floor = Number(room.floor || 0);
            const status = String(room.availability_status || room.room_status || 'unknown');

            // DEBUG: Force log Room 104 status - DISABLED
            // if (roomNumber === '104') {
            //     console.log('🔍 ROOM 104 DEBUG:', {
            //         room_number: roomNumber,
            //         room_status: room.room_status,
            //         availability_status: room.availability_status,
            //         final_status: status,
            //         is_bookable: room.is_bookable,
            //         current_booking: room.current_booking
            //     });
            // }

            const roomElement = (
                <div
                    key={`room-${roomNumber}-${index}`}
                    className={`border rounded-lg p-3 transition-shadow ${
                        status === 'prebooked' 
                            ? 'bg-orange-50 border-orange-200 hover:shadow-lg hover:scale-105' 
                            : status === 'booked' || status === 'occupied' 
                                ? 'cursor-pointer hover:shadow-lg hover:scale-105' 
                                : 'cursor-pointer hover:shadow-md'
                    }`}
                    onClick={() => {
                        // Determine if room is available based on isAvailable parameter or room status
                        const roomIsAvailable = isAvailable !== null ? isAvailable : (status === 'available' && status !== 'prebooked' && status !== 'pending');
                        
                        if (roomIsAvailable) {
                            const checkInDate = formatDateForAPI(filters.check_in_date);
                            const checkOutDate = formatDateForAPI(filters.check_out_date);
                            const roomTypeId = room.room_type_id || room.room_type || '';
                            const roomTypeNameEncoded = encodeURIComponent(roomTypeName);
                            navigate(`/reception?tab=new-booking&room=${roomNumber}&room_type_id=${roomTypeId}&room_type_name=${roomTypeNameEncoded}&check_in=${checkInDate}&check_out=${checkOutDate}&guests=${filters.guests}`);
                        } else if (status === 'prebooked') {
                            // Show prebooked room details
                            handleViewPrebookedDetails(room);
                        } else if (status === 'pending') {
                            alert(`Room ${roomNumber} has a pending booking. Please select a different room or date.`);
                        } else if (status === 'booked' || status === 'occupied') {
                            // Only show guest details for booked/occupied rooms
                            handleRoomCardClick(room);
                        } else {
                            // For other statuses (maintenance, cleaning), show appropriate message
                            alert(`Room ${roomNumber} is currently ${status}. Please select a different room.`);
                        }
                    }}
                >
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center">
                            <h4 className="text-base font-semibold text-gray-900">
                                Room {roomNumber}
                            </h4>
                            {status === 'prebooked' && (
                                <span className="ml-1 text-orange-600 text-xs">🔒</span>
                            )}
                        </div>
                        <span className="text-sm font-medium text-green-600">
                            ₹{price.toLocaleString()}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{roomTypeName}</p>
                    
                    {/* Status Badge - Always show first */}
                    <div className="mb-2">
                        <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${
                            status === 'available' ? 'bg-green-100 text-green-800' :
                            status === 'occupied' ? 'bg-red-100 text-red-800' :
                            status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            status === 'cleaning' ? 'bg-blue-100 text-blue-800' :
                            status === 'booked' ? 'bg-purple-100 text-purple-800' :
                            status === 'pending' ? 'bg-orange-100 text-orange-800' :
                            status === 'prebooked' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                            {status === 'prebooked' ? 'Pre-booked' : 
                             status === 'pending' ? 'Pending' : 
                             status === 'booked' ? 'Booked' :
                             status === 'occupied' ? 'Occupied' :
                             status === 'available' ? 'Available' :
                             status === 'maintenance' ? 'Maintenance' :
                             status === 'cleaning' ? 'Cleaning' :
                             status}
                        </span>
                    </div>

                    {/* Guest Name - Show for booked and occupied rooms */}
                    {(status === 'booked' || status === 'occupied') && room.current_guest_name && (
                        <div className="mb-2">
                            <p className="text-sm text-gray-700 font-semibold">
                                Guest: {room.current_guest_name}
                            </p>
                        </div>
                    )}

                    {/* Checkout Time Information - Show for occupied rooms */}
                    {status === 'occupied' && room.checkout_time_info && (
                        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center">
                                <span className="text-red-600 mr-1 text-xs">🕐</span>
                                <p className="text-xs text-red-700 font-medium">
                                    {room.checkout_time_info}
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Room Details */}
                    <div className="mb-2">
                        <span className="text-xs text-gray-500">
                            {capacity} guests • Floor {floor}
                        </span>
                    </div>
                    
                    {/* Pre-booked Details - Show below badge */}
                    {status === 'prebooked' && room.next_booking_date && (
                        <div className="mb-2 p-2 bg-white border-2 border-orange-200 rounded-lg shadow-sm">
                            <div className="flex items-center mb-1">
                                <span className="text-orange-600 mr-1 text-xs">📅</span>
                                <p className="text-xs text-orange-700 font-semibold">
                                    Pre-booked for: {new Date(room.next_booking_date).toLocaleDateString('en-GB')}
                                </p>
                            </div>
                            {room.next_booking && (
                                <div className="flex items-center">
                                    <span className="text-orange-600 mr-1 text-xs">👤</span>
                                    <p className="text-xs text-orange-600">
                                        {room.next_booking}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                    {(isAvailable !== null ? isAvailable : status === 'available') && (
                        <button 
                            className="mt-2 w-full px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent parent div click
                                const checkInDate = formatDateForAPI(filters.check_in_date);
                                const checkOutDate = formatDateForAPI(filters.check_out_date);
                                const roomTypeId = room.room_type_id || room.room_type || '';
                                const roomTypeNameEncoded = encodeURIComponent(roomTypeName);
                                console.log('Book Now clicked for room:', roomNumber, 'type:', roomTypeName, 'with dates:', checkInDate, checkOutDate);
                                navigate(`/reception?tab=new-booking&room=${roomNumber}&room_type_id=${roomTypeId}&room_type_name=${roomTypeNameEncoded}&check_in=${checkInDate}&check_out=${checkOutDate}&guests=${filters.guests}`);
                            }}
                        >
                            Book Now
                        </button>
                    )}
                    {(status === 'maintenance' || status === 'cleaning') && (
                        <div className="mt-2 text-center">
                            <span className="text-xs text-gray-500 italic">Currently {status}</span>
                        </div>
                    )}
                </div>
            );

            // CRITICAL: Final validation that we're returning a valid React element
            if (!React.isValidElement(roomElement)) {
                console.error(`Generated room element is not valid at index ${index}:`, roomElement);
                return (
                    <div key={`invalid-element-${index}`} className="border rounded-lg p-4 bg-red-50">
                        <p className="text-red-800 text-sm">Invalid room element</p>
                    </div>
                );
            }

            return roomElement;
        } catch (error) {
            console.error('Error rendering room card:', error);
            return (
                <div key={`error-${index}`} className="border rounded-lg p-4 bg-red-50">
                    <p className="text-red-800 text-sm">Error rendering room</p>
                </div>
            );
        }
    }, [filters.check_in_date, filters.check_out_date, filters.guests, navigate]);

    // Helper function to safely render room lists grouped by floor - memoized to prevent unnecessary re-renders
    const renderRoomList = useCallback((rooms, isAvailable = true) => {
        // console.log('renderRoomList called with:', { rooms, isAvailable, roomsType: typeof rooms, isArray: Array.isArray(rooms) });
        
        if (!rooms || !Array.isArray(rooms)) {
            console.log('renderRoomList: rooms is not an array, returning no rooms message');
            return (
                <div className="text-center py-8">
                    <p className="text-gray-600">No rooms available</p>
                </div>
            );
        }

        // CRITICAL: Filter out any non-object items before mapping
        const validRooms = rooms.filter((room, index) => {
            if (!room || typeof room !== 'object') {
                console.error(`Invalid room at index ${index}:`, room);
                return false;
            }
            if (React.isValidElement(room)) {
                console.error(`Room at index ${index} is already a React element:`, room);
                return false;
            }
            if (room.constructor !== Object && room.constructor !== undefined) {
                console.error(`Room at index ${index} is not a plain object:`, room);
                return false;
            }
            return true;
        });

        // console.log('renderRoomList: valid rooms count:', validRooms.length, 'out of', rooms.length);

        // Group rooms by floor
        const roomsByFloor = validRooms.reduce((acc, room) => {
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

        return (
            <div className="space-y-8">
                {sortedFloors.map((floor) => (
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roomsByFloor[floor].map((room, index) => {
                                // console.log(`Rendering room ${index}:`, room);
                                return renderRoomCard(room, index, isAvailable);
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    }, [renderRoomCard]);

    const formatPrice = (price) => {
        return `₹${Number(price).toLocaleString()}`;
    };

    const formatDateForAPI = (date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
            console.error('Invalid date provided to formatDateForAPI:', date);
            // Return today's date as fallback
            const today = new Date();
            return today.toISOString().split('T')[0];
        }
        return date.toISOString().split('T')[0];
    };

    const loadRoomTypes = async () => {
        try {
            const response = await axios.get(buildApiUrl('booking/check_availability.php?action=room_types'));
            // console.log('loadRoomTypes: response received:', response.data);
            if (response.data.success && response.data.data) {
                // console.log('loadRoomTypes: setting room types:', response.data.data);
                setRoomTypes(response.data.data);
            } else {
                console.error('loadRoomTypes: API error:', response.data);
            }
        } catch (error) {
            console.error('Error loading room types:', error);
        }
    };

    const checkAvailability = async () => {
        setLoading(true);
        setError('');
        
        try {
            const params = {
                check_in_date: formatDateForAPI(filters.check_in_date),
                check_out_date: formatDateForAPI(filters.check_out_date),
                guests: filters.guests,
                room_type_id: filters.room_type
            };

            // console.log('checkAvailability: sending params:', params);
            // Use the correct API for room availability status
            const response = await axios.get(buildApiUrl('booking/get_all_rooms_with_status.php'), { params });
            // console.log('checkAvailability: response received:', response.data);

            if (response.data.success) {
                // The get_all_rooms_with_status.php API returns rooms in a different structure
                const data = response.data.data;
                // console.log('checkAvailability: data structure:', data);
                // console.log('checkAvailability: rooms type:', typeof data?.rooms);
                // console.log('checkAvailability: rooms is array:', Array.isArray(data?.rooms));
                
                if (data && Array.isArray(data.rooms)) {
                    // console.log('checkAvailability: setting availability with valid data');
                    // Transform the data to match the expected structure
                    const transformedData = {
                        available_rooms: data.rooms.filter(room => room.availability_status === 'available'),
                        booked_rooms: data.rooms.filter(room => room.availability_status === 'booked'),
                        prebooked_rooms: data.rooms.filter(room => room.availability_status === 'prebooked'),
                        occupied_rooms: data.rooms.filter(room => room.availability_status === 'occupied'),
                        all_rooms: data.rooms
                    };
                    setAvailability(transformedData);
                } else {
                    // console.log('checkAvailability: setting availability with empty array');
                    setAvailability({ 
                        available_rooms: [],
                        booked_rooms: [],
                        prebooked_rooms: [],
                        occupied_rooms: [],
                        all_rooms: []
                    });
                }
            } else {
                console.error('checkAvailability: API error:', response.data.message);
                setError(response.data.message || 'Failed to check availability');
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            setError('Error checking availability: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleViewRoomDetails = async (room) => {
        console.log('handleViewRoomDetails called with room:', room);
        try {
            setLoadingGuestDetails(true);
            setError('');
            
            // Pass the selected dates to get guest details for the specific date range
            const checkInDate = formatDateForAPI(filters.check_in_date);
            const checkOutDate = formatDateForAPI(filters.check_out_date);
            
            console.log('Making API request with:', {
                room_number: room.room_number,
                check_in_date: checkInDate,
                check_out_date: checkOutDate
            });
            
            const apiUrl = buildApiUrl(`booking/get_room_guest_details.php?room_number=${room.room_number}&check_in_date=${checkInDate}&check_out_date=${checkOutDate}`);
            console.log('API URL:', apiUrl);
            
            const response = await axios.get(apiUrl);
            
            console.log('API Response:', response.data);
            
            if (response.data.success) {
                setGuestDetails(response.data.data);
                console.log('Guest details set successfully');
            } else {
                console.log('API returned success: false, message:', response.data.message);
                console.log('Debug info:', response.data.debug_info);
                
                // Show a more user-friendly message
                const message = response.data.message || 'Failed to load guest details';
                if (message.includes('No current guest found') || message.includes('No guest found')) {
                    setError(`Room ${room.room_number} is marked as occupied but no guest details are available. This might be a data inconsistency.`);
                } else {
                    setError(message);
                }
            }
        } catch (error) {
            console.error('Error loading guest details:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response,
                status: error.response?.status,
                data: error.response?.data
            });
            setError('Error loading guest details: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoadingGuestDetails(false);
        }
    };

    const closeGuestDetails = () => {
        setGuestDetails(null);
        setError('');
    };

    const loadAllRooms = async () => {
        setLoading(true);
        setError('');
        
        try {
            const params = {
                check_in_date: formatDateForAPI(filters.check_in_date),
                check_out_date: formatDateForAPI(filters.check_out_date),
                guests: filters.guests,
                room_type_id: filters.room_type
            };

            // console.log('🔄 loadAllRooms: sending params:', params);
            // console.log('🔄 loadAllRooms: URL will be:', buildApiUrl('booking/get_all_rooms_with_status.php'));
            const response = await axios.get(buildApiUrl('booking/get_all_rooms_with_status.php'), { params });
            // console.log('loadAllRooms: response received:', response.data);

            if (response.data.success) {
                // DEBUG: Log the specific data for Room 104
                const data = response.data.data;
                if (data && data.rooms) {
                    const room104 = data.rooms.find(room => room.room_number === '104');
                    if (room104) {
                        console.log('🔍 DEBUG Room 104:', {
                            room_number: room104.room_number,
                            room_status: room104.current_status,
                            availability_status: room104.availability_status,
                            is_prebooked: room104.is_prebooked,
                            next_booking: room104.next_booking,
                            next_booking_date: room104.next_booking_date
                        });
                    } else {
                        console.log('❌ Room 104 not found in API response');
                    }
                }
                // CRITICAL: Validate data structure before setting state
                // console.log('loadAllRooms: data structure:', data);
                // console.log('loadAllRooms: rooms type:', typeof data?.rooms);
                // console.log('loadAllRooms: rooms is array:', Array.isArray(data?.rooms));
                
                if (data && Array.isArray(data.rooms)) {
                    // console.log('loadAllRooms: setting allRoomsData with valid data');
                    setAllRoomsData({
                        all_rooms: data.rooms, // Map rooms to all_rooms for compatibility
                        available_rooms: data.rooms.filter(room => room.availability_status === 'available'),
                        occupied_rooms: data.rooms.filter(room => room.availability_status === 'occupied'),
                        pending_rooms: data.rooms.filter(room => room.availability_status === 'pending'),
                        booked_rooms: data.rooms.filter(room => room.availability_status === 'booked'),
                        prebooked_rooms: data.rooms.filter(room => room.availability_status === 'prebooked'),
                        total_rooms: data.total_rooms || data.rooms.length,
                        available_count: data.rooms.filter(room => room.availability_status === 'available').length,
                        occupied_count: data.rooms.filter(room => room.availability_status === 'occupied').length,
                        pending_count: data.rooms.filter(room => room.availability_status === 'pending').length,
                        booked_count: data.rooms.filter(room => room.availability_status === 'booked').length,
                        maintenance_rooms: data.rooms.filter(room => room.availability_status === 'maintenance').length
                    });
                } else {
                    // console.log('loadAllRooms: setting allRoomsData with empty array');
                    setAllRoomsData({ 
                        all_rooms: [],
                        available_rooms: [],
                        occupied_rooms: [],
                        pending_rooms: [],
                        booked_rooms: [],
                        prebooked_rooms: [],
                        total_rooms: 0,
                        available_count: 0,
                        occupied_count: 0,
                        pending_count: 0,
                        booked_count: 0,
                        maintenance_rooms: 0
                    });
                }
            } else {
                console.error('loadAllRooms: API error:', response.data.message);
                setError(response.data.message || 'Failed to load all rooms');
            }
        } catch (error) {
            console.error('Error loading all rooms:', error);
            setError('Error loading all rooms: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Memoize room data to prevent unnecessary re-renders
    const memoizedAvailableRooms = useMemo(() => {
        return availability?.available_rooms || [];
    }, [availability?.available_rooms]);

    const memoizedAllRooms = useMemo(() => {
        return allRoomsData?.all_rooms || [];
    }, [allRoomsData?.all_rooms]);

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        if (mode === 'all') {
            loadAllRooms();
        }
    };

    const handleRoomCardClick = async (room) => {
        console.log('handleRoomCardClick called with room:', room);
        
        // For booked/occupied rooms, use our new handleViewRoomDetails function
        if (room.availability_status === 'booked' || room.availability_status === 'occupied' || 
            room.room_status === 'booked' || room.room_status === 'occupied') {
            handleViewRoomDetails(room);
        } else {
            // For other statuses, show appropriate message
            const status = room.availability_status || room.room_status || 'unknown';
            alert(`Room ${room.room_number} is currently ${status}. Please select a different room.`);
        }
    };

    const handleViewPrebookedDetails = async (room) => {
        console.log('handleViewPrebookedDetails called with room:', room);
        
        try {
            setLoadingGuestDetails(true);
            setError('');

            // For pre-booked rooms, we need to get the future booking details
            // We'll use the room number and search for the specific pre-booking
            const response = await axios.get(buildApiUrl(`booking/get_room_guest_details.php?room_number=${room.room_number}&include_prebooked=true`));

            if (response.data.success) {
                setGuestDetails(response.data.data);
            } else {
                setError(response.data.message || 'Failed to load pre-booking details');
            }
        } catch (error) {
            console.error('Error loading pre-booking details:', error);
            setError('Error loading pre-booking details: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoadingGuestDetails(false);
        }
    };

    const getPaymentStatusDisplay = (guest) => {
        if (!guest) return 'N/A';
        
        // Use the calculated payment status from the backend if available
        const paymentStatus = guest.calculated_payment_status || guest.payment_status || 'unknown';
        
        // Determine color based on payment status
        let color, displayText;
        
        switch (paymentStatus) {
            case 'completed':
            case 'paid':
                color = 'text-green-600';
                displayText = 'Fully Paid';
                break;
            case 'partial':
                color = 'text-orange-600';
                displayText = 'Partial Payment';
                break;
            case 'pending':
                color = 'text-yellow-600';
                displayText = 'Payment Pending';
                break;
            case 'referred_by_owner':
                color = 'text-blue-600';
                displayText = 'Referred by Owner';
                break;
            default:
                color = 'text-red-600';
                displayText = paymentStatus;
        }
        
        return <span className={color}>{displayText}</span>;
    };

    useEffect(() => {
        checkAvailability();
        loadRoomTypes();
    }, []);

    useEffect(() => {
        if (viewMode === 'available') {
            checkAvailability();
        } else if (viewMode === 'all') {
            loadAllRooms();
        }
    }, [filters.check_in_date, filters.check_out_date, filters.guests, filters.room_type, viewMode]);

        return (
        <div className={`min-h-screen bg-gray-50 ${isAdminContext ? 'admin-room-availability' : ''}`}>
            <div className="max-w-7xl mx-auto p-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900">Room Availability</h1>
                            {/* Mobile-only round refresh button */}
                            <button
                                onClick={() => {
                                    if (viewMode === 'all') {
                                        loadAllRooms();
                                    } else {
                                        checkAvailability();
                                    }
                                }}
                                className="md:hidden bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center shadow-lg"
                                style={{ 
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '50%',
                                    padding: '0',
                                    border: 'none',
                                    outline: 'none',
                                    minWidth: '40px',
                                    maxWidth: '40px',
                                    minHeight: '40px',
                                    maxHeight: '40px'
                                }}
                                title="Force Refresh"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        {/* Desktop refresh button */}
                        <div className="hidden md:flex space-x-2">
                            <button
                                onClick={() => {
                                    // console.log('🔄 Force refreshing room data...');
                                    // console.log('🔄 Current viewMode:', viewMode);
                                    // console.log('🔄 Current filters:', filters);
                                    if (viewMode === 'all') {
                                        // console.log('🔄 Calling loadAllRooms...');
                                        loadAllRooms();
                                    } else {
                                        // console.log('🔄 Calling checkAvailability...');
                                        checkAvailability();
                                    }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                🔄 Force Refresh
                            </button>
                        </div>
                    </div>

                    {/* Search Filters */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex flex-wrap gap-3 justify-center">
                            <div className="w-48">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Check-in Date</label>
                                <input
                                    type="date"
                                    value={formatDateForAPI(filters.check_in_date)}
                                    onChange={(e) => {
                                        const newDate = new Date(e.target.value);
                                        if (!isNaN(newDate.getTime())) {
                                            setFilters({...filters, check_in_date: newDate});
                                        } else {
                                            console.error('Invalid check-in date:', e.target.value);
                                        }
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Check-out Date</label>
                                <input
                                    type="date"
                                    value={formatDateForAPI(filters.check_out_date)}
                                    onChange={(e) => {
                                        const newDate = new Date(e.target.value);
                                        if (!isNaN(newDate.getTime())) {
                                            setFilters({...filters, check_out_date: newDate});
                                        } else {
                                            console.error('Invalid check-out date:', e.target.value);
                                        }
                                    }}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Room Type</label>
                                <select
                                    value={filters.room_type}
                                    onChange={(e) => setFilters({...filters, room_type: e.target.value})}
                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All Types</option>
                                    {roomTypes.map((type) => (
                                        <option key={type.id} value={type.id}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                            <button
                                onClick={checkAvailability}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Check Availability
                            </button>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleViewModeChange('available')}
                                    className={`px-4 py-2 rounded-md transition-colors ${
                                        viewMode === 'available' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    Available Rooms
                                </button>
                                <button
                                    onClick={() => handleViewModeChange('all')}
                                    className={`px-4 py-2 rounded-md transition-colors ${
                                        viewMode === 'all' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    All Rooms
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Display */}
                    {allRoomsData && viewMode === 'all' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">Room Statistics</h3>
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                <div>
                                    <div className="text-lg font-bold text-blue-600">{allRoomsData.total_rooms || 0}</div>
                                    <div className="text-xs text-blue-700">Total Rooms</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-green-600">{allRoomsData.available_count || 0}</div>
                                    <div className="text-xs text-green-700">Available</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-red-600">{allRoomsData.occupied_count || 0}</div>
                                    <div className="text-xs text-red-700">Occupied</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-orange-600">{allRoomsData.pending_count || 0}</div>
                                    <div className="text-xs text-orange-700">Pending</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-yellow-600">{allRoomsData.maintenance_rooms || 0}</div>
                                    <div className="text-xs text-yellow-700">Maintenance</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-purple-600">{allRoomsData.booked_count || 0}</div>
                                    <div className="text-xs text-purple-700">Booked</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Checking availability...</p>
                        </div>
                    )}

                    {/* Available Rooms Display */}
                    {!loading && availability && viewMode === 'available' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Available Rooms</h3>
                            {renderRoomList(memoizedAvailableRooms, true)}
                        </div>
                    )}

                    {/* All Rooms Display */}
                    {!loading && allRoomsData && viewMode === 'all' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">All Rooms</h3>
                            {renderRoomList(memoizedAllRooms, null)}
                        </div>
                    )}

                    {/* Guest Details Modal */}
                    {guestDetails && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {guestDetails.check_in_date && new Date(guestDetails.check_in_date) > new Date() 
                                            ? 'Pre-booking Details' 
                                            : 'Guest Details'
                                        }
                                    </h3>
                                    <button
                                        onClick={closeGuestDetails}
                                        className="text-gray-400 hover:text-gray-600 text-xl md:text-xl sm:text-2xl p-2 md:p-1 rounded-full hover:bg-gray-100 transition-colors"
                                        style={{
                                            minWidth: '44px',
                                            minHeight: '44px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                {/* Loading State */}
                                {loadingGuestDetails && (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-600">Loading guest details...</p>
                                    </div>
                                )}
                                
                                {!loadingGuestDetails && (
                                    <div className="space-y-4">
                                        {/* Guest Information */}
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-blue-900 mb-3">Guest Information</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <span className="font-medium text-gray-700">Name:</span>
                                                    <span className="ml-2 text-gray-900">
                                                        {guestDetails.first_name || 'N/A'} {guestDetails.last_name || ''}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Phone:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.phone || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Email:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.email || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Address:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.address || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">ID Proof:</span>
                                                    <span className="ml-2 text-gray-900">
                                                        {guestDetails.id_proof_type || 'N/A'} - {guestDetails.id_proof_number || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Booking Information */}
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-green-900 mb-3">Booking Information</h4>
                                            
                                            {/* Booking Type Badge */}
                                            <div className="mb-3">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                                    guestDetails.check_in_date && new Date(guestDetails.check_in_date) > new Date()
                                                        ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                                }`}>
                                                    {guestDetails.check_in_date && new Date(guestDetails.check_in_date) > new Date()
                                                        ? '🔒 Pre-booking'
                                                        : '✅ Current Booking'
                                                    }
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <span className="font-medium text-gray-700">Room Number:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.room_number || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Room Type:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.room_type_name || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Check-in:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.check_in_date || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Check-out:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.check_out_date || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Guests:</span>
                                                    <span className="ml-2 text-gray-900">
                                                        {guestDetails.adults || 0} adults, {guestDetails.children || 0} children
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Status:</span>
                                                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                                        guestDetails.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                        guestDetails.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        guestDetails.booking_status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                                                        guestDetails.booking_status === 'checked_out' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {guestDetails.booking_status || 'N/A'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Plan Type:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.plan_type || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Payment Information */}
                                        <div className="bg-purple-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-purple-900 mb-3">Payment Information</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <span className="font-medium text-gray-700">Total Amount:</span>
                                                    <span className="ml-2 text-gray-900">₹{guestDetails.total_amount || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Paid Amount:</span>
                                                    <span className="ml-2 text-gray-900">₹{guestDetails.paid_amount || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Remaining:</span>
                                                    <span className="ml-2 text-gray-900">₹{guestDetails.calculated_remaining_amount || guestDetails.remaining_amount || 0}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Payment Type:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.payment_type || 'N/A'}</span>
                                                </div>
                                                                                        <div>
                                                    <span className="font-medium text-gray-700">Payment Status:</span>
                                                    <span className="ml-2">{getPaymentStatusDisplay(guestDetails)}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Payment Summary:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.payment_summary || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Additional Information */}
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h4 className="font-semibold text-gray-900 mb-3">Additional Information</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <span className="font-medium text-gray-700">Booking ID:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.booking_id || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Owner Reference:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.owner_reference ? 'Yes' : 'No'}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Created:</span>
                                                    <span className="ml-2 text-gray-900">{guestDetails.booking_created_formatted || guestDetails.booking_created_at || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>
        );
};

export default RoomAvailability;
