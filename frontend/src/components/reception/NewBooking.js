import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { buildApiUrl } from '../../config/api';
import BookingSuccessModal from './BookingSuccessModal';
import GlobalEmailSuccess from './GlobalEmailSuccess';
import OptimizedComponent from '../common/OptimizedComponent';
import { useOptimizedLoading } from '../../hooks/useOptimizedAnimation';
import { useSearchParams } from 'react-router-dom';
import { getTodayString, getTomorrowString } from '../../utils/dateUtils';
import './NewBooking.css';

const NewBooking = React.memo(() => {
  const [searchParams] = useSearchParams();
  
  // Helper function to get current real-time dates (defined before useState)


  const [formData, setFormData] = useState({
    // Guest Information
    guest_name: '',
    email: '',
    phone: '',
    address: '',
    
    // Corporate Information (Optional)
    company_name: '',
    gst_number: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    billing_address: '',
    
    // Booking Details
    check_in_date: getTodayString(),
    check_out_date: getTomorrowString(),
    check_in_time: '',
    check_out_time: '',
    // 12-hour format time fields for past bookings
    check_in_hour: '',
    check_in_minute: '',
    check_in_ampm: 'AM',
    check_out_hour: '',
    check_out_minute: '',
    check_out_ampm: 'AM',
    room_type: '',
    room_number: '',
    adults: 1,
    children: 0,
    tariff: 0,
    number_of_days: 1,
    
    // Additional Details
    booking_source: '',
    plan_type: 'EP',
    payment_type: '',
    paid_amount: '',
    id_proof_type: 'Aadhar Number',
    id_proof_number: '',
    notes: '',
    owner_reference: false, // New state for owner reference checkbox
    payment_required: true, // New state for payment requirement
    payment_received: false // New state for payment received checkbox
  });

  const [fileUploads, setFileUploads] = useState({
    customer_photo: null,
    id_proof_photo: null
  });

  const [fileInputKey, setFileInputKey] = useState(0); // Add key for file inputs

  const [options, setOptions] = useState({
    booking_sources: {},
    plan_types: {},
    room_types: {},
    id_proof_types: {},
    payment_types: {}
  });

  const [roomAvailability, setRoomAvailability] = useState([]);

  // Handle URL parameters from "Book Now" button
  useEffect(() => {
    const roomNumber = searchParams.get('room');
    const roomTypeId = searchParams.get('room_type_id');
    const roomTypeName = searchParams.get('room_type_name');
    const checkInDate = searchParams.get('check_in');
    const checkOutDate = searchParams.get('check_out');
    const guests = searchParams.get('guests');

    if (roomNumber || checkInDate || checkOutDate || guests || roomTypeId || roomTypeName) {
      console.log('URL parameters detected in reception:', { roomNumber, roomTypeId, roomTypeName, checkInDate, checkOutDate, guests });
      
      setFormData(prev => ({
        ...prev,
        room_number: roomNumber || prev.room_number,
        room_type: roomTypeId || prev.room_type,
        check_in_date: checkInDate || prev.check_in_date,
        check_out_date: checkOutDate || prev.check_out_date,
        adults: guests ? parseInt(guests) : prev.adults
      }));
    }
  }, [searchParams]);

  // Handle room type setting after room types are loaded
  useEffect(() => {
    const roomTypeId = searchParams.get('room_type_id');
    if (roomTypeId && Object.keys(options.room_types).length > 0) {
      console.log('Setting room type after room types loaded:', { roomTypeId, availableTypes: options.room_types });
      setFormData(prev => ({
        ...prev,
        room_type: roomTypeId
      }));
    }
  }, [options.room_types, searchParams]);
  const [loading, setLoading] = useState(false);
  const [showCorporate, setShowCorporate] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [bookingSummary, setBookingSummary] = useState(null);
  const [allRooms, setAllRooms] = useState([]); // New state for all rooms
  const [showRoomSelector, setShowRoomSelector] = useState(false); // New state for room selector popup
  
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  
  // Global email success message state
  const [showGlobalEmailSuccess, setShowGlobalEmailSuccess] = useState(false);

  // Guest suggestion states
  const [guestSuggestions, setGuestSuggestions] = useState([]);
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [corporateSuggestions, setCorporateSuggestions] = useState([]);
  const [showCorporateSuggestions, setShowCorporateSuggestions] = useState(false);
  const [isDateSyncing, setIsDateSyncing] = useState(false);

  // Date synchronization removed to allow past date bookings
  const [tariffManuallySet, setTariffManuallySet] = useState(false);

  // Load Razorpay script for UPI payments
  useEffect(() => {
    // Check if Razorpay script already exists
    let existingScript = document.querySelector('script[src*="razorpay"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay script loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
      };
      document.body.appendChild(script);
    }
  }, []);

  // Calculate number of days when dates change
  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      const diffTime = checkOut - checkIn;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFormData(prev => ({
        ...prev,
        number_of_days: diffDays > 0 ? diffDays : 1
      }));
    }
  }, [formData.check_in_date, formData.check_out_date]);

  // Date validation removed to allow past date bookings

  // Close room selector when clicking outside
  const handleClickOutside = useCallback((event) => {
    // Don't close if clicking on suggestion items
    if (event.target.closest('.suggestion-item')) {
      return;
    }
    
    if (showRoomSelector && !event.target.closest('.room-selector-container')) {
      setShowRoomSelector(false);
    }
    if (showGuestSuggestions && !event.target.closest('.guest-suggestions-container')) {
      setShowGuestSuggestions(false);
      setGuestSuggestions([]);
    }
    if (showCorporateSuggestions && !event.target.closest('.corporate-suggestions-container')) {
      setShowCorporateSuggestions(false);
      setCorporateSuggestions([]);
    }
  }, [showRoomSelector, showGuestSuggestions, showCorporateSuggestions]);

  const handleEscapeKey = useCallback((event) => {
    if (event.key === 'Escape') {
      if (showRoomSelector) {
        setShowRoomSelector(false);
      }
      if (showGuestSuggestions) {
        setShowGuestSuggestions(false);
      }
      if (showCorporateSuggestions) {
        setShowCorporateSuggestions(false);
      }
    }
  }, [showRoomSelector, showGuestSuggestions, showCorporateSuggestions]);

  useEffect(() => {
    if (showRoomSelector || showGuestSuggestions || showCorporateSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showRoomSelector, showGuestSuggestions, showCorporateSuggestions, handleClickOutside, handleEscapeKey]);

  // Cleanup debounce timer on component unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Ensure all form values are always defined
  useEffect(() => {
    setFormData(prev => {
      const updated = { ...prev };
      // Ensure all string fields are never undefined
      Object.keys(updated).forEach(key => {
        if (typeof updated[key] === 'string' && (updated[key] === undefined || updated[key] === null)) {
          updated[key] = '';
        }
        if (typeof updated[key] === 'number' && (updated[key] === undefined || updated[key] === null)) {
          updated[key] = 0;
        }
      });
      return updated;
    });
  }, []);

  // Memoized handlers for modal actions
  const closeSummary = useCallback(() => setShowSummary(false), []);
  const toggleCorporate = useCallback((checked) => {
    setShowCorporate(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, booking_source: 'corporate' }));
    } else {
      // Don't automatically set to walk_in, let user choose
      setFormData(prev => ({ ...prev, booking_source: '' }));
    }
  }, []);
  const openRoomSelector = useCallback(() => setShowRoomSelector(true), []);
  const closeRoomSelector = useCallback(() => setShowRoomSelector(false), []);

  // Fetch guest suggestions based on phone number
  const fetchGuestSuggestions = useCallback(async (phone) => {
    if (!phone || phone.length < 3) {
      setGuestSuggestions([]);
      setShowGuestSuggestions(false);
      return;
    }

    try {
      // Include checked_out guests and all historical bookings to get complete guest history
      const apiUrl = `${buildApiUrl('reception/guest_search_api.php')}?action=search&type=phone&term=${phone}&include_checked_out=true&include_future_bookings=true`;
      
      console.log('Fetching guest suggestions for phone:', phone);
      console.log('API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Guest suggestions response:', data);
      
      if (data.success && data.data && data.data.length > 0) {
        console.log('Found guest suggestions:', data.data.length);
        setGuestSuggestions(data.data);
        setShowGuestSuggestions(true);
      } else {
        console.log('No guest suggestions found for phone:', phone);
        setGuestSuggestions([]);
        setShowGuestSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching guest suggestions:', error);
      setGuestSuggestions([]);
      setShowGuestSuggestions(false);
    }
  }, []);

  // Fetch corporate suggestions based on phone number and company name
  const fetchCorporateSuggestions = useCallback(async (phone, companyName = '') => {
    if (!phone || phone.length < 3) {
      setCorporateSuggestions([]);
      setShowCorporateSuggestions(false);
      return;
    }

    try {
      let searchTerm = phone;
      let searchType = 'phone';
      
      if (companyName && companyName.length > 2) {
        searchTerm = companyName;
        searchType = 'company';
      }

      // Include checked_out guests to get guest history
      const response = await fetch(`${buildApiUrl('reception/guest_search_api.php')}?action=search&type=${searchType}&term=${searchTerm}&corporate=corporate&include_checked_out=true`);
      const data = await response.json();
      
      if (data.success && data.data && data.data.length > 0) {
        setCorporateSuggestions(data.data);
        setShowCorporateSuggestions(true);
      } else {
        setCorporateSuggestions([]);
        setShowCorporateSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching corporate suggestions:', error);
      setCorporateSuggestions([]);
      setShowCorporateSuggestions(false);
    }
  }, []);

  // Auto-fill form with guest data
  const fillGuestData = useCallback((guest) => {
    console.log('fillGuestData called with guest:', guest);
    
    const guestName = guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim() || '';
    console.log('Setting guest name to:', guestName);
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        guest_name: guestName,
        email: guest.email || '',
        phone: guest.phone || '',
        address: guest.address || '',
        id_proof_type: guest.id_proof_type || 'Aadhar Number',
        id_proof_number: guest.id_proof_number || '',
        // Also fill corporate fields if they exist
        company_name: guest.company_name || '',
        gst_number: guest.gst_number || '',
        contact_person: guest.contact_person || '',
        contact_phone: guest.contact_phone || '',
        contact_email: guest.contact_email || '',
        billing_address: guest.billing_address || '',
        // Set booking source to corporate if company data exists and no source is selected
        booking_source: guest.company_name && !prev.booking_source ? 'corporate' : prev.booking_source
      };
      console.log('New form data:', newFormData);
      return newFormData;
    });
    
    // Auto-enable corporate booking if company data exists
    if (guest.company_name) {
      console.log('Enabling corporate mode for company:', guest.company_name);
      setShowCorporate(true);
    }
    
    // Hide suggestions after filling
    setShowGuestSuggestions(false);
    setGuestSuggestions([]);
    
    // Show success message
    toast.success(`Guest data filled: ${guestName}`);
  }, []);

  // Auto-fill form with corporate data
  const fillCorporateData = useCallback((guest) => {
    setFormData(prev => ({
      ...prev,
      guest_name: guest.full_name || `${guest.first_name} ${guest.last_name}`.trim() || '',
      email: guest.email || '',
      phone: guest.phone || '',
      address: guest.address || '',
      id_proof_type: guest.id_proof_type || 'Aadhar Number',
      id_proof_number: guest.id_proof_number || '',
      company_name: guest.company_name || '',
      gst_number: guest.gst_number || '',
      contact_person: guest.contact_person || '',
      contact_phone: guest.contact_phone || '',
      contact_email: guest.contact_email || '',
      billing_address: guest.billing_address || ''
    }));
    
    // Auto-enable corporate booking if company data exists
    if (guest.company_name) {
      setShowCorporate(true);
      setFormData(prev => ({ ...prev, booking_source: 'corporate' }));
    }
    
    setShowCorporateSuggestions(false);
    setCorporateSuggestions([]);
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [sourcesRes, plansRes, roomTypesRes, idProofRes, paymentTypesRes] = await Promise.all([
        fetch(`${buildApiUrl('reception/new_booking_api.php')}?action=sources`),
        fetch(`${buildApiUrl('reception/new_booking_api.php')}?action=plans`),
        fetch(`${buildApiUrl('reception/new_booking_api.php')}?action=room_types`),
        fetch(`${buildApiUrl('reception/new_booking_api.php')}?action=id_proof_types`),
        fetch(`${buildApiUrl('reception/new_booking_api.php')}?action=payment_types`)
      ]);

      const sources = await sourcesRes.json();
      const plans = await plansRes.json();
      const roomTypes = await roomTypesRes.json();
      const idProof = await idProofRes.json();
      const paymentTypes = await paymentTypesRes.json();

      if (sources.success && plans.success && roomTypes.success && idProof.success && paymentTypes.success) {
        setOptions({
          booking_sources: sources.data,
          plan_types: plans.data,
          room_types: roomTypes.data,
          id_proof_types: idProof.data,
          payment_types: paymentTypes.data
        });
      }
    } catch (error) {
      console.error('Error fetching options:', error);
      toast.error('Error loading form options');
    }
  }, []);

  const fetchAllRooms = useCallback(async (checkInDate = null, checkOutDate = null) => {
    try {
      // Add cache-busting timestamp to ensure fresh data
      const timestamp = new Date().getTime();
      let url = `${buildApiUrl('reception/room_management_api.php')}?action=get_all_rooms&_t=${timestamp}`;
      
      // Add date parameters if provided
      if (checkInDate && checkOutDate) {
        url += `&check_in_date=${checkInDate}&check_out_date=${checkOutDate}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setAllRooms(data.data);
        console.log('🔄 Fetched updated room data:', data.data.length, 'rooms', 
                   checkInDate && checkOutDate ? `for dates ${checkInDate} to ${checkOutDate}` : 'for current date');
      } else {
        toast.error('Error fetching all rooms for room number selection.');
      }
    } catch (error) {
      console.error('Error fetching all rooms:', error);
      toast.error('Error fetching all rooms for room number selection.');
    }
  }, []);

  const checkRoomAvailability = useCallback(async () => {
    try {
      const response = await fetch(
        `${buildApiUrl('reception/new_booking_api.php')}?action=availability&check_in=${formData.check_in_date}&check_out=${formData.check_out_date}&room_type=${formData.room_type}`
      );
      const data = await response.json();
      
      if (data.success) {
        setRoomAvailability(data.data);
        
        // Auto-set tariff if room type is selected and rooms are available
        if (formData.room_type && data.data.length > 0) {
          // Find the first available room to set default tariff
          const firstAvailableRoom = data.data[0];
          if (firstAvailableRoom && (firstAvailableRoom.actual_price || firstAvailableRoom.base_price)) {
            setFormData(prev => ({
              ...prev,
              tariff: firstAvailableRoom.actual_price || firstAvailableRoom.base_price
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  }, [formData.check_in_date, formData.check_out_date, formData.room_type]);

  // Fetch options on component mount
  useEffect(() => {
    fetchOptions();
    fetchAllRooms(); // Fetch all rooms on mount
  }, [fetchOptions, fetchAllRooms]);

  // Check room availability when dates or room type changes
  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date && formData.room_type) {
      checkRoomAvailability();
    }
  }, [formData.check_in_date, formData.check_out_date, formData.room_type, checkRoomAvailability]);

  // Fetch rooms with date-specific availability when dates change
  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date) {
      fetchAllRooms(formData.check_in_date, formData.check_out_date);
    }
  }, [formData.check_in_date, formData.check_out_date, fetchAllRooms]);

  // Debounced input change handler to reduce re-renders
  const debounceTimerRef = useRef(null);
  
  // Optimized input change handler for fast typing
  const handleInputChange = useCallback((name, value) => {
    // Ensure value is never undefined or null
    const safeValue = value ?? '';
    
    // Update form data immediately for fast typing response
    setFormData(prev => ({
      ...prev,
      [name]: safeValue
    }));

    // Clear existing timer for API calls
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer for debounced API calls only
    debounceTimerRef.current = setTimeout(() => {
      // Reset room number when room type changes
      if (name === 'room_type') {
        setFormData(prev => ({
          ...prev,
          room_number: ''
        }));
        // Reset tariff manual flag when room type changes
        setTariffManuallySet(false);
        // Refresh room data when room type changes to ensure latest availability
        fetchAllRooms();
      }

      // Auto-update tariff when room number is selected
      if (name === 'room_number' && safeValue) {
        const selectedRoom = allRooms.find(room => room.room_number === safeValue);
        if (selectedRoom) {
          // Only auto-set tariff if it hasn't been manually entered by the user
          if (!tariffManuallySet) {
            setFormData(prev => ({
              ...prev,
              tariff: selectedRoom.actual_price || selectedRoom.base_price || 0
            }));
          }
        }
      }

      // Auto-detect corporate booking when corporate fields are filled
      if (['company_name', 'gst_number', 'contact_person', 'contact_phone', 'contact_email', 'billing_address'].includes(name)) {
        if (safeValue && !showCorporate) {
          setShowCorporate(true);
          // Only set to corporate if no booking source is selected
          setFormData(prev => ({ 
            ...prev, 
            booking_source: prev.booking_source || 'corporate' 
          }));
        }
      }

      // Fetch suggestions based on input (debounced to avoid excessive API calls)
      if (name === 'phone') {
        fetchGuestSuggestions(safeValue);
        if (showCorporate) {
          fetchCorporateSuggestions(safeValue, formData.company_name || '');
        }
      } else if (name === 'company_name' && showCorporate) {
        fetchCorporateSuggestions(formData.phone || '', safeValue);
      }
    }, 300); // Increased to 300ms for API calls only
  }, [allRooms, showCorporate, fetchGuestSuggestions, fetchCorporateSuggestions, formData.company_name, formData.phone, tariffManuallySet]);

  // Memoized input change handlers for individual fields to prevent re-renders
  const handleGuestNameChange = useCallback((e) => handleInputChange('guest_name', e.target.value), [handleInputChange]);
  const handleEmailChange = useCallback((e) => handleInputChange('email', e.target.value), [handleInputChange]);
  const handlePhoneChange = useCallback((e) => handleInputChange('phone', e.target.value), [handleInputChange]);
  const handleAddressChange = useCallback((e) => handleInputChange('address', e.target.value), [handleInputChange]);
  const handleCompanyNameChange = useCallback((e) => handleInputChange('company_name', e.target.value), [handleInputChange]);
  const handleGstNumberChange = useCallback((e) => handleInputChange('gst_number', e.target.value), [handleInputChange]);
  const handleContactPersonChange = useCallback((e) => handleInputChange('contact_person', e.target.value), [handleInputChange]);
  const handleContactPhoneChange = useCallback((e) => handleInputChange('contact_phone', e.target.value), [handleInputChange]);
  const handleContactEmailChange = useCallback((e) => handleInputChange('contact_email', e.target.value), [handleInputChange]);
  const handleBillingAddressChange = useCallback((e) => handleInputChange('billing_address', e.target.value), [handleInputChange]);
  const handleIdProofNumberChange = useCallback((e) => handleInputChange('id_proof_number', e.target.value), [handleInputChange]);
  const handleNotesChange = useCallback((e) => handleInputChange('notes', e.target.value), [handleInputChange]);
  const handlePaidAmountChange = useCallback((e) => handleInputChange('paid_amount', e.target.value), [handleInputChange]);
  const handlePlanTypeChange = useCallback((e) => handleInputChange('plan_type', e.target.value), [handleInputChange]);
  const handlePaymentTypeChange = useCallback((e) => handleInputChange('payment_type', e.target.value), [handleInputChange]);
  const handleIdProofTypeChange = useCallback((e) => handleInputChange('id_proof_type', e.target.value), [handleInputChange]);
  const handleRoomTypeChange = useCallback((e) => handleInputChange('room_type', e.target.value), [handleInputChange]);
  const handleRoomNumberChange = useCallback((e) => handleInputChange('room_number', e.target.value), [handleInputChange]);
  const handleTariffChange = useCallback((e) => {
    // Handle tariff changes specifically to prevent auto-override
    const value = parseFloat(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      tariff: value
    }));
    // Mark that tariff has been manually set by user
    setTariffManuallySet(true);
  }, []);
  const handleBookingSourceChange = useCallback((e) => {
    const newBookingSource = e.target.value;
    console.log('Booking source changed to:', newBookingSource);
    
    // Auto-set payment type to 'online' for online booking platforms
    if (['MMT', 'Agoda', 'Travel Plus'].includes(newBookingSource)) {
      console.log('Auto-setting payment type to online for:', newBookingSource);
      setFormData(prev => ({
        ...prev,
        booking_source: newBookingSource,
        payment_type: 'online'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        booking_source: newBookingSource
      }));
    }
  }, []);

  const handleFileChange = useCallback((e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Only JPEG and PNG files are allowed');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setFileUploads(prev => ({
        ...prev,
        [type]: file
      }));
    }
  }, []);



  const calculateTotal = useMemo(() => {
    return formData.tariff * formData.number_of_days;
  }, [formData.tariff, formData.number_of_days]);

  const validateForm = useCallback(() => {
    const errors = [];
    
    if (!formData.guest_name) errors.push('Guest name is required');
    if (!formData.phone) errors.push('Phone number is required');
    // Email is now optional - removed the email validation
    if (!formData.check_in_date) errors.push('Check-in date is required');
    if (!formData.check_out_date) errors.push('Check-out date is required');
    if (!formData.room_type) errors.push('Room type is required');
    if (!formData.room_number) errors.push('Room number is required');
    if (!formData.tariff) errors.push('Tariff is required');
    if (!formData.booking_source) errors.push('Booking source is required');
    if (!formData.adults) errors.push('Number of adults is required');
    
    // Validate paid amount for all booking types (but not for owner reference bookings or online booking platforms)
    if (!(formData.owner_reference || false) && !['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source)) {
      if (!formData.paid_amount || formData.paid_amount === '') {
        errors.push('Paid amount is required for all bookings');
      } else if (parseFloat(formData.paid_amount) < 0) {
        errors.push('Paid amount cannot be negative');
      } else if (parseFloat(formData.paid_amount) > calculateTotal) {
        errors.push('Paid amount cannot exceed the total booking amount');
      }
    }
    
    // Room occupancy validation removed to allow past date bookings
    
    // Date validation - allow past dates
    const checkIn = new Date(formData.check_in_date + 'T00:00:00');
    const checkOut = new Date(formData.check_out_date + 'T00:00:00');
    
    if (checkOut <= checkIn) {
      errors.push('Check-out date must be after check-in date');
    }
    
    return errors;
  }, [formData, allRooms, calculateTotal]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    console.log('Form submitted, validating...');
    console.log('Form data:', formData);
    console.log('Owner reference:', formData.owner_reference);
    console.log('Booking source:', formData.booking_source);
    console.log('Paid amount:', formData.paid_amount);
    
    const errors = validateForm();
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      errors.forEach(error => {
        toast.error(error);
      });
      return;
    }
    
    // Auto-detect corporate booking if corporate fields are filled
    const hasCorporateInfo = formData.company_name || formData.gst_number || formData.contact_person || 
                            formData.contact_phone || formData.contact_email || formData.billing_address;
    
    if (hasCorporateInfo && formData.booking_source !== 'corporate') {
      setFormData(prev => ({ ...prev, booking_source: 'corporate' }));
      setShowCorporate(true);
    }
    
    console.log('Form validation passed, creating summary...');
    // Show booking summary instead of creating booking immediately
    const summary = {
      ...formData,
      booking_source: hasCorporateInfo ? 'corporate' : formData.booking_source,
      total_amount: calculateTotal,
      paid_amount: (formData.owner_reference || false) ? calculateTotal : 
                   (['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source) ? calculateTotal : parseFloat(formData.paid_amount || 0)),
      remaining_amount: (formData.owner_reference || false) ? 0 : 
                       (['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source) ? 0 : Math.max(0, calculateTotal - parseFloat(formData.paid_amount || 0))),
      payment_type: (['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source) && (!formData.payment_type || formData.payment_type === '')) ? 'online' : formData.payment_type,
      file_uploads: fileUploads
    };
    
    console.log('Booking summary:', summary);
    setBookingSummary(summary);
    setShowSummary(true);
    console.log('showSummary set to true');
  }, [validateForm, formData, calculateTotal, fileUploads]);

  // Helper function to format prices in INR
  const formatPrice = useCallback((price) => {
    return `₹${parseFloat(price).toLocaleString('en-IN')}`;
  }, []);

  // Helper function to convert 12-hour format to 24-hour format
  const convertTo24HourFormat = useCallback((hour, minute, ampm) => {
    if (!hour || !minute) return '';
    
    let hour24 = parseInt(hour);
    
    // Handle 12 PM (noon) - should be 12, not 0
    if (ampm === 'PM' && hour24 === 12) {
      hour24 = 12; // 12 PM = 12:00 (noon)
    } else if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12; // 1 PM = 13:00, 2 PM = 14:00, etc.
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0; // 12 AM = 00:00 (midnight)
    }
    // AM hours 1-11 stay the same
    
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      guest_name: '',
      email: '',
      phone: '',
      address: '',
      company_name: '',
      gst_number: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      billing_address: '',
      check_in_date: '',
      check_out_date: '',
      check_in_time: '',
      check_out_time: '',
      // 12-hour format time fields for past bookings
      check_in_hour: '',
      check_in_minute: '',
      check_in_ampm: 'AM',
      check_out_hour: '',
      check_out_minute: '',
      check_out_ampm: 'AM',
      room_type: '',
      room_number: '',
      adults: 1,
      children: 0,
      tariff: 0,
      number_of_days: 1,
      booking_source: 'walk_in',
      plan_type: 'EP',
      payment_type: '',
      paid_amount: '',
      id_proof_type: 'Aadhar Number',
      id_proof_number: '',
      notes: '',
      owner_reference: false, // Reset owner reference
      payment_required: true // Reset payment requirement
    });
    
    setFileUploads({
      customer_photo: null,
      id_proof_photo: null
    });
    
    setFileInputKey(prev => prev + 1); // Reset file inputs by changing key
    
    setShowCorporate(false);
    setRoomAvailability([]);
    setGuestSuggestions([]);
    setShowGuestSuggestions(false);
    setCorporateSuggestions([]);
    setShowCorporateSuggestions(false);
  }, []);

  const confirmBooking = useCallback(async () => {
    setLoading(true);
    
    try {
      console.log('Starting confirmBooking...');
      console.log('bookingSummary:', bookingSummary);
      
      // Check if payment type is UPI - if so, call confirm_booking.php instead
      if (formData.payment_type === 'upi') {
        console.log('UPI payment detected, creating booking first then confirming...');
        console.log('Current formData:', formData);
        
        // For UPI payments, we need to create the booking first, then confirm it
        const formDataToSend = new FormData();
        
        // Use current formData instead of bookingSummary to ensure all fields are current
        // Add essential booking fields
        if (formData.guest_name) formDataToSend.append('guest_name', formData.guest_name);
        if (formData.email) formDataToSend.append('email', formData.email);
        if (formData.phone) formDataToSend.append('phone', formData.phone);
        if (formData.address) formDataToSend.append('address', formData.address);
        if (formData.company_name) formDataToSend.append('company_name', formData.company_name);
        if (formData.gst_number) formDataToSend.append('gst_number', formData.gst_number);
        if (formData.contact_person) formDataToSend.append('contact_person', formData.contact_person);
        if (formData.contact_phone) formDataToSend.append('contact_phone', formData.contact_phone);
        if (formData.contact_email) formDataToSend.append('contact_email', formData.contact_email);
        if (formData.billing_address) formDataToSend.append('billing_address', formData.billing_address);
        if (formData.check_in_date) formDataToSend.append('check_in_date', formData.check_in_date);
        if (formData.check_out_date) formDataToSend.append('check_out_date', formData.check_out_date);
        if (formData.room_type) formDataToSend.append('room_type', formData.room_type);
        if (formData.room_number) formDataToSend.append('room_number', formData.room_number);
        if (formData.adults) formDataToSend.append('adults', formData.adults);
        if (formData.children) formDataToSend.append('children', formData.children);
        if (formData.tariff) formDataToSend.append('tariff', formData.tariff);
        if (formData.number_of_days) formDataToSend.append('number_of_days', formData.number_of_days);
        if (formData.booking_source) formDataToSend.append('booking_source', formData.booking_source);
        if (formData.plan_type) formDataToSend.append('plan_type', formData.plan_type);
        if (formData.payment_type) formDataToSend.append('payment_type', formData.payment_type);
        if (formData.paid_amount) formDataToSend.append('paid_amount', formData.paid_amount);
        if (formData.payment_received) formDataToSend.append('payment_received', formData.payment_received);
        if (formData.id_proof_type) formDataToSend.append('id_proof_type', formData.id_proof_type);
        if (formData.id_proof_number) formDataToSend.append('id_proof_number', formData.id_proof_number);
        if (formData.notes) formDataToSend.append('notes', formData.notes);
        if (formData.owner_reference !== undefined) {
            const ownerRefValue = formData.owner_reference ? '1' : '0';
            formDataToSend.append('owner_reference', ownerRefValue);
        }
        if (formData.payment_required !== undefined) formDataToSend.append('payment_required', formData.payment_required);
        
        // Add file uploads from current fileUploads state
        if (fileUploads.customer_photo) {
          formDataToSend.append('customer_photo', fileUploads.customer_photo);
          console.log('Added customer photo to FormData');
        }
        if (fileUploads.id_proof_photo) {
          formDataToSend.append('id_proof_photo', fileUploads.id_proof_photo);
          console.log('Added ID proof photo to FormData');
        }
        
        // Log all FormData entries for debugging
        console.log('FormData entries for UPI booking:');
        for (let [key, value] of formDataToSend.entries()) {
          console.log(`${key}: ${value}`);
        }
        
        // 🎯 FINAL TEST LOGGING - ADDED FOR EMAIL DEBUGGING (UPI)
        console.log('🎯 FINAL TEST - UPI Form data before submission:', formData);
        console.log('🎯 FINAL TEST - UPI Contact email value:', formData.contact_email);
        console.log('🎯 FINAL TEST - UPI Guest email value:', formData.email);
        console.log('🎯 FINAL TEST - UPI FormData entries:');
        for (let [key, value] of formDataToSend.entries()) {
          console.log(`🎯 FINAL TEST - UPI ${key}: ${value}`);
        }
        
        // Create booking first
        const createBookingUrl = `${buildApiUrl('reception/new_booking_api.php')}?action=create`;
        console.log('Creating booking first at:', createBookingUrl);
        
        const createResponse = await fetch(createBookingUrl, {
          method: 'POST',
          body: formDataToSend
        });
        
        if (!createResponse.ok) {
          throw new Error(`HTTP error! status: ${createResponse.status}`);
        }
        
        const createResult = await createResponse.json();
        console.log('🎯 FINAL TEST - UPI Booking creation result:', createResult);
        
        if (!createResult.success) {
          throw new Error(createResult.message || 'Failed to create booking');
        }
        
        // Now confirm the booking with UPI payment
        const confirmBookingData = {
          booking_id: createResult.data.booking_id,
          payment_method: 'upi',
          amount: parseFloat(formData.paid_amount) || 0, // Use the actual paid amount from form
          created_by: 1, // Replace with actual user ID from auth
          notes: 'UPI payment for booking confirmation'
        };
        
        console.log('Confirming booking with UPI payment:', confirmBookingData);
        
        const confirmResponse = await fetch(buildApiUrl('booking/confirm_booking.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(confirmBookingData)
        });
        
        const confirmResult = await confirmResponse.json();
        console.log('Confirm booking response:', confirmResult);
        
        if (confirmResult.success) {
          // For UPI payments, always proceed without Razorpay redirect
          // UPI payment processed successfully
          setSuccessData({
            bookingReference: createResult.data.booking_reference,
            guestName: formData.guest_name || 'Guest',
            checkInDate: formData.check_in_date,
            checkOutDate: formData.check_out_date,
            roomNumber: formData.room_number,
            adults: formData.adults,
            children: formData.children,
            totalAmount: formData.tariff * formData.number_of_days,
            autoConfirmed: false,
            paymentType: 'UPI'
          });
          setShowSuccessModal(true);
          setShowGlobalEmailSuccess(true);
          toast.success('UPI Booking Confirmed Successfully! 🎉', {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          resetForm();
          
          setShowSummary(false);
          return;
        } else {
          throw new Error(confirmResult.message || 'Failed to process UPI payment');
        }
      }
      
      // For non-UPI payments, continue with the existing flow
      const nonUpiFormData = new FormData();
      
      // Convert 12-hour format time fields to 24-hour format for past bookings
      let processedBookingSummary = { ...bookingSummary };
      
      // Convert time fields for all bookings
      if (bookingSummary.check_in_hour && bookingSummary.check_in_minute) {
        processedBookingSummary.check_in_time = convertTo24HourFormat(
          bookingSummary.check_in_hour, 
          bookingSummary.check_in_minute, 
          bookingSummary.check_in_ampm
        );
      }
      
      if (bookingSummary.check_out_hour && bookingSummary.check_out_minute) {
        processedBookingSummary.check_out_time = convertTo24HourFormat(
          bookingSummary.check_out_hour, 
          bookingSummary.check_out_minute, 
          bookingSummary.check_out_ampm
        );
      }
      
      // Add form data
      Object.keys(processedBookingSummary).forEach(key => {
        if (key !== 'total_amount' && key !== 'file_uploads' && 
            key !== 'check_in_hour' && key !== 'check_in_minute' && 
            key !== 'check_out_hour' && key !== 'check_out_minute' &&
            processedBookingSummary[key] !== '') {
          nonUpiFormData.append(key, processedBookingSummary[key]);
          console.log(`Adding to FormData: ${key} = ${processedBookingSummary[key]}`);
        }
      });
      
      // Add AM/PM fields separately
      if (processedBookingSummary.check_in_ampm) {
        nonUpiFormData.append('check_in_ampm', processedBookingSummary.check_in_ampm);
        console.log(`Adding to FormData: check_in_ampm = ${processedBookingSummary.check_in_ampm}`);
      }
      if (processedBookingSummary.check_out_ampm) {
        nonUpiFormData.append('check_out_ampm', processedBookingSummary.check_out_ampm);
        console.log(`Adding to FormData: check_out_ampm = ${processedBookingSummary.check_out_ampm}`);
      }
      
      // Ensure owner_reference is included (even if it's false)
      if (bookingSummary.hasOwnProperty('owner_reference')) {
        // Convert boolean to string representation that PHP can properly interpret
        const ownerRefValue = bookingSummary.owner_reference ? '1' : '0';
        nonUpiFormData.append('owner_reference', ownerRefValue);
        console.log(`Added owner_reference to FormData: ${ownerRefValue} (original: ${bookingSummary.owner_reference})`);
      }
      
      // Ensure room_number is included if it exists
      if (bookingSummary.room_number) {
        nonUpiFormData.append('room_number', bookingSummary.room_number);
        console.log('Added room_number to FormData:', bookingSummary.room_number);
      }
      
      // Add file uploads
      if (bookingSummary.file_uploads.customer_photo) {
        nonUpiFormData.append('customer_photo', bookingSummary.file_uploads.customer_photo);
        console.log('Added customer photo to FormData');
      }
      if (bookingSummary.file_uploads.id_proof_photo) {
        nonUpiFormData.append('id_proof_photo', bookingSummary.file_uploads.id_proof_photo);
        console.log('Added ID proof photo to FormData');
      }
      
      const apiUrl = `${buildApiUrl('reception/new_booking_api.php')}?action=create`;
      console.log('API URL:', apiUrl);
      
      // 🎯 FINAL TEST LOGGING - ADDED FOR EMAIL DEBUGGING
      console.log('🎯 FINAL TEST - Form data before submission:', bookingSummary);
      console.log('🎯 FINAL TEST - Contact email value:', bookingSummary.contact_email);
      console.log('🎯 FINAL TEST - Guest email value:', bookingSummary.email);
      console.log('🎯 FINAL TEST - FormData entries:');
      for (let [key, value] of nonUpiFormData.entries()) {
        console.log(`🎯 FINAL TEST - ${key}: ${value}`);
      }
      
      console.log('Sending request...');
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: nonUpiFormData
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('🎯 FINAL TEST - Response text:', responseText);
      
      let result;
      
      try {
        result = JSON.parse(responseText);
        console.log('🎯 FINAL TEST - Parsed result:', result);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      if (result.success) {
        console.log('Payment decision - requires_payment:', result.data.requires_payment, 'payment_type:', result.data.payment_type);
        // For cash payments, never redirect to Razorpay
        if (result.data.requires_payment && result.data.payment_type !== 'cash') {
          console.log('Redirecting to Razorpay payment');
          await handleRazorpayPayment(result.data);
        } else {
          console.log('Showing success modal (no payment required)');
          // Show success modal instead of toast
          setSuccessData({
            bookingReference: result.data.booking_reference,
            guestName: formData.guest_name,
            checkInDate: formData.check_in_date,
            checkOutDate: formData.check_out_date,
            roomNumber: formData.room_number,
            adults: formData.adults,
            children: formData.children,
            totalAmount: result.data.total_amount || formData.tariff * formData.number_of_days,
            autoConfirmed: result.data.auto_confirmed || false,
            paymentType: result.data.payment_type || formData.payment_type
          });
          setShowSuccessModal(true);
          setShowGlobalEmailSuccess(true);
          toast.success('Email sent successfully! 📧', {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          resetForm();
        }
        setShowSummary(false);
      } else {
        toast.error(result.message || 'Error creating booking');
      }
    } catch (error) {
      console.error('Error confirming booking:', error);
      toast.error(`Error creating booking: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [bookingSummary, formData]);

  const handleRazorpayPayment = useCallback(async (bookingData) => {
    // Prevent Razorpay payment for cash payments
    if (bookingData.payment_type === 'cash') {
      console.log('Preventing Razorpay payment for cash payment type');
      return;
    }
    
    try {
      // Create Razorpay order
      const orderUrl = `${buildApiUrl('reception/razorpay_payment_api.php')}?action=create_order`;
      
      const orderResponse = await fetch(orderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingData.booking_id,
          amount: bookingData.total_amount
        })
      });

      const orderResult = await orderResponse.json();
      
      if (!orderResult.success) {
        throw new Error(orderResult.message || 'Failed to create payment order');
      }

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please check if the script is included.');
      }

      // Initialize Razorpay payment
      const options = {
        key: orderResult.data.key_id,
        amount: orderResult.data.amount * 100, // Razorpay expects amount in paise
        currency: orderResult.data.currency,
        name: 'Hotel Royal',
        description: `Booking ${bookingData.booking_reference}`,
        order_id: orderResult.data.order_id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyResponse = await fetch(`${buildApiUrl('reception/razorpay_payment_api.php')}?action=verify_payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                signature: response.razorpay_signature
              })
            });

            const verifyResult = await verifyResponse.json();
            
            if (verifyResult.success) {
              // Show success modal instead of toast
              setSuccessData({
                bookingReference: bookingData.booking_reference,
                guestName: bookingSummary.guest_name,
                checkInDate: bookingData.check_in_date || formData.check_in_date,
                checkOutDate: bookingData.check_out_date || formData.check_out_date,
                roomNumber: bookingData.room_number || formData.room_number,
                adults: formData.adults,
                children: formData.children,
                totalAmount: bookingData.total_amount,
                autoConfirmed: bookingData.auto_confirmed || false,
                paymentType: bookingData.payment_type || formData.payment_type
              });
              setShowSuccessModal(true);
              setShowGlobalEmailSuccess(true);
              toast.success('Email sent successfully! 📧', {
                position: "top-center",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
              resetForm();
            } else {
              toast.error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: bookingSummary.guest_name,
          email: bookingSummary.email,
          contact: bookingSummary.phone
        },
        theme: {
          color: '#3399cc'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      
    } catch (error) {
      console.error('Razorpay payment error:', error);
      toast.error(`Payment error: ${error.message}`);
    }
  }, [bookingSummary]);

  return (
    <div className="new-booking-container">
      <div className="booking-header animate-fade-in">
        {/* 3D Particle Effects */}
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        
        <h2>SV ROYAL HOTEL BOOKING</h2>
      </div>

      <form onSubmit={handleSubmit} className="booking-form">
        {/* Guest Information Section */}
        <div className="form-section animate-slide-up">
          <h3 className="section-title">
            <span className="section-icon">👤</span>
            Guest Information
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="guest_name">Guest Name *</label>
              <input
                type="text"
                id="guest_name"
                name="guest_name"
                value={formData.guest_name}
                onChange={handleGuestNameChange}
                placeholder="Enter full name"
                required
                className="professional-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address (Optional)</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleEmailChange}
                placeholder="Enter email address (optional)"
                className="professional-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Email is optional - you can book without providing an email address
              </p>
            </div>

            <div className="form-group phone-field-group">
              <label htmlFor="phone">Phone Number *</label>
              <div className="input-with-suggestions phone-input-container">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onFocus={() => {
                    if (formData.phone && formData.phone.length >= 3) {
                      // Trigger search if there are no current suggestions
                      if (guestSuggestions.length === 0) {
                        fetchGuestSuggestions(formData.phone);
                      } else {
                        setShowGuestSuggestions(true);
                      }
                    }
                  }}
                  onBlur={(e) => {
                    // Delay hiding suggestions to allow clicking on them
                    // Check if the new focus target is within the suggestions container
                    setTimeout(() => {
                      const suggestionsContainer = document.querySelector('.guest-suggestions-container');
                      if (!suggestionsContainer || !suggestionsContainer.contains(document.activeElement)) {
                        setShowGuestSuggestions(false);
                      }
                    }, 300);
                  }}
                  placeholder="Enter phone number"
                  required
                  className="professional-input"
                />
                {/* Guest Suggestions Dropdown */}
                {showGuestSuggestions && guestSuggestions.length > 0 && (
                  <div className="guest-suggestions-container suggestions-dropdown">
                    <div className="suggestions-header">
                      <span>Existing Guests ({guestSuggestions.length})</span>
                      <button 
                        type="button" 
                        className="close-suggestions"
                        onClick={() => setShowGuestSuggestions(false)}
                      >
                        ×
                      </button>
                    </div>
                    {guestSuggestions.map((guest, index) => (
                      <button 
                        key={`${guest.booking_id}-${guest.guest_id}-${index}`}
                        type="button"
                        className="suggestion-item"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Suggestion item clicked for guest:', guest.full_name);
                          fillGuestData(guest);
                        }}
                        onMouseDown={(e) => {
                          // Prevent the input field from losing focus when clicking suggestion
                          e.preventDefault();
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          background: 'none',
                          padding: '12px 16px'
                        }}
                      >
                        <div className="guest-info">
                          <div className="guest-name">{guest.full_name}</div>
                          <div className="guest-details">
                            {guest.phone} • {guest.email || 'No email'} • Room {guest.room_number}
                          </div>
                        </div>
                        <div className="guest-action">
                          <span className="click-hint">Click to fill</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-group full-width">
              <label htmlFor="address">Residential Address *</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleAddressChange}
                placeholder="Enter complete residential address"
                rows="3"
                required
                className="professional-input"
              />
            </div>
          </div>
        </div>

        {/* Corporate Booking Section */}
        <div className="form-section animate-slide-up">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-icon">🏢</span>
              Corporate Booking {showCorporate ? '(Required)' : '(Optional)'}
            </h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showCorporate}
                onChange={(e) => toggleCorporate(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
          
          {showCorporate && (
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="company_name">Company Name {showCorporate && <span className="required">*</span>}</label>
                <div className="input-with-suggestions">
                  <input
                    type="text"
                    id="company_name"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleCompanyNameChange}
                    placeholder="Enter company name"
                    required={showCorporate}
                    className="professional-input"
                  />
                  {/* Corporate Suggestions Dropdown */}
                  {showCorporateSuggestions && corporateSuggestions.length > 0 && (
                    <div className="corporate-suggestions-container suggestions-dropdown">
                      <div className="suggestions-header">
                        <span>Existing Corporate Bookings</span>
                        <button 
                          type="button" 
                          className="close-suggestions"
                          onClick={() => setShowCorporateSuggestions(false)}
                        >
                          ×
                        </button>
                      </div>
                      {corporateSuggestions.map((guest, index) => (
                        <div 
                          key={`${guest.booking_id}-${guest.guest_id}-${index}`}
                          className="suggestion-item corporate"
                          onClick={() => fillCorporateData(guest)}
                        >
                          <div className="guest-info">
                            <div className="guest-name">{guest.full_name}</div>
                            <div className="guest-details">
                              {guest.company_name} • {guest.phone} • Room {guest.room_number}
                            </div>
                            <div className="corporate-details">
                              GST: {guest.gst_number || 'N/A'} • Contact: {guest.contact_person || 'N/A'}
                            </div>
                          </div>
                          <div className="guest-action">
                            <span className="click-hint">Click to fill</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="gst_number">GST Number {showCorporate && <span className="required">*</span>}</label>
                <input
                  type="text"
                  id="gst_number"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleGstNumberChange}
                  placeholder="Enter GST number"
                  required={showCorporate}
                  className="professional-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact_person">Contact Person {showCorporate && <span className="required">*</span>}</label>
                <input
                  type="text"
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleContactPersonChange}
                  placeholder="Enter contact person name"
                  required={showCorporate}
                  className="professional-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact_phone">Contact Phone {showCorporate && <span className="required">*</span>}</label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleContactPhoneChange}
                  placeholder="Enter contact phone"
                  required={showCorporate}
                  className="professional-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact_email">Contact Email <span className="text-gray-500 text-xs">(optional)</span></label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleContactEmailChange}
                  placeholder="Enter contact email"
                  className="professional-input"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="billing_address">Billing Address {showCorporate && <span className="required">*</span>}</label>
                <textarea
                  id="billing_address"
                  name="billing_address"
                  value={formData.billing_address}
                  onChange={handleBillingAddressChange}
                  placeholder="Enter company billing address"
                  rows="3"
                  required={showCorporate}
                  className="professional-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* Booking Details Section */}
        <div className="form-section animate-slide-up">
          <h3 className="section-title">
            <span className="section-icon">📅</span>
            Booking Details
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="check_in_date">Check-in Date *</label>
              <input
                type="date"
                id="check_in_date"
                name="check_in_date"
                value={formData.check_in_date}
                onChange={(e) => handleInputChange('check_in_date', e.target.value)}

                required
                className="professional-input"
              />

            </div>

            <div className="form-group">
              <label htmlFor="check_out_date">Check-out Date *</label>
              <input
                type="date"
                id="check_out_date"
                name="check_out_date"
                value={formData.check_out_date}
                onChange={(e) => handleInputChange('check_out_date', e.target.value)}

                required
                className="professional-input"
              />
            </div>

            {/* Show time fields for all bookings */}
            {formData.check_in_date && (
              <>
                <div className="form-group">
                  <label htmlFor="check_in_time">Check-in Time</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Hour"
                      value={formData.check_in_hour || ''}
                      onChange={(e) => handleInputChange('check_in_hour', e.target.value)}
                      style={{ width: '80px', textAlign: 'center' }}
                      className="professional-input"
                    />
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Min"
                      value={formData.check_in_minute || ''}
                      onChange={(e) => handleInputChange('check_in_minute', e.target.value)}
                      style={{ width: '80px', textAlign: 'center' }}
                      className="professional-input"
                    />
                    <select
                      value={formData.check_in_ampm || 'AM'}
                      onChange={(e) => handleInputChange('check_in_ampm', e.target.value)}
                      className="professional-input"
                      style={{ width: '70px' }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                    ✓ Past booking detected - Enter actual check-in time (12-hour format)
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="check_out_time">Check-out Time</label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="Hour"
                      value={formData.check_out_hour || ''}
                      onChange={(e) => handleInputChange('check_out_hour', e.target.value)}
                      style={{ width: '80px', textAlign: 'center' }}
                      className="professional-input"
                    />
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>:</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Min"
                      value={formData.check_out_minute || ''}
                      onChange={(e) => handleInputChange('check_out_minute', e.target.value)}
                      style={{ width: '80px', textAlign: 'center' }}
                      className="professional-input"
                    />
                    <select
                      value={formData.check_out_ampm || 'AM'}
                      onChange={(e) => handleInputChange('check_out_ampm', e.target.value)}
                      className="professional-input"
                      style={{ width: '70px' }}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                  <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                    ✓ Past booking detected - Enter actual check-out time (12-hour format)
                  </small>
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor="number_of_days">Number of Days</label>
              <input
                type="number"
                id="number_of_days"
                name="number_of_days"
                value={formData.number_of_days}
                readOnly
                className="readonly-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="adults">Number of Adults *</label>
              <input
                type="number"
                id="adults"
                name="adults"
                value={formData.adults}
                onChange={(e) => handleInputChange('adults', e.target.value)}
                min="1"
                max="10"
                required
                className="professional-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="children">Number of Children</label>
              <input
                type="number"
                id="children"
                name="children"
                value={formData.children}
                onChange={(e) => handleInputChange('children', e.target.value)}
                min="0"
                max="10"
                className="professional-input"
              />
            </div>

            {/* Room Type Selection */}
            <div className="form-group">
              <label htmlFor="room_type">Room Type *</label>
              <select
                id="room_type"
                name="room_type"
                value={formData.room_type}
                onChange={handleRoomTypeChange}
                required
                className="professional-input"
              >
                <option value="">Select Room Type</option>
                {Object.entries(options.room_types).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {/* Room Number Selection */}
            <div className="form-group">
              <label htmlFor="room_number">Room Number *</label>
              <div className="room-selector-container">
                <div 
                  className={`room-selector-input ${(!formData.room_type || !formData.check_in_date || !formData.check_out_date) ? 'disabled' : ''}`}
                  onClick={() => {
                    if (formData.room_type && formData.check_in_date && formData.check_out_date) {
                      openRoomSelector();
                    }
                  }}
                >
                  {formData.room_number ? (
                    <div className="selected-room-display">
                      <span className="room-number">Room {formData.room_number}</span>
                      <span className="room-details">
                        {(() => {
                          const selectedRoom = allRooms.find(room => room.room_number === formData.room_number);
                          if (selectedRoom) {
                            return `Floor ${selectedRoom.floor} - ₹${selectedRoom.actual_price || selectedRoom.base_price}/night`;
                          }
                          return '';
                        })()}
                      </span>
                    </div>
                  ) : (
                    <span className="placeholder-text">Click to select a room</span>
                  )}
                  <span className="dropdown-arrow">▼</span>
                </div>
                
                {/* Room Selection Popup */}
                {showRoomSelector && (
                  <div className="room-selector-popup">
                    <div className="popup-header">
                      <h3>Select Room</h3>
                      <div className="popup-actions">
                        <button 
                          className="refresh-button"
                          onClick={() => checkRoomAvailability()}
                          title="Refresh availability"
                        >
                          🔄
                        </button>
                        <button 
                          className="close-button"
                          onClick={closeRoomSelector}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    <div className="room-list">
                      {formData.room_type && allRooms.length > 0 ? (
                        // Use the allRooms data which now includes date-specific availability
                        allRooms
                          .filter(room => room.room_type === formData.room_type)
                          .map((room) => {
                            // Use the is_bookable field from the updated API
                            const canBook = room.is_bookable;
                            const availabilityStatus = room.availability_status;
                            
                            let statusClass = 'room-status-badge';
                            let statusText = 'Available';
                            
                            // Use the availability status from the API
                            switch (availabilityStatus) {
                              case 'occupied':
                                statusClass += ' occupied';
                                statusText = 'OCCUPIED';
                                break;
                              case 'booked':
                                statusClass += ' occupied';
                                statusText = 'BOOKED';
                                break;
                              case 'maintenance':
                                statusClass += ' maintenance';
                                statusText = 'Maintenance';
                                break;
                              case 'cleaning':
                                statusClass += ' cleaning';
                                statusText = 'Cleaning';
                                break;
                              case 'available':
                              default:
                                statusClass += ' available';
                                statusText = 'Available';
                                break;
                            }
                            
                            return (
                              <div 
                                key={room.room_number} 
                                className={`room-option ${canBook ? 'selectable' : 'disabled'}`}
                                onClick={() => {
                                  if (canBook) {
                                    handleInputChange('room_number', room.room_number);
                                    closeRoomSelector();
                                  }
                                }}
                              >
                                <div className="room-info">
                                  <span className="room-number">Room {room.room_number}</span>
                                  <span className="room-floor">Floor {room.floor}</span>
                                  <span className="room-price">₹{room.actual_price || room.base_price}/night</span>
                                </div>
                                <div className="room-status-section">
                                  <span className={statusClass}>{statusText}</span>
                                  {!canBook && room.booking_check_out_date && (
                                    <div className="checkout-info">
                                      <span className="checkout-text">
                                        Checkout on {new Date(room.booking_check_out_date).toLocaleDateString('en-GB', {
                                          day: '2-digit',
                                          month: 'short'
                                        })} at {room.booking_check_out_time ? new Date(`2000-01-01T${room.booking_check_out_time}`).toLocaleTimeString('en-US', {
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        }) : '11:00 AM'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        // Fallback: show rooms from allRooms with basic status
                        formData.room_type && allRooms
                          .filter(room => room.room_type === formData.room_type)
                          .map((room) => {
                            // For rooms without availability data, show based on room status
                            const canBook = room.status === 'available';
                            let statusClass = 'room-status-badge';
                            let statusText = 'Available';
                            
                            if (!canBook) {
                              if (room.status === 'occupied') {
                                statusClass += ' occupied';
                                statusText = 'OCCUPIED';
                              } else if (room.status === 'booked') {
                                statusClass += ' booked';
                                statusText = 'BOOKED';
                              } else if (room.status === 'maintenance') {
                                statusClass += ' maintenance';
                                statusText = 'Maintenance';
                              } else if (room.status === 'cleaning') {
                                statusClass += ' cleaning';
                                statusText = 'Cleaning';
                              } else {
                                statusClass += ' occupied';
                                statusText = 'BOOKED';
                              }
                            } else {
                              statusClass += ' available';
                              statusText = 'Available';
                            }
                            
                            return (
                              <div 
                                key={room.room_number} 
                                className={`room-option ${canBook ? 'selectable' : 'disabled'}`}
                                onClick={() => {
                                  if (canBook) {
                                    handleInputChange('room_number', room.room_number);
                                    closeRoomSelector();
                                  }
                                }}
                              >
                                <div className="room-info">
                                  <span className="room-number">Room {room.room_number}</span>
                                  <span className="room-floor">Floor {room.floor}</span>
                                  <span className="room-price">₹{room.actual_price || room.base_price}/night</span>
                                </div>
                                <span className={statusClass}>{statusText}</span>
                              </div>
                            );
                          })
                      )}
                    </div>
                    
                    {formData.room_type && allRooms.filter(room => room.room_type === formData.room_type).length === 0 && (
                      <div className="no-rooms-message">
                        No rooms found for selected room type
                      </div>
                    )}
                    
                    {/* Show availability status */}
                    {formData.room_type && roomAvailability.length === 0 && (
                      <div className="availability-status">
                        Checking room availability...
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {formData.room_type && formData.check_in_date && formData.check_out_date && allRooms.length === 0 && (
                <small className="error-text">No rooms found for selected room type</small>
              )}
              
            </div>

            {/* Owner Reference Checkbox - Positioned below room selection */}
            <div style={{
              backgroundColor: '#fef3c7', 
              border: '1px solid #f59e0b', 
              padding: '10px', 
              borderRadius: '8px', 
              fontSize: '14px',
              marginTop: '15px'
            }}>
              <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px'}}>
                <input
                  type="checkbox"
                  id="owner_reference_checkbox"
                  checked={formData.owner_reference || false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    console.log('Owner reference checkbox changed:', checked);
                    setFormData(prev => ({
                      ...prev,
                      owner_reference: checked,
                      payment_required: !checked,
                      // Automatically set paid_amount to full amount when owner reference is checked
                      paid_amount: checked ? (prev.tariff * prev.number_of_days).toString() : prev.paid_amount
                    }));
                  }}
                  style={{width: '18px', height: '18px'}}
                />
                <div>
                  <div style={{fontWeight: '600', fontSize: '14px', color: '#92400e'}}>
                    🏨 Reference by Owner of the Hotel
                  </div>
                  <div style={{color: '#a16207', marginTop: '2px', fontSize: '12px'}}>
                    Check this box to book room without payment requirement
                  </div>
                </div>
              </div>
              
              {(formData.owner_reference || false) && (
                <div style={{
                  backgroundColor: '#dcfce7', 
                  border: '1px solid #16a34a', 
                  padding: '6px', 
                  borderRadius: '4px', 
                  fontSize: '12px'
                }}>
                  <div style={{color: '#166534', fontWeight: '600'}}>
                    ✅ Owner Reference Active: No Payment Required!
                  </div>
                </div>
              )}
            </div>

            {/* Daily Tariff and Booking Source in Grid Layout */}
            <div className="form-grid">
              {/* Daily Tariff Field */}
              <div className="form-group">
                <label htmlFor="tariff">Daily Tariff (₹) *</label>
                <input
                  type="number"
                  id="tariff"
                  name="tariff"
                  value={formData.tariff}
                  onChange={handleTariffChange}
                  min="0"
                  step="1"
                  placeholder="Enter daily room rate in INR"
                  required
                  className="professional-input"
                />
              </div>

              {/* Booking Source Field */}
              <div className="form-group">
                <label htmlFor="booking_source">Booking Source *</label>
                <select
                  id="booking_source"
                  name="booking_source"
                  value={formData.booking_source}
                  onChange={handleBookingSourceChange}
                  className="professional-input"
                  required
                >
                  <option value="">Select Booking Source</option>
                  {Object.entries(options.booking_sources).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            </div>



          </div>



          {/* Total Calculation */}
          <div className="total-calculation">
            <div className="total-item">
              <span>Daily Tariff:</span>
              <span>{formatPrice(formData.tariff)}</span>
            </div>
            <div className="total-item">
              <span>Number of Days:</span>
              <span>{formData.number_of_days}</span>
            </div>
            <div className="total-item total">
              <span>Total Amount:</span>
              <span>{formatPrice(calculateTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment Details Section */}
        <div className="form-section animate-slide-up">
          <h3 className="section-title">
            <span className="section-icon">💳</span>
            Payment Details
          </h3>
          <div className="form-grid">
            {/* Paid Amount Field - Only enabled for phone call booking, walk in, and online platforms */}
            <div className="form-group">
              <label htmlFor="paid_amount">Paid Amount (₹) {['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source) ? '' : '*'}</label>
              <input
                type="number"
                id="paid_amount"
                name="paid_amount"
                value={formData.owner_reference ? formData.tariff * formData.number_of_days : formData.paid_amount}
                onChange={handlePaidAmountChange}
                min="0"
                max={calculateTotal}
                step="1"
                placeholder={`Enter amount paid (max: ${formatPrice(calculateTotal)})`}
                disabled={formData.owner_reference || !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source))}
                style={{
                  opacity: (formData.owner_reference || !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source))) ? 0.6 : 1,
                  backgroundColor: (formData.owner_reference || !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source))) ? '#f3f4f6' : 'white'
                }}
                required={!['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source) && formData.booking_source !== 'corporate'}
                className="professional-input"
              />
              {(formData.owner_reference || false) && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Full amount automatically set - Owner reference booking
                </small>
              )}
              {!(formData.owner_reference || false) && !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source)) && (
                <small style={{ color: '#dc2626', fontSize: '12px', fontWeight: '600' }}>
                  ⚠ Payment details disabled - Only available for Phone Call Booking, Walk In, Corporate, and online platforms
                </small>
              )}
              {!(formData.owner_reference || false) && (formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in') && (
                <small style={{ color: '#666', fontSize: '12px' }}>
                  • Enter the amount the guest has already paid<br/>
                  • Cannot exceed the total booking amount<br/>
                  • Remaining amount will be calculated automatically
                </small>
              )}
              
              {/* Payment Received Checkbox - Only show for walk-in and corporate bookings */}
              {(formData.booking_source === 'walk_in' || formData.booking_source === 'corporate') && !formData.owner_reference && (
                <div className="mt-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="payment_received"
                      checked={formData.payment_received || false}
                      onChange={(e) => handleInputChange('payment_received', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Payment has been received (check this only if payment was actually collected)
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Only check this if you have actually received the payment. This affects the payment status.
                  </p>
                </div>
              )}
              {!(formData.owner_reference || false) && formData.booking_source === 'MMT' && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ MMT bookings are typically pre-paid through the platform<br/>
                  • Enter the amount received from MMT<br/>
                  • Usually equals the total booking amount
                </small>
              )}
              {!(formData.owner_reference || false) && formData.booking_source === 'Agoda' && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Agoda bookings are typically pre-paid through the platform<br/>
                  • Enter the amount received from Agoda<br/>
                  • Usually equals the total booking amount
                </small>
              )}
              {!(formData.owner_reference || false) && formData.booking_source === 'Travel Plus' && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Travel Plus bookings are typically pre-paid through the platform<br/>
                  • Enter the amount received from Travel Plus<br/>
                  • Usually equals the total booking amount
                </small>
              )}
              {!(formData.owner_reference || false) && formData.booking_source === 'corporate' && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Corporate bookings - Enter the amount paid by the company<br/>
                  • Can be partial or full payment<br/>
                  • Remaining amount will be calculated automatically
                </small>
              )}
            </div>

            {/* Remaining Amount Display - Only show for phone call booking, walk in, and online platforms with paid amount */}
            {formData.paid_amount && parseFloat(formData.paid_amount) > 0 && !(formData.owner_reference || false) && (formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source)) && (
              <div className="form-group">
                <label>Remaining Amount</label>
                <div className="remaining-amount-display">
                  <span className="amount-label">Amount Due:</span>
                  <span className="amount-value">
                    {formatPrice(Math.max(0, calculateTotal - parseFloat(formData.paid_amount)))}
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="plan_type">Plan Type</label>
              <select
                id="plan_type"
                name="plan_type"
                value={formData.plan_type}
                onChange={handlePlanTypeChange}
                className="professional-input"
              >
                {Object.entries(options.plan_types).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="payment_type">Payment Type {['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source) ? '(Auto-set to Online)' : '*'}</label>
              <select
                id="payment_type"
                name="payment_type"
                value={formData.payment_type}
                onChange={handlePaymentTypeChange}
                disabled={formData.owner_reference || !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source))}
                style={{
                  opacity: (formData.owner_reference || !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source))) ? 0.6 : 1,
                  backgroundColor: (formData.owner_reference || !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source))) ? '#f3f4f6' : 'white'
                }}
                required={!['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source) && formData.booking_source !== 'corporate'}
                className="professional-input"
              >
                {Object.entries(options.payment_types).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
              {(formData.owner_reference || false) && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Payment type disabled - Owner reference booking
                </small>
              )}
              {!(formData.owner_reference || false) && !(formData.booking_source === 'Phone Call Booking' || formData.booking_source === 'walk_in' || formData.booking_source === 'corporate' || ['MMT', 'Agoda', 'Travel Plus'].includes(formData.booking_source)) && (
                <small style={{ color: '#dc2626', fontSize: '12px', fontWeight: '600' }}>
                  ⚠ Payment type disabled - Only available for Phone Call Booking, Walk In, Corporate, and online platforms
                </small>
              )}
              {formData.booking_source === 'walk_in' && formData.payment_type === 'cash' && !(formData.owner_reference || false) && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Cash payment will automatically confirm your booking
                </small>
              )}
              {formData.booking_source === 'MMT' && !(formData.owner_reference || false) && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Payment type automatically set to "Online" - MMT handles payment online
                </small>
              )}
              {formData.booking_source === 'Agoda' && !(formData.owner_reference || false) && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Payment type automatically set to "Online" - Agoda handles payment online
                </small>
              )}
              {formData.booking_source === 'Travel Plus' && !(formData.owner_reference || false) && (
                <small style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>
                  ✓ Payment type automatically set to "Online" - Travel Plus handles payment online
                </small>
              )}
            </div>
          </div>
        </div>

        {/* ID Proof Section */}
        <div className="form-section animate-slide-up">
          <h3 className="section-title">
            <span className="section-icon">🔑</span>
            Identity Proof
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="id_proof_type">ID Proof Type</label>
              <select
                id="id_proof_type"
                name="id_proof_type"
                value={formData.id_proof_type}
                onChange={handleIdProofTypeChange}
                className="professional-input"
              >
                {Object.entries(options.id_proof_types).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="id_proof_number">ID Proof Number</label>
              <input
                type="text"
                id="id_proof_number"
                name="id_proof_number"
                value={formData.id_proof_number}
                onChange={handleIdProofNumberChange}
                placeholder="Enter ID proof number"
                className="professional-input"
              />
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="form-section animate-slide-up">
          <h3 className="section-title">
            <span className="section-icon">📄</span>
            Document Uploads (Optional)
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="customer_photo">Customer Photo</label>
              <input
                type="file"
                id="customer_photo"
                key={`customer_photo_${fileInputKey}`}
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => handleFileChange(e, 'customer_photo')}
                className="professional-input"
              />
              <small>JPEG or PNG, max 5MB</small>
              {fileUploads.customer_photo && (
                <p className="file-info">Selected: {fileUploads.customer_photo.name}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="id_proof_photo">ID Proof Photo</label>
              <input
                type="file"
                id="id_proof_photo"
                key={`id_proof_photo_${fileInputKey}`}
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => handleFileChange(e, 'id_proof_photo')}
                className="professional-input"
              />
              <small>JPEG or PNG, max 5MB</small>
              {fileUploads.id_proof_photo && (
                <p className="file-info">Selected: {fileUploads.id_proof_photo.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="form-section animate-slide-up">
          <h3 className="section-title">
            <span className="section-icon">📝</span>
            Additional Information
          </h3>
          <div className="form-group full-width">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleNotesChange}
              placeholder="Any additional notes or special requests"
              rows="3"
              className="professional-input"
            />
      </div>
        </div>

        {/* Submit Section */}
        <div className="submit-section animate-slide-up">
          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Creating Booking...
              </>
            ) : (
              'SV ROYAL HOTEL BOOKING'
            )}
          </button>
          <p className="submit-note">
            All fields marked with * are required
          </p>
        </div>
      </form>

      {/* Booking Summary Modal */}
      {showSummary && (
        <div className="summary-modal-overlay">
          <div className="summary-modal">
            <div className="summary-header">
              <h3>Booking Summary</h3>
              <button 
                className="close-btn"
                onClick={closeSummary}
              >
                ×
              </button>
            </div>
            
            <div className="summary-content">
              <div className="summary-section">
                <h4>Guest Information</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">Name:</span>
                    <span className="value">{bookingSummary.guest_name}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Phone:</span>
                    <span className="value">{bookingSummary.phone}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Email:</span>
                    <span className="value">{bookingSummary.email || 'Not provided'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Address:</span>
                    <span className="value">{bookingSummary.address}</span>
                  </div>
                </div>
              </div>

              <div className="summary-section">
                <h4>Booking Details</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">Check-in:</span>
                    <span className="value">{new Date(bookingSummary.check_in_date).toLocaleDateString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Check-out:</span>
                    <span className="value">{new Date(bookingSummary.check_out_date).toLocaleDateString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Room Type:</span>
                    <span className="value">{bookingSummary.room_type}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Room Number:</span>
                    <span className="value">{bookingSummary.room_number}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Adults:</span>
                    <span className="value">{bookingSummary.adults}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Children:</span>
                    <span className="value">{bookingSummary.children}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Plan:</span>
                    <span className="value">{bookingSummary.plan_type}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Payment:</span>
                    <span className="value">{options.payment_types && options.payment_types[bookingSummary.payment_type] ? options.payment_types[bookingSummary.payment_type] : bookingSummary.payment_type}</span>
                  </div>
                </div>
              </div>

                              <div className="summary-section">
                  <h4>Pricing</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="label">Daily Tariff:</span>
                      <span className="value">{formatPrice(bookingSummary.tariff)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Number of Days:</span>
                      <span className="value">{bookingSummary.number_of_days}</span>
                    </div>
                    <div className="summary-item total">
                      <span className="label">Total Amount:</span>
                      <span className="value">{formatPrice(bookingSummary.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Information Section - Show for all booking types except owner reference */}
                {!(bookingSummary.owner_reference || false) && (
                  <div className="summary-section">
                    <h4>Payment Information</h4>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="label">Payment Type:</span>
                        <span className="value">{options.payment_types && options.payment_types[bookingSummary.payment_type] ? options.payment_types[bookingSummary.payment_type] : bookingSummary.payment_type}</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Amount Paid:</span>
                        <span className="value text-green-600 font-semibold">{formatPrice(bookingSummary.paid_amount || 0)}</span>
                      </div>
                      <div className="summary-item total">
                        <span className="label">Amount Due:</span>
                        <span className="value text-orange-600 font-semibold">{formatPrice(bookingSummary.remaining_amount || 0)}</span>
                      </div>
                    </div>
                    {bookingSummary.payment_type === 'cash' && (
                      <div className="auto-confirmation-notice">
                        <span className="notice-icon">✓</span>
                        <span className="notice-text">This booking will be automatically confirmed upon submission</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Owner Reference Notice - When owner reference is checked */}
                {(bookingSummary.owner_reference || false) && (
                  <div className="summary-section">
                    <h4>Owner Reference Information</h4>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="label">Status:</span>
                        <span className="value text-green-600 font-semibold">✅ Owner Referenced</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Payment Required:</span>
                        <span className="value text-green-600 font-semibold">No Payment Required</span>
                      </div>
                      <div className="summary-item">
                        <span className="label">Booking Status:</span>
                        <span className="value text-green-600 font-semibold">Auto-Confirmed</span>
                      </div>
                    </div>
                    <div className="owner-reference-notice">
                      <span className="notice-icon">🏨</span>
                      <span className="notice-text">This booking is made under owner reference - no payment processing required</span>
                    </div>
                  </div>
                )}

              {/* Corporate Information Section - Only for Corporate Bookings */}
              {bookingSummary.booking_source === 'corporate' && (
                <div className="summary-section">
                  <h4>Corporate Information</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span className="label">Booking Source:</span>
                      <span className="value text-blue-600 font-semibold">🏢 Corporate</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Corporate Status:</span>
                      <span className="value text-blue-600 font-semibold">Active</span>
                    </div>
                    <div className="summary-item">
                      <span className="label">Corporate Type:</span>
                      <span className="value">Business Booking</span>
                    </div>
                    {bookingSummary.company_name && (
                      <div className="summary-item">
                        <span className="label">Company Name:</span>
                        <span className="value font-semibold text-blue-600">
                          {bookingSummary.company_name}
                        </span>
                      </div>
                    )}
                    {bookingSummary.gst_number && (
                      <div className="summary-item">
                        <span className="label">GST Number:</span>
                        <span className="value">
                          {bookingSummary.gst_number}
                        </span>
                      </div>
                    )}
                    {bookingSummary.contact_person && (
                      <div className="summary-item">
                        <span className="label">Contact Person:</span>
                        <span className="value">
                          {bookingSummary.contact_person}
                        </span>
                      </div>
                    )}
                    {bookingSummary.contact_phone && (
                      <div className="summary-item">
                        <span className="label">Contact Phone:</span>
                        <span className="value">
                          {bookingSummary.contact_phone}
                        </span>
                      </div>
                    )}
                    {bookingSummary.contact_email && (
                      <div className="summary-item">
                        <span className="label">Contact Email:</span>
                        <span className="value">
                          {bookingSummary.contact_email}
                        </span>
                      </div>
                    )}
                    {bookingSummary.billing_address && (
                      <div className="summary-item col-span-2">
                        <span className="label">Billing Address:</span>
                        <span className="value">
                          {bookingSummary.billing_address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="summary-actions">
              <button 
                className="cancel-btn"
                onClick={closeSummary}
              >
                Edit Booking
              </button>
              <button 
                className="confirm-btn"
                onClick={confirmBooking}
                disabled={loading}
              >
                {loading ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
      </div>
        </div>
      )}

      {/* Global Email Success Message */}
      <GlobalEmailSuccess
        show={showGlobalEmailSuccess}
        onClose={() => setShowGlobalEmailSuccess(false)}
      />

      {/* Success Modal */}
      <BookingSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        bookingReference={successData?.bookingReference}
        guestName={successData?.guestName}
        checkInDate={successData?.checkInDate}
        checkOutDate={successData?.checkOutDate}
        roomNumber={successData?.roomNumber}
        totalAmount={successData?.totalAmount}
      />
    </div>
  );
});

export default NewBooking;
