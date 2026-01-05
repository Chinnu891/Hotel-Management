import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaDownload, FaEnvelope, FaEye, FaEdit, FaTrash, FaPlus, FaSearch, FaFilter, FaPrint } from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ComprehensiveBilling = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        guest_name: '',
        booking_reference: '',
        date_from: '',
        date_to: ''
    });
    const [stats, setStats] = useState({
        totalInvoices: 0,
        pendingPayments: 0,
        totalRevenue: 0,
        todayPayments: 0,
        overdueInvoices: 0
    });

    // Form states
    const [createForm, setCreateForm] = useState({
        booking_id: '',
        due_date: '',
        notes: ''
    });
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: 'cash',
        transaction_id: '',
        notes: ''
    });

    useEffect(() => {
        fetchInvoices();
        fetchStats();
    }, [filters]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) queryParams.append(key, filters[key]);
            });
            queryParams.append('action', 'all_invoices');

            const response = await fetch(`http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setInvoices(data.invoices);
            } else {
                toast.error(data.message || 'Failed to fetch invoices');
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=billing_stats');
            const data = await response.json();

            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const createInvoice = async () => {
        try {
            if (!createForm.booking_id) {
                toast.error('Please select a booking');
                return;
            }

            const response = await fetch('http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=generate_invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...createForm,
                    user_id: 1 // Replace with actual user ID from context
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Invoice created successfully');
                setShowCreateModal(false);
                setCreateForm({ booking_id: '', due_date: '', notes: '' });
                fetchInvoices();
                fetchStats();
            } else {
                toast.error(data.message || 'Failed to create invoice');
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            toast.error('Failed to create invoice');
        }
    };

    const processPayment = async () => {
        try {
            if (!selectedInvoice || !paymentForm.amount) {
                toast.error('Please fill all required fields');
                return;
            }

            const response = await fetch('http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=process_payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...paymentForm,
                    invoice_id: selectedInvoice.id,
                    processed_by: 1 // Replace with actual user ID from context
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Payment processed successfully');
                setShowPaymentModal(false);
                setPaymentForm({ amount: '', payment_method: 'cash', transaction_id: '', notes: '' });
                fetchInvoices();
                fetchStats();
            } else {
                toast.error(data.message || 'Failed to process payment');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error('Failed to process payment');
        }
    };

    const generateInvoice = async (invoiceId, format) => {
        try {
            const response = await fetch(`http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=invoice_details&invoice_id=${invoiceId}`);
            
            if (format === 'pdf') {
                const data = await response.json();
                if (data.success) {
                    // Download PDF
                    const link = document.createElement('a');
                    link.href = `data:application/pdf;base64,${data.data.pdf_content}`;
                    link.download = data.data.filename;
                    link.click();
                }
            } else if (format === 'email') {
                const data = await response.json();
                if (data.success) {
                    toast.success(`Invoice sent to ${data.data.email}`);
                } else {
                    toast.error(data.message || 'Failed to send invoice');
                }
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error('Failed to generate invoice');
        }
    };

    const downloadInvoice = (invoiceId) => {
                    window.open(`http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=invoice_details&invoice_id=${invoiceId}`, '_blank');
    };

    const viewInvoice = async (invoiceId) => {
        try {
            const response = await fetch(`http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=invoice_details&invoice_id=${invoiceId}`);
            const data = await response.json();

            if (data.success) {
                setSelectedInvoice(data.data);
                setShowInvoiceModal(true);
            } else {
                toast.error(data.message || 'Failed to fetch invoice details');
            }
        } catch (error) {
            console.error('Error fetching invoice details:', error);
            toast.error('Failed to fetch invoice details');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const getStatusBadge = (status) => {
        const statusColors = {
            'draft': 'bg-gray-100 text-gray-800',
            'sent': 'bg-blue-100 text-blue-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'paid': 'bg-green-100 text-green-800',
            'overdue': 'bg-red-100 text-red-800',
            'partial': 'bg-orange-100 text-orange-800'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        SV ROYAL LUXURY ROOMS - Billing Management
                    </h1>
                    <p className="text-gray-600">
                        Comprehensive invoice management and payment processing system
                    </p>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-blue-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-yellow-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-green-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-blue-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Today's Payments</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todayPayments)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-red-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Overdue</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.overdueInvoices}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                            >
                                <FaPlus className="mr-2" />
                                Create Invoice
                            </button>
                            <button
                                onClick={() => setShowPaymentModal(true)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                            >
                                <FaFileInvoiceDollar className="mr-2" />
                                Process Payment
                            </button>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={fetchInvoices}
                                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
                            >
                                <FaSearch className="mr-2" />
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <FaFilter className="mr-2" />
                        Filters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        >
                            <option value="">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="sent">Sent</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                            <option value="partial">Partial</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Guest Name"
                            value={filters.guest_name}
                            onChange={(e) => setFilters({ ...filters, guest_name: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <input
                            type="text"
                            placeholder="Booking Reference"
                            value={filters.booking_reference}
                            onChange={(e) => setFilters({ ...filters, booking_reference: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <input
                            type="date"
                            value={filters.date_from}
                            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                        <input
                            type="date"
                            value={filters.date_to}
                            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                            className="border border-gray-300 rounded-lg px-3 py-2"
                        />
                    </div>
                </div>

                {/* Invoices Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Invoices</h3>
                    </div>
                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600">Loading invoices...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Invoice #
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Guest
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Booking Ref
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Due Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {invoice.invoice_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {invoice.guest_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {invoice.booking_reference}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(invoice.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(invoice.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(invoice.due_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => viewInvoice(invoice.id)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="View Details"
                                                    >
                                                        <FaEye />
                                                    </button>
                                                    <button
                                                        onClick={() => downloadInvoice(invoice.id)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Download PDF"
                                                    >
                                                        <FaDownload />
                                                    </button>
                                                    <button
                                                        onClick={() => generateInvoice(invoice.id, 'email')}
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Send via Email"
                                                    >
                                                        <FaEnvelope />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowPaymentModal(true);
                                                        }}
                                                        className="text-orange-600 hover:text-orange-900"
                                                        title="Process Payment"
                                                    >
                                                        <FaFileInvoiceDollar />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {invoices.length === 0 && (
                                <div className="text-center py-8">
                                    <FaFileInvoiceDollar className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Get started by creating a new invoice.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Invoice</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                                    <input
                                        type="text"
                                        value={createForm.booking_id}
                                        onChange={(e) => setCreateForm({ ...createForm, booking_id: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="Enter booking ID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                                    <input
                                        type="date"
                                        value={createForm.due_date}
                                        onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                                    <textarea
                                        value={createForm.notes}
                                        onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        rows="3"
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createInvoice}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                                >
                                    Create Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {selectedInvoice ? `Process Payment - ${selectedInvoice.invoice_number}` : 'Process Payment'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="Enter amount"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                    <select
                                        value={paymentForm.payment_method}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="credit_card">Credit Card</option>
                                        <option value="debit_card">Debit Card</option>
                                        <option value="upi">UPI</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                        <option value="online_wallet">Online Wallet</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                                    <input
                                        type="text"
                                        value={paymentForm.transaction_id}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, transaction_id: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        placeholder="Optional transaction ID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                                    <textarea
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                                        rows="3"
                                        placeholder="Optional notes"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowPaymentModal(false)}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={processPayment}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                                >
                                    Process Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Details Modal */}
            {showInvoiceModal && selectedInvoice && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Invoice Details - {selectedInvoice.invoice.invoice_number}
                                </h3>
                                <button
                                    onClick={() => setShowInvoiceModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <h4 className="font-semibold mb-2">Guest Information</h4>
                                    <p><strong>Name:</strong> {selectedInvoice.invoice.guest_name}</p>
                                    <p><strong>Email:</strong> {selectedInvoice.invoice.guest_email}</p>
                                    <p><strong>Phone:</strong> {selectedInvoice.invoice.guest_phone}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Invoice Information</h4>
                                    <p><strong>Status:</strong> {getStatusBadge(selectedInvoice.invoice.status)}</p>
                                    <p><strong>Due Date:</strong> {new Date(selectedInvoice.invoice.due_date).toLocaleDateString()}</p>
                                    <p><strong>Total Amount:</strong> {formatCurrency(selectedInvoice.invoice.total_amount)}</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="font-semibold mb-2">Invoice Items</h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full border border-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                                                <th className="border border-gray-200 px-4 py-2 text-left">Quantity</th>
                                                <th className="border border-gray-200 px-4 py-2 text-left">Unit Price</th>
                                                <th className="border border-gray-200 px-4 py-2 text-left">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedInvoice.items.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="border border-gray-200 px-4 py-2">{item.description}</td>
                                                    <td className="border border-gray-200 px-4 py-2">{item.quantity}</td>
                                                    <td className="border border-gray-200 px-4 py-2">{formatCurrency(item.unit_price)}</td>
                                                    <td className="border border-gray-200 px-4 py-2">{formatCurrency(item.total_price)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="font-semibold mb-2">Payment History</h4>
                                    <div className="space-y-2">
                                        {selectedInvoice.payments.map((payment, index) => (
                                            <div key={index} className="bg-gray-50 p-3 rounded">
                                                <p><strong>Date:</strong> {new Date(payment.payment_date).toLocaleString()}</p>
                                                <p><strong>Amount:</strong> {formatCurrency(payment.amount)}</p>
                                                <p><strong>Method:</strong> {payment.method_name}</p>
                                                <p><strong>Status:</strong> {payment.payment_status}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => downloadInvoice(selectedInvoice.invoice.id)}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                                >
                                    <FaDownload className="mr-2" />
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => generateInvoice(selectedInvoice.invoice.id, 'email')}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
                                >
                                    <FaEnvelope className="mr-2" />
                                    Send via Email
                                </button>
                                <button
                                    onClick={() => setShowInvoiceModal(false)}
                                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComprehensiveBilling;
