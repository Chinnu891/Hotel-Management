import React, { useState } from 'react';
import { FaSms, FaWhatsapp, FaLink, FaRupeeSign, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const PaymentLinkSender = ({ 
    amount, 
    bookingId, 
    guestId, 
    guestName, 
    guestEmail, 
    guestPhone,
    onSuccess, 
    onClose 
}) => {
    const [loading, setLoading] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState(guestPhone || '');
    const [paymentLink, setPaymentLink] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSendPaymentLink = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await fetch(buildApiUrl('reception/razorpay_payment.php?action=create_payment_link'), {
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
                    guest_phone: phoneNumber,
                    description: `Hotel booking payment for booking #${bookingId}`
                })
            });

            const data = await response.json();

            if (data.success) {
                setPaymentLink(data.data);
                setSuccess(true);
                if (onSuccess) {
                    onSuccess(data.data);
                }
            } else {
                setError(data.message || 'Failed to create payment link');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Create payment link error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsAppShare = () => {
        if (paymentLink) {
            const message = `Hi ${guestName}, here's your payment link for SV Royal Hotel booking #${bookingId}:\n\nAmount: ₹${amount}\nPayment Link: ${paymentLink.short_url}\n\nPlease complete your payment using this link.`;
            const whatsappUrl = `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        }
    };

    const handleSMSShare = () => {
        if (paymentLink) {
            const message = `SV Royal Hotel: Payment link for ₹${amount} - Hotel booking payment for booking #${bookingId}. Click here: ${paymentLink.short_url}`;
            
            // For mobile devices, try to open SMS app
            if (navigator.userAgent.match(/Android|iPhone|iPad|iPod/i)) {
                window.open(`sms:${phoneNumber}?body=${encodeURIComponent(message)}`);
            } else {
                // For desktop, show the message to copy
                alert(`SMS Message to copy:\n\n${message}`);
            }
        }
    };

    const handleClose = () => {
        if (onClose) {
            onClose();
        }
    };

    if (success && paymentLink) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
                    <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Link Created!</h2>
                    <p className="text-gray-600 mb-4">
                        Payment link has been sent to {phoneNumber}
                    </p>
                    
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-semibold text-lg flex items-center">
                                <FaRupeeSign className="mr-1" />
                                {amount}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-600">Expires:</span>
                            <span className="font-semibold">{paymentLink.expires_at}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                SMS Sent
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleWhatsAppShare}
                            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                        >
                            <FaWhatsapp className="mr-2" />
                            Share via WhatsApp
                        </button>
                        
                        <button
                            onClick={handleSMSShare}
                            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                        >
                            <FaSms className="mr-2" />
                            Share via SMS
                        </button>
                        
                        <button
                            onClick={handleClose}
                            className="w-full bg-gray-500 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Send Payment Link</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Amount:</span>
                        <span className="font-semibold text-lg flex items-center">
                            <FaRupeeSign className="mr-1" />
                            {amount}
                        </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Booking ID:</span>
                        <span className="font-semibold">#{bookingId}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Guest:</span>
                        <span className="font-semibold">{guestName}</span>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number for SMS/WhatsApp
                    </label>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+91-9876543210"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        Payment link will be sent to this number via SMS
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={handleSendPaymentLink}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <FaLink className="mr-2" />
                                Send Payment Link
                            </>
                        )}
                    </button>
                    
                    <button
                        onClick={handleClose}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>

                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-500">
                        Payment link will be sent via SMS and can be shared via WhatsApp
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentLinkSender;
