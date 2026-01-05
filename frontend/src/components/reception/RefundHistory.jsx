import React, { useState, useEffect } from 'react';
import { 
    FaSearch, 
    FaFilter, 
    FaDownload, 
    FaEye,
    FaPrint,
    FaUndo,
    FaCheckCircle,
    FaTimesCircle,
    FaExclamationTriangle,
    FaCalendarAlt,
    FaUser,
    FaCreditCard,
    FaMoneyBillWave,
    FaUniversity,
    FaWallet,
    FaInfoCircle,
    FaFileExport,
    FaTimes
} from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const RefundHistory = () => {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [showRefundDetails, setShowRefundDetails] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(20);
    const [stats, setStats] = useState({
        totalRefunds: 0,
        totalAmount: 0,
        todayRefunds: 0,
        todayAmount: 0,
        pendingRefunds: 0,
        completedRefunds: 0
    });

    const [filters, setFilters] = useState({
        guest_name: '',
        refund_method: '',
        refund_status: '',
        refund_reason: '',
        date_from: '',
        date_to: '',
        amount_min: '',
        amount_max: '',
        processed_by: ''
    });

    const [showFilters, setShowFilters] = useState(false);

    const refundStatuses = [
        { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'processing', label: 'Processing', color: 'bg-blue-100 text-blue-800' },
        { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
        { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' },
        { value: 'reversed', label: 'Reversed', color: 'bg-gray-100 text-gray-800' }
    ];

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

    useEffect(() => {
        fetchRefundHistory();
        fetchRefundStats();
    }, [filters, currentPage]);

    const fetchRefundHistory = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            
            // Add filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value) queryParams.append(key, value);
            });

            // Add pagination
            queryParams.append('page', currentPage);
            queryParams.append('limit', itemsPerPage);

            const response = await fetch(buildApiUrl(`api/comprehensive_billing_api.php?action=refund_history&${queryParams}`));
            const data = await response.json();
            
            if (data.success) {
                setRefunds(data.refunds);
                setTotalPages(Math.ceil(data.total / itemsPerPage));
            } else {
                console.error('Failed to fetch refund history:', data.message);
            }
        } catch (error) {
            console.error('Error fetching refund history:', error);
        } finally {
            setLoading(false);
        }
        // For demo purposes, create sample data
        const sampleRefunds = [
            {
                id: 1,
                refund_receipt: 'REF-2024-000001',
                guest_name: 'John Doe',
                booking_reference: 'BK-2024-001',
                original_payment: 'RCP-2024-000001',
                amount: 2500.00,
                refund_method: 'cash',
                refund_reason: 'guest_request',
                status: 'completed',
                processed_by: 'Admin User',
                processed_at: '2024-01-15 14:30:00',
                notes: 'Guest requested cancellation due to change in travel plans'
            },
            {
                id: 2,
                refund_receipt: 'REF-2024-000002',
                guest_name: 'Jane Smith',
                booking_reference: 'BK-2024-002',
                original_payment: 'RCP-2024-000002',
                amount: 1800.00,
                refund_method: 'bank_transfer',
                refund_reason: 'medical_emergency',
                status: 'completed',
                processed_by: 'Admin User',
                processed_at: '2024-01-14 10:15:00',
                notes: 'Medical emergency - full refund provided with documentation'
            },
            {
                id: 3,
                refund_receipt: 'REF-2024-000003',
                guest_name: 'Mike Johnson',
                booking_reference: 'BK-2024-003',
                original_payment: 'RCP-2024-000003',
                amount: 3200.00,
                refund_method: 'credit_card',
                refund_reason: 'hotel_fault',
                status: 'processing',
                processed_by: 'Admin User',
                processed_at: '2024-01-13 16:45:00',
                notes: 'Room maintenance issue - processing card refund'
            }
        ];
        setRefunds(sampleRefunds);
        setTotalPages(1);
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
            // Set sample stats for demo
            setStats({
                totalRefunds: 3,
                totalAmount: 7500.00,
                todayRefunds: 1,
                todayAmount: 2500.00,
                pendingRefunds: 1,
                completedRefunds: 2
            });
        }
    };

    const viewRefundDetails = (refund) => {
        setSelectedRefund(refund);
        setShowRefundDetails(true);
    };

    const exportRefundHistory = () => {
        // Create CSV content
        const headers = [
            'Refund Receipt',
            'Guest Name',
            'Booking Reference',
            'Original Payment',
            'Amount',
            'Refund Method',
            'Refund Reason',
            'Status',
            'Processed By',
            'Processed At',
            'Notes'
        ];

        const csvContent = [
            headers.join(','),
            ...refunds.map(refund => [
                refund.refund_receipt,
                refund.guest_name,
                refund.booking_reference,
                refund.original_payment,
                refund.amount,
                refund.refund_method.replace('_', ' ').toUpperCase(),
                refund.refund_reason.replace('_', ' ').toUpperCase(),
                refund.status.toUpperCase(),
                refund.processed_by,
                refund.processed_at,
                `"${refund.notes}"`
            ].join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `refund_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        // Handle null, undefined, or empty string
        if (!dateString) {
            return 'N/A';
        }
        
        try {
            const date = new Date(dateString);
            
            // Check if the date is valid
            if (isNaN(date.getTime())) {
                return 'N/A';
            }
            
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Error formatting date:', error, 'Input:', dateString);
            return 'N/A';
        }
    };

    const getStatusColor = (status) => {
        const statusObj = refundStatuses.find(s => s.value === status);
        return statusObj ? statusObj.color : 'bg-gray-100 text-gray-800';
    };

    const getRefundReasonLabel = (reason) => {
        const reasonObj = refundReasons.find(r => r.value === reason);
        return reasonObj ? reasonObj.label : reason.replace('_', ' ').toUpperCase();
    };

    const filteredRefunds = refunds.filter(refund => {
        if (filters.guest_name && !refund.guest_name.toLowerCase().includes(filters.guest_name.toLowerCase())) return false;
        if (filters.refund_method && refund.refund_method !== filters.refund_method) return false;
        if (filters.refund_status && refund.status !== filters.refund_status) return false;
        if (filters.refund_reason && refund.refund_reason !== filters.refund_reason) return false;
        if (filters.amount_min && refund.amount < parseFloat(filters.amount_min)) return false;
        if (filters.amount_max && refund.amount > parseFloat(filters.amount_max)) return false;
        return true;
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Refund History</h1>
                    <p className="text-gray-600">Track all processed refunds and their status</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
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
                                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.pendingRefunds}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FaCheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Completed</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.completedRefunds}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FaCalendarAlt className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Today</p>
                                <p className="text-2xl font-semibold text-gray-900">{stats.todayRefunds}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-2 bg-indigo-100 rounded-lg">
                                <FaMoneyBillWave className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Today Amount</p>
                                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.todayAmount)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Export */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium text-gray-900">Filters & Export</h3>
                            <div className="flex space-x-3">
                                <button
                                    onClick={exportRefundHistory}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <FaFileExport className="mr-2" />
                                    Export CSV
                                </button>
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                >
                                    <FaFilter className="mr-2" />
                                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <input
                                type="text"
                                placeholder="Guest Name"
                                value={filters.guest_name}
                                onChange={(e) => setFilters({...filters, guest_name: e.target.value})}
                                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <select
                                value={filters.refund_method}
                                onChange={(e) => setFilters({...filters, refund_method: e.target.value})}
                                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Methods</option>
                                <option value="cash">Cash</option>
                                <option value="credit_card">Credit Card</option>
                                <option value="debit_card">Debit Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="upi">UPI</option>
                                <option value="cheque">Cheque</option>
                                <option value="wallet_credit">Wallet Credit</option>
                            </select>
                            <select
                                value={filters.refund_status}
                                onChange={(e) => setFilters({...filters, refund_status: e.target.value})}
                                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Statuses</option>
                                {refundStatuses.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={filters.refund_reason}
                                onChange={(e) => setFilters({...filters, refund_reason: e.target.value})}
                                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Reasons</option>
                                {refundReasons.map(reason => (
                                    <option key={reason.value} value={reason.value}>
                                        {reason.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Refunds Table */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Refund History</h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Refund Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Guest & Booking
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount & Method
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status & Reason
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Processed By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredRefunds.map((refund) => (
                                    <tr key={refund.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {refund.refund_receipt}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {formatDate(refund.processed_at)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {refund.guest_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {refund.booking_reference}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {refund.original_payment}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(refund.amount)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {refund.refund_method.replace('_', ' ').toUpperCase()}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(refund.status)}`}>
                                                    {refund.status.toUpperCase()}
                                                </span>
                                                <div className="text-sm text-gray-500 mt-1">
                                                    {getRefundReasonLabel(refund.refund_reason)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {refund.processed_by}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => viewRefundDetails(refund)}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                <FaEye className="inline mr-1" />
                                                View
                                            </button>
                                            <button
                                                onClick={() => {/* Print refund receipt */}}
                                                className="text-gray-600 hover:text-gray-900"
                                            >
                                                <FaPrint className="inline mr-1" />
                                                Print
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredRefunds.length === 0 && (
                            <div className="text-center py-8">
                                <FaInfoCircle className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No refunds found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {loading ? 'Loading refunds...' : 'No refunds match your filters.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing page {currentPage} of {totalPages}
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Refund Details Modal */}
                {showRefundDetails && selectedRefund && (
                    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Refund Details</h3>
                                    <button
                                        onClick={() => setShowRefundDetails(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <FaTimes className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">Refund Information</h4>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><strong>Receipt:</strong> {selectedRefund.refund_receipt}</p>
                                            <p><strong>Amount:</strong> {formatCurrency(selectedRefund.amount)}</p>
                                            <p><strong>Method:</strong> {selectedRefund.refund_method.replace('_', ' ').toUpperCase()}</p>
                                            <p><strong>Status:</strong> 
                                                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRefund.status)}`}>
                                                    {selectedRefund.status.toUpperCase()}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">Guest & Booking</h4>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><strong>Guest:</strong> {selectedRefund.guest_name}</p>
                                            <p><strong>Booking:</strong> {selectedRefund.booking_reference}</p>
                                            <p><strong>Original Payment:</strong> {selectedRefund.original_payment}</p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-medium text-gray-900 mb-2">Processing Details</h4>
                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p><strong>Reason:</strong> {getRefundReasonLabel(selectedRefund.refund_reason)}</p>
                                            <p><strong>Processed By:</strong> {selectedRefund.processed_by}</p>
                                            <p><strong>Processed At:</strong> {formatDate(selectedRefund.processed_at)}</p>
                                            {selectedRefund.notes && (
                                                <p><strong>Notes:</strong> {selectedRefund.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end mt-6">
                                    <button
                                        onClick={() => setShowRefundDetails(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    >
                                        Close
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

export default RefundHistory;
