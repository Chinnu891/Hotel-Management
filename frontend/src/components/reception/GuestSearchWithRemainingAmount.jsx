import React, { useState, useEffect } from 'react';
import { FaSearch, FaExclamationTriangle, FaCreditCard, FaCheckCircle, FaTimes } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';
import RemainingAmountModal from './RemainingAmountModal';

const GuestSearchWithRemainingAmount = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [showRemainingAmountModal, setShowRemainingAmountModal] = useState(false);

    useEffect(() => {
        if (searchTerm.length >= 3) {
            searchGuests();
        } else {
            setGuests([]);
        }
    }, [searchTerm]);

    const searchGuests = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch(buildApiUrl(`reception/search_guests.php?search=${encodeURIComponent(searchTerm)}`));
            const data = await response.json();
            
            if (data.success) {
                setGuests(data.guests);
            } else {
                setError(data.message || 'Failed to search guests');
            }
        } catch (error) {
            console.error('Search error:', error);
            setError('Error searching guests');
        } finally {
            setLoading(false);
        }
    };

    const handleRemainingAmountClick = (guest) => {
        setSelectedGuest(guest);
        setShowRemainingAmountModal(true);
    };

    const handlePaymentComplete = (paymentResult) => {
        // Refresh the guest list to show updated payment status
        searchGuests();
        setShowRemainingAmountModal(false);
        setSelectedGuest(null);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const getStatusBadge = (status, remainingAmount) => {
        if (remainingAmount > 0) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <FaExclamationTriangle className="w-3 h-3 mr-1" />
                    Outstanding Balance
                </span>
            );
        }
        
        switch (status) {
            case 'checked_in':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <FaCheckCircle className="w-3 h-3 mr-1" />
                        Checked In
                    </span>
                );
            case 'checked_out':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Checked Out
                    </span>
                );
            case 'confirmed':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Confirmed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Guest Search</h1>
                    <p className="text-gray-600 mt-2">Search for guests and manage their bookings</p>
                </div>

                {/* Search Input */}
                <div className="mb-8">
                    <div className="relative max-w-2xl mx-auto">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by guest name, phone, or room number..."
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <FaTimes className="text-red-400 mr-2" />
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Searching guests...</p>
                    </div>
                )}

                {/* Guest Results */}
                {!loading && guests.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Found {guests.length} guest(s)
                        </h2>
                        
                        {guests.map((guest) => (
                            <div key={guest.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-4 mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {guest.first_name} {guest.last_name}
                                                </h3>
                                                <p className="text-sm text-gray-600">{guest.email}</p>
                                                <p className="text-sm text-gray-600">{guest.phone}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {getStatusBadge(guest.status, guest.remaining_amount)}
                                                {guest.remaining_amount > 0 && (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                        ₹{parseFloat(guest.remaining_amount).toFixed(2)} Due
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="font-medium text-gray-700">Room:</span>
                                                <span className="ml-2 text-gray-900">{guest.room_number}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Room Type:</span>
                                                <span className="ml-2 text-gray-900">{guest.room_type_name}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Check-in:</span>
                                                <span className="ml-2 text-gray-900">{guest.check_in_date}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Check-out:</span>
                                                <span className="ml-2 text-gray-900">{guest.check_out_date}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Total Amount:</span>
                                                <span className="ml-2 font-semibold text-green-600">
                                                    {formatCurrency(guest.total_amount)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="font-medium text-gray-700">Amount Paid:</span>
                                                <span className="ml-2 font-semibold text-blue-600">
                                                    {formatCurrency(guest.paid_amount || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        {guest.remaining_amount > 0 && (
                                            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center">
                                                        <FaExclamationTriangle className="text-orange-400 mr-2" />
                                                        <span className="text-orange-800 font-medium">
                                                            Outstanding Balance: {formatCurrency(guest.remaining_amount)}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRemainingAmountClick(guest)}
                                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                                    >
                                                        <FaCreditCard className="w-4 h-4 mr-2" />
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {!loading && searchTerm.length >= 3 && guests.length === 0 && (
                    <div className="text-center py-8">
                        <FaSearch className="text-4xl text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No guests found matching your search criteria.</p>
                        <p className="text-sm text-gray-500 mt-2">Try searching with a different name, phone number, or room number.</p>
                    </div>
                )}

                {/* Search Instructions */}
                {!loading && searchTerm.length === 0 && (
                    <div className="text-center py-8">
                        <FaSearch className="text-4xl text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Enter at least 3 characters to search for guests.</p>
                        <p className="text-sm text-gray-500 mt-2">You can search by guest name, phone number, or room number.</p>
                    </div>
                )}
            </div>

            {/* Remaining Amount Modal */}
            {showRemainingAmountModal && selectedGuest && (
                <RemainingAmountModal
                    booking={selectedGuest}
                    onClose={() => {
                        setShowRemainingAmountModal(false);
                        setSelectedGuest(null);
                    }}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}
        </div>
    );
};

export default GuestSearchWithRemainingAmount;
