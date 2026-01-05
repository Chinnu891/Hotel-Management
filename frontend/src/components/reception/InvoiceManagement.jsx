import React, { useState, useEffect } from 'react';
import { 
    FaSearch, 
    FaEye, 
    FaPrint, 
    FaDownload,
    FaTimes,
    FaFilter,
    FaCalendarAlt,
    FaEdit,
    FaTrash,
    FaCheck,
    FaTimes as FaX
} from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const InvoiceManagement = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, [filterStatus, dateFrom, dateTo]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            let url = buildApiUrl('api/comprehensive_billing_api.php?action=all_invoices');
            
            const params = new URLSearchParams();
            if (filterStatus) params.append('status', filterStatus);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);
            
            if (params.toString()) {
                url += '&' + params.toString();
            }

            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                setInvoices(data.invoices);
            } else {
                setMessage(data.message || 'Error fetching invoices');
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setMessage('Error fetching invoices');
        } finally {
            setLoading(false);
        }
    };

    const viewInvoice = async (invoiceId) => {
        try {
            const response = await fetch(buildApiUrl(`api/comprehensive_billing_api.php?action=invoice_details&invoice_id=${invoiceId}`));
            const data = await response.json();
            if (data.success) {
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

    const updateInvoiceStatus = async () => {
        if (!selectedInvoice || !newStatus) return;

        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=update_status'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoice_id: selectedInvoice.id,
                    status: newStatus,
                    user_id: 1 // Replace with actual user ID from auth
                }),
            });

            const data = await response.json();
            if (data.success) {
                setMessage('Invoice status updated successfully');
                setShowStatusModal(false);
                setSelectedInvoice(null);
                setNewStatus('');
                fetchInvoices(); // Refresh the list
            } else {
                setMessage(data.message || 'Failed to update invoice status');
            }
        } catch (error) {
            console.error('Error updating invoice status:', error);
            setMessage('Error updating invoice status');
        } finally {
            setLoading(false);
        }
    };

    const deleteInvoice = async (invoiceId) => {
        if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=delete_invoice'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoice_id: invoiceId,
                    user_id: 1 // Replace with actual user ID from auth
                }),
            });

            const data = await response.json();
            if (data.success) {
                setMessage('Invoice deleted successfully');
                fetchInvoices(); // Refresh the list
            } else {
                setMessage(data.message || 'Failed to delete invoice');
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            setMessage('Error deleting invoice');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'paid': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'overdue': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredInvoices = invoices.filter(invoice => 
        invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.guest_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.booking_reference?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Invoice Management</h2>
                    <p className="text-gray-600">View and manage all invoices</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="overdue">Overdue</option>
                    </select>
                    
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="From Date"
                    />
                    
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="To Date"
                    />
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

            {/* Invoices List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">All Invoices</h3>
                </div>
                
                {loading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading invoices...</p>
                    </div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        {searchTerm || filterStatus || dateFrom || dateTo ? 'No invoices found matching your criteria.' : 'No invoices available.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Guest & Room
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {invoice.invoice_number}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {invoice.booking_reference}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {new Date(invoice.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{invoice.guest_name}</div>
                                            <div className="text-sm text-gray-500">Room {invoice.room_number}</div>
                                            <div className="text-sm text-gray-500">{invoice.guest_phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                ₹{parseFloat(invoice.total_amount).toFixed(2)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Subtotal: ₹{parseFloat(invoice.subtotal).toFixed(2)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Tax: ₹{parseFloat(invoice.tax_amount).toFixed(2)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => viewInvoice(invoice.id)}
                                                    className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                                                >
                                                    <FaEye className="h-4 w-4" />
                                                    <span>View</span>
                                                </button>
                                                <button
                                                    onClick={() => viewInvoice(invoice.id)}
                                                    className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                                                >
                                                    <FaPrint className="h-4 w-4" />
                                                    <span>Print</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedInvoice(invoice);
                                                        setNewStatus(invoice.status);
                                                        setShowStatusModal(true);
                                                    }}
                                                    className="text-yellow-600 hover:text-yellow-900 flex items-center space-x-1"
                                                >
                                                    <FaEdit className="h-4 w-4" />
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => deleteInvoice(invoice.id)}
                                                    className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                                                >
                                                    <FaTrash className="h-4 w-4" />
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Status Update Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Invoice Status</h3>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Invoice: {selectedInvoice?.invoice_number}
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="overdue">Overdue</option>
                                </select>
                            </div>
                            <div className="flex space-x-3">
                                <button
                                    onClick={updateInvoiceStatus}
                                    disabled={loading}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Updating...' : 'Update Status'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowStatusModal(false);
                                        setSelectedInvoice(null);
                                        setNewStatus('');
                                    }}
                                    className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceManagement;
