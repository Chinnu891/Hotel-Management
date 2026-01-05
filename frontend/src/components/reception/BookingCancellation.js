import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl } from '../../config/api';
import { toast } from 'react-toastify';

const BookingCancellation = () => {
    const { bookingId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(null);
    const [cancellationData, setCancellationData] = useState({
        cancellation_reason: '',
        cancellation_details: '',
        refund_amount: 0,
        refund_method: 'cash'
    });
    const [refundCalculation, setRefundCalculation] = useState(null);

    const cancellationReasons = [
        { value: 'guest_request', label: 'Guest Request', description: 'Guest requested cancellation' },
        { value: 'medical_emergency', label: 'Medical Emergency', description: 'Medical emergency with documentation' },
        { value: 'travel_issues', label: 'Travel Issues', description: 'Flight delays, visa issues, etc.' },
        { value: 'hotel_fault', label: 'Hotel Fault', description: 'Room issues, service problems' },
        { value: 'weather_conditions', label: 'Weather Conditions', description: 'Natural disasters, extreme weather' },
        { value: 'force_majeure', label: 'Force Majeure', description: 'Government orders, pandemics' },
        { value: 'other', label: 'Other', description: 'Other valid reasons' }
    ];

    const refundMethods = [
        { value: 'cash', label: 'Cash' },
        { value: 'bank_transfer', label: 'Bank Transfer' },
        { value: 'credit_card', label: 'Credit Card' },
        { value: 'debit_card', label: 'Debit Card' },
        { value: 'upi', label: 'UPI' },
        { value: 'cheque', label: 'Cheque' },
        { value: 'wallet_credit', label: 'Wallet Credit' }
    ];

    useEffect(() => {
        if (bookingId) {
            fetchBookingDetails();
        }
    }, [bookingId]);

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(buildApiUrl(`reception/get_booking_details.php?id=${bookingId}`));
            
            if (response.data.success) {
                setBooking(response.data.data);
                calculateRefund(response.data.data);
            } else {
                toast.error('Failed to fetch booking details');
            }
        } catch (error) {
            console.error('Error fetching booking details:', error);
            toast.error('Error fetching booking details');
        } finally {
            setLoading(false);
        }
    };

    const calculateRefund = (bookingData) => {
        const checkIn = new Date(bookingData.check_in_date);
        const today = new Date();
        const timeDiff = checkIn.getTime() - today.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);
        
        let refundPercentage = 0;
        let cancellationFee = 0;
        let refundType = '';

        if (hoursDiff > 24) {
            refundPercentage = 100;
            refundType = 'Full Refund';
        } else if (hoursDiff > 12) {
            refundPercentage = 75;
            cancellationFee = 25;
            refundType = '75% Refund';
        } else if (hoursDiff > 6) {
            refundPercentage = 50;
            cancellationFee = 50;
            refundType = '50% Refund';
        } else if (hoursDiff > 0) {
            refundPercentage = 25;
            cancellationFee = 75;
            refundType = '25% Refund';
        } else {
            refundPercentage = 0;
            cancellationFee = 100;
            refundType = 'No Refund';
        }

        // Special cases
        if (cancellationData.cancellation_reason === 'medical_emergency') {
            refundPercentage = 100;
            cancellationFee = 0;
            refundType = 'Full Refund (Medical Emergency)';
        } else if (cancellationData.cancellation_reason === 'hotel_fault') {
            refundPercentage = 100;
            cancellationFee = 0;
            refundType = 'Full Refund (Hotel Fault)';
        }

        const maxRefundAmount = (bookingData.total_amount * refundPercentage) / 100;
        const cancellationFeeAmount = (bookingData.total_amount * cancellationFee) / 100;

        setRefundCalculation({
            refundPercentage,
            cancellationFee,
            refundType,
            maxRefundAmount,
            cancellationFeeAmount,
            hoursUntilCheckin: Math.max(0, hoursDiff)
        });

        setCancellationData(prev => ({
            ...prev,
            refund_amount: maxRefundAmount
        }));
    };

    const handleInputChange = (field, value) => {
        setCancellationData(prev => ({
            ...prev,
            [field]: value
        }));

        if (field === 'cancellation_reason') {
            // Recalculate refund when reason changes
            setTimeout(() => calculateRefund(booking), 100);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!cancellationData.cancellation_reason) {
            toast.error('Please select a cancellation reason');
            return;
        }

        if (cancellationData.refund_amount < 0) {
            toast.error('Refund amount cannot be negative');
            return;
        }

        // No refund validation - user has full control
        console.log('Refund validation bypassed - user controls refund amount');

        try {
            setLoading(true);
            
            const payload = {
                booking_id: parseInt(bookingId),
                cancellation_reason: cancellationData.cancellation_reason,
                cancellation_details: cancellationData.cancellation_details,
                cancelled_by: 1, // Current user ID
                refund_amount: parseFloat(cancellationData.refund_amount)
            };

            const response = await axios.post(buildApiUrl('booking/cancel_booking.php'), payload);
            
            if (response.data.success) {
                toast.success('Booking cancelled successfully!');
                
                // Show refund details
                const refundInfo = response.data.data;
                toast.info(`
                    Cancellation processed successfully!
                    Refund Amount: ₹${refundInfo.refund_amount}
                    Cancellation Fee: ₹${refundInfo.cancellation_fee}
                    Refund Type: ${refundInfo.refund_type}
                `);
                
                // Navigate back to bookings list
                navigate('/reception/bookings');
            } else {
                toast.error(response.data.message || 'Failed to cancel booking');
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast.error('Error cancelling booking: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (loading && !booking) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h2>
                        <p className="text-gray-600 mb-4">The requested booking could not be found.</p>
                        <button
                            onClick={() => navigate('/reception/bookings')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            Back to Bookings
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">Cancel Booking</h1>
                        <button
                            onClick={() => navigate('/reception/bookings')}
                            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                        >
                            Back to Bookings
                        </button>
                    </div>
                    
                    <div className="border-t pt-4">
                        <h2 className="text-xl font-semibold text-gray-800 mb-3">Booking Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p><strong>Guest:</strong> {booking.guest_name}</p>
                                <p><strong>Room:</strong> {booking.room_number} ({booking.room_type})</p>
                                <p><strong>Check-in:</strong> {new Date(booking.check_in_date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <p><strong>Check-out:</strong> {new Date(booking.check_out_date).toLocaleDateString()}</p>
                                <p><strong>Total Amount:</strong> ₹{booking.total_amount}</p>
                                <p><strong>Status:</strong> 
                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                        booking.status === 'checked_in' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {booking.status}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cancellation Form */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6">Cancellation & Refund Details</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Cancellation Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cancellation Reason *
                            </label>
                            <select
                                value={cancellationData.cancellation_reason}
                                onChange={(e) => handleInputChange('cancellation_reason', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="">Select a reason</option>
                                {cancellationReasons.map(reason => (
                                    <option key={reason.value} value={reason.value}>
                                        {reason.label} - {reason.description}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Cancellation Details */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Additional Details
                            </label>
                            <textarea
                                value={cancellationData.cancellation_details}
                                onChange={(e) => handleInputChange('cancellation_details', e.target.value)}
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Provide additional details about the cancellation..."
                            />
                        </div>

                        {/* Refund Calculation Display */}
                        {refundCalculation && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-blue-900 mb-3">Refund Calculation</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p><strong>Time until check-in:</strong> {Math.floor(refundCalculation.hoursUntilCheckin)} hours</p>
                                        <p><strong>Refund Type:</strong> {refundCalculation.refundType}</p>
                                        <p><strong>Refund Percentage:</strong> {refundCalculation.refundPercentage}%</p>
                                    </div>
                                    <div>
                                        <p><strong>Maximum Refund:</strong> ₹{refundCalculation.maxRefundAmount.toFixed(2)}</p>
                                        <p><strong>Cancellation Fee:</strong> ₹{refundCalculation.cancellationFeeAmount.toFixed(2)}</p>
                                        <p><strong>Net Refund:</strong> ₹{refundCalculation.maxRefundAmount.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Refund Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Refund Amount (₹) *
                            </label>
                            <input
                                type="number"
                                value={cancellationData.refund_amount}
                                onChange={(e) => handleInputChange('refund_amount', parseFloat(e.target.value) || 0)}
                                min="0"
                                max={refundCalculation?.maxRefundAmount || 0}
                                step="0.01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Maximum refund: ₹{refundCalculation?.maxRefundAmount.toFixed(2) || 0}
                            </p>
                        </div>

                        {/* Refund Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Refund Method *
                            </label>
                            <select
                                value={cancellationData.refund_method}
                                onChange={(e) => handleInputChange('refund_method', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                {refundMethods.map(method => (
                                    <option key={method.value} value={method.value}>
                                        {method.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Warning Message */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Important Notice
                                    </h3>
                                    <div className="mt-2 text-sm text-yellow-700">
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>This action cannot be undone</li>
                                            <li>The room will be made available for new bookings</li>
                                            <li>Refund will be processed according to hotel policy</li>
                                            <li>Guest will receive cancellation confirmation email</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => navigate('/reception/bookings')}
                                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : 'Cancel Booking & Process Refund'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BookingCancellation;
