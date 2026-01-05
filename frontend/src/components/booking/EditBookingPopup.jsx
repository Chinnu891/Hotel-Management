import React, { useState } from 'react';
import { toast } from 'react-toastify';
import EditBookingForm from './EditBookingForm';
import { buildApiUrl } from '../../config/api';

const EditBookingPopup = ({ isOpen, onClose, booking, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleSave = async (formData) => {
        if (!booking?.id) {
            toast.error('Booking ID is required');
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(buildApiUrl('booking/update_booking.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    booking_id: booking.id,
                    ...formData
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Booking updated successfully!');
                if (onSuccess) {
                    onSuccess(data.data);
                }
                onClose();
            } else {
                toast.error(data.message || 'Failed to update booking');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            toast.error('Failed to update booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isOpen ? 'block' : 'hidden'}`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleClose}></div>
            
            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Edit Booking</h2>
                        <button
                            onClick={handleClose}
                            disabled={loading}
                            className="text-blue-100 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-blue-600 disabled:opacity-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                    <EditBookingForm
                        booking={booking}
                        onSave={handleSave}
                        loading={loading}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditBookingPopup;
