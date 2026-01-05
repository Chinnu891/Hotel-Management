import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import RoomAvailabilityStatus from './RoomAvailabilityStatus';
import RazorpayPayment from '../reception/RazorpayPayment';

const NewBooking = () => {
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
        // Corporate Information
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
        // Owner Reference Checkbox
        owner_reference: false,
        payment_required: true
    });

    const [availableRooms, setAvailableRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [pricing, setPricing] = useState(null);
    const [roomAvailability, setRoomAvailability] = useState(null);
    
    // Phone suggestions and validation
    const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
    const [phoneSuggestions, setPhoneSuggestions] = useState([]);

    // Payment related state
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
    const [showRazorpayPayment, setShowRazorpayPayment] = useState(false);
    const [paymentMethods] = useState([
        { id: 'cash', name: 'Cash', description: 'Pay at reception' },
        { id: 'card', name: 'Credit/Debit Card', description: 'Card payment' },
        { id: 'upi', name: 'UPI', description: 'UPI payment via Razorpay' },
        { id: 'bank_transfer', name: 'Bank Transfer', description: 'Direct bank transfer' },
        { id: 'cheque', name: 'Cheque', description: 'Cheque payment' }
    ]);

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
        card.style.boxShadow = '0 10px 30px rgba(0,0,255,0.1)';
    };

    // Phone validation function
    const isValidPhone = (phone) => {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
    };

    // Fetch phone suggestions based on input
    const fetchPhoneSuggestions = async (phoneInput) => {
        if (phoneInput.length < 3) {
            setPhoneSuggestions([]);
            return;
        }

        try {
            const response = await fetch(buildApiUrl('reception/search_guest.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    search_type: 'phone',
                    search_term: phoneInput,
                    status_filter: 'all'
                })
            });

            const data = await response.json();
            if (data.success && data.data) {
                const suggestions = data.data.slice(0, 5).map(guest => ({
                    phone: guest.phone,
                    name: `${guest.first_name} ${guest.last_name}`,
                    email: guest.email
                }));
                setPhoneSuggestions(suggestions);
            } else {
                setPhoneSuggestions([]);
            }
        } catch (error) {
            console.error('Error fetching phone suggestions:', error);
            setPhoneSuggestions([]);
        }
    };

    const animateStepTransition = (newStep) => {
        setIsAnimating(true);
        setTimeout(() => {
            setStep(newStep);
            setIsAnimating(false);
        }, 300);
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

    // API base URL from centralized config

    useEffect(() => {
        // Call checkAvailability when component mounts and when dates/guests change
        if (formData.check_in_date && formData.check_out_date) {
            console.log('Dates changed, checking availability...', {
                check_in: formData.check_in_date,
                check_out: formData.check_out_date,
                adults: formData.adults
            });
            checkAvailability();
        } else {
            console.log('Dates not set yet:', {
                check_in: formData.check_in_date,
                check_out: formData.check_out_date
            });
        }
    }, [formData.check_in_date, formData.check_out_date, formData.adults]);

    // Initial load effect
    useEffect(() => {
        // Ensure dates are properly initialized
        if (!formData.check_in_date || !formData.check_out_date) {
            console.log('Initializing default dates...');
            setDefaultDates();
        } else {
            console.log('Dates already initialized:', {
                check_in: formData.check_in_date,
                check_out: formData.check_out_date
            });
        }
        
        // Load rooms on component mount
        console.log('Component mounted, checking availability...');
        checkAvailability();
    }, []); // Empty dependency array means this runs once on mount

    // Debug effect to log step changes
    useEffect(() => {
        console.log('Step changed to:', step);
        console.log('Current form data:', formData);
        console.log('Owner reference value:', formData.owner_reference); // Debug owner reference
        console.log('Payment required value:', formData.payment_required); // Debug payment required
        console.log('All rooms:', allRooms);
        console.log('Available rooms:', availableRooms);
    }, [step, formData, allRooms, availableRooms]);

    // Handle guestId parameter for editing existing guest
    useEffect(() => {
        if (guestId) {
            // TODO: Load existing guest data if editing
            console.log('Loading guest data for ID:', guestId);
        }
    }, [guestId]);

    const checkAvailability = async () => {
        setLoading(true);
        setError('');
        try {
            // Handle case where dates might not be set yet
            if (!formData.check_in_date || !formData.check_out_date) {
                console.log('Dates not set yet, loading all rooms without date filtering...');
                // Load all rooms without date filtering
                const availabilityResponse = await axios.get(buildApiUrl('rooms/getRoomAvailability.php'), {
                    params: { 
                        guests: formData.adults + formData.children 
                    }
                });
                
                if (availabilityResponse.data.success) {
                    setRoomAvailability(availabilityResponse.data.data);
                    setAllRooms(availabilityResponse.data.data.all_rooms);
                    setAvailableRooms(availabilityResponse.data.data.available_rooms);
                    console.log('All rooms loaded:', availabilityResponse.data.data.all_rooms.length);
                }
                setLoading(false);
                return;
            }

            const checkIn = formData.check_in_date.toISOString().split('T')[0];
            const checkOut = formData.check_out_date.toISOString().split('T')[0];
            const totalGuests = formData.adults + formData.children;

            console.log('Checking availability for:', { checkIn, checkOut, totalGuests });
            console.log('API URL:', buildApiUrl('rooms/getRoomAvailability.php'));

            // Get room availability with room numbers
            const availabilityResponse = await axios.get(buildApiUrl('rooms/getRoomAvailability.php'), {
                params: { 
                    check_in_date: checkIn, 
                    check_out_date: checkOut, 
                    guests: totalGuests 
                }
            });

            console.log('Availability response:', availabilityResponse.data);

            if (availabilityResponse.data.success) {
                setRoomAvailability(availabilityResponse.data.data);
                setAllRooms(availabilityResponse.data.data.all_rooms);
                setAvailableRooms(availabilityResponse.data.data.available_rooms);
                console.log('Rooms loaded:', availabilityResponse.data.data.all_rooms.length);
            } else {
                console.error('Availability API error:', availabilityResponse.data);
                setError('Failed to load room availability: ' + (availabilityResponse.data.message || 'Unknown error'));
            }

            // Get pricing from booking availability
            const pricingResponse = await axios.get(buildApiUrl('booking/check_availability.php'), {
                params: { check_in: checkIn, check_out: checkOut, guests: totalGuests }
            });

            if (pricingResponse.data.success) {
                setPricing(pricingResponse.data.data);
            }
        } catch (error) {
            console.error('Error checking availability:', error);
            setError('Error checking availability: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            // Special handling for date fields
            if (field === 'check_in_date' || field === 'check_out_date') {
                if (value && !isNaN(new Date(value).getTime())) {
                    const dateValue = new Date(value);
                    dateValue.setHours(0, 0, 0, 0);
                    
                    // If changing check-in date, ensure check-out date is after it
                    if (field === 'check_in_date' && formData.check_out_date) {
                        if (dateValue >= formData.check_out_date) {
                            // Set check-out date to one day after new check-in date
                            const newCheckOut = new Date(dateValue);
                            newCheckOut.setDate(newCheckOut.getDate() + 1);
                            setFormData(prev => ({ 
                                ...prev, 
                                [field]: dateValue,
                                check_out_date: newCheckOut
                            }));
                            return;
                        }
                    }
                    
                    // If changing check-out date, ensure it's after check-in date
                    if (field === 'check_out_date' && formData.check_in_date) {
                        if (dateValue <= formData.check_in_date) {
                            alert('Check-out date must be after check-in date');
                            return;
                        }
                    }
                    
                    setFormData(prev => ({ ...prev, [field]: dateValue }));
                } else {
                    console.error('Invalid date value:', value);
                }
            } else {
                setFormData(prev => ({ ...prev, [field]: value }));
            }
        }
    };

    const handleRoomSelection = (room) => {
        setSelectedRoom(room);
        setFormData(prev => ({ 
            ...prev, 
            room_number: room.room_number 
        }));
    };

    const handleRoomNumberChange = (roomNumber) => {
        const selectedRoomData = allRooms.find(room => room.room_number === roomNumber);
        if (selectedRoomData) {
            // Check if room is available
            if (selectedRoomData.availability_status === 'occupied' || selectedRoomData.room_status === 'occupied') {
                alert('This room is currently occupied and cannot be booked!');
                return;
            }
            
            // Check if room is in maintenance or cleaning
            if (selectedRoomData.room_status === 'maintenance' || selectedRoomData.room_status === 'cleaning') {
                alert(`This room is currently under ${selectedRoomData.room_status} and cannot be booked!`);
                return;
            }
            
            setSelectedRoom(selectedRoomData);
            setFormData(prev => ({ 
                ...prev, 
                room_number: selectedRoomData.room_number 
            }));
        }
    };

    // Function to manually set dates for troubleshooting
    const setDefaultDates = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        setFormData(prev => ({
            ...prev,
            check_in_date: today,
            check_out_date: tomorrow
        }));
        
        console.log('Default dates set:', { today, tomorrow });
    };

    // Function to validate dates
    const validateDates = () => {
        if (!formData.check_in_date || !formData.check_out_date) {
            console.error('Dates are not set');
            return false;
        }
        
        if (formData.check_in_date >= formData.check_out_date) {
            console.error('Check-in date must be before check-out date');
            return false;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (formData.check_in_date < today) {
            console.error('Check-in date cannot be in the past');
            return false;
        }
        
        console.log('Dates are valid');
        return true;
    };

    const nextStep = () => {
        setError('');
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;
        if (step === 3 && !validateStep3()) return;
        if (step === 4 && !validateStep4()) return;
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const validateStep1 = () => {
        const { guest_info } = formData;
        const missingFields = [];
        
        if (!guest_info.first_name) missingFields.push('First Name');
        if (!guest_info.last_name) missingFields.push('Last Name');
        if (!guest_info.email) missingFields.push('Email');
        if (!guest_info.phone) missingFields.push('Phone');
        if (!guest_info.id_proof_number) missingFields.push('ID Proof Number');
        
        if (missingFields.length > 0) {
            setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        // Only validate room selection if we're moving to step 3
        // Step 2 is for selecting dates and guest count, room selection happens in step 3
        return true;
    };

    const validateStep3 = () => {
        if (!formData.room_number) {
            setError('Please select a room');
            return false;
        }
        return true;
    };

    const validateStep4 = () => {
        const missingFields = [];
        
        if (!formData.company_name) missingFields.push('Company Name');
        if (!formData.gst_number) missingFields.push('GST Number');
        if (!formData.contact_person) missingFields.push('Contact Person');
        if (!formData.contact_phone) missingFields.push('Contact Phone');
        // Contact Email is now optional - removed from required fields
        if (!formData.billing_address) missingFields.push('Billing Address');
        
        if (missingFields.length > 0) {
            setError(`Please fill in the following required corporate fields: ${missingFields.join(', ')}`);
            return false;
        }
        return true;
    };

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
                // Navigate to booking confirmation page
                navigate(`/reception/booking-confirmation/${response.data.data.booking_id}`);
            } else {
                setError(response.data.message);
            }
        } catch (error) {
            setError('Error creating booking');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Guest Information</h3>
                <p className="text-gray-600">Please provide the guest's personal details</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card3D cardId="firstName" className="p-6">
                    <FloatingLabelInput
                        label="First Name"
                        value={formData.guest_info.first_name}
                        onChange={(value) => handleInputChange('guest_info.first_name', value)}
                        required={true}
                        validation={(value) => value.length >= 2}
                    />
                </Card3D>
                
                <Card3D cardId="lastName" className="p-6">
                    <FloatingLabelInput
                        label="Last Name"
                        value={formData.guest_info.last_name}
                        onChange={(value) => handleInputChange('guest_info.last_name', value)}
                        required={true}
                        validation={(value) => value.length >= 2}
                    />
                </Card3D>
                
                <Card3D cardId="email" className="p-6">
                    <FloatingLabelInput
                        label="Email Address"
                        value={formData.guest_info.email}
                        onChange={(value) => handleInputChange('guest_info.email', value)}
                        type="email"
                        required={true}
                        validation={(value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
                    />
                </Card3D>
                
                <Card3D cardId="phone" className="p-6">
                    <FloatingLabelInput
                        label="Phone Number"
                        value={formData.guest_info.phone}
                        onChange={(value) => handleInputChange('guest_info.phone', value)}
                        type="tel"
                        required={true}
                        validation={(value) => value.length >= 10}
                    />
                </Card3D>
                
                <Card3D cardId="address" className="p-6 md:col-span-2">
                    <FloatingLabelInput
                        label="Address"
                        value={formData.guest_info.address}
                        onChange={(value) => handleInputChange('guest_info.address', value)}
                        required={true}
                        validation={(value) => value.length >= 10}
                    />
                </Card3D>
                
                <Card3D cardId="idProof" className="p-6">
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">ID Proof Type</label>
                        <select
                            value={formData.guest_info.id_proof_type}
                            onChange={(e) => handleInputChange('guest_info.id_proof_type', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-300"
                        >
                            <option value="passport">Passport</option>
                            <option value="driving_license">Driving License</option>
                            <option value="aadhar">Aadhar Card</option>
                            <option value="pan">PAN Card</option>
                        </select>
                    </div>
                </Card3D>
                
                <Card3D cardId="idNumber" className="p-6">
                    <FloatingLabelInput
                        label="ID Proof Number"
                        value={formData.guest_info.id_proof_number}
                        onChange={(value) => handleInputChange('guest_info.id_proof_number', value)}
                        required={true}
                        validation={(value) => value.length >= 5}
                    />
                </Card3D>
            </div>
        </div>
    );
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                    <input
                        type="text"
                        value={formData.guest_info.last_name}
                        onChange={(e) => handleInputChange('guest_info.last_name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                        type="email"
                        value={formData.guest_info.email}
                        onChange={(e) => handleInputChange('guest_info.email', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone *</label>
                    <div className="relative">
                        <input
                            type="tel"
                            value={formData.guest_info.phone}
                            onChange={(e) => {
                                const value = e.target.value;
                                handleInputChange('guest_info.phone', value);
                                fetchPhoneSuggestions(value);
                            }}
                            onFocus={() => setShowPhoneSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowPhoneSuggestions(false), 200)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                            placeholder="Enter phone number"
                            required
                        />
                        {/* Phone Suggestions Dropdown */}
                        {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                {phoneSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                        onClick={() => {
                                            handleInputChange('guest_info.phone', suggestion.phone);
                                            setShowPhoneSuggestions(false);
                                        }}
                                    >
                                        <div className="font-medium text-gray-900">{suggestion.phone}</div>
                                        <div className="text-xs text-gray-500">
                                            {suggestion.name} - {suggestion.email}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Phone validation message */}
                    {formData.guest_info.phone && !isValidPhone(formData.guest_info.phone) && (
                        <p className="mt-1 text-sm text-red-600">
                            Please enter a valid phone number
                        </p>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                        value={formData.guest_info.address}
                        onChange={(e) => handleInputChange('guest_info.address', e.target.value)}
                        rows={2}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ID Proof Type *</label>
                    <select
                        value={formData.guest_info.id_proof_type}
                        onChange={(e) => handleInputChange('guest_info.id_proof_type', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
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
                        value={formData.guest_info.id_proof_number}
                        onChange={(e) => handleInputChange('guest_info.id_proof_number', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Booking Source *</label>
                    <select
                        value={formData.booking_source}
                        onChange={(e) => handleInputChange('booking_source', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                        required
                    >
                        <option value="walk_in">Walk-in</option>
                        <option value="corporate">Corporate</option>
                        <option value="online">Online</option>
                        <option value="phone">Phone</option>
                        <option value="travel_agent">Travel Agent</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                {/* Owner Reference Checkbox */}
                <div className="md:col-span-2">
                    <div style={{backgroundColor: '#fef3c7', border: '2px solid #f59e0b', padding: '20px', borderRadius: '8px', marginTop: '20px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                            <input
                                type="checkbox"
                                id="owner_reference_checkbox"
                                checked={formData.owner_reference}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    console.log('Owner reference checkbox changed:', checked);
                                    setFormData(prev => ({
                                        ...prev,
                                        owner_reference: checked,
                                        payment_required: !checked
                                    }));
                                }}
                                style={{width: '20px', height: '20px'}}
                            />
                            <div>
                                <div style={{fontWeight: 'bold', fontSize: '18px', color: '#92400e'}}>
                                    🏨 Reference by Owner of the Hotel
                                </div>
                                <div style={{color: '#a16207', marginTop: '5px'}}>
                                    Check this box to book room without payment requirement
                                </div>
                            </div>
                        </div>
                        
                        {formData.owner_reference && (
                            <div style={{backgroundColor: '#dcfce7', border: '2px solid #16a34a', padding: '15px', borderRadius: '8px', marginTop: '15px'}}>
                                <div style={{color: '#166534', fontWeight: 'bold'}}>
                                    ✅ Owner Reference Active: No Payment Required!
                                </div>
                            </div>
                        )}
                        
                        <div style={{backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '6px', marginTop: '15px', fontSize: '12px', color: '#6b7280'}}>
                            Debug Info: owner_reference = {formData.owner_reference ? 'true' : 'false'}, payment_required = {formData.payment_required ? 'true' : 'false'}
                        </div>
                    </div>
                </div>

                {/* Company Information Fields - Only show when Corporate is selected */}
                {formData.booking_source === 'corporate' && (
                    <>
                        <div className="md:col-span-2">
                            <h4 className="text-lg font-medium text-blue-700 mb-3">🏢 Company Information</h4>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company Name *</label>
                            <input
                                type="text"
                                value={formData.company_name}
                                onChange={(e) => handleInputChange('company_name', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">GST Number</label>
                            <input
                                type="text"
                                value={formData.gst_number}
                                onChange={(e) => handleInputChange('gst_number', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Person *</label>
                            <input
                                type="text"
                                value={formData.contact_person}
                                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Phone *</label>
                            <input
                                type="tel"
                                value={formData.contact_phone}
                                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Contact Email *</label>
                            <input
                                type="email"
                                value={formData.contact_email}
                                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Billing Address</label>
                            <textarea
                                value={formData.billing_address}
                                onChange={(e) => handleInputChange('billing_address', e.target.value)}
                                rows={3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Dates & Guest Count</h3>
            
            {/* Debug Information */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Debug Information</h4>
                <div className="text-xs text-gray-600 space-y-1">
                    <p>Check-in Date: {formData.check_in_date ? formData.check_in_date.toString() : 'Not set'}</p>
                    <p>Check-out Date: {formData.check_out_date ? formData.check_out_date.toString() : 'Not set'}</p>
                    <p>Check-in ISO: {formData.check_in_date ? formData.check_in_date.toISOString() : 'Not set'}</p>
                    <p>Check-out ISO: {formData.check_out_date ? formData.check_out_date.toISOString() : 'Not set'}</p>
                    <p>Current Step: {step}</p>
                    <p>Form Data Keys: {Object.keys(formData).join(', ')}</p>
                </div>
                
                {/* Troubleshooting Buttons */}
                <div className="mt-3 space-x-2">
                    <button
                        onClick={setDefaultDates}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                        Set Default Dates
                    </button>
                    <button
                        onClick={validateDates}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                        Validate Dates
                    </button>
                    <button
                        onClick={() => console.log('Form Data:', formData)}
                        className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
                    >
                        Log Form Data
                    </button>
                </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                <p className="text-blue-800 text-sm">
                    <strong>Note:</strong> The room number dropdown is located below. 
                    If you don't see it, check the debug information above.
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Check-in Date *</label>
                    <input
                        type="date"
                        value={formData.check_in_date ? formData.check_in_date.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                            console.log('Check-in date changed:', e.target.value);
                            if (e.target.value) {
                                handleInputChange('check_in_date', e.target.value);
                            } else {
                                console.error('Empty check-in date value');
                            }
                        }}
                        onBlur={(e) => {
                            console.log('Check-in date blur:', e.target.value);
                            if (!e.target.value) {
                                console.error('Check-in date is required');
                            }
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                        required
                        aria-label="Check-in date"
                        title="Select check-in date"
                    />
                    {formData.check_in_date && (
                        <p className="text-xs text-gray-500 mt-1">
                            Selected: {formData.check_in_date.toLocaleDateString()}
                        </p>
                    )}
                    {!formData.check_in_date && (
                        <p className="text-xs text-red-500 mt-1">
                            Check-in date is required
                        </p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Check-out Date *</label>
                    <input
                        type="date"
                        value={formData.check_out_date ? formData.check_out_date.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                            console.log('Check-out date changed:', e.target.value);
                            if (e.target.value) {
                                handleInputChange('check_out_date', e.target.value);
                            } else {
                                console.error('Empty check-out date value');
                            }
                        }}
                        onBlur={(e) => {
                            console.log('Check-out date blur:', e.target.value);
                            if (!e.target.value) {
                                console.error('Check-out date is required');
                            }
                        }}
                        min={formData.check_in_date ? formData.check_in_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                        required
                        aria-label="Check-out date"
                        title="Select check-out date"
                    />
                    {formData.check_out_date && (
                        <p className="text-xs text-gray-500 mt-1">
                            Selected: {formData.check_out_date.toLocaleDateString()}
                        </p>
                    )}
                    {!formData.check_out_date && (
                        <p className="text-xs text-red-500 mt-1">
                            Check-out date is required
                        </p>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Adults *</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={formData.adults}
                        onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Children</label>
                    <input
                        type="number"
                        min="0"
                        max="10"
                        value={formData.children}
                        onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-lg font-semibold text-blue-700">Room Number *</label>
                    <p className="text-sm text-gray-600 mb-2">Select a room number from the dropdown below</p>
                    {/* Debug info */}
                    <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-100 rounded">
                        Debug: {allRooms.length} rooms loaded, {availableRooms.length} available
                        {loading && ' | Loading...'}
                        <button 
                            onClick={() => checkAvailability()} 
                            className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        >
                            Test API
                        </button>
                    </div>
                    <select
                        value={formData.room_number}
                        onChange={(e) => handleRoomNumberChange(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-1.5 px-2 text-sm"
                        required
                        disabled={loading}
                    >
                        <option value="">{loading ? 'Loading rooms...' : 'Select a room number'}</option>
                        {allRooms.length > 0 ? (
                            allRooms.map((room) => (
                                <option 
                                    key={room.room_number} 
                                    value={room.room_number}
                                    disabled={!room.is_bookable}
                                    className={!room.is_bookable ? 'text-red-500' : ''}
                                >
                                    {room.room_number} - {room.room_type_name} 
                                    ({room.availability_status === 'available' ? 'Available' : 'Occupied'})
                                    {room.amenities && room.amenities.length > 0 && ` - ${room.amenities.join(', ')}`}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>{loading ? 'Loading rooms...' : 'No rooms available'}</option>
                        )}
                    </select>
                    {allRooms.length === 0 && !loading && (
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-yellow-800 text-sm">
                                <strong>No rooms loaded.</strong> This could be due to:
                            </p>
                            <ul className="text-yellow-700 text-sm mt-1 ml-4 list-disc">
                                <li>API connection issue</li>
                                <li>Database connection problem</li>
                                <li>No rooms in the database</li>
                            </ul>
                            <p className="text-yellow-700 text-sm mt-1">
                                Click the "Test API" button above to debug the issue.
                            </p>
                        </div>
                    )}
                    {formData.room_number && (
                        <div className="mt-2 text-sm text-gray-600">
                            {roomAvailability && (
                                <div className="flex items-center space-x-4">
                                    <span>Available: {roomAvailability.available_count} rooms</span>
                                    <span>Occupied: {roomAvailability.occupied_count} rooms</span>
                                </div>
                            )}
                        </div>
                    )}
                    {error && (
                        <div className="mt-2 text-sm text-red-600">
                            Error loading rooms: {error}
                        </div>
                    )}
                </div>
            </div>
            {pricing && (
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900">Stay Summary</h4>
                    <p className="text-blue-700">
                        {pricing.nights} night{pricing.nights > 1 ? 's' : ''} • 
                        {formData.adults + formData.children} guest{formData.adults + formData.children > 1 ? 's' : ''}
                    </p>
                </div>
            )}
            
            {/* Room Availability Overview */}
            <div className="mt-4">
                <RoomAvailabilityStatus 
                    checkInDate={formData.check_in_date}
                    checkOutDate={formData.check_out_date}
                    guests={formData.adults + formData.children}
                    onRoomSelect={handleRoomSelection}
                />
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Room Selection</h3>
            {loading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Checking availability...</p>
                </div>
            ) : availableRooms.length > 0 ? (
                <div className="space-y-4">
                    {availableRooms.map((room) => (
                        <div
                            key={room.room_number}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedRoom?.room_number === room.room_number
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleRoomSelection(room)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h4 className="font-medium text-gray-900">
                                            Room {room.room_number}
                                        </h4>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Available
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{room.room_type_name}</p>
                                    <p className="text-sm text-gray-600">{room.description}</p>
                                    <p className="text-sm text-gray-600">Floor {room.floor}</p>
                                    {room.amenities && room.amenities.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-500 font-medium">Features:</p>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {room.amenities.map((amenity, index) => (
                                                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                        {amenity}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-blue-600">
                                        ${room.pricing?.total_price || 'N/A'}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        ${room.pricing?.price_per_night || 'N/A'}/night
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500">
                    <p>No rooms available for the selected dates and guest count.</p>
                </div>
            )}
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Corporate Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-2">
                            Company Name *
                        </label>
                        <input
                            type="text"
                            id="company_name"
                            name="company_name"
                            value={formData.company_name}
                            onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter company name"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="gst_number" className="block text-sm font-medium text-gray-700 mb-2">
                            GST Number *
                        </label>
                        <input
                            type="text"
                            id="gst_number"
                            name="gst_number"
                            value={formData.gst_number}
                            onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter GST number"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="contact_person" className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Person *
                        </label>
                        <input
                            type="text"
                            id="contact_person"
                            name="contact_person"
                            value={formData.contact_person}
                            onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter contact person name"
                            required
                        />
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Phone *
                        </label>
                        <input
                            type="tel"
                            id="contact_phone"
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter contact phone number"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-2">
                            Contact Email *
                        </label>
                        <input
                            type="email"
                            id="contact_email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter contact email address"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="billing_address" className="block text-sm font-medium text-gray-700 mb-2">
                            Billing Address *
                        </label>
                        <textarea
                            id="billing_address"
                            name="billing_address"
                            value={formData.billing_address}
                            onChange={(e) => setFormData({...formData, billing_address: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter company billing address"
                            rows="3"
                            required
                        />
                    </div>
                </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> All corporate information fields are required for business bookings. 
                    This information will be used for billing and invoicing purposes.
                </p>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Review Booking</h3>
            {selectedRoom && (
                <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-4">Guest Details</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Name:</span> {formData.guest_info.first_name} {formData.guest_info.last_name}</p>
                                <p><span className="font-medium">Email:</span> {formData.guest_info.email}</p>
                                <p><span className="font-medium">Phone:</span> {formData.guest_info.phone}</p>
                                <p><span className="font-medium">Guests:</span> {formData.adults} adults, {formData.children} children</p>
                                <p>
                                    <span className="font-medium">Booking Source:</span> 
                                    <span className={`ml-2 ${formData.booking_source === 'corporate' ? 'text-blue-600 font-semibold' : ''}`}>
                                        {formData.booking_source === 'corporate' ? '🏢 Corporate' : formData.booking_source}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-medium text-gray-900 mb-4">Room Details</h4>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Room Number:</span> <span className="font-semibold text-blue-600">{selectedRoom.room_number}</span></p>
                                <p><span className="font-medium">Room Type:</span> {selectedRoom.room_type_name}</p>
                                <p><span className="font-medium">Floor:</span> {selectedRoom.floor}</p>
                                <p><span className="font-medium">Check-in:</span> {formData.check_in_date.toLocaleDateString()}</p>
                                <p><span className="font-medium">Check-out:</span> {formData.check_out_date.toLocaleDateString()}</p>
                                <p><span className="font-medium">Nights:</span> {pricing?.nights}</p>
                                {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                                    <div className="mt-2">
                                        <p><span className="font-medium">Features:</span></p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {selectedRoom.amenities.map((amenity, index) => (
                                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                                    {amenity}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Corporate Information Section */}
                    <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium text-gray-900 mb-4">Corporate Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Company Name:</span> <span className="font-semibold text-blue-600">{formData.company_name || 'N/A'}</span></p>
                                <p><span className="font-medium">GST Number:</span> <span className="font-semibold text-blue-600">{formData.gst_number || 'N/A'}</span></p>
                                <p><span className="font-medium">Contact Person:</span> <span className="font-semibold text-blue-600">{formData.contact_person || 'N/A'}</span></p>
                            </div>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Contact Phone:</span> <span className="font-semibold text-blue-600">{formData.contact_phone || 'N/A'}</span></p>
                                <p><span className="font-medium">Contact Email:</span> <span className="font-semibold text-blue-600">{formData.contact_email || 'N/A'}</span></p>
                                <p><span className="font-medium">Billing Address:</span> <span className="font-semibold text-blue-600">{formData.billing_address || 'N/A'}</span></p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-medium text-gray-900">Total Amount:</span>
                            <span className="text-2xl font-bold text-blue-600">
                                ₹{selectedRoom.pricing.total_price}
                            </span>
                        </div>
                        
                        {/* Payment Method Selection */}
                        {formData.payment_required && (
                            <div className="border-t pt-4">
                                <h4 className="font-medium text-gray-900 mb-4">Payment Method</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {paymentMethods.map((method) => (
                                        <div
                                            key={method.id}
                                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                selectedPaymentMethod === method.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                            onClick={() => setSelectedPaymentMethod(method.id)}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-4 h-4 rounded-full border-2 ${
                                                    selectedPaymentMethod === method.id
                                                        ? 'border-blue-500 bg-blue-500'
                                                        : 'border-gray-300'
                                                }`}>
                                                    {selectedPaymentMethod === method.id && (
                                                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{method.name}</div>
                                                    <div className="text-sm text-gray-500">{method.description}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {selectedPaymentMethod === 'upi' && (
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                                        <p className="text-sm text-blue-800">
                                            <strong>UPI Payment:</strong> You will be redirected to Razorpay for secure UPI payment processing.
                                        </p>
                                    </div>
                                )}
                                
                                {!selectedPaymentMethod && (
                                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                        <p className="text-sm text-yellow-800">
                                            Please select a payment method to proceed with the booking.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            case 5: return renderStep5();
            default: return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">New Booking</h1>
                    <p className="text-gray-600 mt-2">Create a new hotel booking for your guests</p>
                    {allRooms.length === 0 && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md max-w-2xl mx-auto">
                            <p className="text-red-800 text-sm">
                                <strong>Troubleshooting:</strong> If you don't see the room number dropdown:
                            </p>
                            <ol className="text-red-700 text-sm mt-1 ml-4 list-decimal">
                                <li>Fill out all required fields in Step 1 (Guest Information)</li>
                                <li>Click "Next" to proceed to Step 2</li>
                                <li>Look for the "Room Number" section below</li>
                                <li>If no rooms appear, click the "Test API" button</li>
                                <li>Check the debug information above for errors</li>
                            </ol>
                        </div>
                    )}
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-center">
                        {[1, 2, 3, 4, 5].map((stepNumber) => (
                            <div key={stepNumber} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                    stepNumber < step ? 'bg-green-500 text-white' : 
                                    stepNumber === step ? 'bg-blue-500 text-white' : 
                                    'bg-gray-200 text-gray-600'
                                }`}>
                                    {stepNumber < step ? '✓' : stepNumber}
                                </div>
                                {stepNumber < 5 && (
                                    <div className={`w-16 h-1 mx-2 ${
                                        stepNumber < step ? 'bg-green-500' : 'bg-gray-200'
                                    }`} />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-center mt-4 space-x-8 text-xs text-gray-600">
                        <span>Guest Info</span>
                        <span>Dates & Guests</span>
                        <span>Room Selection</span>
                        <span>Corporate Info</span>
                        <span>Review</span>
                    </div>
                    {/* Debug info */}
                    <div className="text-center mt-4 text-sm text-gray-500">
                        Current Step: {step} | Rooms Loaded: {allRooms.length} | Available: {availableRooms.length}
                        <div className="mt-2 space-x-2">
                            <button 
                                onClick={() => setStep(1)} 
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                                Step 1
                            </button>
                            <button 
                                onClick={() => setStep(2)} 
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                                Step 2
                            </button>
                            <button 
                                onClick={() => setStep(3)} 
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                                Step 3
                            </button>
                            <button 
                                onClick={() => setStep(4)} 
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                                Step 4
                            </button>
                            <button 
                                onClick={() => setStep(5)} 
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                                Step 5
                            </button>
                        </div>
                        <div className="mt-2 text-xs">
                            <p>Step 1: Guest Information | Step 2: Dates & Guests | Step 3: Room Selection | Step 4: Corporate Info | Step 5: Review</p>
                            <p>To see the room number dropdown, you must be on Step 3</p>
                            <p>If you can't proceed, check the error message below</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
                        <p className="text-sm text-green-800">{success}</p>
                    </div>
                )}

                <form onSubmit={(e) => e.preventDefault()}>
                    {renderStepContent()}

                    <div className="flex justify-between mt-8">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={step === 1}
                            className={`px-6 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                                step === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                                'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            Previous
                        </button>

                        <div className="flex space-x-3">
                            {step < 5 ? (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="px-6 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    Next
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading || !selectedRoom}
                                    className={`px-6 py-2 rounded-md text-sm font-medium ${
                                        loading || !selectedRoom ? 
                                        'bg-gray-400 text-gray-200 cursor-not-allowed' : 
                                        'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {loading ? 'Creating Booking...' : 'Create Booking'}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewBooking;
