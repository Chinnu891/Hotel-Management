import React, { useState } from 'react';
import AllRoomsStatus from '../components/booking/AllRoomsStatus';

const TestRoomStatus = () => {
    const [checkInDate, setCheckInDate] = useState(new Date());
    const [checkOutDate, setCheckOutDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    });

    const handleRoomSelect = (room) => {
        alert(`Selected Room ${room.room_number} - ${room.room_type_name} for ₹${room.actual_price}`);
    };

    const handleDateChange = (type, value) => {
        if (type === 'checkin') {
            setCheckInDate(new Date(value));
        } else {
            setCheckOutDate(new Date(value));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Room Status Test - All Rooms View
                    </h1>
                    <p className="text-gray-600 mb-6">
                        This page shows all rooms with their current status, including pre-booked rooms.
                        Pre-booked rooms are marked in orange and show the booking details.
                    </p>

                    {/* Date Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Check-in Date
                            </label>
                            <input
                                type="date"
                                value={checkInDate.toISOString().split('T')[0]}
                                onChange={(e) => handleDateChange('checkin', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Check-out Date
                            </label>
                            <input
                                type="date"
                                value={checkOutDate.toISOString().split('T')[0]}
                                onChange={(e) => handleDateChange('checkout', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Status Legend:</h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                            <div className="flex items-center">
                                <span className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></span>
                                <span>Available</span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-3 h-3 bg-orange-100 border border-orange-300 rounded mr-2"></span>
                                <span>Pre-booked</span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-3 h-3 bg-red-100 border border-red-300 rounded mr-2"></span>
                                <span>Occupied</span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></span>
                                <span>Maintenance</span>
                            </div>
                            <div className="flex items-center">
                                <span className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-2"></span>
                                <span>Cleaning</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Room Status Component */}
                <AllRoomsStatus
                    checkInDate={checkInDate}
                    checkOutDate={checkOutDate}
                    onRoomSelect={handleRoomSelect}
                />
            </div>
        </div>
    );
};

export default TestRoomStatus;
