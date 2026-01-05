import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../config/api';

const BookingConfirmation = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // API base URL from centralized config

    useEffect(() => {
        if (bookingId) {
            fetchBookingDetails();
        }
    }, [bookingId]);

    const fetchBookingDetails = async () => {
        try {
            const response = await axios.get(buildApiUrl(`booking/confirm_booking.php?booking_id=${bookingId}`));
            if (response.data.success) {
                setBooking(response.data.data.confirmation_details);
            } else {
                setError(response.data.message);
            }
        } catch (error) {
            setError('Error fetching booking details');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleNewBooking = () => {
        navigate('/reception/new-booking');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/reception')}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <h2 className="text-xl font-semibold text-yellow-800 mb-2">Booking Not Found</h2>
                    <p className="text-yellow-600 mb-4">The requested booking could not be found.</p>
                    <button
                        onClick={() => navigate('/reception')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 text-center">
                    <div className="flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <h1 className="text-3xl font-bold">Booking Confirmed!</h1>
                    </div>
                    <p className="text-blue-100">Your hotel reservation has been successfully confirmed</p>
                </div>

                {/* Booking Reference */}
                <div className="bg-gray-50 p-6 border-b">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Reference</h2>
                        <div className="inline-block bg-blue-100 text-blue-800 px-6 py-3 rounded-lg">
                            <span className="text-3xl font-mono font-bold">{booking.booking_reference}</span>
                        </div>
                        <p className="text-gray-600 mt-2">Please keep this reference number for your records</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Guest Information */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                Guest Information
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium text-gray-700">Name:</span>
                                    <span className="ml-2 text-gray-900">{booking.first_name} {booking.last_name}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Email:</span>
                                    <span className="ml-2 text-gray-900">{booking.email}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Phone:</span>
                                    <span className="ml-2 text-gray-900">{booking.phone}</span>
                                </div>
                                {booking.address && (
                                    <div>
                                        <span className="font-medium text-gray-700">Address:</span>
                                        <span className="ml-2 text-gray-900">{booking.address}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Room Information */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                                </svg>
                                Room Details
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium text-gray-700">Room Type:</span>
                                    <span className="ml-2 text-gray-900">{booking.room_type_name}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Room Number:</span>
                                    <span className="ml-2 text-gray-900">{booking.room_number}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Floor:</span>
                                    <span className="ml-2 text-gray-900">{booking.floor}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Description:</span>
                                    <span className="ml-2 text-gray-900">{booking.room_description}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stay Details */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                </svg>
                                Stay Details
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium text-gray-700">Check-in:</span>
                                    <span className="ml-2 text-gray-900">{booking.check_in_date_formatted}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Check-out:</span>
                                    <span className="ml-2 text-gray-900">{booking.check_out_date_formatted}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Duration:</span>
                                    <span className="ml-2 text-gray-900">{booking.nights} night{booking.nights > 1 ? 's' : ''}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Guests:</span>
                                    <span className="ml-2 text-gray-900">{booking.adults} adults, {booking.children} children</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Information */}
                        <div className="bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                                </svg>
                                Payment Details
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <span className="font-medium text-gray-700">Total Amount:</span>
                                    <span className="ml-2 text-2xl font-bold text-green-600">${booking.total_amount}</span>
                                </div>
                                {booking.payment_method && (
                                    <div>
                                        <span className="font-medium text-gray-700">Payment Method:</span>
                                        <span className="ml-2 text-gray-900 capitalize">{booking.payment_method}</span>
                                    </div>
                                )}
                                {booking.transaction_id && (
                                    <div>
                                        <span className="font-medium text-gray-700">Transaction ID:</span>
                                        <span className="ml-2 text-gray-900 font-mono">{booking.transaction_id}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="font-medium text-gray-700">Status:</span>
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {booking.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Amenities */}
                    {booking.amenities_list && booking.amenities_list.length > 0 && (
                        <div className="mt-8 bg-gray-50 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                Room Amenities
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {booking.amenities_list.map((amenity, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                    >
                                        {amenity.trim()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Important Information */}
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            Important Information
                        </h3>
                        <div className="space-y-2 text-blue-800">
                            <p>• Check-in time: {booking.check_in_time}</p>
                            <p>• Check-out time: {booking.check_out_time}</p>
                            <p>• Please present a valid ID at check-in</p>
                            <p>• Early check-in and late check-out are subject to availability</p>
                            <p>• Cancellation policy: 24 hours before check-in</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handlePrint}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                            </svg>
                            Print Confirmation
                        </button>
                        
                        <button
                            onClick={handleNewBooking}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            New Booking
                        </button>
                        
                        <button
                            onClick={() => navigate('/reception')}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                            </svg>
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingConfirmation;
