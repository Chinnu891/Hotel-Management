import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import RoomAvailabilityStatus from './RoomAvailabilityStatus';
import './NewBookingEnhanced.css';

const NewBookingEnhanced = () => {
    const navigate = useNavigate();
    const { guestId } = useParams();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    // Refs for 3D effects
    const cardRefs = useRef({});
    const stepIndicatorRef = useRef(null);

    const [formData, setFormData] = useState({
        guest_info: {
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            address: '',
            id_proof_type: 'passport',
            id_proof_number: ''
        },
        company_name: '',
        gst_number: '',
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        billing_address: '',
        check_in_date: (() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        })(),
        check_out_date: (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return tomorrow;
        })(),
        adults: 1,
        children: 0,
        room_number: '',
        booking_source: 'walk_in',
        owner_reference: false,
        payment_required: true
    });

    const [availableRooms, setAvailableRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [pricing, setPricing] = useState(null);
    const [roomAvailability, setRoomAvailability] = useState(null);

    // 3D Animation functions
    const handle3DCardEffect = (e, cardId) => {
        const card = cardRefs.current[cardId];
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.boxShadow = `0 20px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1)`;
    };

    const reset3DCardEffect = (cardId) => {
        const card = cardRefs.current[cardId];
        if (!card) return;
        
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
    };

    // Enhanced floating label input component
    const FloatingLabelInput = ({ 
        label, 
        value, 
        onChange, 
        type = 'text', 
        required = false, 
        placeholder = '',
        className = '',
        validation = null
    }) => {
        const [isFocused, setIsFocused] = useState(false);
        const [hasError, setHasError] = useState(false);
        
        const handleChange = (e) => {
            const newValue = e.target.value;
            onChange(newValue);
            
            if (validation) {
                setHasError(!validation(newValue));
            }
        };

        return (
            <div className={`relative ${className}`}>
                <input
                    type={type}
                    value={value}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`
                        w-full px-4 py-3 border-2 rounded-lg transition-all duration-300 ease-out
                        ${isFocused 
                            ? 'border-blue-500 bg-blue-50' 
                            : hasError 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-gray-300 bg-white hover:border-gray-400'
                        }
                        ${isFocused || value ? 'pt-6 pb-2' : 'py-3'}
                        focus:outline-none focus:ring-4 focus:ring-blue-100
                    `}
                    required={required}
                    placeholder={placeholder}
                />
                <label className={`
                    absolute left-4 transition-all duration-300 ease-out pointer-events-none
                    ${isFocused || value 
                        ? 'top-2 text-xs text-blue-600 font-medium' 
                        : 'top-3 text-sm text-gray-500'
                    }
                `}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                {hasError && (
                    <div className="absolute -bottom-6 left-0 text-xs text-red-500">
                        Invalid {label.toLowerCase()}
                    </div>
                )}
            </div>
        );
    };

    // Enhanced 3D card component
    const Card3D = ({ children, className = '', cardId, onClick = null }) => (
        <div
            ref={(el) => cardRefs.current[cardId] = el}
            className={`
                ${className} 
                transition-all duration-300 ease-out cursor-pointer
                transform perspective-1000 hover:scale-105
                bg-white rounded-xl shadow-lg border border-gray-100
                hover:shadow-2xl hover:shadow-blue-500/20
            `}
            onMouseMove={(e) => handle3DCardEffect(e, cardId)}
            onMouseLeave={() => reset3DCardEffect(cardId)}
            onClick={onClick}
        >
            {children}
        </div>
    );

    // Handle form submission
    const handleSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            const checkIn = formData.check_in_date.toISOString().split('T')[0];
            const checkOut = formData.check_out_date.toISOString().split('T')[0];

            const bookingData = {
                ...formData,
                check_in_date: checkIn,
                check_out_date: checkOut,
                created_by: 1
            };

            const response = await axios.post(buildApiUrl('booking/create_booking.php'), bookingData);

            if (response.data.success) {
                setSuccess('Booking created successfully!');
                // Navigate to booking confirmation page
                setTimeout(() => {
                    navigate(`/reception/booking-confirmation/${response.data.data.booking_id}`);
                }, 2000);
            } else {
                setError(response.data.message);
            }
        } catch (error) {
            setError('Error creating booking: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Handle input changes
    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }
    };

    // Booking Summary Component with proper width
    const BookingSummary = () => (
        <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-blue-200 p-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">📋 Booking Summary</h2>
                <p className="text-gray-600">Review your booking details before confirmation</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Guest & Booking Details */}
                <div className="space-y-6">
                    {/* Guest Information */}
                    <Card3D cardId="guestSummary" className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-lg">👤</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">Guest Information</h3>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Full Name:</span>
                                <span className="font-semibold text-gray-900">
                                    {formData.guest_info.first_name} {formData.guest_info.last_name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Email:</span>
                                <span className="font-semibold text-gray-900">{formData.guest_info.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-semibold text-gray-900">{formData.guest_info.phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">ID Proof:</span>
                                <span className="font-semibold text-gray-900">
                                    {formData.guest_info.id_proof_type} - {formData.guest_info.id_proof_number}
                                </span>
                            </div>
                        </div>
                    </Card3D>

                    {/* Booking Details */}
                    <Card3D cardId="bookingSummary" className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="text-green-600 text-lg">📅</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Check-in:</span>
                                <span className="font-semibold text-gray-900">
                                    {formData.check_in_date?.toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Check-out:</span>
                                <span className="font-semibold text-gray-900">
                                    {formData.check_out_date?.toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Duration:</span>
                                <span className="font-semibold text-gray-900">
                                    {pricing?.nights || 1} night{pricing?.nights > 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Guests:</span>
                                <span className="font-semibold text-gray-900">
                                    {formData.adults + formData.children} ({formData.adults} adults, {formData.children} children)
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Source:</span>
                                <span className="font-semibold text-blue-600 capitalize">
                                    {formData.booking_source === 'corporate' ? '🏢 Corporate' : formData.booking_source}
                                </span>
                            </div>
                        </div>
                    </Card3D>
                </div>

                {/* Right Column - Room & Pricing Details */}
                <div className="space-y-6">
                    {/* Room Information */}
                    {selectedRoom && (
                        <Card3D cardId="roomSummary" className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-purple-600 text-lg">🏨</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">Room Details</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Room Number:</span>
                                    <span className="font-semibold text-purple-600 text-lg">{selectedRoom.room_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Room Type:</span>
                                    <span className="font-semibold text-gray-900">{selectedRoom.room_type_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Floor:</span>
                                    <span className="font-semibold text-gray-900">{selectedRoom.floor}</span>
                                </div>
                                {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                                    <div className="mt-4">
                                        <span className="text-gray-600 text-xs block mb-2">Features:</span>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRoom.amenities.map((amenity, index) => (
                                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800">
                                                    ✨ {amenity}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card3D>
                    )}

                    {/* Pricing Summary */}
                    {selectedRoom && pricing && (
                        <Card3D cardId="pricingSummary" className="p-6">
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <span className="text-yellow-600 text-lg">💰</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900">Pricing Summary</h3>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Price per night:</span>
                                    <span className="font-semibold text-gray-900">
                                        ${selectedRoom.pricing?.price_per_night || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Number of nights:</span>
                                    <span className="font-semibold text-gray-900">{pricing.nights}</span>
                                </div>
                                <div className="border-t pt-3 mt-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                                        <span className="text-3xl font-bold text-green-600">
                                            ${selectedRoom.pricing?.total_price || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card3D>
                    )}

                    {/* Special Notes */}
                    <Card3D cardId="specialNotes" className="p-6">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <span className="text-orange-600 text-lg">📝</span>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">Special Notes</h3>
                        </div>
                        <div className="space-y-3 text-sm">
                            {formData.owner_reference && (
                                <div className="flex items-center space-x-2 p-3 bg-green-100 rounded-lg">
                                    <span className="text-green-600">✅</span>
                                    <span className="text-green-800 font-medium">Owner Reference - Special rates applied</span>
                                </div>
                            )}
                            {formData.booking_source === 'corporate' && (
                                <div className="flex items-center space-x-2 p-3 bg-blue-100 rounded-lg">
                                    <span className="text-blue-600">🏢</span>
                                    <span className="text-blue-800 font-medium">Corporate booking - Business rates</span>
                                </div>
                            )}
                            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                                <span className="text-blue-600">ℹ</span>
                                <span className="text-blue-800">Please ensure all information is correct</span>
                            </div>
                        </div>
                    </Card3D>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4 mt-8 pt-6 border-t border-blue-200">
                <button
                    onClick={() => setStep(4)}
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                    ← Back to Edit
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creating Booking...' : '✨ Confirm & Create Booking'}
                </button>
            </div>
        </div>
    );

    // Main render function
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">🏨 New Booking</h1>
                    <p className="text-xl text-gray-600">Create a new reservation with enhanced features</p>
                </div>

                {/* Step Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-center">
                        {[1, 2, 3, 4, 5].map((stepNumber) => (
                            <div key={stepNumber} className="flex items-center">
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium 
                                    transition-all duration-300 ease-out transform hover:scale-110
                                    ${stepNumber < step 
                                        ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg shadow-green-500/30' 
                                        : stepNumber === step 
                                            ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' 
                                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                    }
                                `}>
                                    {stepNumber < step ? '✓' : stepNumber}
                                </div>
                                {stepNumber < 5 && (
                                    <div className={`
                                        w-20 h-1 mx-3 transition-all duration-300 ease-out
                                        ${stepNumber < step 
                                            ? 'bg-gradient-to-r from-green-400 to-green-600' 
                                            : 'bg-gray-200'
                                        }
                                    `} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center mt-6 space-x-12 text-sm text-gray-600 font-medium">
                        <span>Guest Info</span>
                        <span>Dates & Guests</span>
                        <span>Room Selection</span>
                        <span>Corporate Info</span>
                        <span>Review</span>
                    </div>
                </div>

                {/* Success and Error Messages */}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-green-600 text-xl">✅</span>
                            <p className="text-green-800 font-medium">{success}</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-red-600 text-xl">❌</span>
                            <p className="text-red-800 font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="w-full">
                    {step === 5 ? (
                        <BookingSummary />
                    ) : (
                        <div className="text-center py-12">
                            <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                                Step {step} of 5
                            </h2>
                            <p className="text-gray-500">
                                This step will be implemented with the full form functionality
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewBookingEnhanced;
