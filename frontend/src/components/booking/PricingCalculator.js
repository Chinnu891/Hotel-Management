import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import { formatDateForAPI, formatDateForInput } from '../../utils/dateUtils';
import './PricingCalculator.css';

const PricingCalculator = () => {
    const { roomTypeId, checkIn, checkOut, guests } = useParams();
    const navigate = useNavigate();
    const [pricing, setPricing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [roomTypes, setRoomTypes] = useState([]);

    const [calculation, setCalculation] = useState({
        room_type_id: roomTypeId || '',
        check_in_date: checkIn ? new Date(checkIn) : new Date(),
        check_out_date: checkOut ? new Date(checkOut) : (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        })(),
        adults: guests ? parseInt(guests) : 1,
        children: 0,
        extra_services: []
    });

    const [availableServices, setAvailableServices] = useState([]);

    // API base URL from centralized config

    useEffect(() => {
        loadRoomTypes();
        loadExtraServices();
    }, []);

    // Handle route parameter changes
    useEffect(() => {
        if (roomTypeId && checkIn && checkOut && guests) {
            setCalculation(prev => ({
                ...prev,
                room_type_id: roomTypeId,
                check_in_date: new Date(checkIn),
                check_out_date: new Date(checkOut),
                adults: parseInt(guests)
            }));
        }
    }, [roomTypeId, checkIn, checkOut, guests]);

    useEffect(() => {
        if (calculation.room_type_id && calculation.check_in_date && calculation.check_out_date) {
            calculatePricing();
        }
    }, [calculation.room_type_id, calculation.check_in_date, calculation.check_out_date, calculation.adults, calculation.children, calculation.extra_services]);

    const loadRoomTypes = async () => {
        try {
            const response = await axios.get(buildApiUrl('booking/check_availability.php?action=room_types'));
            if (response.data.success) {
                setRoomTypes(response.data.data);
            }
        } catch (error) {
            console.error('Error loading room types:', error);
        }
    };

    const loadExtraServices = async () => {
        try {
            const response = await axios.get(buildApiUrl('extra_services/get_services.php'));
            if (response.data.success) {
                setAvailableServices(response.data.data);
            }
        } catch (error) {
            console.error('Error loading extra services:', error);
        }
    };

    const calculatePricing = async () => {
        if (!calculation.room_type_id || !calculation.check_in_date || !calculation.check_out_date) {
            return;
        }

        // Validate that check-out date is after check-in date
        if (calculation.check_out_date <= calculation.check_in_date) {
            setError('Check-out date must be after check-in date');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const checkIn = formatDateForAPI(calculation.check_in_date);
            const checkOut = formatDateForAPI(calculation.check_out_date);
            const totalGuests = calculation.adults + calculation.children;

            const response = await axios.get(buildApiUrl('booking/check_availability.php'), {
                params: {
                    check_in: checkIn,
                    check_out: checkOut,
                    guests: totalGuests,
                    room_type_id: calculation.room_type_id
                }
            });

            if (response.data.success && response.data.data.available_rooms.length > 0) {
                const room = response.data.data.available_rooms[0];
                const basePricing = room.pricing;
                
                // Calculate extra services cost
                const extraServicesCost = calculation.extra_services.reduce((total, service) => {
                    const serviceData = availableServices.find(s => s.id === service.service_id);
                    return total + (serviceData ? serviceData.price * service.quantity : 0);
                }, 0);

                const totalPricing = {
                    ...basePricing,
                    extra_services_cost: extraServicesCost,
                    total_with_services: basePricing.total_price + extraServicesCost,
                    breakdown: {
                        base_price: basePricing.base_price_per_night * basePricing.nights,
                        extra_guests: basePricing.extra_guest_charge * basePricing.nights,
                        extra_services: extraServicesCost,
                        subtotal: basePricing.total_price,
                        total: basePricing.total_price + extraServicesCost
                    }
                };

                setPricing(totalPricing);
            } else {
                setError('No rooms available for the selected criteria');
                setPricing(null);
            }
        } catch (error) {
            setError('Error calculating pricing');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCalculationChange = (field, value) => {
        setCalculation(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleServiceToggle = (serviceId) => {
        setCalculation(prev => {
            const existingService = prev.extra_services.find(s => s.service_id === serviceId);
            
            if (existingService) {
                return {
                    ...prev,
                    extra_services: prev.extra_services.filter(s => s.service_id !== serviceId)
                };
            } else {
                return {
                    ...prev,
                    extra_services: [...prev.extra_services, { service_id: serviceId, quantity: 1 }]
                };
            }
        });
    };

    const handleServiceQuantityChange = (serviceId, quantity) => {
        setCalculation(prev => ({
            ...prev,
            extra_services: prev.extra_services.map(s => 
                s.service_id === serviceId ? { ...s, quantity: Math.max(1, quantity) } : s
            )
        }));
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const getSelectedRoomType = () => {
        return roomTypes.find(type => type.id == calculation.room_type_id);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Pricing Calculator</h1>
                    <p className="text-gray-600 mt-2">Calculate the total cost of your stay including extra services</p>
                </div>

                {/* Input Form */}
                <div className="bg-gray-50 rounded-lg p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Room Type *</label>
                            <select
                                value={calculation.room_type_id}
                                onChange={(e) => handleCalculationChange('room_type_id', e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Select Room Type</option>
                                {roomTypes.map((type) => (
                                    <option key={type.id} value={type.id}>
                                        {type.name} - {formatCurrency(type.base_price)}/night
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Date *</label>
                            <input
                                type="date"
                                value={formatDateForInput(calculation.check_in_date)}
                                onChange={(e) => handleCalculationChange('check_in_date', new Date(e.target.value))}

                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Date *</label>
                            <input
                                type="date"
                                value={formatDateForInput(calculation.check_out_date)}
                                onChange={(e) => handleCalculationChange('check_out_date', new Date(e.target.value))}

                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Adults *</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={calculation.adults}
                                onChange={(e) => handleCalculationChange('adults', parseInt(e.target.value))}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={calculation.children}
                                onChange={(e) => handleCalculationChange('children', parseInt(e.target.value))}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={calculatePricing}
                                disabled={!calculation.room_type_id || loading}
                                className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                                    !calculation.room_type_id || loading
                                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {loading ? 'Calculating...' : 'Calculate Price'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Extra Services */}
                {availableServices.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-6 mb-8">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Extra Services</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableServices.map((service) => {
                                const isSelected = calculation.extra_services.some(s => s.service_id === service.id);
                                const selectedService = calculation.extra_services.find(s => s.service_id === service.id);
                                
                                return (
                                    <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleServiceToggle(service.id)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="ml-2 font-medium text-gray-900">{service.name}</span>
                                            </label>
                                            <span className="text-sm font-medium text-gray-600">
                                                {formatCurrency(service.price)}
                                            </span>
                                        </div>
                                        
                                        {service.description && (
                                            <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                                        )}
                                        
                                        {isSelected && (
                                            <div className="flex items-center space-x-2">
                                                <label className="text-sm text-gray-700">Quantity:</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={selectedService?.quantity || 1}
                                                    onChange={(e) => handleServiceQuantityChange(service.id, parseInt(e.target.value))}
                                                    className="w-16 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                                />
                                                <span className="text-sm text-gray-600">
                                                    = {formatCurrency(service.price * (selectedService?.quantity || 1))}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Pricing Results */}
                {pricing && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-gray-900">Pricing Breakdown</h2>
                        
                        {/* Summary Card */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {calculation.adults + calculation.children}
                                    </div>
                                    <div className="text-sm text-blue-700">Total Guests</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{pricing.nights}</div>
                                    <div className="text-sm text-blue-700">Nights</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatDate(calculation.check_in_date)}
                                    </div>
                                    <div className="text-sm text-blue-700">Check-in</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {formatDate(calculation.check_out_date)}
                                    </div>
                                    <div className="text-sm text-blue-700">Check-out</div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Cost Breakdown</h3>
                            </div>
                            
                            <div className="p-6">
                                <div className="space-y-4">
                                    {/* Base Room Cost */}
                                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                        <div>
                                            <span className="font-medium text-gray-900">Base Room Rate</span>
                                            <p className="text-sm text-gray-600">
                                                {getSelectedRoomType()?.name} × {pricing.nights} nights
                                            </p>
                                        </div>
                                        <span className="font-medium text-gray-900">
                                            {formatCurrency(pricing.breakdown.base_price)}
                                        </span>
                                    </div>

                                    {/* Extra Guests */}
                                    {pricing.breakdown.extra_guests > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                            <div>
                                                <span className="font-medium text-gray-900">Extra Guest Charges</span>
                                                <p className="text-sm text-gray-600">
                                                    Additional guests beyond room capacity
                                                </p>
                                            </div>
                                            <span className="font-medium text-gray-900">
                                                {formatCurrency(pricing.breakdown.extra_guests)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Extra Services */}
                                    {pricing.breakdown.extra_services > 0 && (
                                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                            <div>
                                                <span className="font-medium text-gray-900">Extra Services</span>
                                                <p className="text-sm text-gray-600">
                                                    {calculation.extra_services.length} service(s) selected
                                                </p>
                                            </div>
                                            <span className="font-medium text-gray-900">
                                                {formatCurrency(pricing.breakdown.extra_services)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Subtotal */}
                                    <div className="flex justify-between items-center py-2 border-b border-gray-200">
                                        <span className="font-medium text-gray-900">Subtotal</span>
                                        <span className="font-medium text-gray-900">
                                            {formatCurrency(pricing.breakdown.subtotal)}
                                        </span>
                                    </div>

                                    {/* Total */}
                                    <div className="flex justify-between items-center py-3 bg-gray-50 px-4 rounded-lg">
                                        <span className="text-lg font-bold text-gray-900">Total Amount</span>
                                        <span className="text-2xl font-bold text-green-600">
                                            {formatCurrency(pricing.breakdown.total)}
                                        </span>
                                    </div>
                                </div>

                                {/* Additional Information */}
                                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        <li>• Prices are subject to change without notice</li>
                                        <li>• Extra guest charges apply when exceeding room capacity</li>
                                        <li>• Extra services are charged per item per stay</li>
                                        <li>• All prices include applicable taxes</li>
                                        <li>• Cancellation policy: 24 hours before check-in</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* No Results */}
                {!loading && !pricing && !error && calculation.room_type_id && (
                    <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Calculate</h3>
                        <p className="text-gray-600">
                            Fill in the booking details above and click "Calculate Price" to see the total cost.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PricingCalculator;
