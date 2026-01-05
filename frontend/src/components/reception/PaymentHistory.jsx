import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRealTime } from '../../contexts/RealTimeContext';
import { 
    FaSearch, 
    FaFilter, 
    FaDownload, 
    FaEye,
    FaCalendarAlt,
    FaUser,
    FaCreditCard,
    FaUndo,
    FaPrint,
    FaChartBar,
    FaSync,
    FaTimes,
    FaCheck,
    FaExclamationTriangle,
    FaWifi,
    FaExclamationCircle,
    FaBell,
    FaBellSlash
} from 'react-icons/fa';
import { toast } from 'react-toastify';

const PaymentHistory = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(20);
    const [previousPaymentCount, setPreviousPaymentCount] = useState(0);
    const [stats, setStats] = useState({
        totalPayments: 0,
        totalAmount: 0,
        todayPayments: 0,
        todayAmount: 0
    });

    const [filters, setFilters] = useState({
        guest_name: '',
        payment_method: '',
        payment_status: '',
        date_from: '',
        date_to: '',
        amount_min: '',
        amount_max: '',
        processed_by: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [realTimeEnabled, setRealTimeEnabled] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());
    const [newPaymentsCount, setNewPaymentsCount] = useState(0);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    
    const previousPaymentsRef = useRef([]);
    const updateIntervalRef = useRef(null);
    const { isConnected, sendMessage, subscribeToChannel, unsubscribeFromChannel } = useRealTime();

    // Fetch payment history with pagination
    const fetchPaymentHistory = useCallback(async () => {
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

            const response = await fetch(`http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=payment_history&${queryParams}`);
            const data = await response.json();
            
            if (data.success) {
                const newPayments = data.payments;
                const previousPayments = previousPaymentsRef.current;
                
                // Check for new payments
                if (previousPayments.length > 0 && newPayments.length > previousPayments.length) {
                    const newPaymentCount = newPayments.length - previousPayments.length;
                    setNewPaymentsCount(prev => prev + newPaymentCount);
                    
                    // Show notification for new payments
                    if (notificationsEnabled) {
                        const newPayments = data.payments.slice(0, newPaymentCount);
                        newPayments.forEach(payment => {
                            toast.success(`New payment received: ${payment.receipt_number} - ₹${payment.amount}`, {
                                position: "top-right",
                                autoClose: 5000,
                                hideProgressBar: false,
                                closeOnClick: true,
                                pauseOnHover: true,
                                draggable: true,
                            });
                        });
                    }
                }
                
                setPayments(newPayments);
                previousPaymentsRef.current = newPayments;
                setTotalPages(Math.ceil(data.total_count / itemsPerPage));
                setLastUpdate(new Date());
            } else {
                toast.error(data.message || 'Failed to fetch payment history');
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
            toast.error('Failed to fetch payment history');
        } finally {
            setLoading(false);
        }
    }, [filters, currentPage, itemsPerPage]);

    // Fetch payment statistics
    const fetchPaymentStats = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=payment_stats`);
            const data = await response.json();
            
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching payment stats:', error);
        }
    }, []);

    // Handle real-time payment updates
    const handlePaymentUpdate = useCallback((data) => {
        const { type, data: paymentData } = data;
        
        switch (type) {
            case 'payment_received':
                handleNewPayment(paymentData);
                break;
            case 'payment_status_changed':
                handlePaymentStatusChange(paymentData);
                break;
            case 'payment_refunded':
                handlePaymentRefund(paymentData);
                break;
            case 'payment_failed':
                handlePaymentFailure(paymentData);
                break;
            case 'online_payment_verified':
                handleOnlinePaymentVerification(paymentData);
                break;
            default:
                console.log('Unknown payment update type:', type);
        }
    }, []);

    // Handle new payment received
    const handleNewPayment = useCallback((paymentData) => {
        setPayments(prev => [paymentData, ...prev.slice(0, -1)]);
        setNewPaymentsCount(prev => prev + 1);
        setLastUpdate(new Date());
        
        // Show notification
        if (notificationsEnabled) {
            toast.success(`New payment received: ${paymentData.receipt_number} - ₹${paymentData.amount}`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    }, [notificationsEnabled]);

    // Handle payment status change
    const handlePaymentStatusChange = useCallback((paymentData) => {
        setPayments(prev => 
            prev.map(payment => 
                payment.id === paymentData.payment_id 
                    ? { ...payment, payment_status: paymentData.new_status }
                    : payment
            )
        );
        
        setLastUpdate(new Date());
        
        // Show notification
        if (notificationsEnabled) {
            toast.info(`Payment status changed: ${paymentData.receipt_number} - ${paymentData.old_status} → ${paymentData.new_status}`, {
                position: "top-right",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    }, [notificationsEnabled]);

    // Handle payment refund
    const handlePaymentRefund = useCallback((paymentData) => {
        setPayments(prev => 
            prev.map(payment => 
                payment.id === paymentData.payment_id 
                    ? { ...payment, payment_status: 'refunded' }
                    : payment
            )
        );
        
        setLastUpdate(new Date());
        
        // Show notification
        if (notificationsEnabled) {
            toast.warning(`Payment refunded: ${paymentData.receipt_number} - ₹${paymentData.refund_amount}`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    }, [notificationsEnabled]);

    // Handle payment failure
    const handlePaymentFailure = useCallback((paymentData) => {
        setPayments(prev => 
            prev.map(payment => 
                payment.id === paymentData.payment_id 
                    ? { ...payment, payment_status: 'failed' }
                    : payment
            )
        );
        
        setLastUpdate(new Date());
        
        // Show notification
        if (notificationsEnabled) {
            toast.error(`Payment failed: ${paymentData.receipt_number} - ${paymentData.failure_reason}`, {
                position: "top-right",
                autoClose: 6000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    }, [notificationsEnabled]);

    // Handle online payment verification
    const handleOnlinePaymentVerification = useCallback((paymentData) => {
        setPayments(prev => 
            prev.map(payment => 
                payment.id === paymentData.payment_id 
                    ? { ...payment, verification_status: paymentData.verification_status }
                    : payment
            )
        );
        
        setLastUpdate(new Date());
        
        // Show notification
        if (notificationsEnabled) {
            const status = paymentData.verification_status === 'verified' ? 'verified' : 'failed';
            const icon = status === 'verified' ? '✅' : '❌';
            toast.info(`${icon} Online payment ${status}: ${paymentData.receipt_number}`, {
                position: "top-right",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    }, [notificationsEnabled]);

    // Toggle real-time updates
    const toggleRealTime = useCallback(() => {
        if (realTimeEnabled) {
            // Disable real-time
            setRealTimeEnabled(false);
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
                updateIntervalRef.current = null;
            }
            unsubscribeFromChannel('reception');
            toast.info('Real-time updates disabled');
        } else {
            // Enable real-time
            setRealTimeEnabled(true);
            subscribeToChannel('reception');
            toast.info('Real-time updates enabled');
        }
    }, [realTimeEnabled, subscribeToChannel, unsubscribeFromChannel]);

    // Toggle notifications
    const toggleNotifications = useCallback(() => {
        setNotificationsEnabled(prev => !prev);
        toast.info(`Notifications ${!notificationsEnabled ? 'enabled' : 'disabled'}`);
    }, [notificationsEnabled]);

    // Clear new payments count
    const clearNewPaymentsCount = useCallback(() => {
        setNewPaymentsCount(0);
    }, []);

    // Initialize real-time connection
    useEffect(() => {
        if (isConnected && realTimeEnabled) {
            subscribeToChannel('reception');
            
            // Set up periodic refresh as backup
            updateIntervalRef.current = setInterval(() => {
                fetchPaymentHistory(false); // Don't show loading
                fetchPaymentStats();
            }, 30000); // Every 30 seconds
        }

        return () => {
            if (updateIntervalRef.current) {
                clearInterval(updateIntervalRef.current);
            }
            unsubscribeFromChannel('reception');
        };
    }, [isConnected, realTimeEnabled, subscribeToChannel, unsubscribeFromChannel, fetchPaymentHistory, fetchPaymentStats]);

    // Listen for WebSocket messages
    useEffect(() => {
        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type && data.channel === 'reception') {
                    handlePaymentUpdate(data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        // Add event listener for WebSocket messages
        if (isConnected) {
            window.addEventListener('websocket-message', handleMessage);
        }

        return () => {
            window.removeEventListener('websocket-message', handleMessage);
        };
    }, [isConnected, handlePaymentUpdate]);

    useEffect(() => {
        fetchPaymentHistory();
        fetchPaymentStats();
        
        // Set up real-time updates every 30 seconds
        const interval = setInterval(() => {
            fetchPaymentHistory();
            fetchPaymentStats();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchPaymentHistory, fetchPaymentStats]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setCurrentPage(1); // Reset to first page when filters change
    };

    const clearFilters = () => {
        setFilters({
            guest_name: '',
            payment_method: '',
            payment_status: '',
            date_from: '',
            date_to: '',
            amount_min: '',
            amount_max: '',
            processed_by: ''
        });
        setCurrentPage(1);
    };

    const handlePaymentDetails = (payment) => {
        setSelectedPayment(payment);
        setShowPaymentDetails(true);
    };

    const handleRefund = (payment) => {
        setSelectedPayment(payment);
        setRefundAmount(payment.amount);
        setRefundReason('');
        setShowRefundModal(true);
    };

    const processRefund = async () => {
        if (!refundAmount || !refundReason) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const response = await fetch(`http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=process_refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_id: selectedPayment.id,
                    refund_amount: parseFloat(refundAmount),
                    refund_reason: refundReason
                })
            });

            const data = await response.json();
            
            if (data.success) {
                toast.success('Refund processed successfully');
                setShowRefundModal(false);
                fetchPaymentHistory(); // Refresh the list
                fetchPaymentStats(); // Refresh stats
            } else {
                toast.error(data.message || 'Failed to process refund');
            }
        } catch (error) {
            console.error('Error processing refund:', error);
            toast.error('Failed to process refund');
        }
    };

    const printPayment = (payment) => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Payment Receipt - ${payment.receipt_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .receipt { margin: 20px 0; }
                        .row { display: flex; justify-content: space-between; margin: 5px 0; }
                        .total { font-weight: bold; font-size: 18px; border-top: 1px solid #333; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Hotel Management System</h1>
                        <h2>Payment Receipt</h2>
                    </div>
                    <div class="receipt">
                        <div class="row">
                            <strong>Receipt #:</strong> ${payment.receipt_number}
                        </div>
                        <div class="row">
                            <strong>Date:</strong> ${new Date(payment.payment_date).toLocaleDateString()}
                        </div>
                        <div class="row">
                            <strong>Time:</strong> ${new Date(payment.payment_date).toLocaleTimeString()}
                        </div>
                        <div class="row">
                            <strong>Guest:</strong> ${payment.guest_name}
                        </div>
                        <div class="row">
                            <strong>Phone:</strong> ${payment.guest_phone}
                        </div>
                        <div class="row">
                            <strong>Payment Method:</strong> ${payment.payment_method.replace('_', ' ')}
                        </div>
                        <div class="row">
                            <strong>Status:</strong> ${payment.payment_status}
                        </div>
                        <div class="row total">
                            <strong>Amount:</strong> ₹${parseFloat(payment.amount).toFixed(2)}
                        </div>
                        <div class="row">
                            <strong>Processed By:</strong> ${payment.processed_by_name}
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const exportPayments = () => {
        // Enhanced CSV export with more details
        const headers = [
            'Date', 'Time', 'Receipt #', 'Guest Name', 'Guest Phone', 
            'Amount', 'Method', 'Status', 'Transaction ID', 'Processed By', 'Notes'
        ];
        
        const csvContent = [
            headers.join(','),
            ...payments.map(payment => [
                new Date(payment.payment_date).toLocaleDateString(),
                new Date(payment.payment_date).toLocaleTimeString(),
                payment.receipt_number,
                payment.guest_name,
                payment.guest_phone,
                payment.amount,
                payment.payment_method.replace('_', ' '),
                payment.payment_status,
                payment.transaction_id || '',
                payment.processed_by_name,
                payment.notes || ''
            ].map(field => `"${field}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Payment history exported successfully');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'refunded': return 'bg-gray-100 text-gray-800';
            case 'partially_refunded': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getMethodIcon = (method) => {
        switch (method) {
            case 'cash': return '💵';
            case 'credit_card': return '💳';
            case 'debit_card': return '💳';
            case 'upi': return '📱';
            case 'bank_transfer': return '🏦';
            case 'cheque': return '📄';
            case 'online_wallet': return '📱';
            default: return '💰';
        }
    };

    const formatCurrency = (amount) => {
        return `₹${parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6">
            {/* Header with Stats */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Real-Time Payment History</h2>
                        <p className="text-gray-600">Live synchronized payment records with instant updates</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {/* Real-time Status */}
                        <div className="flex items-center space-x-2">
                            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                                isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {isConnected ? <FaWifi className="h-4 w-4" /> : <FaExclamationCircle className="h-4 w-4" />}
                                <span className="text-sm font-medium">
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                            </div>
                        </div>

                        {/* Real-time Toggle */}
                        <button
                            onClick={toggleRealTime}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                                realTimeEnabled 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-gray-600 text-white hover:bg-gray-700'
                            }`}
                        >
                            {realTimeEnabled ? <FaSync className="h-4 w-4 animate-spin" /> : <FaSync className="h-4 w-4" />}
                            <span>{realTimeEnabled ? 'Real-time ON' : 'Real-time OFF'}</span>
                        </button>

                        {/* Notifications Toggle */}
                        <button
                            onClick={toggleNotifications}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                                notificationsEnabled 
                                    ? 'bg-green-600 text-white hover:bg-green-700' 
                                    : 'bg-gray-600 text-white hover:bg-gray-700'
                            }`}
                        >
                            {notificationsEnabled ? <FaBell className="h-4 w-4" /> : <FaBellSlash className="h-4 w-4" />}
                            <span>{notificationsEnabled ? 'Notifications ON' : 'Notifications OFF'}</span>
                        </button>

                        {/* New Payments Indicator */}
                        {newPaymentsCount > 0 && (
                            <button
                                onClick={clearNewPaymentsCount}
                                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                            >
                                <FaBell className="h-4 w-4" />
                                <span>{newPaymentsCount} New</span>
                            </button>
                        )}

                        {/* Last Update */}
                        <div className="text-sm text-gray-500">
                            Last update: {lastUpdate.toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <FaChartBar className="h-8 w-8 text-blue-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-blue-600">Total Payments</p>
                                <p className="text-2xl font-bold text-blue-900">{stats.totalPayments}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <FaCreditCard className="h-8 w-8 text-green-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-green-600">Total Amount</p>
                                <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalAmount)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <FaCalendarAlt className="h-8 w-8 text-yellow-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-yellow-600">Today's Payments</p>
                                <p className="text-2xl font-bold text-yellow-900">{stats.todayPayments}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="flex items-center">
                            <FaUser className="h-8 w-8 text-purple-600" />
                            <div className="ml-3">
                                <p className="text-sm font-medium text-purple-600">Today's Revenue</p>
                                <p className="text-2xl font-bold text-purple-900">{formatCurrency(stats.todayAmount)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-6">
                    <div className="flex space-x-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <FaFilter className="h-4 w-4" />
                            <span>Filters</span>
                        </button>
                        <button
                            onClick={exportPayments}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                            <FaDownload className="h-4 w-4" />
                            <span>Export</span>
                        </button>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => { fetchPaymentHistory(); fetchPaymentStats(); }}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            <FaSync className="h-4 w-4" />
                            <span>Manual Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Filters */}
            {showFilters && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Payments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Guest Name
                            </label>
                            <input
                                type="text"
                                name="guest_name"
                                value={filters.guest_name}
                                onChange={handleFilterChange}
                                placeholder="Search by guest name..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Method
                            </label>
                            <select
                                name="payment_method"
                                value={filters.payment_method}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All methods</option>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Status
                            </label>
                            <select
                                name="payment_status"
                                value={filters.payment_status}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All statuses</option>
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                                <option value="refunded">Refunded</option>
                                <option value="partially_refunded">Partially Refunded</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                From Date
                            </label>
                            <input
                                type="date"
                                name="date_from"
                                value={filters.date_from}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                To Date
                            </label>
                            <input
                                type="date"
                                name="date_to"
                                value={filters.date_to}
                                onChange={handleFilterChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Amount
                            </label>
                            <input
                                type="number"
                                name="amount_min"
                                value={filters.amount_min}
                                onChange={handleFilterChange}
                                placeholder="Minimum amount"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Amount
                            </label>
                            <input
                                type="number"
                                name="amount_max"
                                value={filters.amount_max}
                                onChange={handleFilterChange}
                                placeholder="Maximum amount"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Processed By
                            </label>
                            <input
                                type="text"
                                name="processed_by"
                                value={filters.processed_by}
                                onChange={handleFilterChange}
                                placeholder="Staff name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Payments Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        Payment Records ({payments.length})
                        {newPaymentsCount > 0 && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                {newPaymentsCount} new
                            </span>
                        )}
                    </h3>
                </div>
                
                {loading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading payments...</p>
                    </div>
                ) : payments.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        <FaExclamationTriangle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p>No payment records found.</p>
                        <p className="text-sm">Try adjusting your filters or check back later.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Payment Details
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Guest
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Method
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
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
                                    {payments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {payment.receipt_number}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(payment.payment_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {new Date(payment.payment_date).toLocaleTimeString()}
                                                    </div>
                                                    {payment.transaction_id && (
                                                        <div className="text-xs text-gray-400">
                                                            TXN: {payment.transaction_id}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{payment.guest_name}</div>
                                                <div className="text-sm text-gray-500">{payment.guest_phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(payment.amount)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-lg">{getMethodIcon(payment.payment_method)}</span>
                                                    <span className="text-sm text-gray-900">
                                                        {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.payment_status)}`}>
                                                    {payment.payment_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{payment.processed_by_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handlePaymentDetails(payment)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="View Details"
                                                    >
                                                        <FaEye className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => printPayment(payment)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Print Receipt"
                                                    >
                                                        <FaPrint className="h-4 w-4" />
                                                    </button>
                                                    {payment.payment_status === 'completed' && (
                                                        <button
                                                            onClick={() => handleRefund(payment)}
                                                            className="text-orange-600 hover:text-orange-900"
                                                            title="Process Refund"
                                                        >
                                                            <FaUndo className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Payment Details Modal */}
            {showPaymentDetails && selectedPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                            <button
                                onClick={() => setShowPaymentDetails(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Receipt Number</label>
                                <p className="text-sm text-gray-900">{selectedPayment.receipt_number}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                                <p className="text-sm text-gray-900">
                                    {new Date(selectedPayment.payment_date).toLocaleDateString()} at{' '}
                                    {new Date(selectedPayment.payment_date).toLocaleTimeString()}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Guest Name</label>
                                <p className="text-sm text-gray-900">{selectedPayment.guest_name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Guest Phone</label>
                                <p className="text-sm text-gray-900">{selectedPayment.guest_phone}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount</label>
                                <p className="text-sm font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <p className="text-sm text-gray-900">
                                    {getMethodIcon(selectedPayment.payment_method)} {selectedPayment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayment.payment_status)}`}>
                                    {selectedPayment.payment_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Processed By</label>
                                <p className="text-sm text-gray-900">{selectedPayment.processed_by_name}</p>
                            </div>
                            {selectedPayment.transaction_id && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                                    <p className="text-sm text-gray-900">{selectedPayment.transaction_id}</p>
                                </div>
                            )}
                            {selectedPayment.notes && (
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                                    <p className="text-sm text-gray-900">{selectedPayment.notes}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => printPayment(selectedPayment)}
                                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <FaPrint className="h-4 w-4" />
                                <span>Print Receipt</span>
                            </button>
                            <button
                                onClick={() => setShowPaymentDetails(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refund Modal */}
            {showRefundModal && selectedPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Process Refund</h3>
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes className="h-6 w-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Original Amount
                                </label>
                                <p className="text-sm text-gray-900">{formatCurrency(selectedPayment.amount)}</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Refund Amount *
                                </label>
                                <input
                                    type="number"
                                    value={refundAmount}
                                    onChange={(e) => setRefundAmount(e.target.value)}
                                    max={selectedPayment.amount}
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Refund Reason *
                                </label>
                                <textarea
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter reason for refund..."
                                />
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={processRefund}
                                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                            >
                                <FaUndo className="h-4 w-4" />
                                <span>Process Refund</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentHistory;
