import React, { useState } from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaTimes, FaMoneyBillWave } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const CheckoutWithRemainingAmount = ({ isOpen, onClose, bookingData, onCheckoutComplete }) => {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleCheckout = async () => {
        if (bookingData.remaining_amount > 0) {
            // Show payment modal for remaining amount
            setShowPaymentModal(true);
        } else {
            // Proceed with checkout
            await processCheckout();
        }
    };

    const processCheckout = async () => {
        setLoading(true);
        setError('');

        try {
            const checkoutData = {
                booking_id: bookingData.booking_id,
                room_id: bookingData.room_id,
                checkout_date: new Date().toISOString().split('T')[0],
                processed_by: 1 // Replace with actual user ID from auth
            };

            const response = await fetch(buildApiUrl('reception/checkin_checkout_api.php') + '?action=checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checkoutData)
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Guest checked out successfully! Room is now available.');
                setTimeout(() => {
                    onCheckoutComplete();
                    onClose();
                }, 2000);
            } else {
                setError(data.message || 'Failed to checkout guest');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentComplete = () => {
        setShowPaymentModal(false);
        // After payment, proceed with checkout
        processCheckout();
    };

    if (!isOpen || !bookingData) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    return (
        <>
            {/* Main Checkout Modal */}
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                            <FaCheckCircle className="mr-2 text-green-600" />
                            Checkout Guest
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <FaTimes className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Guest Info */}
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Guest Information</h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Guest:</span>
                                    <span className="font-medium">{bookingData.first_name} {bookingData.last_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Room:</span>
                                    <span className="font-medium">Room {bookingData.room_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Check-in:</span>
                                    <span className="font-medium">{new Date(bookingData.check_in_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Check-out:</span>
                                    <span className="font-medium">{new Date(bookingData.check_out_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Status */}
                        <div className="mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Status</h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-800">Total Amount:</span>
                                    <span className="font-semibold text-blue-900">{formatCurrency(bookingData.total_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-blue-800">Amount Paid:</span>
                                    <span className="font-semibold text-blue-900">{formatCurrency(bookingData.paid_amount)}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-blue-200 pt-3">
                                    <span className="text-blue-800 font-medium">Remaining Amount:</span>
                                    <span className={`font-bold text-lg ${bookingData.remaining_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {formatCurrency(bookingData.remaining_amount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Warning for Remaining Amount */}
                        {bookingData.remaining_amount > 0 && (
                            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <FaExclamationTriangle className="text-orange-400 mr-2" />
                                    <div>
                                        <h4 className="font-medium text-orange-900">Outstanding Balance</h4>
                                        <p className="text-sm text-orange-700 mt-1">
                                            This guest has an outstanding balance of {formatCurrency(bookingData.remaining_amount)}. 
                                            Please collect the remaining amount before checkout.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">{success}</p>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                    loading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : bookingData.remaining_amount > 0
                                            ? 'bg-orange-600 hover:bg-orange-700'
                                            : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {loading ? 'Processing...' : 
                                    bookingData.remaining_amount > 0 
                                        ? 'Pay & Checkout' 
                                        : 'Proceed to Checkout'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal for Remaining Amount */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                                <FaMoneyBillWave className="mr-2 text-green-600" />
                                Pay Remaining Amount
                            </h2>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FaTimes className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="text-center mb-6">
                                <FaExclamationTriangle className="text-4xl text-orange-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Outstanding Balance
                                </h3>
                                <p className="text-gray-600">
                                    Guest must pay the remaining amount before checkout.
                                </p>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                                <div className="text-center">
                                    <p className="text-sm text-orange-700 mb-2">Remaining Amount:</p>
                                    <p className="text-2xl font-bold text-orange-600">
                                        {formatCurrency(bookingData.remaining_amount)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPaymentModal(false);
                                        // Here you would typically open the payment modal
                                        // For now, we'll just proceed with checkout
                                        processCheckout();
                                    }}
                                    className="flex-1 px-4 py-2 bg-green-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-green-700 transition-colors"
                                >
                                    Pay Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CheckoutWithRemainingAmount;
