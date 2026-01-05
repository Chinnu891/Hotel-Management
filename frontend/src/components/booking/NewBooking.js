import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import RoomAvailabilityStatus from './RoomAvailabilityStatus';
import { formatDateForAPI, formatDateForInput, getTodayString, getTomorrowString } from '../../utils/dateUtils';

const NewBooking = () => {
    const navigate = useNavigate();
    const { guestId } = useParams();
    const [searchParams] = useSearchParams();
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
        check_in_date: new Date(),
        check_out_date: (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        })(),
        adults: 1,
        children: 0,
        room_number: '',
        booking_source: 'walk_in',
        // Owner Reference Checkbox
        owner_reference: false,
        payment_required: true,
        // Payment Information
        initial_payment: 0,
        payment_method: 'cash'
    });

    const [availableRooms, setAvailableRooms] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [pricing, setPricing] = useState(null);
    const [roomAvailability, setRoomAvailability] = useState(null);
    
    // Phone suggestions and validation
    const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
    const [phoneSuggestions, setPhoneSuggestions] = useState([]);
    const [isReturningGuest, setIsReturningGuest] = useState(false);

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

    // Handle URL parameters from "Book Now" button
    useEffect(() => {
        const roomNumber = searchParams.get('room');
        const roomTypeId = searchParams.get('room_type_id');
        const roomTypeName = searchParams.get('room_type_name');
        const checkInDate = searchParams.get('check_in');
        const checkOutDate = searchParams.get('check_out');
        const guests = searchParams.get('guests');

        if (roomNumber || checkInDate || checkOutDate || guests || roomTypeId || roomTypeName) {
            console.log('URL parameters detected:', { roomNumber, roomTypeId, roomTypeName, checkInDate, checkOutDate, guests });
            
            setFormData(prev => ({
                ...prev,
                room_number: roomNumber || prev.room_number,
                room_type: roomTypeId || prev.room_type,
                check_in_date: checkInDate ? new Date(checkInDate) : prev.check_in_date,
                check_out_date: checkOutDate ? new Date(checkOutDate) : prev.check_out_date,
                adults: guests ? parseInt(guests) : prev.adults
            }));

            // If room number is provided, set it as selected room
            if (roomNumber) {
                setSelectedRoom({ 
                    room_number: roomNumber,
                    room_type_id: roomTypeId,
                    room_type_name: roomTypeName ? decodeURIComponent(roomTypeName) : null
                });
            }
        }
    }, [searchParams]);

    // Fetch phone suggestions based on input
    const fetchPhoneSuggestions = async (phoneInput) => {
        if (phoneInput.length < 3) {
            setPhoneSuggestions([]);
            return;
        }

        console.log('Fetching phone suggestions for:', phoneInput);
        console.log('API URL:', buildApiUrl('reception/search_guest.php'));

        try {
            const requestBody = {
                search_type: 'phone',
                search_term: phoneInput,
                status_filter: 'all'
            };
            console.log('Request body:', requestBody);

            const response = await fetch(buildApiUrl('reception/search_guest.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log('API response:', data);
            
            if (data.success && data.data) {
                const suggestions = data.data.slice(0, 5).map(guest => {
                    console.log('Processing guest data:', guest);
                    return {
                        phone: guest.phone,
                        name: `${guest.first_name} ${guest.last_name}`,
                        email: guest.email,
                        address: guest.address || '',
                        id_proof_type: guest.id_proof_type || 'passport',
                        id_proof_number: guest.id_proof_number || '',
                        first_name: guest.first_name,
                        last_name: guest.last_name,
                        // Add any additional fields that might be in the API response
                        full_name: guest.full_name || `${guest.first_name} ${guest.last_name}`,
                        room_number: guest.room_number || '',
                        booking_id: guest.booking_id || '',
                        guest_id: guest.guest_id || ''
                    };
                });
                console.log('Processed suggestions:', suggestions);
                setPhoneSuggestions(suggestions);
            } else {
                console.log('No suggestions found or API error');
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
        validation = null,
        onFocus = null,
        onBlur = null
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

        const handleFocus = (e) => {
            setIsFocused(true);
            if (onFocus) {
                onFocus(e);
            }
        };

        const handleBlur = (e) => {
            setIsFocused(false);
            if (onBlur) {
                onBlur(e);
            }
        };

        return (
            <div className={`relative ${className}`}>
                <input
                    type={type}
                    value={value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
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
            console.log('🔄 DATES CHANGED - useEffect triggered:', {
                check_in: formData.check_in_date,
                check_out: formData.check_out_date,
                adults: formData.adults
            });
            checkAvailability();
        } else {
            console.log('📅 Dates not set yet:', {
                check_in: formData.check_in_date,
                check_out: formData.check_out_date
            });
        }
    }, [formData.check_in_date, formData.check_out_date, formData.adults]);

    // Initial load effect
    useEffect(() => {
        // Load rooms on component mount
        console.log('Component mounted, checking availability...');
        checkAvailability();
    }, []); // Empty dependency array means this runs once on mount

    // Debug effect to log step changes
    useEffect(() => {
        console.log('Step changed to:', step);
        console.log('Current form data:', formData);
        console.log('Guest info:', formData.guest_info);
        console.log('Owner reference value:', formData.owner_reference); // Debug owner reference
        console.log('Payment required value:', formData.payment_required); // Debug payment required
        console.log('All rooms:', allRooms);
        console.log('Available rooms:', availableRooms);
    }, [step, formData, allRooms, availableRooms]);
    
    // Debug effect to monitor allRooms changes
    useEffect(() => {
        if (allRooms.length > 0) {
            console.log('🔄 allRooms state updated:', allRooms.length, 'rooms');
            const room101 = allRooms.find(room => room.room_number === '101');
            if (room101) {
                console.log('🔄 Room 101 in allRooms state:', {
                    availability_status: room101.availability_status,
                    is_bookable: room101.is_bookable,
                    current_booking: room101.current_booking
                });
            } else {
                console.log('🔄 Room 101 not found in allRooms state');
            }
        }
    }, [allRooms]);

    // Effect to handle owner reference changes
    useEffect(() => {
        if (formData.owner_reference) {
            // When owner reference is checked, reset payment fields
            setFormData(prev => ({
                ...prev,
                initial_payment: 0,
                payment_required: false,
                payment_status: 'referred_by_owner'
            }));
            console.log('Owner reference checked - payment fields reset');
        } else {
            // When owner reference is unchecked, restore payment fields
            setFormData(prev => ({
                ...prev,
                payment_required: true,
                payment_status: 'pending'
            }));
            console.log('Owner reference unchecked - payment fields restored');
        }
    }, [formData.owner_reference]);

    // Handle guestId parameter for editing existing guest
    useEffect(() => {
        if (guestId) {
            // TODO: Load existing guest data if editing
            console.log('Loading guest data for ID:', guestId);
        }
    }, [guestId]);

    const checkAvailability = async (forceRefresh = false) => {
        setLoading(true);
        setError('');
        try {
            // Add cache busting parameter if force refresh is requested
            const cacheBustParam = forceRefresh ? { t: Date.now() } : {};
            // Handle case where dates might not be set yet
            if (!formData.check_in_date || !formData.check_out_date) {
                console.log('Dates not set yet, loading all rooms without date filtering...');
                // Load all rooms without date filtering
                const availabilityResponse = await axios.get(buildApiUrl('rooms/getRoomAvailability.php'), {
                    params: { 
                        guests: formData.adults + formData.children,
                        ...cacheBustParam
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

            const checkIn = formatDateForAPI(formData.check_in_date);
            const checkOut = formatDateForAPI(formData.check_out_date);
            const totalGuests = formData.adults + formData.children;

            console.log('🔍 Checking availability for:', { checkIn, checkOut, totalGuests, forceRefresh });
            console.log('🔗 API URL:', buildApiUrl('rooms/getRoomAvailability.php'));
            console.log('📅 Form dates:', { 
                check_in_date: formData.check_in_date, 
                check_out_date: formData.check_out_date 
            });
            console.log('📅 Formatted dates for API:', { 
                checkIn, 
                checkOut 
            });

            // Get room availability with room numbers
            const availabilityResponse = await axios.get(buildApiUrl('rooms/getRoomAvailability.php'), {
                params: { 
                    check_in_date: checkIn, 
                    check_out_date: checkOut, 
                    guests: totalGuests,
                    ...cacheBustParam
                }
            });

            console.log('📊 Availability response:', availabilityResponse.data);

            if (availabilityResponse.data.success) {
                setRoomAvailability(availabilityResponse.data.data);
                setAllRooms(availabilityResponse.data.data.all_rooms);
                setAvailableRooms(availabilityResponse.data.data.available_rooms);
                
                // Debug: Log Room 101 specifically
                const room101 = availabilityResponse.data.data.all_rooms.find(room => room.room_number === '101');
                if (room101) {
                    console.log('🏠 Room 101 status:', {
                        availability_status: room101.availability_status,
                        is_bookable: room101.is_bookable,
                        current_booking: room101.current_booking
                    });
                    
                    // Alert if Room 101 is not showing as occupied
                    if (room101.availability_status !== 'occupied') {
                        alert(`🚨 DEBUG: Room 101 status is "${room101.availability_status}" but should be "occupied"!`);
                    }
                } else {
                    console.log('❌ Room 101 not found in response');
                    alert('🚨 DEBUG: Room 101 not found in API response!');
                }
                
                console.log('📈 Rooms loaded:', {
                    total: availabilityResponse.data.data.all_rooms.length,
                    available: availabilityResponse.data.data.available_rooms.length
                });
                
                // Log all room statuses for debugging
                console.log('🏨 All room statuses:', availabilityResponse.data.data.all_rooms.map(room => ({
                    room: room.room_number,
                    status: room.availability_status,
                    bookable: room.is_bookable
                })));
                
                // Direct test - log the raw API response
                console.log('🔍 RAW API RESPONSE:', availabilityResponse.data);
                
                // Test Room 101 specifically
                const testRoom101 = availabilityResponse.data.data.all_rooms.find(room => room.room_number === '101');
                if (testRoom101) {
                    console.log('🧪 ROOM 101 RAW DATA:', testRoom101);
                    console.log('🧪 ROOM 101 availability_status:', testRoom101.availability_status);
                    console.log('🧪 ROOM 101 is_bookable:', testRoom101.is_bookable);
                    console.log('🧪 ROOM 101 current_booking:', testRoom101.current_booking);
                }
            } else {
                console.error('Availability API error:', availabilityResponse.data);
                setError('Failed to load room availability: ' + (availabilityResponse.data.message || 'Unknown error'));
            }

            // Get pricing from booking availability
            const pricingResponse = await axios.get(buildApiUrl('booking/check_availability.php'), {
                params: { check_in: checkIn, check_out: checkOut, guests: totalGuests }
            });

            if (pricingResponse.data.success) {
                console.log('Pricing response:', pricingResponse.data);
                console.log('Pricing data structure:', pricingResponse.data.data);
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
            // Check if this is a past date booking
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPastDate = formData.check_in_date && formData.check_in_date < today;
            
            // For past dates, allow booking any room regardless of current status
            if (isPastDate) {
                console.log('Past date booking - allowing room selection regardless of current status');
                setSelectedRoom(selectedRoomData);
                setFormData(prev => ({ 
                    ...prev, 
                    room_number: selectedRoomData.room_number 
                }));
                return;
            }
            
            // For current/future dates, check room availability
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

    // Function to manually refresh room availability
    const refreshRoomAvailability = async () => {
        console.log('Manually refreshing room availability...');
        setLoading(true);
        try {
            await checkAvailability();
            setSuccess('Room availability refreshed successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            console.error('Error refreshing room availability:', error);
            setError('Failed to refresh room availability');
        } finally {
            setLoading(false);
        }
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
        
        // Removed past date validation to allow booking past dates
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
        if (!guest_info.phone) missingFields.push('Phone');
        if (!guest_info.id_proof_number) missingFields.push('ID Proof Number');
        
        if (missingFields.length > 0) {
            setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        // Validate dates and guest count
        if (!formData.check_in_date || !formData.check_out_date) {
            setError('Please select check-in and check-out dates');
            return false;
        }
        
        if (formData.adults < 1) {
            setError('At least one adult guest is required');
            return false;
        }
        
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
            const checkIn = formatDateForAPI(formData.check_in_date);
            const checkOut = formatDateForAPI(formData.check_out_date);

            // Calculate total amount
            const totalAmount = pricing?.total_price || (selectedRoom?.price * (pricing?.nights || 1)) || 0;

            // Prepare booking data with proper payment handling for owner reference
            const bookingData = {
                ...formData,
                check_in_date: checkIn,
                check_out_date: checkOut,
                room_type: selectedRoom?.room_type_name || '', // Add room type information
                created_by: 1
            };

            // If owner reference is checked, ensure payment data is set correctly
            if (formData.owner_reference) {
                bookingData.initial_payment = 0; // No initial payment for owner reference
                bookingData.payment_required = false; // Mark as no payment required
                bookingData.payment_status = 'referred_by_owner'; // Set payment status
                console.log('Owner reference booking - setting payment data:', {
                    initial_payment: 0,
                    payment_required: false,
                    payment_status: 'referred_by_owner',
                    total_amount: totalAmount,
                    remaining_amount: 0
                });
            } else {
                // Regular booking - ensure payment data is set
                bookingData.initial_payment = formData.initial_payment || 0;
                bookingData.payment_required = true;
                bookingData.payment_status = 'pending';
                console.log('Regular booking - setting payment data:', {
                    initial_payment: formData.initial_payment || 0,
                    payment_required: true,
                    payment_status: 'pending',
                    total_amount: totalAmount,
                    remaining_amount: totalAmount - (formData.initial_payment || 0)
                });
            }

            // Debug: Log final booking data
            console.log('Submitting booking with final data:', {
                owner_reference: formData.owner_reference,
                initial_payment: bookingData.initial_payment,
                payment_method: bookingData.payment_method,
                payment_required: bookingData.payment_required,
                payment_status: bookingData.payment_status,
                pricing: pricing,
                selectedRoom: selectedRoom,
                total_amount: totalAmount,
                room_type: bookingData.room_type,
                room_number: bookingData.room_number,
                check_in_date: bookingData.check_in_date,
                check_out_date: bookingData.check_out_date
            });

            const response = await axios.post(buildApiUrl('booking/create_booking.php'), bookingData);

            if (response.data.success) {
                // Navigate to booking confirmation page
                navigate(`/reception/booking-confirmation/${response.data.data.booking_id}`);
            } else {
                setError(response.data.message);
            }
        } catch (error) {
            console.error('Booking submission error:', error);
            setError('Error creating booking: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Calculate remaining amount based on owner reference
    const calculateRemainingAmount = () => {
        if (formData.owner_reference) {
            return 0; // No remaining amount for owner reference bookings
        }
        
        const totalAmount = pricing?.total_price || (selectedRoom?.price * (pricing?.nights || 1)) || 0;
        const initialPayment = formData.initial_payment || 0;
        return Math.max(0, totalAmount - initialPayment);
    };

    // Handle checkout functionality
    const handleCheckout = async () => {
        if (!selectedRoom || !formData.room_number) {
            setError('Please select a room first');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const checkoutData = {
                room_number: formData.room_number,
                check_out_date: getTodayString(),
                checkout_reason: 'Guest checkout'
            };

            console.log('Processing checkout for room:', checkoutData);

            const response = await axios.post(buildApiUrl('reception/checkout_guest.php'), checkoutData);

            if (response.data.success) {
                setSuccess('Guest checked out successfully! Room is now available.');
                
                // Clear the selected room
                setSelectedRoom(null);
                setFormData(prev => ({ ...prev, room_number: '' }));
                
                // Refresh room availability data
                console.log('Refreshing room availability after checkout...');
                await checkAvailability();
                
                // Verify that the room is now available
                const refreshedRooms = await axios.get(buildApiUrl('rooms/getRoomAvailability.php'), {
                    params: { 
                                        check_in_date: formData.check_in_date ? formatDateForAPI(formData.check_in_date) : getTodayString(),
                check_out_date: formData.check_out_date ? formatDateForAPI(formData.check_out_date) : getTomorrowString(), 
                        guests: formData.adults + formData.children,
                        t: Date.now() // Cache busting
                    }
                });
                
                if (refreshedRooms.data.success) {
                    const checkedOutRoom = refreshedRooms.data.data.all_rooms.find(room => room.room_number === checkoutData.room_number);
                    if (checkedOutRoom && checkedOutRoom.availability_status === 'available') {
                        setSuccess('Guest checked out successfully! Room ' + checkoutData.room_number + ' is now available for booking.');
                        console.log('Room status verified as available after checkout');
                    } else {
                        setSuccess('Guest checked out successfully! Please refresh room availability to see updated status.');
                        console.log('Room status not yet updated, may need manual refresh');
                    }
                }
                
                // Show success message for longer
                setTimeout(() => {
                    setSuccess('');
                }, 8000);
                
                console.log('Room availability refreshed after checkout');
            } else {
                setError(response.data.message || 'Checkout failed');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setError('Error processing checkout: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className={`space-y-6 transition-all duration-500 ${isAnimating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
            <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Guest Information</h3>
                <p className="text-gray-600">Please provide the guest's personal details</p>
                
                {/* Returning Guest Indicator */}
                {isReturningGuest && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                        <div className="flex items-center justify-center space-x-2">
                            <span className="text-green-600 text-lg">👋</span>
                            <span className="text-sm font-bold text-green-800">
                                Returning Guest Detected
                            </span>
                            <span className="text-green-600 text-lg">✓</span>
                        </div>
                        <p className="text-xs text-green-700 text-center mt-1">
                            Previous guest details have been auto-filled
                        </p>
                    </div>
                )}
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
                        label="Email Address (Optional)"
                        value={formData.guest_info.email}
                        onChange={(value) => handleInputChange('guest_info.email', value)}
                        type="email"
                        required={false}
                        validation={(value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                        💡 Email is optional - you can book without providing an email address
                    </p>
                </Card3D>
                
                <Card3D cardId="phone" className="p-6">
                    <div className="relative">
                        <FloatingLabelInput
                            label="Phone Number"
                            value={formData.guest_info.phone}
                            onChange={(value) => {
                                console.log('Phone number changed:', value);
                                handleInputChange('guest_info.phone', value);
                                // Fetch suggestions when phone number changes
                                if (value.length >= 3) {
                                    console.log('Fetching suggestions for:', value);
                                    fetchPhoneSuggestions(value);
                                    setShowPhoneSuggestions(true);
                                } else {
                                    setShowPhoneSuggestions(false);
                                    setPhoneSuggestions([]);
                                    // Reset returning guest flag if phone number is cleared
                                    if (value.length === 0) {
                                        setIsReturningGuest(false);
                                    }
                                }
                            }}
                            onFocus={() => {
                                if (formData.guest_info.phone.length >= 3) {
                                    setShowPhoneSuggestions(true);
                                }
                            }}
                            onBlur={() => {
                                // Delay hiding suggestions to allow clicking on them
                                setTimeout(() => setShowPhoneSuggestions(false), 200);
                            }}
                            type="tel"
                            required={true}
                            validation={(value) => value.length >= 10}
                        />
                        
                        {/* Guest Suggestions Dropdown */}
                        {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="p-2 bg-blue-50 border-b border-gray-200">
                                    <p className="text-xs font-medium text-blue-800">
                                        Previous guests with this phone number:
                                    </p>
                                </div>
                                {phoneSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('Suggestion clicked:', suggestion);
                                            
                                            // Auto-fill all guest details from suggestion
                                            setFormData(prev => {
                                                const newFormData = {
                                                    ...prev,
                                                    guest_info: {
                                                        ...prev.guest_info,
                                                        first_name: suggestion.first_name || '',
                                                        last_name: suggestion.last_name || '',
                                                        email: suggestion.email || '',
                                                        phone: suggestion.phone,
                                                        address: suggestion.address || '',
                                                        id_proof_type: suggestion.id_proof_type || 'passport',
                                                        id_proof_number: suggestion.id_proof_number || ''
                                                    }
                                                };
                                                console.log('Updated form data:', newFormData);
                                                return newFormData;
                                            });
                                            setShowPhoneSuggestions(false);
                                            setPhoneSuggestions([]);
                                            setIsReturningGuest(true);
                                            
                                            // Show success message for returning guest
                                            setSuccess(`Welcome back, ${suggestion.first_name}! Your details have been auto-filled.`);
                                            setTimeout(() => setSuccess(''), 5000);
                                            
                                            // Force a re-render to ensure the form updates
                                            setTimeout(() => {
                                                console.log('Current form data after update:', formData);
                                            }, 100);
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{suggestion.name}</p>
                                                <p className="text-sm text-gray-600">{suggestion.phone}</p>
                                                {suggestion.email && (
                                                    <p className="text-xs text-gray-500">{suggestion.email}</p>
                                                )}
                                            </div>
                                            <div className="text-blue-600 text-sm">
                                                <span className="bg-blue-100 px-2 py-1 rounded-full text-xs">
                                                    Returning Guest
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                            <button
                                onClick={refreshRoomAvailability}
                                className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                            >
                                Refresh Rooms
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
                        value={formData.check_in_date ? formatDateForInput(formData.check_in_date) : ''}
                        onChange={(e) => {
                            console.log('Check-in date changed:', e.target.value);
                            if (e.target.value) {
                                const selectedDate = new Date(e.target.value);
                                selectedDate.setHours(0, 0, 0, 0);
                                handleInputChange('check_in_date', selectedDate);
                            } else {
                                handleInputChange('check_in_date', null);
                            }
                        }}
                        onBlur={(e) => {
                            console.log('Check-in date blur:', e.target.value);
                            if (!e.target.value) {
                                console.error('Check-in date is required');
                            }
                        }}
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
                        value={formData.check_out_date ? formatDateForInput(formData.check_out_date) : ''}
                        onChange={(e) => {
                            console.log('Check-out date changed:', e.target.value);
                            if (e.target.value) {
                                const selectedDate = new Date(e.target.value);
                                selectedDate.setHours(0, 0, 0, 0);
                                handleInputChange('check_out_date', selectedDate);
                            } else {
                                handleInputChange('check_out_date', null);
                            }
                        }}
                        onBlur={(e) => {
                            console.log('Check-out date blur:', e.target.value);
                            if (!e.target.value) {
                                console.error('Check-out date is required');
                            }
                        }}

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
                            onClick={() => checkAvailability(true)} 
                            className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        >
                            Refresh Rooms
                        </button>
                        <button 
                            onClick={() => {
                                console.log('🔄 FORCE REFRESH CLICKED');
                                checkAvailability(true);
                            }} 
                            className="ml-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 font-bold"
                        >
                            🔄 FORCE REFRESH
                        </button>
                        
                        {/* Room 101 Status Debug */}
                        {allRooms.length > 0 && (() => {
                            const room101 = allRooms.find(room => room.room_number === '101');
                            return room101 ? (
                                <div className="mt-2 p-3 bg-red-100 border-2 border-red-400 rounded">
                                    <strong className="text-red-800">🚨 ROOM 101 DEBUG (16-17 Sep):</strong><br/>
                                    <span className="text-red-700">
                                        Status: <strong>{room101.availability_status}</strong><br/>
                                        Bookable: <strong>{room101.is_bookable ? 'Yes' : 'No'}</strong><br/>
                                        Current Booking: <strong>{room101.current_booking ? 'Yes' : 'No'}</strong><br/>
                                        {room101.current_booking && (
                                            <>
                                                Checkout Date: <strong>{room101.current_booking.check_out_date}</strong><br/>
                                                Checkout Time: <strong>{room101.current_booking.check_out_time}</strong>
                                            </>
                                        )}
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-2 p-2 bg-orange-100 border border-orange-300 rounded">
                                    <strong>⚠️ Room 101 not found in allRooms array</strong>
                                </div>
                            );
                        })()}
                    </div>
                    {/* Enhanced Room Selection */}
                    <div className="mt-1 space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {loading ? (
                            <div className="text-center py-4 text-gray-500">Loading rooms...</div>
                        ) : allRooms.length > 0 ? (
                            allRooms.map((room) => (
                                <div
                                    key={room.room_number}
                                    onClick={() => room.is_bookable ? handleRoomNumberChange(room.room_number) : null}
                                    className={`
                                        p-3 rounded-lg border cursor-pointer transition-all
                                        ${room.is_bookable 
                                            ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50' 
                                            : 'border-red-200 bg-red-50 cursor-not-allowed'
                                        }
                                        ${formData.room_number === room.room_number 
                                            ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-200' 
                                            : ''
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-gray-900">
                                                    Room {room.room_number}
                                                </h4>
                                                <span className={`
                                                    px-2 py-1 rounded-full text-xs font-medium
                                                    ${room.availability_status === 'available' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : room.availability_status === 'occupied'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                    }
                                                `}>
                                                    {room.availability_status === 'available' ? 'Available' : 
                                                     room.availability_status === 'occupied' ? 'Occupied' :
                                                     room.availability_status === 'booked' ? 'Booked' :
                                                     room.availability_status === 'prebooked' ? 'Pre-booked' :
                                                     room.availability_status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">{room.room_type_name}</p>
                                            <p className="text-xs text-gray-500">Floor {room.floor} • {room.capacity} guests</p>
                                            
                                            {/* Guest Name - Show for booked and occupied rooms */}
                                            {(room.availability_status === 'booked' || room.availability_status === 'occupied') && room.current_guest_name && (
                                                <p className="text-sm text-gray-700 font-semibold mt-1">
                                                    Guest: {room.current_guest_name}
                                                </p>
                                            )}
                                            
                                            {/* Checkout Information */}
                                            {room.current_booking && (
                                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                                                    <div className="flex items-center gap-1 text-red-700">
                                                        <span>🕐</span>
                                                        <span>Checkout on {new Date(room.current_booking.check_out_date).toLocaleDateString('en-GB', { 
                                                            day: '2-digit', 
                                                            month: 'short' 
                                                        })} at {room.current_booking.check_out_time || '12:00 PM'}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-600">
                                                ₹{room.price.toLocaleString()}
                                            </div>
                                            <div className="text-sm text-gray-500">per night</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-gray-500">No rooms available</div>
                        )}
                    </div>
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

    const renderStep3 = () => {
        // Group rooms by floor
        const roomsByFloor = availableRooms.reduce((acc, room) => {
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
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Room Selection</h3>
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Checking availability...</p>
                    </div>
                ) : availableRooms.length > 0 ? (
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
                                    {roomsByFloor[floor].map((room) => (
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
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold text-gray-900">
                                                        {room.room_type_name}
                                                    </h3>
                                                    <p className="text-gray-600 text-xs">Room {room.room_number}</p>
                                                    {room.pricing_info && room.pricing_info.custom_price_used && (
                                                        <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mt-1">
                                                            {room.pricing_info.price_source === 'room_type_custom' ? (
                                                                <span>Custom Room Type Price: ₹{room.pricing_info.room_type_custom_price}/night</span>
                                                            ) : (
                                                                <span>Custom Room Price: ₹{room.pricing_info.room_custom_price}/night</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {room.description && (
                                                        <p className="text-sm text-gray-600 mt-1">{room.description}</p>
                                                    )}
                                                    {room.amenities && Array.isArray(room.amenities) && room.amenities.length > 0 && (
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
                                                <div className="text-right ml-4">
                                                    <div className="text-2xl font-bold text-blue-600">
                                                        ₹{room.price}/night
                                                    </div>
                                                    {room.pricing_info && room.pricing_info.custom_price_used && (
                                                        <div className="text-sm text-gray-400 line-through">
                                                            Standard: ₹{room.pricing_info.standard_price}/night
                                                        </div>
                                                    )}
                                                    {room.pricing_info && room.pricing_info.extra_guest_charge > 0 && (
                                                        <div className="text-xs text-orange-600">
                                                            +₹{room.pricing_info.extra_guest_charge} extra guests
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
    };

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
                            Contact Email <span className="text-gray-500 text-xs">(optional)</span>
                        </label>
                        <input
                            type="email"
                            id="contact_email"
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter contact email address"
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
                    <strong>Note:</strong> Corporate information fields are required for business bookings, except Contact Email which is optional. 
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
                                        {(() => {
                                          const sourceMap = {
                                            'corporate': '🏢 Corporate',
                                            'MMT': '🌐 MakeMyTrip',
                                            'Agoda': '🌐 Agoda',
                                            'Travel Plus': '🌐 Travel Plus',
                                            'Phone Call Booking': '📞 Phone Call Booking',
                                            'walk_in': '🚶 Walk In'
                                          };
                                          return sourceMap[formData.booking_source] || formData.booking_source || 'N/A';
                                        })()}
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
                                {selectedRoom.amenities && Array.isArray(selectedRoom.amenities) && selectedRoom.amenities.length > 0 && (
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
                    
                    {/* Payment Information Section */}
                    <div className="border-t pt-4 mt-4">
                        <h4 className="font-medium text-gray-900 mb-4">Payment Information</h4>
                        
                        {formData.owner_reference && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <span className="text-green-600 text-lg">🏨</span>
                                    <span className="text-sm font-medium text-green-800">
                                        Owner Reference Booking - Special Payment Terms
                                    </span>
                                </div>
                                <p className="text-xs text-green-700 mt-1 ml-6">
                                    This booking is approved by the hotel owner. No payment is required and financial details will show "No payment required".
                                </p>
                            </div>
                        )}
                    
                    {/* Owner Reference Checkbox */}
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id="owner_reference"
                                    checked={formData.owner_reference}
                                    onChange={(e) => setFormData({...formData, owner_reference: e.target.checked})}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <label htmlFor="owner_reference" className="text-sm font-medium text-yellow-800">
                                    🏨 Referenced by Owner of the Hotel
                                </label>
                            </div>
                            <p className="text-xs text-yellow-700 mt-2 ml-7">
                                Check this box if this booking is approved by the hotel owner. No payment will be required.
                            </p>
                            {formData.owner_reference && (
                                <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-green-600">✓</span>
                                        <span className="text-sm font-medium text-green-800">
                                            Owner Reference Active - No Payment Required
                                        </span>
                                    </div>
                                    <p className="text-xs text-green-700 mt-1 ml-6">
                                        Financial details will show "No payment required" instead of due amounts.
                                    </p>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {!formData.owner_reference ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Initial Payment Amount
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.initial_payment}
                                            onChange={(e) => setFormData({...formData, initial_payment: parseFloat(e.target.value) || 0})}
                                            min="0"
                                            max={pricing?.total_price || (selectedRoom?.price * (pricing?.nights || 1)) || 0}
                                            step="0.01"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Enter initial payment amount"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enter the amount to be paid now (0 for no initial payment)
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Payment Method
                                        </label>
                                        <select
                                            value={formData.payment_method}
                                            onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="cash">Cash</option>
                                            <option value="credit_card">Credit Card</option>
                                            <option value="debit_card">Debit Card</option>
                                            <option value="upi">UPI</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="online_wallet">Online Wallet</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className="md:col-span-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-green-600 text-2xl">🏨</span>
                                        <div>
                                            <h4 className="text-lg font-bold text-green-800">Owner Reference Booking</h4>
                                            <p className="text-sm text-green-700">
                                                No payment fields are required for owner reference bookings. 
                                                The hotel owner has approved this booking without payment requirement.
                                            </p>
                                            <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                                                <span className="text-sm font-bold text-green-800">
                                                    ✓ Payment Status: NOT REQUIRED
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Payment Summary */}
                        {pricing && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                {formData.owner_reference ? (
                                    <div className="text-center">
                                        <div className="text-lg font-bold text-green-600 mb-2">
                                            🏨 Owner Reference Booking
                                        </div>
                                        <div className="text-sm text-green-700">
                                            No payment required - This booking is approved by the hotel owner
                                        </div>
                                        <div className="mt-3 p-3 bg-green-100 rounded border border-green-200">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium text-green-800">Total Amount:</span>
                                                    <span className="ml-2 text-lg font-bold text-green-600">
                                                        ₹{pricing.total_price || (selectedRoom?.price * (pricing?.nights || 1)) || 0}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-green-800">Initial Payment:</span>
                                                    <span className="ml-2 text-lg font-bold text-green-600">₹0</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-green-800">Remaining Due:</span>
                                                    <span className="ml-2 text-lg font-bold text-green-600">₹0</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 p-2 bg-green-200 rounded border border-green-300">
                                                <span className="text-sm font-bold text-green-800">✓ NO PAYMENT REQUIRED</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium text-gray-700">Total Amount:</span>
                                            <span className="ml-2 text-lg font-bold text-blue-600">
                                                ₹{pricing.total_price || (selectedRoom?.price * (pricing?.nights || 1)) || 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Initial Payment:</span>
                                            <span className="ml-2 text-lg font-bold text-green-600">₹{formData.initial_payment}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium text-gray-700">Remaining Due:</span>
                                            <span className="ml-2 text-lg font-bold text-red-600">
                                                ₹{calculateRemainingAmount()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Checkout Button */}
                    <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 className="font-medium text-orange-900 mb-3">Guest Checkout</h4>
                        <p className="text-sm text-orange-700 mb-3">
                            If you need to checkout a guest from this room, click the checkout button below.
                        </p>
                        <button
                            type="button"
                            onClick={handleCheckout}
                            disabled={loading || !selectedRoom}
                            className={`px-6 py-3 rounded-md text-sm font-medium ${
                                loading || !selectedRoom ? 
                                'bg-gray-400 text-gray-200 cursor-not-allowed' : 
                                'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                        >
                            {loading ? 'Processing...' : 'Checkout Guest'}
                        </button>
                        <p className="text-xs text-orange-600 mt-2">
                            This will mark the guest as checked out and update room status.
                        </p>
                        
                        {/* Checkout Process Info */}
                        <div className="mt-3 p-2 bg-orange-100 border border-orange-300 rounded text-xs">
                            <p className="text-orange-800"><strong>Checkout Process:</strong></p>
                            <ul className="text-orange-700 mt-1 ml-3 list-disc">
                                <li>Guest will be marked as checked out</li>
                                <li>Room status will be updated to available</li>
                                <li>Room availability will be automatically refreshed</li>
                                <li>Room will appear in the available rooms list</li>
                            </ul>
                        </div>
                        
                        {/* Troubleshooting */}
                        {success && success.includes('checkout') && (
                            <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-xs">
                                <p className="text-green-800"><strong>✓ Checkout Completed!</strong></p>
                                <p className="text-green-700">If room doesn't appear as available, use the "Refresh Rooms" button in Step 2.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1: return renderStep1(); // Guest Information
            case 2: return renderStep2(); // Dates & Guest Count
            case 3: return renderStep3(); // Room Selection
            case 4: return renderStep4(); // Corporate Information
            case 5: return renderStep5(); // Confirmation
            default: return renderStep1();
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
                    
                    {/* Owner Reference Status Indicator */}
                    {formData.owner_reference && (
                        <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg max-w-md mx-auto">
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-green-600 text-lg">🏨</span>
                                <span className="text-sm font-bold text-green-800">
                                    Owner Reference Active
                                </span>
                                <span className="text-green-600 text-lg">✓</span>
                            </div>
                            <p className="text-xs text-green-700 text-center mt-1">
                                No payment required - This booking is approved by the hotel owner
                            </p>
                        </div>
                    )}
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
                        
                        {/* Room Status Debug Info */}
                        {selectedRoom && (
                            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                                <p><strong>Selected Room:</strong> {selectedRoom.room_number} - {selectedRoom.room_type_name}</p>
                                <p><strong>Status:</strong> {selectedRoom.room_status || 'Unknown'} | <strong>Availability:</strong> {selectedRoom.availability_status || 'Unknown'}</p>
                                <p><strong>Price:</strong> ₹{selectedRoom.price}/night</p>
                            </div>
                        )}
                        
                        {/* Checkout Status */}
                        {success && success.includes('checkout') && (
                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                <p className="text-green-800"><strong>✓ Checkout Successful!</strong></p>
                                <p className="text-green-700">Room availability has been refreshed. Check the room dropdown above.</p>
                            </div>
                        )}
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
                            {/* Checkout Button - Show on all steps when room is selected */}
                            {selectedRoom && (
                                <button
                                    type="button"
                                    onClick={handleCheckout}
                                    disabled={loading}
                                    className="px-6 py-2 bg-orange-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-orange-700"
                                >
                                    {loading ? 'Processing...' : 'Checkout Guest'}
                                </button>
                            )}
                            
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
