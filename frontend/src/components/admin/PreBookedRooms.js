import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/api';
import { toast } from 'react-toastify';
import { useRealTime } from '../../contexts/RealTimeContext';
import { fetchPrebookedRooms, updatePrebookedBooking } from '../../utils/prebookedRoomsApi';
import { 
  FaCalendarAlt, 
  FaBed, 
  FaUser, 
  FaPhone, 
  FaEnvelope,
  FaBuilding,
  FaMoneyBillWave,
  FaSync,
  FaEye,
  FaSearch,
  FaClock
} from 'react-icons/fa';

const PreBookedRooms = () => {
  const [preBookedRooms, setPreBookedRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showGuestDetails, setShowGuestDetails] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [availableRooms, setAvailableRooms] = useState([]);
  
  // Real-time context
  const { isConnected, subscribeToChannel } = useRealTime();

  useEffect(() => {
    loadPreBookedRooms();
  }, []);

  // Real-time updates listener
  useEffect(() => {
    if (isConnected) {
      subscribeToChannel('admin');

      const handleRealTimeUpdate = (data) => {
        if (data.type === 'booking_updated' || data.type === 'booking_confirmed') {
          loadPreBookedRooms();
        }
      };

      window.addEventListener('booking_updated', handleRealTimeUpdate);
      window.addEventListener('booking_confirmed', handleRealTimeUpdate);

      return () => {
        window.removeEventListener('booking_updated', handleRealTimeUpdate);
        window.removeEventListener('booking_confirmed', handleRealTimeUpdate);
      };
    }
  }, [isConnected, subscribeToChannel]);

  const loadPreBookedRooms = async () => {
    try {
      setLoading(true);
      
      // Use dedicated prebooked rooms API
      const data = await fetchPrebookedRooms();
      
      console.log('🔍 API Response:', data);
      console.log('📅 Today:', new Date().toISOString().split('T')[0]);
      console.log('👥 Prebooked rooms from API:', data.data?.length || 0);
      
      if (data.success && data.data) {
        // Data is already filtered by backend for future bookings
        console.log('🔮 Prebooked rooms found:', data.data.length);
        setPreBookedRooms(data.data);
      } else {
        console.error('❌ API Error:', data);
        toast.error(data.message || 'Failed to load pre-booked rooms');
        setPreBookedRooms([]);
      }
    } catch (error) {
      console.error('Error loading pre-booked rooms:', error);
      toast.error(error.message || 'Network error while loading pre-booked rooms');
      setPreBookedRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getDaysUntilCheckIn = (checkInDate) => {
    if (!checkInDate) return 0;
    const today = new Date();
    const checkIn = new Date(checkInDate);
    const diffTime = checkIn - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleViewGuest = (guest) => {
    setSelectedGuest(guest);
    setShowGuestDetails(true);
  };

  const handleCloseModal = () => {
    setShowGuestDetails(false);
    setShowEditForm(false);
    setSelectedGuest(null);
    setEditFormData({});
  };

  const handleModifyBooking = () => {
    if (selectedGuest) {
      console.log('🔍 Initializing form with guest data:', selectedGuest);
      console.log('🆔 Guest ID Proof Data:', {
        id_proof_type: selectedGuest.id_proof_type,
        id_proof_number: selectedGuest.id_proof_number
      });
      
      // Initialize form data with current guest data
      const formData = {
        // Guest Information
        first_name: selectedGuest.first_name || selectedGuest.firstName || '',
        last_name: selectedGuest.last_name || selectedGuest.lastName || '',
        phone: selectedGuest.phone || '',
        email: selectedGuest.email || '',
        address: selectedGuest.address || '',
        id_proof_type: selectedGuest.id_proof_type || selectedGuest.idProofType || 
          (() => {
            const idNumber = selectedGuest.id_proof_number || selectedGuest.idProofNumber || '';
            if (idNumber.length === 12) return 'national_id'; // Aadhar Number
            if (idNumber.length === 13) return 'national_id'; // Aadhar Number (13 digits)
            if (idNumber.length === 10) return 'other'; // Voter ID
            if (idNumber.length === 8) return 'driving_license'; // Driving License
            if (idNumber.length >= 6 && idNumber.length <= 9) return 'passport'; // Passport ID
            return '';
          })(),
        id_proof_number: selectedGuest.id_proof_number || selectedGuest.idProofNumber || '',
        
        // Booking Information
        room_number: selectedGuest.room_number || '',
        check_in_date: selectedGuest.check_in_date || '',
        check_out_date: selectedGuest.check_out_date || '',
        check_in_time: selectedGuest.check_in_time || '',
        check_in_ampm: selectedGuest.check_in_ampm || 'AM',
        check_out_time: selectedGuest.check_out_time || '',
        check_out_ampm: selectedGuest.check_out_ampm || 'AM',
        adults: selectedGuest.adults || 1,
        children: selectedGuest.children || 0,
        
        // Payment Information
        total_amount: selectedGuest.total_amount || 0,
        paid_amount: selectedGuest.paid_amount || 0,
        payment_status: selectedGuest.payment_status || 'pending',
        
        // Corporate Information (not available in current database schema)
        // company_name: selectedGuest.company_name || '',
        // gst_number: selectedGuest.gst_number || '',
        // contact_person: selectedGuest.contact_person || '',
        // contact_phone: selectedGuest.contact_phone || '',
        // contact_email: selectedGuest.contact_email || '',
        // billing_address: selectedGuest.billing_address || '',
        
        // Booking Details
        booking_reference: selectedGuest.booking_reference || '',
        booking_status: selectedGuest.booking_status || 'confirmed',
        booking_source: selectedGuest.booking_source || 'walk_in',
        owner_reference: selectedGuest.owner_reference || ''
      };
      
      setEditFormData(formData);
      setShowEditForm(true);
      loadAvailableRooms();
    }
  };

  const loadAvailableRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${buildApiUrl('rooms/getAll.php')}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableRooms(data.rooms || []);
        }
      }
    } catch (error) {
      console.error('Error loading available rooms:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveBooking = async () => {
    console.log('🔄 Save button clicked!');
    console.log('📝 Current editFormData:', editFormData);
    console.log('👤 Selected guest:', selectedGuest);
    console.log('🆔 ID Proof Form Data:', {
      id_proof_type: editFormData.id_proof_type,
      id_proof_number: editFormData.id_proof_number
    });
    
    try {
      // Basic validation
      if (!editFormData.first_name || !editFormData.phone) {
        toast.error('Please fill in at least first name and phone number');
        return;
      }
      
      if (!selectedGuest || !selectedGuest.booking_id) {
        toast.error('No booking selected for update');
        return;
      }
      
      setSaving(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found. Please login again.');
        setSaving(false);
        return;
      }
      
      // Structure the data according to API expectations
      const updateData = {
        booking_id: selectedGuest.booking_id,
        guest_info: {
          first_name: editFormData.first_name || '',
          last_name: editFormData.last_name || 'Guest',
          phone: editFormData.phone || '',
          email: editFormData.email || '',
          address: editFormData.address || '',
          id_proof_type: editFormData.id_proof_type || '',
          id_proof_number: editFormData.id_proof_number || ''
        },
        // Booking details
        room_number: editFormData.room_number || selectedGuest.room_number || '',
        check_in_date: editFormData.check_in_date || selectedGuest.check_in_date || '',
        check_out_date: editFormData.check_out_date || selectedGuest.check_out_date || '',
        check_in_time: editFormData.check_in_time || selectedGuest.check_in_time || '',
        check_in_ampm: editFormData.check_in_ampm || selectedGuest.check_in_ampm || 'AM',
        check_out_time: editFormData.check_out_time || selectedGuest.check_out_time || '',
        check_out_ampm: editFormData.check_out_ampm || selectedGuest.check_out_ampm || 'AM',
        adults: editFormData.adults || selectedGuest.adults || 1,
        children: editFormData.children || selectedGuest.children || 0,
        total_amount: editFormData.total_amount || selectedGuest.total_amount || 0,
        paid_amount: editFormData.paid_amount || selectedGuest.paid_amount || 0,
        payment_status: editFormData.payment_status || selectedGuest.payment_status || 'pending',
        booking_status: editFormData.booking_status || selectedGuest.booking_status || 'confirmed',
        booking_source: editFormData.booking_source || selectedGuest.booking_source || 'walk_in',
        owner_reference: editFormData.owner_reference || selectedGuest.owner_reference || ''
      };
      
      console.log('🔄 Sending update data:', updateData);
      console.log('🆔 ID Proof Data:', {
        id_proof_type: updateData.guest_info.id_proof_type,
        id_proof_number: updateData.guest_info.id_proof_number
      });
      
      // Use dedicated prebooked rooms API utility
      const data = await updatePrebookedBooking(selectedGuest.booking_id, updateData);
      
      console.log('📡 Update response:', data);
      
      if (data.success) {
        toast.success('Booking updated successfully!');
        
        // Close modals and reset state
        setShowEditForm(false);
        setShowGuestDetails(false);
        setSelectedGuest(null);
        setEditFormData({});
        
        // Refresh the pre-booked rooms list
        await loadPreBookedRooms();
      } else {
        console.error('❌ API Error:', data);
        toast.error(data.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('❌ Error updating booking:', error);
      toast.error('Network error while updating booking');
    } finally {
      setSaving(false);
    }
  };

  // Add keyboard shortcut to close modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && (showGuestDetails || showEditForm)) {
        handleCloseModal();
      }
    };

    if (showGuestDetails || showEditForm) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showGuestDetails, showEditForm]);

  // Ensure form data is properly initialized when edit form opens
  useEffect(() => {
    if (showEditForm && selectedGuest && Object.keys(editFormData).length === 0) {
      handleModifyBooking();
    }
  }, [showEditForm, selectedGuest]);

  const filteredRooms = preBookedRooms.filter(room => {
    const guestName = `${room.first_name || ''} ${room.last_name || ''}`.trim();
    const matchesSearch = 
      room.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.phone?.includes(searchTerm) ||
      room.email?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pre-booked Rooms</h1>
            <p className="text-gray-600">View and manage rooms with future bookings</p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <button
              onClick={loadPreBookedRooms}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <FaSync className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by room number, guest name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FaCalendarAlt className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-600">{filteredRooms.length}</div>
              <div className="text-sm text-gray-600">Pre-booked Rooms</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <FaClock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-600">
                {filteredRooms.filter(room => getDaysUntilCheckIn(room.check_in_date) <= 3).length}
              </div>
              <div className="text-sm text-gray-600">Check-in within 3 days</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <FaMoneyBillWave className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(filteredRooms.reduce((sum, room) => sum + (parseFloat(room.total_amount) || 0), 0))}
              </div>
              <div className="text-sm text-gray-600">Total Value</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-booked Rooms List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Pre-booked Rooms ({filteredRooms.length})
          </h2>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FaSync className="animate-spin text-4xl text-blue-600 mb-4" />
              <p className="text-lg text-gray-600">Loading pre-booked rooms...</p>
            </div>
          ) : filteredRooms.length > 0 ? (
            <div className="space-y-4">
              {filteredRooms.map((room, index) => {
                const daysUntilCheckIn = getDaysUntilCheckIn(room.check_in_date);
                const isUpcoming = daysUntilCheckIn <= 3;
                
                return (
                  <div 
                    key={`${room.room_number}-${index}`}
                    className={`bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-300 ${
                      isUpcoming ? 'border-orange-300 bg-orange-50' : ''
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      {/* Room and Guest Info */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 lg:mb-0">
                        {/* Room Details */}
                        <div>
                          <div className="flex items-center mb-2">
                            <FaBed className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="font-semibold text-lg text-gray-900">
                              Room {room.room_number}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center mb-1">
                              <FaBuilding className="w-3 h-3 mr-1" />
                              {room.room_type_name || 'Standard'}
                            </div>
                          </div>
                        </div>

                        {/* Guest Details */}
                        <div>
                          <div className="flex items-center mb-2">
                            <FaUser className="w-4 h-4 text-green-600 mr-2" />
                            <span className="font-medium text-gray-900">
                              {`${room.first_name || ''} ${room.last_name || ''}`.trim() || 'Guest Name'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            {room.phone && (
                              <div className="flex items-center">
                                <FaPhone className="w-3 h-3 mr-1" />
                                {room.phone}
                              </div>
                            )}
                            {room.email && (
                              <div className="flex items-center">
                                <FaEnvelope className="w-3 h-3 mr-1" />
                                {room.email}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Booking Details */}
                        <div>
                          <div className="flex items-center mb-2">
                            <FaCalendarAlt className="w-4 h-4 text-purple-600 mr-2" />
                            <span className="font-medium text-gray-900">Check-in</span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>{formatDate(room.check_in_date)}</div>
                            <div className={`font-medium ${isUpcoming ? 'text-orange-600' : 'text-gray-500'}`}>
                              {daysUntilCheckIn === 0 ? 'Today' : 
                               daysUntilCheckIn === 1 ? 'Tomorrow' : 
                               `In ${daysUntilCheckIn} days`}
                            </div>
                            <div className="text-xs">
                              Until: {formatDate(room.check_out_date)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions and Amount */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {formatCurrency(room.total_amount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {room.payment_status === 'completed' ? (
                              <span className="text-green-600 font-medium">Paid</span>
                            ) : (
                              <span className="text-orange-600 font-medium">
                                Due: {formatCurrency(room.remaining_amount || room.total_amount)}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center space-x-2"
                          onClick={() => handleViewGuest(room)}
                        >
                          <FaEye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </div>
                    </div>

                    {isUpcoming && (
                      <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded-md">
                        <p className="text-sm text-orange-800 font-medium">
                          ⚠️ Upcoming check-in - Ensure room is ready
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No pre-booked rooms</h3>
              <p className="text-gray-600">
                {searchTerm ? 'No rooms match your search criteria' : 'No future bookings found'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guest Details Modal */}
      {showGuestDetails && selectedGuest && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Guest Details</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Guest Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaUser className="w-5 h-5 mr-2 text-blue-600" />
                      Guest Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-gray-900 font-medium">
                          {`${selectedGuest.first_name || ''} ${selectedGuest.last_name || ''}`.trim() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{selectedGuest.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">{selectedGuest.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="text-gray-900">{selectedGuest.address || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">ID Proof</label>
                        <p className="text-gray-900">
                          {(() => {
                            const idType = selectedGuest.id_proof_type;
                            const idNumber = selectedGuest.id_proof_number;
                            
                            // Convert database values to user-friendly labels
                            let displayType = 'N/A';
                            if (idType === 'national_id') displayType = 'Aadhar Number';
                            else if (idType === 'driving_license') displayType = 'Driving License';
                            else if (idType === 'passport') displayType = 'Passport ID';
                            else if (idType === 'other') displayType = 'Other';
                            else if (idType) displayType = idType;
                            
                            // Smart detection if no type is stored
                            if (!idType && idNumber) {
                              if (idNumber.length === 12 || idNumber.length === 13) displayType = 'Aadhar Number';
                              else if (idNumber.length === 10) displayType = 'Voter ID';
                              else if (idNumber.length === 8) displayType = 'Driving License';
                              else if (idNumber.length >= 6 && idNumber.length <= 9) displayType = 'Passport ID';
                            }
                            
                            return `${displayType}${idNumber ? ` - ${idNumber}` : ''}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Company Information (not available in current database schema) */}
                  {/* {selectedGuest.company_name && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FaBuilding className="w-5 h-5 mr-2 text-purple-600" />
                        Company Information
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Company Name</label>
                          <p className="text-gray-900 font-medium">{selectedGuest.company_name}</p>
                        </div>
                        {selectedGuest.gst_number && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">GST Number</label>
                            <p className="text-gray-900">{selectedGuest.gst_number}</p>
                          </div>
                        )}
                        {selectedGuest.contact_person && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Contact Person</label>
                            <p className="text-gray-900">{selectedGuest.contact_person}</p>
                          </div>
                        )}
                        {selectedGuest.billing_address && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Billing Address</label>
                            <p className="text-gray-900">{selectedGuest.billing_address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )} */}
                </div>

                {/* Booking Information */}
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaBed className="w-5 h-5 mr-2 text-blue-600" />
                      Room & Booking Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Room Number</label>
                        <p className="text-gray-900 font-bold text-lg">{selectedGuest.room_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Room Type</label>
                        <p className="text-gray-900">{selectedGuest.room_type_name || 'Standard'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Booking Reference</label>
                        <p className="text-gray-900 font-mono">{selectedGuest.booking_reference || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Booking Status</label>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          selectedGuest.booking_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          selectedGuest.booking_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedGuest.booking_status?.toUpperCase() || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Guests</label>
                        <p className="text-gray-900">
                          {selectedGuest.adults || 1} Adults
                          {selectedGuest.children > 0 && `, ${selectedGuest.children} Children`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaCalendarAlt className="w-5 h-5 mr-2 text-green-600" />
                      Stay Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-in Date</label>
                        <p className="text-gray-900 font-medium">{formatDate(selectedGuest.check_in_date)}</p>
                        <p className="text-sm text-green-600">
                          In {getDaysUntilCheckIn(selectedGuest.check_in_date)} days
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-out Date</label>
                        <p className="text-gray-900">{formatDate(selectedGuest.check_out_date)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-in Time</label>
                        <p className="text-gray-900">
                          {selectedGuest.check_in_time ? 
                            `${selectedGuest.check_in_time} ${selectedGuest.check_in_ampm || ''}` : 
                            'Not specified'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Check-out Time</label>
                        <p className="text-gray-900">
                          {selectedGuest.check_out_time ? 
                            `${selectedGuest.check_out_time} ${selectedGuest.check_out_ampm || ''}` : 
                            'Not specified'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaMoneyBillWave className="w-5 h-5 mr-2 text-yellow-600" />
                      Payment Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Total Amount</label>
                        <p className="text-gray-900 font-bold text-lg">{formatCurrency(selectedGuest.total_amount)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Paid Amount</label>
                        <p className="text-green-600 font-medium">{formatCurrency(selectedGuest.paid_amount || 0)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Remaining Amount</label>
                        <p className={`font-medium ${
                          (selectedGuest.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(selectedGuest.remaining_amount || 0)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Payment Status</label>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          selectedGuest.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                          selectedGuest.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedGuest.payment_status?.toUpperCase() || 'PENDING'}
                        </span>
                      </div>
                      {selectedGuest.owner_reference && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Owner Reference</label>
                          <p className="text-blue-600 font-medium">{selectedGuest.owner_reference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={handleModifyBooking}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Modify Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditForm && selectedGuest && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Modify Booking</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Guest Information */}
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaUser className="w-5 h-5 mr-2 text-blue-600" />
                      Guest Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          First Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.first_name || ''}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Last Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.last_name || ''}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={editFormData.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={editFormData.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                          value={editFormData.address || ''}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof Type</label>
                        <select
                          value={editFormData.id_proof_type || ''}
                          onChange={(e) => handleInputChange('id_proof_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select ID Type</option>
                          <option value="national_id">Aadhar Number</option>
                          <option value="driving_license">Driving License</option>
                          <option value="passport">Passport ID</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID Proof Number</label>
                        <input
                          type="text"
                          value={editFormData.id_proof_number || ''}
                          onChange={(e) => handleInputChange('id_proof_number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Corporate Information (not available in current database schema) */}
                  {/* <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaBuilding className="w-5 h-5 mr-2 text-purple-600" />
                      Corporate Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                        <input
                          type="text"
                          value={editFormData.company_name || ''}
                          onChange={(e) => handleInputChange('company_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                        <input
                          type="text"
                          value={editFormData.gst_number || ''}
                          onChange={(e) => handleInputChange('gst_number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                        <input
                          type="text"
                          value={editFormData.contact_person || ''}
                          onChange={(e) => handleInputChange('contact_person', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                        <input
                          type="tel"
                          value={editFormData.contact_phone || ''}
                          onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                        <textarea
                          value={editFormData.billing_address || ''}
                          onChange={(e) => handleInputChange('billing_address', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div> */}
                </div>

                {/* Booking Information */}
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaBed className="w-5 h-5 mr-2 text-blue-600" />
                      Room & Booking Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Room Number <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={editFormData.room_number || ''}
                          onChange={(e) => handleInputChange('room_number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Select Room</option>
                          {availableRooms.map(room => (
                            <option key={room.room_number} value={room.room_number}>
                              Room {room.room_number} - {room.room_type_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Booking Status</label>
                        <select
                          value={editFormData.booking_status || ''}
                          onChange={(e) => handleInputChange('booking_status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="confirmed">Confirmed</option>
                          <option value="pending">Pending</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                        <input
                          type="number"
                          min="1"
                          value={editFormData.adults || 1}
                          onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                        <input
                          type="number"
                          min="0"
                          value={editFormData.children || 0}
                          onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaCalendarAlt className="w-5 h-5 mr-2 text-green-600" />
                      Stay Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Check-in Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={editFormData.check_in_date || ''}
                          onChange={(e) => handleInputChange('check_in_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Check-out Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={editFormData.check_out_date || ''}
                          onChange={(e) => handleInputChange('check_out_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={editFormData.check_in_time || ''}
                            onChange={(e) => handleInputChange('check_in_time', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <select
                            value={editFormData.check_in_ampm || 'AM'}
                            onChange={(e) => handleInputChange('check_in_ampm', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={editFormData.check_out_time || ''}
                            onChange={(e) => handleInputChange('check_out_time', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <select
                            value={editFormData.check_out_ampm || 'AM'}
                            onChange={(e) => handleInputChange('check_out_ampm', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FaMoneyBillWave className="w-5 h-5 mr-2 text-yellow-600" />
                      Payment Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editFormData.total_amount || 0}
                          onChange={(e) => handleInputChange('total_amount', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editFormData.paid_amount || 0}
                          onChange={(e) => handleInputChange('paid_amount', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                        <select
                          value={editFormData.payment_status || ''}
                          onChange={(e) => handleInputChange('payment_status', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="partial">Partial</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Booking Source</label>
                        <select
                          value={editFormData.booking_source || ''}
                          onChange={(e) => handleInputChange('booking_source', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="walk_in">Walk-in</option>
                          <option value="online">Online</option>
                          <option value="phone">Phone</option>
                          <option value="corporate">Corporate</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Owner Reference</label>
                        <input
                          type="text"
                          value={editFormData.owner_reference || ''}
                          onChange={(e) => handleInputChange('owner_reference', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Optional owner reference"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBooking}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {saving ? (
                    <>
                      <FaSync className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreBookedRooms;
