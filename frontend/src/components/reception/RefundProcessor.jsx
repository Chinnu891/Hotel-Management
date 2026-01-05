import React, { useState, useEffect } from 'react';
import { 
    FaSearch, 
    FaUndo, 
    FaCheck, 
    FaTimes, 
    FaEye,
    FaFilter,
    FaDownload,
    FaPrint,
    FaCreditCard,
    FaMoneyBillWave,
    FaUniversity,
    FaWallet,
    FaExclamationTriangle,
    FaInfoCircle,
    FaCalendarAlt
} from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const RefundProcessor = () => {
    const [payments, setPayments] = useState([]);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({
        totalRefunds: 0,
        totalRefundAmount: 0,
        pendingRefunds: 0,
        todayRefunds: 0
    });

    const [refundForm, setRefundForm] = useState({
        refund_amount: '',
        refund_reason: '',
        refund_method: 'cash',
        bank_details: '',
        notes: ''
    });

    const [filters, setFilters] = useState({
        guest_name: '',
        payment_method: '',
        payment_status: 'completed',
        date_from: '',
        date_to: '',
        amount_min: '',
        amount_max: ''
    });

    const [showFilters, setShowFilters] = useState(false);

    const refundReasons = [
        { value: 'guest_request', label: 'Guest Request' },
        { value: 'medical_emergency', label: 'Medical Emergency' },
        { value: 'travel_issues', label: 'Travel Issues' },
        { value: 'hotel_fault', label: 'Hotel Fault/Issue' },
        { value: 'weather_conditions', label: 'Weather Conditions' },
        { value: 'force_majeure', label: 'Force Majeure' },
        { value: 'service_issue', label: 'Service Issue' },
        { value: 'room_problem', label: 'Room Problem' },
        { value: 'other', label: 'Other' }
    ];

    const refundMethods = [
        { value: 'cash', label: 'Cash', icon: FaMoneyBillWave },
        { value: 'credit_card', label: 'Credit Card', icon: FaCreditCard },
        { value: 'debit_card', label: 'Debit Card', icon: FaCreditCard },
        { value: 'bank_transfer', label: 'Bank Transfer', icon: FaUniversity },
        { value: 'upi', label: 'UPI', icon: FaWallet },
        { value: 'cheque', label: 'Cheque', icon: FaMoneyBillWave },
        { value: 'wallet_credit', label: 'Wallet Credit', icon: FaWallet }
    ];

    useEffect(() => {
        fetchRefundablePayments();
        fetchRefundStats();
    }, [filters]);

    const fetchRefundablePayments = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            const response = await fetch(buildApiUrl(`api/comprehensive_billing_api.php?action=refundable_payments&${queryParams}`));
            const data = await response.json();
            
            if (data.success) {
                setPayments(data.payments);
            } else {
                setMessage(data.message || 'Failed to fetch payments');
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            setMessage('Error fetching payments');
        } finally {
            setLoading(false);
        }
    };

    const fetchRefundStats = async () => {
        try {
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=refund_stats'));
            const data = await response.json();
            
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching refund stats:', error);
        }
    };

    const selectPaymentForRefund = (payment) => {
        setSelectedPayment(payment);
        setRefundForm({
            refund_amount: payment.amount.toString(),
            refund_reason: '',
            refund_method: 'cash',
            bank_details: '',
            notes: ''
        });
        setShowRefundModal(true);
    };

    const handleRefundFormChange = (e) => {
        const { name, value } = e.target;
        setRefundForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const processRefund = async () => {
        try {
            setLoading(true);
            
            // Validate refund amount
            if (parseFloat(refundForm.refund_amount) > selectedPayment.amount) {
                setMessage('Refund amount cannot exceed original payment amount');
                return;
            }

            if (!refundForm.refund_reason) {
                setMessage('Please select a refund reason');
                return;
            }

            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=process_refund'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_id: selectedPayment.id,
                    refund_amount: parseFloat(refundForm.refund_amount),
                    refund_reason: refundForm.refund_reason,
                    refund_method: refundForm.refund_method,
                    bank_details: refundForm.bank_details,
                    notes: refundForm.notes,
                    user_id: 1 // Replace with actual user ID from auth
                }),
            });

            const data = await response.json();
            
            if (data.success) {
                setMessage(`Refund processed successfully! Refund Receipt: ${data.refund_receipt}`);
                setShowRefundModal(false);
                setSelectedPayment(null);
                setRefundForm({
                    refund_amount: '',
                    refund_reason: '',
                    refund_method: 'cash',
                    bank_details: '',
                    notes: ''
                });
                
                // Refresh data
                fetchRefundablePayments();
                fetchRefundStats();
            } else {
                setMessage(data.message || 'Failed to process refund');
            }
        } catch (error) {
            console.error('Error processing refund:', error);
            setMessage('Error processing refund');
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'refunded': return 'bg-blue-100 text-blue-800';
            case 'partially_refunded': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredPayments = payments.filter(payment => {
        if (filters.guest_name && !payment.guest_name.toLowerCase().includes(filters.guest_name.toLowerCase())) return false;
        if (filters.payment_method && payment.payment_method !== filters.payment_method) return false;
        if (filters.amount_min && payment.amount < parseFloat(filters.amount_min)) return false;
        if (filters.amount_max && payment.amount > parseFloat(filters.amount_max)) return false;
        return true;
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Refund Processor</h1>
                    <p className="text-gray-600">Process refunds for completed payments</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FaUndo className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Refunds</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.totalRefunds}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FaMoneyBillWave className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total Refund Amount</p>
                                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalRefundAmount)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending Refunds</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.pendingRefunds}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FaCalendarAlt className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Today's Refunds</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.todayRefunds}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                            >
                                <FaFilter className="mr-2" />
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </button>
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="text"
                                placeholder="Guest Name"
                                value={filters.guest_name}
                                onChange={(e) => setFilters({...filters, guest_name: e.target.value})}
                                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                                value={filters.payment_method}
                                onChange={(e) => setFilters({...filters, payment_method: e.target.value})}
                                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Payment Methods</option>
                                <option value="cash">Cash</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="debit_card">Debit Card</option>
                                <option value="upi">UPI</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                            <div className="flex space-x-2">
                                <input
                                    type="number"
                                    placeholder="Min Amount"
                                    value={filters.amount_min}
                                    onChange={(e) => setFilters({...filters, amount_min: e.target.value})}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                                />
                                <input
                                    type="number"
                                    placeholder="Max Amount"
                                    value={filters.amount_max}
                                    onChange={(e) => setFilters({...filters, amount_max: e.target.value})}
                                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Refundable Payments</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Guest
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Payment Details
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
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {payment.guest_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {payment.booking_reference}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm text-gray-900">
                                                    {payment.payment_method.replace('_', ' ').toUpperCase()}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {payment.receipt_number}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {new Date(payment.payment_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatCurrency(payment.amount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.payment_status)}`}>
                                                {payment.payment_status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => selectPaymentForRefund(payment)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                <FaUndo className="inline mr-1" />
                                                Process Refund
                                            </button>
                                            <button
                                                onClick={() => {/* View payment details */}}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                <FaEye className="inline mr-1" />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredPayments.length === 0 && (
                            <div className="text-center py-8">
                                <FaInfoCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No payments found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {loading ? 'Loading payments...' : 'No refundable payments match your filters.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`mt-4 p-4 rounded-md ${
                        message.includes('successfully') 
                            ? 'bg-green-50 text-green-800 border border-green-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Refund Modal */}
                {showRefundModal && selectedPayment && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Process Refund</h3>
                                    <button
                                        onClick={() => setShowRefundModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <FaTimes className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                                    <div className="text-sm text-gray-600">
                                        <p><strong>Guest:</strong> {selectedPayment.guest_name}</p>
                                        <p><strong>Amount:</strong> {formatCurrency(selectedPayment.amount)}</p>
                                        <p><strong>Method:</strong> {selectedPayment.payment_method.replace('_', ' ').toUpperCase()}</p>
                                        <p><strong>Receipt:</strong> {selectedPayment.receipt_number}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Refund Amount *
                                        </label>
                                        <input
                                            type="number"
                                            name="refund_amount"
                                            value={refundForm.refund_amount}
                                            onChange={handleRefundFormChange}
                                            max={selectedPayment.amount}
                                            step="0.01"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Maximum: {formatCurrency(selectedPayment.amount)}
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Refund Reason *
                                        </label>
                                        <select
                                            name="refund_reason"
                                            value={refundForm.refund_reason}
                                            onChange={handleRefundFormChange}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            <option value="">Select a reason</option>
                                            {refundReasons.map(reason => (
                                                <option key={reason.value} value={reason.value}>
                                                    {reason.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Refund Method *
                                        </label>
                                        <select
                                            name="refund_method"
                                            value={refundForm.refund_method}
                                            onChange={handleRefundFormChange}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        >
                                            {refundMethods.map(method => (
                                                <option key={method.value} value={method.value}>
                                                    {method.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {refundForm.refund_method === 'bank_transfer' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Bank Details
                                            </label>
                                            <textarea
                                                name="bank_details"
                                                value={refundForm.bank_details}
                                                onChange={handleRefundFormChange}
                                                placeholder="Account number, IFSC code, bank name..."
                                                rows="3"
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Additional Notes
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={refundForm.notes}
                                            onChange={handleRefundFormChange}
                                            placeholder="Any additional details..."
                                            rows="2"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end space-x-3 mt-6">
                                    <button
                                        onClick={() => setShowRefundModal(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={processRefund}
                                        disabled={loading || !refundForm.refund_amount || !refundForm.refund_reason}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Processing...' : 'Process Refund'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RefundProcessor;
