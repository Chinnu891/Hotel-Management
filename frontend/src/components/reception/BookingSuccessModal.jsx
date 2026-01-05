import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import './BookingSuccessModal.css';

const BookingSuccessModal = ({ 
  isOpen, 
  onClose, 
  bookingReference, 
  guestName, 
  checkInDate, 
  checkOutDate,
  roomNumber,
  adults,
  children,
  totalAmount,
  autoConfirmed,
  paymentType
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 booking-success-modal">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl modal-content">
        {/* Email Success Message - Top Center */}
        <div className="email-success-message">
          <div className="flex items-center justify-center space-x-2">
            <CheckIcon className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-bold text-lg">
              Email Sent Successfully!
            </span>
            <CheckIcon className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-green-700 text-sm mt-1">
            Confirmation email delivered to guest
          </p>
        </div>

        {/* Success Circle with Checkmark */}
        <div className="mb-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg success-circle">
            <CheckIcon className="w-8 h-8 text-white check-icon" />
          </div>
        </div>

        {/* Success Message */}
        <h2 className="text-xl font-bold text-gray-800 mb-2 modal-title">
          Booking Confirmed!
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Your booking has been successfully created
        </p>
        
        {/* Auto Confirmation Notice */}
        {autoConfirmed && paymentType === 'cash' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckIcon className="h-4 w-4 text-green-400" />
              </div>
              <div className="ml-2">
                <p className="text-xs font-medium text-green-800">
                  Payment Completed & Room Confirmed
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Cash payment received. Room has been automatically confirmed and is ready for check-in.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-left">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Reference:</span>
              <span className="text-gray-800 font-semibold">{bookingReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Guest:</span>
              <span className="text-gray-800 font-semibold">{guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Check-in:</span>
              <span className="text-gray-800 font-semibold">{checkInDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Check-out:</span>
              <span className="text-gray-800 font-semibold">{checkOutDate}</span>
            </div>
            {roomNumber && (
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Room:</span>
                <span className="text-gray-800 font-semibold">{roomNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Guests:</span>
              <span className="text-gray-800 font-semibold">
                {adults} adult{adults !== 1 ? 's' : ''}
                {children > 0 && `, ${children} child${children !== 1 ? 'ren' : ''}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Total Amount:</span>
              <span className="text-gray-800 font-semibold">₹{totalAmount}</span>
            </div>
            {paymentType && (
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Payment Type:</span>
                <span className="text-gray-800 font-semibold capitalize">{paymentType}</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 action-buttons mb-3">
          <button
            onClick={onClose}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors success-modal-btn text-sm"
          >
            Done
          </button>
          <button
            onClick={() => {
              // You can add functionality to print or download booking details
              window.print();
            }}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors success-modal-btn text-sm"
          >
            Print
          </button>
        </div>

        {/* Additional Info */}
        <p className="text-xs text-gray-500">
          A confirmation email has been sent to your email address
        </p>
      </div>
    </div>
  );
};

export default BookingSuccessModal;
