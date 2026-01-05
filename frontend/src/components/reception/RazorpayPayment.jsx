import React, { useState, useEffect } from 'react';
import { FaCreditCard, FaCheckCircle, FaTimesCircle, FaShieldAlt, FaLock } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const RazorpayPayment = ({ 
    amount, 
    bookingId, 
    guestId, 
    guestName, 
    guestEmail, 
    guestPhone,
    invoiceId,
    onPaymentSuccess, 
    onPaymentFailure,
    onClose 
}) => {
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const [error, setError] = useState('');
    const [paymentDetails, setPaymentDetails] = useState(null);

    // Load Razorpay script
    useEffect(() => {
        // Check if script already exists
        let existingScript = document.querySelector('script[src*="razorpay"]');
        
        if (!existingScript) {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => {
                console.log('Razorpay script loaded successfully');
            };
            script.onerror = () => {
                setError('Failed to load payment gateway. Please refresh the page.');
            };
            document.body.appendChild(script);
            existingScript = script;
        }

        return () => {
            // Only remove if we created the script and it still exists
            if (existingScript && existingScript.parentNode) {
                try {
                    existingScript.parentNode.removeChild(existingScript);
                } catch (error) {
                    console.log('Script already removed or not found');
                }
            }
        };
    }, []);

    // Create payment order
    const createOrder = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(buildApiUrl('reception/razorpay_payment.php?action=create_order'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: amount,
                    booking_id: bookingId,
                    guest_id: guestId,
                    guest_name: guestName,
                    guest_email: guestEmail,
                    guest_phone: guestPhone,
                    invoice_id: invoiceId,
                    description: `Hotel booking payment for booking #${bookingId}`
                })
            });

            const data = await response.json();

            if (data.success) {
                initializeRazorpay(data.data);
            } else {
                setError(data.message || 'Failed to create payment order');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Create order error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Initialize Razorpay checkout
    const initializeRazorpay = (orderData) => {
        if (!window.Razorpay) {
            setError('Payment gateway not loaded. Please refresh the page.');
            return;
        }

        const options = {
            key: orderData.key_id,
            amount: orderData.amount * 100, // Convert to paise
            currency: orderData.currency,
            name: orderData.company_name || 'SV Royal Hotel',
            description: `Payment for Invoice #${invoiceId || bookingId}`,
            order_id: orderData.order_id,
            prefill: {
                name: guestName,
                email: guestEmail,
                contact: guestPhone
            },
            notes: {
                booking_id: bookingId,
                guest_name: guestName,
                invoice_id: invoiceId
            },
            theme: {
                color: '#059669'
            },
            handler: function (response) {
                handlePaymentSuccess(response);
            },
            modal: {
                ondismiss: function () {
                    setPaymentStatus('cancelled');
                }
            },
            // Enable all payment methods
            method: {
                upi: true,
                card: true,
                netbanking: true,
                wallet: true
            },
            // Additional payment options
            options: {
                checkout: {
                    method: {
                        upi: {
                            flow: 'intent'
                        },
                        card: {
                            flow: 'popup'
                        },
                        netbanking: {
                            flow: 'popup'
                        }
                    }
                }
            },
            config: {
                display: {
                    blocks: {
                        banks: {
                            name: "Pay using UPI",
                            instruments: [
                                {
                                    method: "upi"
                                }
                            ]
                        },
                        cards: {
                            name: "Pay using Cards",
                            instruments: [
                                {
                                    method: "card"
                                }
                            ]
                        },
                        netbanking: {
                            name: "Pay using Net Banking",
                            instruments: [
                                {
                                    method: "netbanking"
                                }
                            ]
                        }
                    },
                    sequence: ["block.banks", "block.cards", "block.netbanking"],
                    preferences: {
                        show_default_blocks: false
                    }
                }
            }
        };

        try {
            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            setError('Failed to initialize payment. Please try again.');
            console.error('Razorpay initialization error:', err);
        }
    };

    // Handle payment success
    const handlePaymentSuccess = async (response) => {
        try {
            setLoading(true);
            setPaymentStatus('processing');

            // Verify payment with backend
            const verifyResponse = await fetch(buildApiUrl('reception/razorpay_payment.php?action=verify_payment'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    amount: amount,
                    booking_id: bookingId,
                    invoice_id: invoiceId,
                    guest_id: guestId
                })
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
                setPaymentStatus('success');
                setPaymentDetails(verifyData.data);
                
                // Call success callback
                if (onPaymentSuccess) {
                    onPaymentSuccess(verifyData.data);
                }
            } else {
                setPaymentStatus('failed');
                setError(verifyData.message || 'Payment verification failed');
                
                if (onPaymentFailure) {
                    onPaymentFailure(verifyData.message);
                }
            }
        } catch (err) {
            setPaymentStatus('failed');
            setError('Payment verification failed. Please contact support.');
            console.error('Payment verification error:', err);
            
            if (onPaymentFailure) {
                onPaymentFailure('Payment verification failed');
            }
        } finally {
            setLoading(false);
        }
    };

    // Retry payment
    const retryPayment = () => {
        setError('');
        setPaymentStatus('pending');
        setPaymentDetails(null);
        createOrder();
    };

    // Handle close
    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    // Format amount
    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">Secure Payment</h2>
                            <p className="text-green-100 text-sm">Powered by Razorpay</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <FaShieldAlt className="text-green-200" />
                            <FaLock className="text-green-200" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {paymentStatus === 'pending' && (
                        <div>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FaCreditCard className="text-2xl text-green-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Complete Your Payment
                                </h3>
                                <p className="text-gray-600">
                                    Secure payment powered by Razorpay
                                </p>
                            </div>

                            {/* Payment Details */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-gray-600">Amount:</span>
                                    <span className="text-2xl font-bold text-green-600">
                                        {formatAmount(amount)}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Booking ID:</span>
                                        <span className="font-medium">#{bookingId}</span>
                                    </div>
                                    {invoiceId && (
                                        <div className="flex justify-between">
                                            <span>Invoice ID:</span>
                                            <span className="font-medium">#{invoiceId}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span>Guest:</span>
                                        <span className="font-medium">{guestName}</span>
                                    </div>
                                </div>
                            </div>

                                                         {/* Payment Methods Info */}
                             <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                 <div className="flex items-start">
                                     <FaCreditCard className="text-green-600 mt-1 mr-3 flex-shrink-0" />
                                     <div className="text-sm text-green-800">
                                         <p className="font-medium">Available Payment Methods</p>
                                         <p className="text-green-700">
                                             UPI, Debit/Credit Cards, Net Banking & Digital Wallets
                                         </p>
                                     </div>
                                 </div>
                             </div>

                             {/* Security Notice */}
                             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                 <div className="flex items-start">
                                     <FaShieldAlt className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                                     <div className="text-sm text-blue-800">
                                         <p className="font-medium">Secure Payment</p>
                                         <p className="text-blue-700">
                                             Your payment information is encrypted and secure. 
                                             We never store your card details.
                                         </p>
                                     </div>
                                 </div>
                             </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={createOrder}
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {loading ? 'Processing...' : 'Pay Now'}
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {paymentStatus === 'processing' && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Processing Payment
                            </h3>
                            <p className="text-gray-600">
                                Please wait while we verify your payment...
                            </p>
                        </div>
                    )}

                    {paymentStatus === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaCheckCircle className="text-3xl text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Payment Successful!
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Your payment has been processed successfully.
                            </p>
                            {paymentDetails && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Transaction ID:</span>
                                            <span className="font-medium">{paymentDetails.transaction_id}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Receipt:</span>
                                            <span className="font-medium">{paymentDetails.receipt_number}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Amount:</span>
                                            <span className="font-medium">{formatAmount(paymentDetails.amount)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={handleClose}
                                className="bg-green-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {paymentStatus === 'failed' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaTimesCircle className="text-3xl text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Payment Failed
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {error || 'Your payment could not be processed.'}
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={retryPayment}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {paymentStatus === 'cancelled' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FaTimesCircle className="text-3xl text-yellow-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Payment Cancelled
                            </h3>
                            <p className="text-gray-600 mb-4">
                                You cancelled the payment process.
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={retryPayment}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={handleClose}
                                    className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RazorpayPayment;
