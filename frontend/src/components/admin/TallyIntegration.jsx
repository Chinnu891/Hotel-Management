import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    DocumentArrowDownIcon, 
    CalendarIcon, 
    CurrencyDollarIcon,
    BanknotesIcon,
    BuildingOfficeIcon,
    CogIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const TallyIntegration = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [exportHistory, setExportHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    const [stats, setStats] = useState({
        totalTransactions: 0,
        totalRevenue: 0,
        cashPayments: 0,
        cardPayments: 0,
        upiPayments: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [statsError, setStatsError] = useState(false);

    useEffect(() => {
        fetchExportHistory();
        fetchStats();
    }, []);

    const fetchExportHistory = async () => {
        try {
            setHistoryLoading(true);
            setHistoryError(false);
            const response = await axios.get('http://localhost/hotel-management/backend/tally_integration/export_history.php', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.data.success) {
                setExportHistory(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching export history:', error);
            setHistoryError(true);
        } finally {
            setHistoryLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            setStatsLoading(true);
            setStatsError(false);
            const response = await axios.get('http://localhost/hotel-management/backend/tally_integration/stats.php', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
            setStatsError(true);
        } finally {
            setStatsLoading(false);
        }
    };

    const showMessage = (msg, type = 'success') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 5000);
    };

    const exportToTally = async (exportType, params = {}) => {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
            showMessage('Please log in to export data', 'error');
            return;
        }

        setLoading(true);
        try {
            let url = `http://localhost/hotel-management/backend/tally_integration/tally_export.php?action=${exportType}`;
            
            // Add parameters to URL
            Object.keys(params).forEach(key => {
                if (params[key]) {
                    url += `&${key}=${encodeURIComponent(params[key])}`;
                }
            });

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                responseType: 'blob'
            });

            // Check if response is actually XML by looking at content type
            const contentType = response.headers['content-type'];
            if (contentType && contentType.includes('application/json')) {
                // This is an error response, not XML
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorData = JSON.parse(reader.result);
                        showMessage(errorData.message || 'Export failed', 'error');
                    } catch (e) {
                        showMessage('Export failed with an error', 'error');
                    }
                };
                reader.readAsText(response.data);
                return;
            }

            // Create download link for XML
            const blob = new Blob([response.data], { type: 'application/xml' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `tally_${exportType}_${new Date().toISOString().split('T')[0]}.xml`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            showMessage(`${exportType.replace(/_/g, ' ').toUpperCase()} exported successfully!`);
            fetchExportHistory();
        } catch (error) {
            console.error('Export error:', error);
            showMessage('Export failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportDailyTransactions = () => {
        if (statsLoading || historyLoading) {
            showMessage('Please wait for data to load', 'error');
            return;
        }
        exportToTally('export_daily_transactions', { date: selectedDate });
    };

    const exportMonthlySummary = () => {
        if (statsLoading || historyLoading) {
            showMessage('Please wait for data to load', 'error');
            return;
        }
        exportToTally('export_monthly_summary', { month: selectedMonth });
    };

    const exportGuestPayments = () => {
        if (statsLoading || historyLoading) {
            showMessage('Please wait for data to load', 'error');
            return;
        }
        exportToTally('export_guest_payments', { 
            date_from: dateRange.from, 
            date_to: dateRange.to 
        });
    };

    const exportRoomRevenue = () => {
        if (statsLoading || historyLoading) {
            showMessage('Please wait for data to load', 'error');
            return;
        }
        exportToTally('export_room_revenue', { 
            date_from: dateRange.from, 
            date_to: dateRange.to 
        });
    };

    const exportServiceCharges = () => {
        if (statsLoading || historyLoading) {
            showMessage('Please wait for data to load', 'error');
            return;
        }
        exportToTally('export_service_charges', { 
            date_from: dateRange.from, 
            date_to: dateRange.to 
        });
    };

    const getExportTypeLabel = (type) => {
        const labels = {
            'export_daily_transactions': 'Daily Transactions',
            'export_monthly_summary': 'Monthly Summary',
            'export_guest_payments': 'Guest Payments',
            'export_room_revenue': 'Room Revenue',
            'export_service_charges': 'Service Charges'
        };
        return labels[type] || type;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <CogIcon className="h-8 w-8 mr-3 text-blue-600" />
                        Tally Integration
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Export hotel financial data to Tally accounting software
                    </p>
                </div>

                {/* Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center ${
                        messageType === 'error' 
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : 'bg-green-100 text-green-700 border border-green-200'
                    }`}>
                        {messageType === 'error' ? (
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                        ) : (
                            <CheckCircleIcon className="h-5 w-5 mr-2" />
                        )}
                        {message}
                    </div>
                )}

                                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {statsLoading ? (
                        // Loading skeleton
                        Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <div className="h-8 w-8 bg-gray-200 rounded mr-3 animate-pulse"></div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                                        <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : statsError ? (
                        // Error state
                        <div className="col-span-5 bg-red-50 border border-red-200 rounded-lg p-6">
                            <div className="flex items-center">
                                <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
                                <div>
                                    <p className="text-sm font-medium text-red-600">Failed to load statistics</p>
                                    <p className="text-sm text-red-500 mt-1">Please check your connection and try again</p>
                                    <button 
                                        onClick={fetchStats}
                                        className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <CurrencyDollarIcon className="h-8 w-8 text-green-600 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                        <p className="text-2xl font-bold text-gray-900">₹{(stats.totalRevenue || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <DocumentArrowDownIcon className="h-8 w-8 text-blue-600 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Transactions</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions || 0}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <BanknotesIcon className="h-8 w-8 text-yellow-600 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Cash Payments</p>
                                        <p className="text-2xl font-bold text-gray-900">₹{(stats.cashPayments || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <BuildingOfficeIcon className="h-8 w-8 text-purple-600 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Card Payments</p>
                                        <p className="text-2xl font-bold text-gray-900">₹{(stats.cardPayments || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <div className="flex items-center">
                                    <CurrencyDollarIcon className="h-8 w-8 text-indigo-600 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">UPI Payments</p>
                                        <p className="text-2xl font-bold text-gray-900">₹{(stats.upiPayments || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Export Options */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Daily Transactions */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                            Daily Transactions
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Date
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button
                            onClick={exportDailyTransactions}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                    Export Daily Transactions
                                </>
                            )}
                        </button>
                    </div>

                    {/* Monthly Summary */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <CalendarIcon className="h-5 w-5 mr-2 text-green-600" />
                            Monthly Summary
                        </h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Month
                            </label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                        </div>
                        <button
                            onClick={exportMonthlySummary}
                            disabled={loading}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                    Export Monthly Summary
                                </>
                            )}
                        </button>
                    </div>

                    {/* Guest Payments */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <CurrencyDollarIcon className="h-5 w-5 mr-2 text-purple-600" />
                            Guest Payments
                        </h3>
                        <div className="mb-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={exportGuestPayments}
                            disabled={loading}
                            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                    Export Guest Payments
                                </>
                            )}
                        </button>
                    </div>

                    {/* Room Revenue */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <BuildingOfficeIcon className="h-5 w-5 mr-2 text-indigo-600" />
                            Room Revenue
                        </h3>
                        <div className="mb-4 space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={exportRoomRevenue}
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                    Export Room Revenue
                                </>
                            )}
                        </button>
                    </div>

                    {/* Service Charges */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border lg:col-span-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <CogIcon className="h-5 w-5 mr-2 text-orange-600" />
                            Service Charges
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.from}
                                    onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={dateRange.to}
                                    onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>
                        <button
                            onClick={exportServiceCharges}
                            disabled={loading}
                            className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                                    Export Service Charges
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Export History */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Export History</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Export Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        File Size
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {historyLoading ? (
                                    // Loading skeleton
                                    Array.from({ length: 3 }).map((_, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : historyError ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center">
                                            <div className="text-red-600">
                                                <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2" />
                                                <p className="text-sm font-medium">Failed to load export history</p>
                                                <p className="text-xs text-red-500 mt-1">Please check your connection and try again</p>
                                                <button 
                                                    onClick={fetchExportHistory}
                                                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                                                >
                                                    Retry
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : exportHistory.length > 0 ? (
                                    exportHistory.map((export_, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {getExportTypeLabel(export_.export_type)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(export_.export_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {export_.file_size}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    export_.status === 'completed' 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {export_.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No export history available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">How to Import to Tally</h3>
                    <div className="text-blue-800 space-y-2">
                        <p>1. Download the XML file from any export option above</p>
                        <p>2. Open Tally Prime and go to Gateway of Tally</p>
                        <p>3. Press F1 (Help) and select "Import Data"</p>
                        <p>4. Choose the downloaded XML file</p>
                        <p>5. Tally will automatically create journal entries</p>
                        <p>6. Verify the entries in Journal Vouchers</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TallyIntegration;
