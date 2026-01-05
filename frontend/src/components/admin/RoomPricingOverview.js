import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';

const RoomPricingOverview = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchRoomPricing();
    }, []);

    const fetchRoomPricing = async () => {
        try {
            setLoading(true);
            const response = await axios.get(buildApiUrl('rooms/getAll.php'));
            
            if (response.data.success) {
                const roomsWithPricing = response.data.rooms.map(room => ({
                    ...room,
                    hasCustomPrice: room.price > 0 && room.price !== room.base_price,
                    priceDifference: room.price > 0 ? room.price - room.base_price : 0
                }));
                setRooms(roomsWithPricing);
            } else {
                setError('Failed to fetch room data');
            }
        } catch (error) {
            console.error('Error fetching room pricing:', error);
            setError('Error fetching room pricing data');
        } finally {
            setLoading(false);
        }
    };

    const formatPrice = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
            </div>
        );
    }

    const customPricedRooms = rooms.filter(room => room.hasCustomPrice);
    const standardPricedRooms = rooms.filter(room => !room.hasCustomPrice);

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Room Pricing Overview</h2>
                <p className="text-gray-600 text-sm">
                    This overview shows all rooms and highlights any custom pricing that differs from the standard room type pricing.
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{rooms.length}</div>
                    <div className="text-sm text-blue-800">Total Rooms</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{standardPricedRooms.length}</div>
                    <div className="text-sm text-green-800">Standard Pricing</div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">{customPricedRooms.length}</div>
                    <div className="text-sm text-orange-800">Custom Pricing</div>
                </div>
            </div>

            {/* Custom Priced Rooms */}
            {customPricedRooms.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">⚠️ Rooms with Custom Pricing</h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-orange-200">
                                <thead className="bg-orange-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Room</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Standard Price</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Custom Price</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-orange-800 uppercase tracking-wider">Difference</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-orange-50 divide-y divide-orange-200">
                                    {customPricedRooms.map((room) => (
                                        <tr key={room.room_number}>
                                            <td className="px-4 py-3 text-sm text-orange-900 font-medium">
                                                {room.room_number}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-orange-800">
                                                {room.room_type_name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-orange-800">
                                                {formatPrice(room.base_price)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-orange-800 font-medium">
                                                {formatPrice(room.price)}
                                            </td>
                                            <td className={`px-4 py-3 text-sm font-medium ${
                                                room.priceDifference > 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {room.priceDifference > 0 ? '+' : ''}{formatPrice(room.priceDifference)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* All Rooms Table */}
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">All Rooms Pricing</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Floor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Standard Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Price</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Type</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {rooms.map((room) => (
                                    <tr key={room.room_number} className={room.hasCustomPrice ? 'bg-orange-50' : ''}>
                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                            {room.room_number}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            {room.room_type_name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            {room.floor}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                room.status === 'available' ? 'bg-green-100 text-green-800' :
                                                room.status === 'occupied' ? 'bg-red-100 text-red-800' :
                                                room.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                                {room.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            {formatPrice(room.base_price)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                                            {room.hasCustomPrice ? formatPrice(room.price) : formatPrice(room.base_price)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            {room.hasCustomPrice ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                    Custom
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Standard
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Understanding Room Pricing</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Standard Price:</strong> The base price set for the room type</li>
                    <li>• <strong>Custom Price:</strong> A specific price set for an individual room</li>
                    <li>• <strong>Actual Price:</strong> The price that will be charged to guests</li>
                    <li>• Rooms with custom pricing are highlighted in orange</li>
                </ul>
            </div>
        </div>
    );
};

export default RoomPricingOverview;
