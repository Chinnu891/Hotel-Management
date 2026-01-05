import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaDownload, FaCalendarAlt, FaChartBar, FaFilter, FaPrint, FaEnvelope } from 'react-icons/fa';
import { toast } from 'react-toastify';

const BillingReports = () => {
    const [reports, setReports] = useState({
        revenue: [],
        invoices: [],
        payments: [],
        guests: []
    });
    const [filters, setFilters] = useState({
        date_from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        date_to: new Date().toISOString().split('T')[0],
        report_type: 'revenue'
    });
    const [loading, setLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        generateReports();
    }, [filters]);

    const generateReports = async () => {
        try {
            setLoading(true);
            
            // Generate mock data based on filters
            const mockData = generateMockReportData(filters);
            setReports(mockData);
            
        } catch (error) {
            console.error('Error generating reports:', error);
            toast.error('Failed to generate reports');
        } finally {
            setLoading(false);
        }
    };

    const generateMockReportData = (filters) => {
        const startDate = new Date(filters.date_from);
        const endDate = new Date(filters.date_to);
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        // Generate revenue data
        const revenue = [];
        for (let i = 0; i < daysDiff; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            revenue.push({
                date: date.toISOString().split('T')[0],
                amount: Math.floor(Math.random() * 5000) + 1000,
                invoices: Math.floor(Math.random() * 10) + 1
            });
        }

        // Generate invoice status data
        const invoices = [
            { status: 'Paid', count: Math.floor(Math.random() * 50) + 20, amount: Math.floor(Math.random() * 100000) + 50000 },
            { status: 'Pending', count: Math.floor(Math.random() * 30) + 10, amount: Math.floor(Math.random() * 50000) + 20000 },
            { status: 'Overdue', count: Math.floor(Math.random() * 20) + 5, amount: Math.floor(Math.random() * 30000) + 10000 },
            { status: 'Draft', count: Math.floor(Math.random() * 15) + 5, amount: Math.floor(Math.random() * 20000) + 5000 }
        ];

        // Generate payment method data
        const payments = [
            { method: 'Credit Card', count: Math.floor(Math.random() * 100) + 50, amount: Math.floor(Math.random() * 200000) + 100000 },
            { method: 'Cash', count: Math.floor(Math.random() * 80) + 30, amount: Math.floor(Math.random() * 150000) + 75000 },
            { method: 'UPI', count: Math.floor(Math.random() * 60) + 20, amount: Math.floor(Math.random() * 100000) + 50000 },
            { method: 'Bank Transfer', count: Math.floor(Math.random() * 40) + 15, amount: Math.floor(Math.random() * 80000) + 40000 },
            { method: 'Online Wallet', count: Math.floor(Math.random() * 30) + 10, amount: Math.floor(Math.random() * 60000) + 30000 }
        ];

        // Generate guest data
        const guests = [
            { category: 'New Guests', count: Math.floor(Math.random() * 100) + 50, revenue: Math.floor(Math.random() * 150000) + 75000 },
            { category: 'Returning Guests', count: Math.floor(Math.random() * 80) + 40, revenue: Math.floor(Math.random() * 200000) + 100000 },
            { category: 'VIP Guests', count: Math.floor(Math.random() * 30) + 15, revenue: Math.floor(Math.random() * 100000) + 50000 },
            { category: 'Corporate Clients', count: Math.floor(Math.random() * 50) + 25, revenue: Math.floor(Math.random() * 120000) + 60000 }
        ];

        return { revenue, invoices, payments, guests };
    };

    const exportReport = (format) => {
        try {
            if (format === 'pdf') {
                // Generate PDF report
                toast.info('Generating PDF report...');
                // Implement PDF generation logic
            } else if (format === 'excel') {
                // Generate Excel report
                toast.info('Generating Excel report...');
                // Implement Excel generation logic
            } else if (format === 'email') {
                // Send report via email
                toast.info('Sending report via email...');
                // Implement email logic
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            toast.error('Failed to export report');
        }
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
            
            return date.toLocaleDateString('en-IN');
        } catch (error) {
            console.error('Error formatting date:', error, 'Input:', dateString);
            return 'N/A';
        }
    };

    const getTotalRevenue = () => {
        return reports.revenue.reduce((total, day) => total + day.amount, 0);
    };

    const getTotalInvoices = () => {
        return reports.invoices.reduce((total, status) => total + status.count, 0);
    };

    const getAverageRevenue = () => {
        const total = getTotalRevenue();
        return total / reports.revenue.length || 0;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        SV ROYAL LUXURY ROOMS - Billing Reports & Analytics
                    </h1>
                    <p className="text-gray-600">
                        Comprehensive financial reports and business insights
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <FaFilter className="mr-2" />
                        Report Filters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date From</label>
                            <input
                                type="date"
                                value={filters.date_from}
                                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date To</label>
                            <input
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                            <select
                                value={filters.report_type}
                                onChange={(e) => setFilters({ ...filters, report_type: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            >
                                <option value="revenue">Revenue Report</option>
                                <option value="invoices">Invoice Status</option>
                                <option value="payments">Payment Methods</option>
                                <option value="guests">Guest Analysis</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={generateReports}
                                disabled={loading}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Generating...' : 'Generate Report'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-blue-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(getTotalRevenue())}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center">
                            <FaChartBar className="text-green-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                                <p className="text-2xl font-bold text-gray-900">{getTotalInvoices()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                        <div className="flex items-center">
                            <FaMoneyBillWave className="text-purple-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Average Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(getAverageRevenue())}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
                        <div className="flex items-center">
                            <FaCalendarAlt className="text-orange-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Period Days</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {Math.ceil((new Date(filters.date_to) - new Date(filters.date_from)) / (1000 * 60 * 60 * 24))}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Export Options */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                        <FaDownload className="mr-2" />
                        Export Options
                    </h3>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => exportReport('pdf')}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center"
                        >
                            <FaDownload className="mr-2" />
                            Export PDF
                        </button>
                        <button
                            onClick={() => exportReport('excel')}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                        >
                            <FaDownload className="mr-2" />
                            Export Excel
                        </button>
                        <button
                            onClick={() => exportReport('email')}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                        >
                            <FaEnvelope className="mr-2" />
                            Send via Email
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center"
                        >
                            <FaPrint className="mr-2" />
                            Print Report
                        </button>
                    </div>
                </div>

                {/* Report Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Revenue Chart */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Daily Revenue Trend</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {reports.revenue.map((day, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                                            <span className="text-sm text-gray-600">{formatDate(day.date)}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">{formatCurrency(day.amount)}</p>
                                            <p className="text-xs text-gray-500">{day.invoices} invoices</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Invoice Status */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Invoice Status Distribution</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {reports.invoices.map((status, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className={`w-4 h-4 rounded-full mr-3 ${
                                                status.status === 'Paid' ? 'bg-green-500' :
                                                status.status === 'Pending' ? 'bg-yellow-500' :
                                                status.status === 'Overdue' ? 'bg-red-500' : 'bg-gray-500'
                                            }`}></div>
                                            <span className="text-sm text-gray-600">{status.status}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">{status.count}</p>
                                            <p className="text-xs text-gray-500">{formatCurrency(status.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Payment Methods Analysis</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {reports.payments.map((payment, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                                            <span className="text-sm text-gray-600">{payment.method}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">{payment.count}</p>
                                            <p className="text-xs text-gray-500">{formatCurrency(payment.amount)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Guest Analysis */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Guest Category Analysis</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {reports.guests.map((guest, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="w-4 h-4 bg-orange-500 rounded-full mr-3"></div>
                                            <span className="text-sm text-gray-600">{guest.category}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-gray-900">{guest.count}</p>
                                            <p className="text-xs text-gray-500">{formatCurrency(guest.revenue)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Report Table */}
                <div className="mt-8 bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Detailed Report Data</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Revenue
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoices
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Average
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reports.revenue.map((day, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(day.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatCurrency(day.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {day.invoices}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatCurrency(day.amount / day.invoices)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Report Footer */}
                <div className="mt-8 bg-gray-50 rounded-lg p-6 text-center">
                    <p className="text-gray-600">
                        Report generated on {new Date().toLocaleString()} for the period from {formatDate(filters.date_from)} to {formatDate(filters.date_to)}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        SV ROYAL LUXURY ROOMS - Financial Reports & Analytics
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BillingReports;
