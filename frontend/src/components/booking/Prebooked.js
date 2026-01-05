import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import { FaCalendarAlt, FaUser, FaPhone, FaEnvelope, FaBed, FaClock, FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import EditBookingPopup from './EditBookingPopup';
import CancelBooking from './CancelBooking';
import { toast } from 'react-toastify';
import './Prebooked.css';

const Prebooked = () => {
    const navigate = useNavigate();
    const [prebookedRooms, setPrebookedRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        check_in_date: '',
        room_type: '',
        guest_name: ''
    });

    // Edit and Cancel booking states
    const [showEditModal, setShowEditModal] = useState(false);
    const [bookingToEdit, setBookingToEdit] = useState(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState(null);

    const loadPrebookedRooms = async () => {
        setLoading(true);
        setError('');
        
        try {
            const params = {
                action: 'get_prebooked',
                check_in_date: filters.check_in_date,
                room_type: filters.room_type,
                guest_name: filters.guest_name
            };

            const response = await axios.get(buildApiUrl('reception/prebooked_api.php'), { params });
            
            if (response.data.success) {
                setPrebookedRooms(response.data.data);
            } else {
                setError(response.data.message || 'Failed to load prebooked rooms');
            }
        } catch (error) {
            console.error('Error loading prebooked rooms:', error);
            setError('Error loading prebooked rooms: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (bookingId) => {
        try {
            const response = await axios.post(buildApiUrl('reception/check_in.php'), {
                booking_id: bookingId,
                check_in_time: new Date().toTimeString().slice(0, 5),
                notes: 'Check-in from prebooked list'
            });
            
            if (response.data.success) {
                // Reload the list after successful check-in
                loadPrebookedRooms();
                alert('Guest checked in successfully!');
            } else {
                alert('Check-in failed: ' + response.data.message);
            }
        } catch (error) {
            console.error('Error during check-in:', error);
            alert('Check-in failed: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleEditBooking = (booking) => {
        setBookingToEdit(booking);
        setShowEditModal(true);
    };

    const handleCancelBooking = (booking) => {
        setBookingToCancel(booking);
        setShowCancelModal(true);
    };

    const handleEditSuccess = (updatedBooking) => {
        toast.success('Booking updated successfully!');
        setShowEditModal(false);
        setBookingToEdit(null);
        loadPrebookedRooms();
    };

    const handleCancellationSuccess = (cancellationData) => {
        const successMessage = cancellationData.cancellation_fee > 0 
            ? `Booking cancelled successfully! Cancellation Fee: ₹${cancellationData.cancellation_fee}, Refund: ₹${cancellationData.refund_amount}`
            : `Booking cancelled successfully! Full refund: ₹${cancellationData.refund_amount}`;
        
        toast.success(successMessage);
        setShowCancelModal(false);
        setBookingToCancel(null);
        loadPrebookedRooms();
        
        if (cancellationData.room_number) {
            toast.info(`Room ${cancellationData.room_number} is now available for new bookings`);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        return timeString.slice(0, 5);
    };

    const getDaysUntilCheckIn = (checkInDate) => {
        const today = new Date();
        const checkIn = new Date(checkInDate);
        const diffTime = checkIn - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 0) return 'Overdue';
        return `${diffDays} days`;
    };

    useEffect(() => {
        loadPrebookedRooms();
    }, [filters]);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
                <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                            <FaCalendarAlt className="text-xl sm:text-2xl text-blue-600" />
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Prebooked Rooms</h1>
                        </div>
                        <div className="flex space-x-2 w-full sm:w-auto">
                            <button
                                onClick={loadPrebookedRooms}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto touch-manipulation"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                                <input
                                    type="date"
                                    value={filters.check_in_date}
                                    onChange={(e) => setFilters({...filters, check_in_date: e.target.value})}
                                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                                <select
                                    value={filters.room_type}
                                    onChange={(e) => setFilters({...filters, room_type: e.target.value})}
                                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation"
                                >
                                    <option value="">All Types</option>
                                    <option value="deluxe">Deluxe</option>
                                    <option value="executive">Executive</option>
                                    <option value="suite">Suite</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                                <input
                                    type="text"
                                    value={filters.guest_name}
                                    onChange={(e) => setFilters({...filters, guest_name: e.target.value})}
                                    placeholder="Search by guest name..."
                                    className="w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 sm:p-4 mb-4">
                            <p className="text-sm sm:text-base text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="text-center py-6 sm:py-8">
                            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm sm:text-base text-gray-600">Loading prebooked rooms...</p>
                        </div>
                    )}

                    {/* Prebooked Rooms List */}
                    {!loading && (
                        <div className="space-y-3 sm:space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                                    Prebooked Rooms ({prebookedRooms.length})
                                </h3>
                            </div>
                            
                            {/* Future Prebooked Rooms */}
                            {prebookedRooms.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                    {prebookedRooms.map((booking) => (
                                        <div key={booking.booking_id} className="border rounded-lg p-3 sm:p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-2 sm:mb-3">
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                                                        Room {booking.room_number}
                                                    </h4>
                                                    <p className="text-xs sm:text-sm text-gray-600 truncate">{booking.room_type_name}</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                                        {getDaysUntilCheckIn(booking.check_in_date)}
                                                    </span>
                                                    {booking.payment_remaining && (
                                                        <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium whitespace-nowrap">
                                                            ⚠️ Payment Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Guest Information */}
                                            <div className="space-y-1 mb-2 sm:mb-3">
                                                <div className="flex items-center space-x-1 min-w-0">
                                                    <FaUser className="text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs sm:text-sm text-gray-700 truncate">
                                                        {booking.guest_name || `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'Guest'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-1 min-w-0">
                                                    <FaPhone className="text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs sm:text-sm text-gray-700 truncate">
                                                        {booking.phone}
                                                    </span>
                                                </div>
                                                {booking.email && (
                                                    <div className="flex items-center space-x-1 min-w-0">
                                                        <FaEnvelope className="text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs sm:text-sm text-gray-700 truncate">
                                                            {booking.email}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Booking Details */}
                                            <div className="bg-gray-50 rounded p-2 sm:p-3 mb-2 sm:mb-3">
                                                <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                                                    <div>
                                                        <span className="font-medium text-gray-700 block">Check-in:</span>
                                                        <div className="text-gray-600 text-xs sm:text-sm">{formatDate(booking.check_in_date)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700 block">Check-out:</span>
                                                        <div className="text-gray-600 text-xs sm:text-sm">{formatDate(booking.check_out_date)}</div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700 block">Guests:</span>
                                                        <div className="text-gray-600 text-xs sm:text-sm">
                                                            {booking.adults} adults, {booking.children} children
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium text-gray-700 block">Total Amount:</span>
                                                        <div className="text-gray-600 text-xs sm:text-sm">₹{booking.total_amount}</div>
                                                    </div>
                                                </div>
                                                
                                                {/* Payment Details */}
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                                                        <div>
                                                            <span className="font-medium text-green-700 block">Advance Paid:</span>
                                                            <div className="text-green-600 font-semibold text-xs sm:text-sm">₹{booking.paid_amount || 0}</div>
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-red-700 block">Remaining:</span>
                                                            <div className={`font-semibold text-xs sm:text-sm ${(booking.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                ₹{booking.remaining_amount || 0}
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
                                                <button
                                                    onClick={() => handleCheckIn(booking.booking_id)}
                                                    disabled={getDaysUntilCheckIn(booking.check_in_date) !== 'Today'}
                                                    className={`flex-1 px-3 py-2.5 sm:py-1.5 text-xs sm:text-xs rounded-md transition-colors touch-manipulation ${
                                                        getDaysUntilCheckIn(booking.check_in_date) === 'Today'
                                                            ? 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                >
                                                    <FaEye className="inline mr-1" />
                                                    Check In
                                                </button>
                                                <div className="flex space-x-1">
                                                    <button
                                                        onClick={() => handleEditBooking(booking)}
                                                        className="flex-1 px-3 py-2.5 sm:py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                                                    >
                                                        <FaEdit className="inline mr-1" />
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelBooking(booking)}
                                                        className="flex-1 px-3 py-2.5 sm:py-1.5 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation"
                                                    >
                                                        <FaTrash className="inline mr-1" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 sm:py-8">
                                    <FaCalendarAlt className="text-3xl sm:text-4xl text-gray-400 mx-auto mb-3 sm:mb-4" />
                                    <p className="text-sm sm:text-base text-gray-600">No prebooked rooms found</p>
                                    <p className="text-xs sm:text-sm text-gray-500 mt-2 px-4">
                                        When prebooked dates arrive, rooms automatically appear in Guest Search for check-in and payment collection.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Booking Modal */}
            {showEditModal && bookingToEdit && (
                <EditBookingPopup
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false);
                        setBookingToEdit(null);
                    }}
                    booking={{
                        id: bookingToEdit.booking_id,
                        first_name: bookingToEdit.first_name || (bookingToEdit.guest_name ? bookingToEdit.guest_name.split(' ')[0] : '') || '',
                        last_name: bookingToEdit.last_name || (bookingToEdit.guest_name ? bookingToEdit.guest_name.split(' ').slice(1).join(' ') : '') || '',
                        email: bookingToEdit.email || '',
                        phone: bookingToEdit.phone || '',
                        address: bookingToEdit.address || '',
                        check_in_date: bookingToEdit.check_in_date || '',
                        check_out_date: bookingToEdit.check_out_date || '',
                        adults: bookingToEdit.adults || 1,
                        children: bookingToEdit.children || 0,
                        room_number: bookingToEdit.room_number || '',
                        notes: bookingToEdit.notes || ''
                    }}
                    onSuccess={handleEditSuccess}
                />
            )}

            {/* Cancellation Modal */}
            {showCancelModal && bookingToCancel && (
                <CancelBooking
                    booking={{
                        id: bookingToCancel.booking_id,
                        guest_name: bookingToCancel.guest_name || `${bookingToCancel.first_name || ''} ${bookingToCancel.last_name || ''}`.trim() || 'Guest',
                        room_number: bookingToCancel.room_number || '',
                        check_in_date: bookingToCancel.check_in_date || '',
                        check_out_date: bookingToCancel.check_out_date || '',
                        total_amount: bookingToCancel.total_amount || 0,
                        status: bookingToCancel.status || bookingToCancel.booking_status || 'confirmed'
                    }}
                    onClose={() => {
                        setShowCancelModal(false);
                        setBookingToCancel(null);
                    }}
                    onCancellationSuccess={handleCancellationSuccess}
                />
            )}
        </div>
    );
};

export default Prebooked;
