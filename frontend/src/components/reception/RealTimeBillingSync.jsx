import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../../config/api';
import { 
    FaSync, 
    FaDollarSign, 
    FaChartLine, 
    FaCreditCard, 
    FaCalendarDay,
    FaClock,
    FaExclamationTriangle,
    FaCheckCircle,
    FaInfoCircle,
    FaDatabase
} from 'react-icons/fa';

const RealTimeBillingSync = () => {
    const [billingStats, setBillingStats] = useState({
        today_revenue: 0,
        today_collected: 0,
        month_revenue: 0,
        total_revenue: 0,
        pending_invoices: 0,
        last_sync: null,
        system_status: 'unknown',
        data_source: 'unknown',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoSync, setAutoSync] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    // Auto-refresh every 10 seconds
    useEffect(() => {
        if (autoSync) {
            const interval = setInterval(() => {
                fetchBillingStats();
            }, 10000); // 10 seconds

            return () => clearInterval(interval);
        }
    }, [autoSync]);

    // Initial fetch
    useEffect(() => {
        fetchBillingStats();
    }, []);

    const fetchBillingStats = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=billing_stats'));
            const data = await response.json();
            
            if (data.success) {
                // Handle both data.stats and data.data response formats
                const stats = data.stats || data.data || {};
                setBillingStats({
                    today_revenue: stats.today_revenue || 0,
                    today_collected: stats.today_collected || 0,
                    month_revenue: stats.month_revenue || stats.total_revenue || 0,
                    total_revenue: stats.total_revenue || 0,
                    pending_invoices: stats.pending_invoices || 0,
                    last_sync: stats.last_sync || new Date().toISOString(),
                    system_status: stats.system_status || 'operational',
                    data_source: stats.data_source || 'bookings',
                    message: stats.message || ''
                });
                setLastUpdate(new Date());
            } else {
                setError(data.message || 'Failed to fetch billing statistics');
            }
        } catch (error) {
            console.error('Error fetching billing stats:', error);
            setError('Network error while fetching billing data');
        } finally {
            setLoading(false);
        }
    };

    const handleManualRefresh = () => {
        fetchBillingStats();
    };

    const toggleAutoSync = () => {
        setAutoSync(!autoSync);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatTime = (date) => {
        if (!date) return 'Never';
        return new Date(date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getSyncStatusColor = () => {
        if (loading) return 'text-yellow-600';
        if (error) return 'text-red-600';
        if (billingStats?.system_status === 'billing_tables_missing') return 'text-orange-600';
        return 'text-green-600';
    };

    const getSyncStatusIcon = () => {
        if (loading) return <FaSync className="animate-spin" />;
        if (error) return <FaExclamationTriangle />;
        if (billingStats?.system_status === 'billing_tables_missing') return <FaInfoCircle />;
        return <FaCheckCircle />;
    };

    const getSyncStatusText = () => {
        if (loading) return 'Syncing...';
        if (error) return 'Sync Error';
        if (billingStats?.system_status === 'billing_tables_missing') return 'Setup Required';
        return 'Auto-sync active';
    };

    const getDataSourceInfo = () => {
        if (billingStats?.data_source === 'invoices') {
            return { text: 'Billing System Active', color: 'text-green-600', icon: <FaDatabase /> };
        } else if (billingStats?.data_source === 'bookings') {
            return { text: 'Using Booking Data', color: 'text-blue-600', icon: <FaInfoCircle /> };
        }
        return { text: 'No Data Available', color: 'text-gray-600', icon: <FaExclamationTriangle /> };
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Real-Time Billing Sync</h3>
                    <p className="text-sm text-gray-600">Live revenue tracking and payment monitoring</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={toggleAutoSync}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            autoSync 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                        {autoSync ? 'Auto-Sync ON' : 'Auto-Sync OFF'}
                    </button>
                    <button
                        onClick={handleManualRefresh}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <FaSync className={`inline mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Now
                    </button>
                </div>
            </div>

            {/* Sync Status */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                    <span className={`text-sm ${getSyncStatusColor()}`}>
                        {getSyncStatusIcon()}
                    </span>
                    <span className="text-sm text-gray-700">
                        {getSyncStatusText()}
                    </span>
                </div>
                <div className="text-xs text-gray-500">
                    Last updated: {formatTime(lastUpdate)}
                </div>
            </div>

            {/* System Status Info */}
            {billingStats?.system_status && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-blue-700 text-sm">
                        <FaInfoCircle className="mr-2" />
                        <span className="font-medium">System Status:</span>
                        <span className="ml-2">{billingStats?.message || 'System operational'}</span>
                    </div>
                    {billingStats.data_source && (
                        <div className="flex items-center mt-1 text-blue-600 text-xs">
                            {getDataSourceInfo().icon}
                            <span className="ml-1">{getDataSourceInfo().text}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center text-red-700 text-sm">
                        <FaExclamationTriangle className="mr-2" />
                        {error}
                    </div>
                </div>
            )}

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Today's Revenue */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-100">Today's Revenue</p>
                            <p className="text-xl font-bold">{formatCurrency(billingStats?.today_revenue || 0)}</p>
                        </div>
                        <FaDollarSign className="text-2xl text-green-200" />
                    </div>
                </div>

                {/* Today's Collected */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-blue-100">Amount Collected</p>
                            <p className="text-xl font-bold">{formatCurrency(billingStats?.today_collected || 0)}</p>
                        </div>
                        <FaCreditCard className="text-2xl text-blue-200" />
                    </div>
                </div>

                {/* Month Revenue */}
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-purple-100">This Month</p>
                            <p className="text-xl font-bold">{formatCurrency(billingStats?.month_revenue || 0)}</p>
                        </div>
                        <FaChartLine className="text-2xl text-purple-200" />
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-orange-100">Total Revenue</p>
                            <p className="text-xl font-bold">{formatCurrency(billingStats?.total_revenue || 0)}</p>
                        </div>
                        <FaDollarSign className="text-2xl text-orange-200" />
                    </div>
                </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <FaCalendarDay className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Pending Invoices</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{billingStats?.pending_invoices || 0}</p>
                    <p className="text-xs text-gray-500">Requires attention</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <FaClock className="text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Last Sync</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                        {formatTime(billingStats?.last_sync || new Date().toISOString())}
                    </p>
                    <p className="text-xs text-gray-500">Data freshness</p>
                </div>
            </div>

            {/* Sync Details */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 text-center">
                    <p>Data automatically syncs with billing system every 10 seconds</p>
                    <p className="mt-1">
                        {autoSync ? 'Auto-sync is active' : 'Auto-sync is disabled - use manual refresh'}
                    </p>
                    {billingStats?.system_status === 'billing_tables_missing' && (
                        <p className="mt-2 text-orange-600 font-medium">
                            ⚠️ Billing system setup required. Contact administrator.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RealTimeBillingSync;

