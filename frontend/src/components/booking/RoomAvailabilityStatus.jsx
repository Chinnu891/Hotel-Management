import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/api';

const RoomAvailabilityStatus = ({ checkInDate, checkOutDate, guests, onRoomSelect }) => {
    const [availableRooms, setAvailableRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [draggedRoom, setDraggedRoom] = useState(null);
    const [selectedRoom, setSelectedRoom] = useState(null);

    useEffect(() => {
        if (checkInDate && checkOutDate && guests) {
            checkAvailability();
        }
    }, [checkInDate, checkOutDate, guests]);

    const checkAvailability = async () => {
        if (!checkInDate || !checkOutDate || !guests) return;

        setLoading(true);
        setError('');

        try {
            const checkIn = checkInDate.toISOString().split('T')[0];
            const checkOut = checkOutDate.toISOString().split('T')[0];

            const response = await fetch(buildApiUrl('booking/check_availability.php'), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                params: {
                    check_in: checkIn,
                    check_out: checkOut,
                    guests: guests
                }
            });

            const data = await response.json();

            if (data.success) {
                setAvailableRooms(data.data.available_rooms || []);
            } else {
                setError(data.message || 'Failed to check availability');
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            setError('Error checking availability');
        } finally {
            setLoading(false);
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e, room) => {
        setDraggedRoom(room);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', room.room_number);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetRoom) => {
        e.preventDefault();
        
        if (draggedRoom && draggedRoom.room_number !== targetRoom.room_number) {
            // Swap room positions or handle the drop logic
            console.log(`Dropped ${draggedRoom.room_number} onto ${targetRoom.room_number}`);
            
            // Update room selection
            setSelectedRoom(targetRoom);
            if (onRoomSelect) {
                onRoomSelect(targetRoom);
            }
        }
        
        setDraggedRoom(null);
    };

    const handleRoomClick = (room) => {
        setSelectedRoom(room);
        if (onRoomSelect) {
            onRoomSelect(room);
        }
    };

    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Checking room availability...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{error}</p>
            </div>
        );
    }

    if (!availableRooms || availableRooms.length === 0) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">No rooms available for the selected dates and guest count.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900">Available Rooms</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRooms.map((room) => (
                    <div
                        key={room.room_number}
                        draggable
                        onDragStart={(e) => handleDragStart(e, room)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, room)}
                        onClick={() => handleRoomClick(room)}
                        className={`
                            border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                            ${selectedRoom?.room_number === room.room_number 
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                : 'border-gray-200 hover:border-gray-300'
                            }
                            ${draggedRoom?.room_number === room.room_number ? 'opacity-50' : ''}
                        `}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h5 className="font-semibold text-gray-900">
                                    Room {room.room_number}
                                </h5>
                                <p className="text-sm text-gray-600">{room.room_type_name}</p>
                                <p className="text-xs text-gray-500">Floor {room.floor}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-green-600">
                                    {room.pricing ? formatPrice(room.pricing.total_price) : 'N/A'}
                                </div>
                                <div className="text-sm text-gray-500">
                                    {room.pricing ? `${formatPrice(room.pricing.price_per_night)}/night` : 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Paid Amount Display */}
                        {room.pricing && (
                            <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                                <div className="text-sm font-medium text-green-800">
                                    💰 Total Amount: {formatPrice(room.pricing.total_price)}
                                </div>
                                <div className="text-xs text-green-600">
                                    Base: {formatPrice(room.pricing.base_price_per_night)} × {room.pricing.nights} nights
                                </div>
                                {room.pricing.extra_guest_charge > 0 && (
                                    <div className="text-xs text-green-600">
                                        +{formatPrice(room.pricing.extra_guest_charge)} extra guest charge
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Room Details */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Capacity:</span>
                                <span className="font-medium">{room.capacity} guests</span>
                            </div>
                            
                            {room.amenities && Array.isArray(room.amenities) && room.amenities.length > 0 && (
                                <div>
                                    <p className="text-xs text-gray-600 mb-1">Features:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {room.amenities.slice(0, 3).map((amenity, index) => (
                                            <span
                                                key={index}
                                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                            >
                                                {amenity.trim()}
                                            </span>
                                        ))}
                                        {room.amenities.length > 3 && (
                                            <span className="text-xs text-gray-500">
                                                +{room.amenities.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Drag and Drop Indicator */}
                        <div className="mt-3 pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-500 text-center">
                                🖱️ Click to select • Drag to reorder
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Selection Summary */}
            {selectedRoom && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Selected Room</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-blue-700">Room:</span>
                            <span className="ml-2 font-medium">{selectedRoom.room_number}</span>
                        </div>
                        <div>
                            <span className="text-blue-700">Type:</span>
                            <span className="ml-2 font-medium">{selectedRoom.room_type_name}</span>
                        </div>
                        <div>
                            <span className="text-blue-700">Total Amount:</span>
                            <span className="ml-2 font-medium text-green-600">
                                {selectedRoom.pricing ? formatPrice(selectedRoom.pricing.total_price) : 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="text-blue-700">Nights:</span>
                            <span className="ml-2 font-medium">{selectedRoom.pricing ? selectedRoom.pricing.nights : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomAvailabilityStatus;
