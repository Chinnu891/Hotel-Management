import React, { useState } from 'react';
import BookingSuccessModal from './BookingSuccessModal';

const SuccessModalDemo = () => {
  const [showModal, setShowModal] = useState(false);
  const [demoData, setDemoData] = useState({
    bookingReference: 'BK2024001',
    guestName: 'John Doe',
    checkInDate: '2024-01-15',
    checkOutDate: '2024-01-17',
    roomNumber: '101',
    totalAmount: 5000
  });

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Booking Success Modal Demo
      </h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Test the Success Modal
        </h2>
        <p className="text-gray-600 mb-4">
          Click the button below to see the PhonePe-style success modal in action.
        </p>
        
        <button
          onClick={handleShowModal}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Show Success Modal
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Features:
        </h3>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>✅ Big green circle with animated checkmark</li>
          <li>✅ PhonePe-style design and animations</li>
          <li>✅ Complete booking details display</li>
          <li>✅ Responsive design for mobile devices</li>
          <li>✅ Print functionality</li>
          <li>✅ Smooth fade-in and slide-in animations</li>
          <li>✅ Glowing success circle effect</li>
        </ul>
      </div>

      {/* Success Modal */}
      <BookingSuccessModal
        isOpen={showModal}
        onClose={handleCloseModal}
        bookingReference={demoData.bookingReference}
        guestName={demoData.guestName}
        checkInDate={demoData.checkInDate}
        checkOutDate={demoData.checkOutDate}
        roomNumber={demoData.roomNumber}
        totalAmount={demoData.totalAmount}
      />
    </div>
  );
};

export default SuccessModalDemo;
