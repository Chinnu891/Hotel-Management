import React, { useState, useEffect } from 'react';
import { FaUser, FaCalendar, FaBed, FaCreditCard, FaMoneyBillWave, FaCalculator, FaExclamationTriangle } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';
import { getTodayString, getTomorrowString } from '../../utils/dateUtils';

const NewBookingWithWalkInPayment = () => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Guest Information
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        id_proof_type: 'passport',
        id_proof_number: '',
        
        // Booking Details
        check_in_date: getTodayString(),
        check_out_date: getTomorrowString(),
        adults: 1,
        children: 0,
        
        // Room Selection
        room_type_id: '',
        room_id: '',
        
        // Walk-in Payment Details
        booking_source: 'walk_in',
        paid_amount: '',
        payment_method: '',
        referenced_by_owner: false,
        owner_reference_notes: '',
        
        // Additional Services
        extra_services: [],
        notes: ''
    });

    const [availableRooms, setAvailableRooms] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [extraServices, setExtraServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);
    const [showPaymentType, setShowPaymentType] = useState(false);

    useEffect(() => {
        fetchRoomTypes();
        fetchExtraServices();
    }, []);

    useEffect(() => {
        if (formData.room_id && formData.check_in_date && formData.check_out_date) {
            calculateTotal();
        }
    }, [formData.room_id, formData.check_in_date, formData.check_out_date, formData.adults, formData.children, formData.extra_services]);

    useEffect(() => {
        // Show payment type only if paid amount > 0
        const paidAmount = parseFloat(formData.paid_amount) || 0;
        setShowPaymentType(paidAmount > 0);
        
        // Calculate remaining amount
        if (totalAmount > 0) {
            setRemainingAmount(totalAmount - paidAmount);
        }
    }, [formData.paid_amount, totalAmount]);

    const fetchRoomTypes = async () => {
        try {
            const response = await fetch(buildApiUrl('rooms/get_room_types.php'));
            const data = await response.json();
            if (data.success) {
                setRoomTypes(data.room_types);
            }
        } catch (error) {
            console.error('Error fetching room types:', error);
        }
    };

    const fetchExtraServices = async () => {
        try {
            const response = await fetch(buildApiUrl('extra_services/get_services.php'));
            const data = await response.json();
            if (data.success) {
                setExtraServices(data.services);
            }
        } catch (error) {
            console.error('Error fetching extra services:', error);
        }
    };

    const fetchAvailableRooms = async () => {
        if (!formData.room_type_id || !formData.check_in_date || !formData.check_out_date) return;

        try {
            const response = await fetch(buildApiUrl(`rooms/check_availability.php?room_type_id=${formData.room_type_id}&check_in=${formData.check_in_date}&check_out=${formData.check_out_date}`));
            const data = await response.json();
            if (data.success) {
                setAvailableRooms(data.available_rooms);
            }
        } catch (error) {
            console.error('Error fetching available rooms:', error);
        }
    };

    const calculateTotal = async () => {
        if (!formData.room_id || !formData.check_in_date || !formData.check_out_date) return;

        try {
            const response = await fetch(buildApiUrl(`rooms/calculate_price.php`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    room_id: formData.room_id,
                    check_in_date: formData.check_in_date,
                    check_out_date: formData.check_out_date,
                    adults: formData.adults,
                    children: formData.children,
                    extra_services: formData.extra_services
                })
            });
            const data = await response.json();
            if (data.success) {
                setTotalAmount(data.total_amount);
            }
        } catch (error) {
            console.error('Error calculating total:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Fetch available rooms when room type changes
        if (field === 'room_type_id') {
            fetchAvailableRooms();
        }
    };

    const handleServiceToggle = (serviceId) => {
        setFormData(prev => ({
            ...prev,
            extra_services: prev.extra_services.includes(serviceId)
                ? prev.extra_services.filter(id => id !== serviceId)
                : [...prev.extra_services, serviceId]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate payment fields
            if (formData.booking_source === 'walk_in') {
                const paidAmount = parseFloat(formData.paid_amount) || 0;
                if (paidAmount > totalAmount) {
                    setError('Paid amount cannot exceed total amount');
                    setLoading(false);
                    return;
                }
                if (paidAmount > 0 && !formData.payment_method) {
                    setError('Payment method is required when amount is greater than 0');
                    setLoading(false);
                    return;
                }
            }

            const bookingData = {
                ...formData,
                total_amount: totalAmount,
                remaining_amount: remainingAmount,
                created_by: 1 // Replace with actual user ID from auth
            };

            const response = await fetch(buildApiUrl('booking/create_booking_with_walk_in_payment.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();

            if (data.success) {
                // Handle success - redirect or show confirmation
                alert('Booking created successfully!');
                setFormData({
                    first_name: '', last_name: '', email: '', phone: '', address: '',
                    id_proof_type: 'passport', id_proof_number: '',
                    check_in_date: '', check_out_date: '', adults: 1, children: 0,
                    room_type_id: '', room_id: '', booking_source: 'walk_in',
                    paid_amount: '', payment_method: '', referenced_by_owner: false,
                    owner_reference_notes: '', extra_services: [], notes: ''
                });
                setCurrentStep(1);
            } else {
                setError(data.message || 'Failed to create booking');
            }
        } catch (error) {
            console.error('Booking error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep < 4) setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const renderStep1 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FaUser className="mr-2" />
                Guest Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">First Name *</label>
                    <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                    <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone *</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows="3"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof Type *</label>
                    <select
                        value={formData.id_proof_type}
                        onChange={(e) => handleInputChange('id_proof_type', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="passport">Passport</option>
                        <option value="driving_license">Driving License</option>
                        <option value="national_id">National ID</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof Number *</label>
                    <input
                        type="text"
                        value={formData.id_proof_number}
                        onChange={(e) => handleInputChange('id_proof_number', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FaCalendar className="mr-2" />
                Dates & Guest Count
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Check-in Date *</label>
                    <input
                        type="date"
                        value={formData.check_in_date}
                        onChange={(e) => handleInputChange('check_in_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Check-out Date *</label>
                    <input
                        type="date"
                        value={formData.check_out_date}
                        onChange={(e) => handleInputChange('check_out_date', e.target.value)}
                        min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Adults *</label>
                    <input
                        type="number"
                        value={formData.adults}
                        onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                        min="1"
                        max="10"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Children</label>
                    <input
                        type="number"
                        value={formData.children}
                        onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                        min="0"
                        max="10"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FaBed className="mr-2" />
                Room Selection
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Room Type *</label>
                    <select
                        value={formData.room_type_id}
                        onChange={(e) => handleInputChange('room_type_id', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">Select Room Type</option>
                        {roomTypes.map(type => (
                            <option key={type.id} value={type.id}>
                                {type.name} - {formatCurrency(type.base_price)}/night
                            </option>
                        ))}
                    </select>
                </div>

                {formData.room_type_id && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Available Room *</label>
                        <select
                            value={formData.room_id}
                            onChange={(e) => handleInputChange('room_id', e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        >
                            <option value="">Select Room</option>
                            {availableRooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    Room {room.room_number} - Floor {room.floor}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {totalAmount > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Pricing Summary</h4>
                        <div className="text-sm text-blue-800">
                            <p>Total Amount: <span className="font-semibold">{formatCurrency(totalAmount)}</span></p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FaCreditCard className="mr-2" />
                Payment & Confirmation
            </h3>
            
            <div className="space-y-4">
                {/* Booking Source */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Booking Source *</label>
                    <select
                        value={formData.booking_source}
                        onChange={(e) => handleInputChange('booking_source', e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="walk_in">Walk-in</option>
                        <option value="online">Online</option>
                        <option value="phone">Phone</option>
                    </select>
                </div>

                {/* Payment Fields - Only enabled for phone call booking and walk in */}
                {(formData.booking_source === 'phone' || formData.booking_source === 'walk_in') ? (
                    <>
                        {/* Total Amount Display */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-900 mb-2">Total Room Amount</h4>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                        </div>

                        {/* Paid Amount Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount to Pay *</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={formData.paid_amount}
                                    onChange={(e) => handleInputChange('paid_amount', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    max={totalAmount}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder={`Max: ${formatCurrency(totalAmount)}`}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <FaCalculator className="text-gray-400" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Enter the amount the guest is paying now
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Total Amount Display - Always visible */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-medium text-green-900 mb-2">Total Room Amount</h4>
                            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                        </div>

                        {/* Payment Disabled Notice */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <span className="text-red-800 font-medium">
                                    ⚠ Payment details disabled
                                </span>
                            </div>
                            <p className="text-red-700 text-sm mt-1">
                                Payment details are only available for Phone Call Booking and Walk In bookings.
                            </p>
                        </div>
                    </>
                )}

                        {/* Payment Method - Only show if amount > 0 and payment details enabled */}
                        {showPaymentType && (formData.booking_source === 'phone' || formData.booking_source === 'walk_in') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Method *</label>
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => handleInputChange('payment_method', e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select Payment Method</option>
                                    <option value="cash">Cash</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="debit_card">Debit Card</option>
                                    <option value="upi">UPI</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="online_wallet">Online Wallet</option>
                                </select>
                            </div>
                        )}

                        {/* Remaining Amount Display - Only show if payment details enabled */}
                        {remainingAmount > 0 && (formData.booking_source === 'phone' || formData.booking_source === 'walk_in') && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h4 className="font-medium text-orange-900 mb-2">Remaining Amount</h4>
                                <p className="text-xl font-semibold text-orange-600">{formatCurrency(remainingAmount)}</p>
                                <p className="text-sm text-orange-700 mt-1">
                                    This amount will be collected later
                                </p>
                            </div>
                        )}

                        {/* Owner Reference Checkbox */}
                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="referenced_by_owner"
                                checked={formData.referenced_by_owner}
                                onChange={(e) => handleInputChange('referenced_by_owner', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                                <label htmlFor="referenced_by_owner" className="text-sm font-medium text-gray-700">
                                    Referenced by Owner of the Hotel
                                </label>
                                <p className="text-sm text-gray-500 mt-1">
                                    Check this if the owner has approved this booking without full payment
                                </p>
                            </div>
                        </div>

                        {/* Owner Reference Notes */}
                        {formData.referenced_by_owner && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Owner Reference Notes</label>
                                <textarea
                                    value={formData.owner_reference_notes}
                                    onChange={(e) => handleInputChange('owner_reference_notes', e.target.value)}
                                    rows="3"
                                    placeholder="Enter owner's approval notes..."
                                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        )}
                    </>

                {/* Extra Services */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Extra Services</label>
                    <div className="mt-2 space-y-2">
                        {extraServices.map(service => (
                            <label key={service.id} className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.extra_services.includes(service.id)}
                                    onChange={() => handleServiceToggle(service.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    {service.name} - {formatCurrency(service.price)}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows="3"
                        placeholder="Any additional notes about this booking..."
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    );

    const renderStepContent = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return renderStep1();
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">New Booking</h1>
                    <p className="text-gray-600 mt-2">Create a new booking with walk-in payment support</p>
                </div>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3, 4].map((step) => (
                            <div key={step} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    currentStep >= step 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {step}
                                </div>
                                {step < 4 && (
                                    <div className={`w-16 h-1 mx-2 ${
                                        currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>Guest Info</span>
                        <span>Dates</span>
                        <span>Room</span>
                        <span>Payment</span>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <FaExclamationTriangle className="text-red-400 mr-2" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-6">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium ${
                                currentStep === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Previous
                        </button>

                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                className="px-6 py-2 bg-blue-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-blue-700"
                            >
                                Next
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-6 py-2 rounded-lg text-sm font-medium text-white ${
                                    loading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {loading ? 'Creating Booking...' : 'Create Booking'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewBookingWithWalkInPayment;
