import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaMoneyBillWave, FaCalculator, FaExclamationTriangle } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const WalkInPaymentForm = ({ 
    booking, 
    onPaymentComplete, 
    onClose, 
    isPartialPayment = false 
}) => {
    const [formData, setFormData] = useState({
        paid_amount: '',
        payment_method: '',
        transaction_id: '',
        notes: '',
        referenced_by_owner: false,
        owner_reference_notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [paymentMethods] = useState([
        { id: 'cash', name: 'Cash', icon: FaMoneyBillWave },
        { id: 'credit_card', name: 'Credit Card', icon: FaCreditCard },
        { id: 'debit_card', name: 'Debit Card', icon: FaCreditCard },
        { id: 'upi', name: 'UPI', icon: FaCreditCard },
        { id: 'bank_transfer', name: 'Bank Transfer', icon: FaCreditCard },
        { id: 'cheque', name: 'Cheque', icon: FaCreditCard },
        { id: 'online_wallet', name: 'Online Wallet', icon: FaCreditCard }
    ]);

    const [remainingAmount, setRemainingAmount] = useState(0);
    const [showPaymentType, setShowPaymentType] = useState(true);

    useEffect(() => {
        if (booking) {
            // Calculate remaining amount
            const remaining = parseFloat(booking.total_amount) - parseFloat(booking.paid_amount || 0);
            setRemainingAmount(remaining);
            
            // Set initial paid amount for partial payment
            if (isPartialPayment && remaining > 0) {
                setFormData(prev => ({
                    ...prev,
                    paid_amount: remaining.toString()
                }));
            }
        }
    }, [booking, isPartialPayment]);

    useEffect(() => {
        // Show payment type only if paid amount > 0
        const paidAmount = parseFloat(formData.paid_amount) || 0;
        setShowPaymentType(paidAmount > 0);
    }, [formData.paid_amount]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const paidAmount = parseFloat(formData.paid_amount);
            if (paidAmount <= 0) {
                setError('Paid amount must be greater than 0');
                setLoading(false);
                return;
            }

            if (paidAmount > remainingAmount) {
                setError('Paid amount cannot exceed remaining amount');
                setLoading(false);
                return;
            }

            const paymentData = {
                booking_id: booking.id,
                paid_amount: paidAmount,
                payment_method: formData.payment_method,
                transaction_id: formData.transaction_id || null,
                notes: formData.notes || 'Walk-in payment',
                processed_by: 1, // Replace with actual user ID from auth
                referenced_by_owner: formData.referenced_by_owner,
                owner_reference_notes: formData.owner_reference_notes || null
            };

            const action = isPartialPayment ? 'partial_payment' : 'process_payment';
            const response = await fetch(buildApiUrl(`booking/walk_in_payment.php?action=${action}`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(paymentData)
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(data.message);
                setTimeout(() => {
                    if (onPaymentComplete) {
                        onPaymentComplete(data);
                    }
                }, 1500);
            } else {
                setError(data.message || 'Payment failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    if (!booking) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">
                                {isPartialPayment ? 'Partial Payment' : 'Walk-in Payment'}
                            </h2>
                            <p className="text-blue-100 text-sm">
                                Room {booking.room_number} - {booking.guest_name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-blue-100 hover:text-white text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Payment Summary */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-gray-900 mb-3">Payment Summary</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="ml-2 font-semibold text-lg text-green-600">
                                    {formatCurrency(booking.total_amount)}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Already Paid:</span>
                                <span className="ml-2 font-semibold text-blue-600">
                                    {formatCurrency(booking.paid_amount || 0)}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-gray-600">Remaining Amount:</span>
                                <span className={`ml-2 font-semibold text-lg ${
                                    remainingAmount > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                    {formatCurrency(remainingAmount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Paid Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount to Pay *
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="paid_amount"
                                    value={formData.paid_amount}
                                    onChange={(e) => handleInputChange('paid_amount', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    max={remainingAmount}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={`Max: ${formatCurrency(remainingAmount)}`}
                                    required
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                    <FaCalculator className="text-gray-400" />
                                </div>
                            </div>
                            {remainingAmount > 0 && (
                                <p className="text-sm text-gray-500 mt-1">
                                    Maximum amount you can pay: {formatCurrency(remainingAmount)}
                                </p>
                            )}
                        </div>

                        {/* Payment Method - Only show if amount > 0 */}
                        {showPaymentType && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Method *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {paymentMethods.map((method) => {
                                        const Icon = method.icon;
                                        return (
                                            <label
                                                key={method.id}
                                                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                                                    formData.payment_method === method.id
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-300 hover:border-gray-400'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="payment_method"
                                                    value={method.id}
                                                    checked={formData.payment_method === method.id}
                                                    onChange={(e) => handleInputChange('payment_method', e.target.value)}
                                                    className="sr-only"
                                                    required
                                                />
                                                <Icon className="w-5 h-5 mr-2 text-gray-600" />
                                                <span className="text-sm font-medium">{method.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Transaction ID */}
                        {showPaymentType && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Transaction ID
                                </label>
                                <input
                                    type="text"
                                    name="transaction_id"
                                    value={formData.transaction_id}
                                    onChange={(e) => handleInputChange('transaction_id', e.target.value)}
                                    placeholder="Transaction ID (optional)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        {/* Owner Reference Checkbox */}
                        <div className="flex items-start space-x-3">
                            <input
                                type="checkbox"
                                id="referenced_by_owner"
                                checked={formData.referenced_by_owner}
                                onChange={(e) => handleInputChange('referenced_by_owner', e.target.checked)}
                                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                                <label htmlFor="referenced_by_owner" className="text-sm font-medium text-gray-700">
                                    Referenced by Owner of the Hotel
                                </label>
                                <p className="text-sm text-gray-500 mt-1">
                                    Check this if the owner has approved this booking without full payment
                                </p>
                            </div>
                        </div>

                        {/* Owner Reference Notes */}
                        {formData.referenced_by_owner && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Owner Reference Notes
                                </label>
                                <textarea
                                    name="owner_reference_notes"
                                    value={formData.owner_reference_notes}
                                    onChange={(e) => handleInputChange('owner_reference_notes', e.target.value)}
                                    rows="3"
                                    placeholder="Enter owner's approval notes..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Additional Notes
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows="3"
                                placeholder="Any additional notes about this payment..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Error and Success Messages */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center">
                                    <FaExclamationTriangle className="text-red-400 mr-2" />
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center">
                                    <FaCalculator className="text-green-400 mr-2" />
                                    <p className="text-sm text-green-800">{success}</p>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.paid_amount || (showPaymentType && !formData.payment_method)}
                                className={`px-6 py-2 rounded-lg text-sm font-medium text-white ${
                                    loading || !formData.paid_amount || (showPaymentType && !formData.payment_method)
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {loading ? 'Processing...' : (isPartialPayment ? 'Process Payment' : 'Complete Payment')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default WalkInPaymentForm;
