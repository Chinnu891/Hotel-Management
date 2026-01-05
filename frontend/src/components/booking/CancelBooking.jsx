import React, { useState, useEffect } from 'react';
import { FaTimes, FaExclamationTriangle, FaMoneyBillWave, FaCalendarAlt, FaUser } from 'react-icons/fa';
import { buildApiUrl, getApiBase } from '../../config/api';
import { API_ENDPOINTS } from '../../config/api';

const CancelBooking = ({ booking, onClose, onCancellationSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [cancellationReason, setCancellationReason] = useState('');
    const [refundAmount, setRefundAmount] = useState(0);
    const [cancellationFee, setCancellationFee] = useState(0);
    const [calculatedRefund, setCalculatedRefund] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    useEffect(() => {
        if (booking) {
            calculateRefund();
        }
    }, [booking]);
    
    // Debug: Monitor cancellationFee changes
    useEffect(() => {
        console.log('cancellationFee state changed to:', cancellationFee);
    }, [cancellationFee]);
    
    // Debug: Monitor refundAmount changes
    useEffect(() => {
        console.log('refundAmount state changed to:', refundAmount);
    }, [refundAmount]);

    const calculateRefund = async () => {
        if (!booking) return;

        try {
            // For now, let's calculate a basic refund based on booking amount
            // In a real scenario, this would come from the backend
            const totalAmount = parseFloat(booking.total_amount) || 0;
            
            // Calculate refund based on typical hotel policies
            // 100% refund for medical emergency or hotel fault
            // 80% refund for other reasons (20% cancellation fee)
            const defaultCancellationFee = totalAmount * 0.2; // 20% fee
            const maxRefund = totalAmount - defaultCancellationFee;
            
            const calculatedData = {
                original_amount: totalAmount,
                cancellation_fee: defaultCancellationFee,
                max_refund: maxRefund,
                refund_type: 'Partial Refund',
                cancellation_policy: '20% cancellation fee applies'
            };
            
            setCalculatedRefund(calculatedData);
            // Only set initial values if user hasn't set custom values
            if (cancellationFee === 0) {
                setCancellationFee(defaultCancellationFee);
                setRefundAmount(maxRefund);
            }
        } catch (error) {
            console.error('Error calculating refund:', error);
            // Fallback calculation
            const totalAmount = parseFloat(booking.total_amount) || 0;
            const defaultCancellationFee = totalAmount * 0.2; // 80% refund
            setCalculatedRefund({
                original_amount: totalAmount,
                cancellation_fee: defaultCancellationFee,
                max_refund: totalAmount - defaultCancellationFee,
                refund_type: 'Partial Refund',
                cancellation_policy: '20% cancellation fee applies'
            });
            // Only set initial values if user hasn't set custom values
            if (cancellationFee === 0) {
                setCancellationFee(defaultCancellationFee);
                setRefundAmount(totalAmount - defaultCancellationFee);
            }
        }
    };

    const handleCancellationReasonChange = (reason) => {
        console.log('handleCancellationReasonChange called with reason:', reason);
        setCancellationReason(reason);
        
        // Only set default values if user hasn't manually set a custom cancellation fee
        if (cancellationFee === 0) {
            const totalAmount = parseFloat(booking.total_amount) || 0;
            
            if (reason === 'medical_emergency' || reason === 'hotel_fault') {
                // Full refund for medical emergency or hotel fault
                console.log('Setting medical/hotel fault - no cancellation fee (initial)');
                setCancellationFee(0);
                setRefundAmount(totalAmount);
                setCalculatedRefund({
                    ...calculatedRefund,
                    max_refund: totalAmount,
                    cancellation_fee: 0,
                    refund_type: 'Full Refund',
                    cancellation_policy: 'No cancellation fee for medical emergency or hotel fault'
                });
            } else {
                // Partial refund for other reasons (20% cancellation fee)
                const defaultCancellationFee = totalAmount * 0.2;
                const maxRefund = totalAmount - defaultCancellationFee;
                console.log('Setting default cancellation fee (initial):', defaultCancellationFee, 'refund:', maxRefund);
                setCancellationFee(defaultCancellationFee);
                setRefundAmount(maxRefund);
                setCalculatedRefund({
                    ...calculatedRefund,
                    max_refund: maxRefund,
                    cancellation_fee: defaultCancellationFee,
                    refund_type: 'Partial Refund',
                    cancellation_policy: '20% cancellation fee applies'
                });
            }
        } else {
            console.log('User has already set custom cancellation fee:', cancellationFee, '- not overriding');
            // Recalculate refund based on current custom fee
            const totalAmount = parseFloat(booking.total_amount) || 0;
            const currentFee = parseFloat(cancellationFee) || 0;
            const currentRefund = totalAmount - currentFee;
            
            setCalculatedRefund({
                ...calculatedRefund,
                max_refund: currentRefund,
                cancellation_fee: currentFee,
                refund_type: currentFee === 0 ? 'Full Refund' : 'Partial Refund',
                cancellation_policy: currentFee === 0 ? 'No cancellation fee' : `Custom cancellation fee: ₹${currentFee}`
            });
        }
    };

    const handleCancellationFeeChange = (fee) => {
        const totalAmount = parseFloat(booking.total_amount) || 0;
        const newFee = parseFloat(fee) || 0;
        
        console.log('handleCancellationFeeChange called with:', { fee, newFee, totalAmount });
        
        // Ensure cancellation fee doesn't exceed total amount
        if (newFee > totalAmount) {
            console.log('Fee exceeds total amount, setting to total amount');
            setCancellationFee(totalAmount);
            setRefundAmount(0);
        } else {
            console.log('Setting cancellation fee to:', newFee, 'and refund to:', totalAmount - newFee);
            setCancellationFee(newFee);
            setRefundAmount(totalAmount - newFee);
        }
        
        // Update calculated refund data
        const updatedCalculatedRefund = {
            ...calculatedRefund,
            cancellation_fee: newFee,
            max_refund: totalAmount - newFee,
            refund_type: newFee === 0 ? 'Full Refund' : 'Partial Refund',
            cancellation_policy: newFee === 0 ? 'No cancellation fee' : `Custom cancellation fee: ₹${newFee}`
        };
        
        console.log('Updated calculated refund:', updatedCalculatedRefund);
        setCalculatedRefund(updatedCalculatedRefund);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!cancellationReason) {
            setError('Please select a cancellation reason');
            return;
        }
        
        // Validate cancellation fee and refund amount
        const totalAmount = parseFloat(booking.total_amount) || 0;
        const fee = parseFloat(cancellationFee) || 0;
        const refund = parseFloat(refundAmount) || 0;
        
        console.log('Form validation - Total:', totalAmount, 'Fee:', fee, 'Refund:', refund);
        
        if (fee < 0) {
            setError('Cancellation fee cannot be negative');
            return;
        }
        
        if (fee > totalAmount) {
            setError('Cancellation fee cannot exceed the total amount');
            return;
        }
        
        if (refund < 0) {
            setError('Refund amount cannot be negative');
            return;
        }
        
        // No refund validation - user has full control
        console.log('Refund validation bypassed - user controls refund amount');

        setShowConfirmation(true);
    };

    const confirmCancellation = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('Starting cancellation process...');
            console.log('Full booking object:', booking);
            console.log('Booking ID:', booking.id, 'or', booking.booking_id);
            console.log('Cancellation reason:', cancellationReason);
            console.log('Cancellation fee:', cancellationFee);
            console.log('Refund amount:', refundAmount);

            // Use the proper comprehensive billing API
            const apiUrl = buildApiUrl(API_ENDPOINTS.COMPREHENSIVE_BILLING_CANCEL_BOOKING);
            console.log('Calling API:', apiUrl);
            console.log('Full API URL:', apiUrl);
            console.log('API Base:', getApiBase());
            console.log('Endpoint:', API_ENDPOINTS.COMPREHENSIVE_BILLING_CANCEL_BOOKING);
            
            // Test the API endpoint first
            try {
                console.log('Testing API endpoint...');
                const testResponse = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                console.log('Test response status:', testResponse.status);
                console.log('Test response headers:', testResponse.headers);
                
                if (testResponse.ok) {
                    const testText = await testResponse.text();
                    console.log('Test response text:', testText);
                }
            } catch (testError) {
                console.error('API endpoint test failed:', testError);
            }
            
            // Validate the URL
            if (!apiUrl || apiUrl.includes('undefined')) {
                throw new Error('Invalid API URL generated');
            }
            
            // Ensure all numeric values are properly formatted
            const totalAmount = parseFloat(booking.total_amount) || 0;
            const fee = parseFloat(cancellationFee) || 0;
            
            // The backend expects: refund_amount = base_amount - cancellation_fee
            // Since we're using total_amount as base_amount, calculate accordingly
            const refund = totalAmount - fee;
            
            // Ensure the refund amount is never negative and matches backend expectation
            const finalRefund = Math.max(0, refund);
            
            console.log('Final calculation - Total:', totalAmount, 'Fee:', fee, 'Refund:', finalRefund);
            console.log('Backend will calculate: base_amount - cancellation_fee =', totalAmount, '-', fee, '=', totalAmount - fee);
            console.log('Type check - Total:', typeof totalAmount, 'Fee:', typeof fee, 'Refund:', typeof finalRefund);
            console.log('Exact values - Total:', totalAmount, 'Fee:', fee, 'Refund:', finalRefund);
            
            const requestBody = {
                booking_id: parseInt(booking.id),
                cancellation_reason: cancellationReason,
                cancelled_by: 1, // Replace with actual user ID
                cancellation_fee: fee,
                refund_amount: finalRefund,
                notes: `Cancelled via reception system. Reason: ${cancellationReason}`
            };
            
            console.log('Request body before API call:', requestBody);
            console.log('Raw values - cancellationFee:', cancellationFee, 'refundAmount:', refundAmount);
            console.log('Calculated values - totalAmount:', totalAmount, 'fee:', fee, 'refund:', refund);
            console.log('Final API values - cancellation_fee:', requestBody.cancellation_fee, 'refund_amount:', requestBody.refund_amount);
            
            // Validate the request body
            if (fee < 0) {
                setError('Cancellation fee cannot be negative');
                return;
            }
            
            if (fee > totalAmount) {
                setError('Cancellation fee cannot exceed the total amount');
                return;
            }
            
            if (refund < 0) {
                setError('Refund amount cannot be negative');
                return;
            }
            
            console.log('Validation passed - Fee:', fee, 'Refund:', refund, 'Total:', totalAmount);
            
            // Double-check the calculation matches backend expectation
            if (finalRefund !== (totalAmount - fee)) {
                console.error('Calculation mismatch! Expected refund:', totalAmount - fee, 'but got:', finalRefund);
                setError('Calculation error. Please try again.');
                return;
            }
            
            // Ensure the cancellation fee is exactly what we expect
            if (fee !== parseFloat(cancellationFee)) {
                console.error('Cancellation fee mismatch! Expected:', parseFloat(cancellationFee), 'but got:', fee);
                setError('Cancellation fee error. Please try again.');
                return;
            }
            
            console.log('Request body:', requestBody);
            console.log('Original values - cancellationFee:', cancellationFee, 'refundAmount:', refundAmount);
            console.log('Final calculated values - fee:', fee, 'refund:', refund, 'totalAmount:', totalAmount);
            console.log('JSON stringified body:', JSON.stringify(requestBody));

            console.log('Making POST request to:', apiUrl);
            console.log('Request method: POST');
            console.log('Request headers:', { 'Content-Type': 'application/json' });
            console.log('Request body (stringified):', JSON.stringify(requestBody));
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            console.log('Response URL:', response.url);

            // Check if response is ok
            if (!response.ok) {
                const errorText = await response.text();
                console.error('HTTP Error Response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed JSON response:', data);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text that failed to parse:', responseText);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
            }

            if (data.success) {
                setSuccess('Booking cancelled successfully!');
                console.log('Cancellation successful, calling onCancellationSuccess...');
                setTimeout(() => {
                    if (onCancellationSuccess) {
                        onCancellationSuccess(data);
                    }
                    onClose();
                }, 2000);
            } else {
                // Show detailed error information
                const errorMessage = data.message || data.error || 'Failed to cancel booking';
                console.error('Cancellation failed - Full response:', data);
                console.error('Error message:', errorMessage);
                console.error('Response status:', response.status);
                
                // Provide more helpful error messages
                let userFriendlyError = errorMessage;
                if (errorMessage.includes('Cancellation fee cannot be negative')) {
                    userFriendlyError = 'Cancellation fee cannot be negative. Please enter a valid amount.';
                } else if (errorMessage.includes('Refund amount cannot be negative')) {
                    userFriendlyError = 'Refund amount cannot be negative. Please check your inputs.';
                }
                
                setError(`Cancellation failed: ${userFriendlyError}`);
            }
        } catch (error) {
            console.error('Network/JSON parsing error:', error);
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            setError(`Network error: ${error.message}`);
        } finally {
            setLoading(false);
            setShowConfirmation(false);
        }
    };

    const formatPrice = (price) => {
        return `₹${parseFloat(price).toLocaleString('en-IN')}`;
    };

    const getCancellationReasonLabel = (reason) => {
        const reasons = {
            'guest_request': 'Guest Request',
            'medical_emergency': 'Medical Emergency',
            'travel_issues': 'Travel Issues',
            'hotel_fault': 'Hotel Fault/Issue',
            'weather_conditions': 'Weather Conditions',
            'force_majeure': 'Force Majeure',
            'other': 'Other'
        };
        return reasons[reason] || reason;
    };

    if (!booking) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-red-600 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <FaExclamationTriangle className="text-2xl" />
                            <div>
                                <h2 className="text-xl font-semibold">Cancel Booking</h2>
                                <p className="text-red-100 text-sm">Cancel booking and process refund</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-red-100 hover:text-white transition-colors"
                        >
                            <FaTimes className="text-xl" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 text-sm">{success}</p>
                        </div>
                    )}

                    {/* Booking Details */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                        <h3 className="font-medium text-gray-900 mb-3">Booking Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Guest:</span>
                                <span className="ml-2 font-medium">{booking.guest_name}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Room:</span>
                                <span className="ml-2 font-medium">{booking.room_number}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Check-in:</span>
                                <span className="ml-2 font-medium">{booking.check_in_date}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Check-out:</span>
                                <span className="ml-2 font-medium">{booking.check_out_date}</span>
                            </div>
                            <div>
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="ml-2 font-medium text-green-600">
                                    {formatPrice(booking.total_amount)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Status:</span>
                                <span className="ml-2 font-medium">{booking.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cancellation Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Cancellation Reason */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cancellation Reason *
                            </label>
                            <select
                                value={cancellationReason}
                                onChange={(e) => handleCancellationReasonChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                required
                            >
                                <option value="">Select a reason</option>
                                <option value="guest_request">Guest Request</option>
                                <option value="medical_emergency">Medical Emergency</option>
                                <option value="travel_issues">Travel Issues</option>
                                <option value="hotel_fault">Hotel Fault/Issue</option>
                                <option value="weather_conditions">Weather Conditions</option>
                                <option value="force_majeure">Force Majeure</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Manual Cancellation Fee Input */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Cancellation Fee *
                            </label>
                            <div className="bg-yellow-50 p-3 rounded-lg mb-3">
                                <p className="text-sm text-yellow-800">
                                    <strong>How it works:</strong> Enter the amount you want to keep as cancellation fee. 
                                    The remaining amount will be refunded to the guest.
                                </p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Example: If total amount is ₹2000 and you enter ₹500 as cancellation fee, 
                                    guest gets ₹1500 refund and you keep ₹500.
                                </p>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    value={cancellationFee}
                                    onChange={(e) => {
                                        console.log('Input onChange - Raw value:', e.target.value);
                                        handleCancellationFeeChange(e.target.value);
                                    }}
                                    onBlur={(e) => {
                                        console.log('Input onBlur - Final value:', e.target.value);
                                    }}
                                    min="0"
                                    max={parseFloat(booking.total_amount) || 0}
                                    step="0.01"
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                    placeholder="Enter cancellation fee"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Maximum: {formatPrice(booking.total_amount || 0)}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                💡 You can manually adjust the cancellation fee. Set to 0 for full refund.
                            </p>
                            <div className="flex gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log('Set fee to 0 clicked');
                                        handleCancellationFeeChange('0');
                                    }}
                                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                >
                                    Set Fee to 0
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log('Reset to default clicked');
                                        setCancellationFee(0);
                                        setRefundAmount(0);
                                        setCalculatedRefund(null);
                                        calculateRefund();
                                    }}
                                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                >
                                    Reset to Default
                                </button>
                            </div>
                            {cancellationFee >= (parseFloat(booking.total_amount) || 0) && (
                                <p className="text-xs text-orange-600 mt-1">
                                    ⚠️ No refund will be given with this cancellation fee.
                                </p>
                            )}
                        </div>

                        {/* Refund Information */}
                        {calculatedRefund && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-900 mb-2">Refund Calculation</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Original Amount:</span>
                                        <span className="font-medium">{formatPrice(booking.total_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Cancellation Fee (You Keep):</span>
                                        <span className="font-medium text-red-600">
                                            {formatPrice(cancellationFee)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Refund to Guest:</span>
                                        <span className="font-medium text-green-600">
                                            {formatPrice(refundAmount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Refund Type:</span>
                                        <span className="font-medium">{calculatedRefund.refund_type}</span>
                                    </div>
                                </div>
                                <div className="mt-3 p-2 bg-green-100 rounded">
                                    <p className="text-xs text-green-800">
                                        <strong>Summary:</strong> Guest pays ₹{formatPrice(booking.total_amount)}, 
                                        you keep ₹{formatPrice(cancellationFee)}, 
                                        guest gets ₹{formatPrice(refundAmount)} refund.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Refund Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Refund Amount *
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        setRefundAmount(value);
                                    }}
                                    min="0"
                                    max={booking.total_amount}
                                    step="0.01"
                                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            {/* User has full control over refund amount */}
                            {/* No validation warnings - user has full control */}
                            {/* User controls refund amount - no warnings needed */}
                        </div>

                        {/* Warning */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <FaExclamationTriangle className="text-yellow-600 mt-0.5" />
                                <div className="text-sm text-yellow-800">
                                    <p className="font-medium">Warning</p>
                                    <p>This action cannot be undone. The booking will be permanently cancelled and the room will be made available for other guests.</p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                disabled={loading || !cancellationReason}
                            >
                                {loading ? 'Processing...' : 'Cancel Booking'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Confirmation Modal */}
                {showConfirmation && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                            <div className="p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <FaExclamationTriangle className="text-red-600 text-2xl" />
                                    <h3 className="text-lg font-medium text-gray-900">Confirm Cancellation</h3>
                                </div>
                                
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to cancel this booking? This action cannot be undone.
                                </p>

                                <div className="bg-gray-50 p-3 rounded-lg mb-6">
                                    <div className="text-sm">
                                        <div className="flex justify-between mb-1">
                                            <span>Guest:</span>
                                            <span className="font-medium">{booking.guest_name}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                            <span>Room:</span>
                                            <span className="font-medium">{booking.room_number}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                            <span>Cancellation Fee:</span>
                                            <span className="font-medium text-red-600">{formatPrice(cancellationFee)}</span>
                                        </div>
                                        <div className="flex justify-between mb-1">
                                            <span>Refund Amount:</span>
                                            <span className="font-medium text-green-600">{formatPrice(refundAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Reason:</span>
                                            <span className="font-medium">{getCancellationReasonLabel(cancellationReason)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => setShowConfirmation(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                        disabled={loading}
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={confirmCancellation}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        disabled={loading}
                                    >
                                        {loading ? 'Processing...' : 'Yes, Cancel Booking'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CancelBooking;
