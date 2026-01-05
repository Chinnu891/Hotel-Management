import React, { useState, useEffect } from 'react';
import { 
    FaSearch, 
    FaFileInvoiceDollar, 
    FaPrint, 
    FaDownload,
    FaEye,
    FaTimes,
    FaFilter,
    FaCalendarAlt
} from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const InvoiceGenerator = () => {
    const [bookings, setBookings] = useState([]);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [filterStatus, setFilterStatus] = useState('checked_in');

    useEffect(() => {
        fetchBookings();
    }, [filterStatus]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await fetch(buildApiUrl(`api/bookings.php?status=${filterStatus}`));
            const data = await response.json();
            if (data.success) {
                // Ensure unique bookings by ID and remove any duplicates
                const uniqueBookings = data.bookings.filter((booking, index, self) => 
                    index === self.findIndex(b => b.id === booking.id)
                );
                console.log('Fetched bookings:', data.bookings);
                console.log('Unique bookings after deduplication:', uniqueBookings);
                setBookings(uniqueBookings);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            setMessage('Error fetching bookings');
        } finally {
            setLoading(false);
        }
    };

    const generateInvoice = async (bookingId) => {
        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=generate_invoice'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    booking_id: bookingId,
                    user_id: 1 // Replace with actual user ID from auth
                }),
            });

            const data = await response.json();
            if (data.success) {
                setMessage(`Invoice generated successfully! Invoice #: ${data.invoice_number}`);
                fetchBookings(); // Refresh the list
            } else {
                setMessage(data.message || 'Failed to generate invoice');
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
            setMessage('Error generating invoice');
        } finally {
            setLoading(false);
        }
    };

    const viewInvoice = async (invoiceId) => {
        try {
            const response = await fetch(buildApiUrl(`api/comprehensive_billing_api.php?action=invoice_details&invoice_id=${invoiceId}`));
            const data = await response.json();
            if (data.success) {
                // Open invoice in new window for printing
                const invoiceWindow = window.open('', '_blank');
                invoiceWindow.document.write(data.html);
                invoiceWindow.document.close();
            } else {
                setMessage(data.message || 'Error viewing invoice');
            }
        } catch (error) {
            console.error('Error viewing invoice:', error);
            setMessage('Error viewing invoice');
        }
    };

    const filteredBookings = React.useMemo(() => {
        return bookings.filter(booking => 
            booking.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${booking.guest_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.room_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [bookings, searchTerm]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Generate Invoice</h2>
                    <p className="text-gray-600">Select a booking to generate an invoice</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex space-x-4">
                <div className="flex-1">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by booking reference, guest name, or room number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <FaFilter className="text-gray-400" />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="checked_in">Checked In</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="all">All Bookings</option>
                    </select>
                </div>
            </div>

            {/* Message Display */}
            {message && (
                <div className={`p-4 rounded-lg ${
                    message.includes('successfully') 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                    <div className="flex items-center justify-between">
                        <span>{message}</span>
                        <button
                            onClick={() => setMessage('')}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            {/* Bookings List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Available Bookings</h3>
                </div>
                
                {loading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading bookings...</p>
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        {searchTerm ? 'No bookings found matching your search.' : `No ${filterStatus} bookings available.`}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Booking Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Guest
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Room
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Stay Duration
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredBookings.map((booking, index) => (
                                    <tr key={`${booking.id || 'unknown'}-${booking.booking_reference || 'unknown'}-${index}`} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {booking.booking_reference || 'N/A'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {booking.check_in_date ? new Date(booking.check_in_date).toLocaleDateString() : 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{booking.guest_name || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{booking.guest_phone || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{booking.room_number || 'N/A'}</div>
                                            <div className="text-sm text-gray-500">{booking.room_type || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {booking.check_in_date ? new Date(booking.check_in_date).toLocaleDateString() : 'N/A'} - {booking.check_out_date ? new Date(booking.check_out_date).toLocaleDateString() : 'N/A'}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {booking.check_in_date && booking.check_out_date ? 
                                                    Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24)) + ' nights' : 'N/A'
                                                }
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                ₹{parseFloat(booking.base_price || 0).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                {booking.invoice_id ? (
                                                    <>
                                                        <button
                                                            onClick={() => viewInvoice(booking.invoice_id)}
                                                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                                        >
                                                            <FaEye className="h-4 w-4" />
                                                            <span>View</span>
                                                        </button>
                                                        <button
                                                            onClick={() => viewInvoice(booking.invoice_id)}
                                                            className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                                                        >
                                                            <FaPrint className="h-4 w-4" />
                                                            <span>Print</span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => generateInvoice(booking.id)}
                                                        disabled={loading}
                                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                                                    >
                                                        <FaFileInvoiceDollar className="h-4 w-4" />
                                                        <span>Generate Invoice</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceGenerator;
