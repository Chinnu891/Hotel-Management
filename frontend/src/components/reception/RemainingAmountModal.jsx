import React, { useState, useEffect } from 'react';
import { FaTimes, FaMoneyBillWave, FaCreditCard, FaInfoCircle } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const RemainingAmountModal = ({ isOpen, onClose, bookingData, onPaymentComplete }) => {
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (isOpen && bookingData) {
            setPaymentAmount('');
            setPaymentMethod('');
            setError('');
            setSuccess('');
        }
    }, [isOpen, bookingData]);

    const handlePayment = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const amount = parseFloat(paymentAmount);
            if (amount <= 0) {
                setError('Payment amount must be greater than 0');
                setLoading(false);
                return;
            }

            if (amount > bookingData.remaining_amount) {
                setError('Payment amount cannot exceed remaining amount');
                setLoading(false);
                return;
            }

            if (!paymentMethod) {
                setError('Please select a payment method');
                setLoading(false);
                return;
            }

            const paymentData = {
                booking_id: bookingData.booking_id,
                amount: amount,
                payment_method: paymentMethod,
                payment_type: amount >= bookingData.remaining_amount ? 'final' : 'partial',
                processed_by: 1, // Replace with actual user ID from auth
                notes: `Partial payment for remaining amount - ${paymentMethod}`
            };

            const response = await fetch(buildApiUrl('booking/walk_in_payment.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Payment processed successfully!');
                setTimeout(() => {
                    onPaymentComplete();
                    onClose();
                }, 2000);
            } else {
                setError(data.message || 'Failed to process payment');
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !bookingData) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const newRemainingAmount = Math.max(0, bookingData.remaining_amount - parseFloat(paymentAmount || 0));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                        <FaMoneyBillWave className="mr-2 text-green-600" />
                        Pay Remaining Amount
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
                                <span className="text-gray-600">Booking Ref:</span>
                                <span className="font-medium">{bookingData.booking_reference}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Summary */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Payment Summary</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-blue-800">Total Room Amount:</span>
                                <span className="font-semibold text-blue-900">{formatCurrency(bookingData.total_amount)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-blue-800">Amount Already Paid:</span>
                                <span className="font-semibold text-blue-900">{formatCurrency(bookingData.paid_amount)}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-blue-200 pt-3">
                                <span className="text-blue-800 font-medium">Remaining Amount:</span>
                                <span className="font-bold text-lg text-orange-600">{formatCurrency(bookingData.remaining_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <form onSubmit={handlePayment} className="space-y-4">
                        {/* Payment Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Amount to Pay *
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    max={bookingData.remaining_amount}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Enter amount (max: ${formatCurrency(bookingData.remaining_amount)})`}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <FaMoneyBillWave className="text-gray-400" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Enter the amount the guest is paying now
                            </p>
                        </div>

                        {/* Payment Method */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Method *
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                required
                            >
                                <option value="">Select Payment Method</option>
                                <option value="cash">Cash</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="debit_card">Debit Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                                <option value="online_wallet">Online Wallet</option>
                            </select>
                        </div>

                        {/* New Remaining Amount Preview */}
                        {paymentAmount && parseFloat(paymentAmount) > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <h4 className="font-medium text-orange-900 mb-2 flex items-center">
                                    <FaInfoCircle className="mr-2" />
                                    After This Payment
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-orange-700">Current Remaining:</span>
                                        <span className="font-semibold">{formatCurrency(bookingData.remaining_amount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-orange-700">Payment Amount:</span>
                                        <span className="font-semibold text-green-600">-{formatCurrency(parseFloat(paymentAmount))}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-orange-200 pt-2">
                                        <span className="text-orange-700 font-medium">New Remaining:</span>
                                        <span className={`font-bold ${newRemainingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            {formatCurrency(newRemainingAmount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm text-green-800">{success}</p>
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
                                type="submit"
                                disabled={loading || !paymentAmount || !paymentMethod}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                                    loading || !paymentAmount || !paymentMethod
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                }`}
                            >
                                {loading ? 'Processing...' : 'Process Payment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RemainingAmountModal;
