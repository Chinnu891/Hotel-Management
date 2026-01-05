import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../../config/api';
import RealTimeBillingSync from './RealTimeBillingSync';
import { 
    FaFileInvoice, 
    FaCreditCard, 
    FaChartBar, 
    FaHistory,
    FaPlus,
    FaEye,
    FaPrint,
    FaDownload,
    FaCalendarAlt,
    FaDollarSign,
    FaExclamationTriangle,
    FaCheckCircle
} from 'react-icons/fa';

const BillingDashboard = () => {
    const [stats, setStats] = useState({
        total_invoices: 0,
        pending_invoices: 0,
        paid_invoices: 0,
        total_revenue: 0,
        today_invoices: 0
    });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBillingStats();
        fetchRecentInvoices();
    }, []);

    const fetchBillingStats = async () => {
        try {
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=billing_stats'));
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching billing stats:', error);
            setError('Failed to fetch billing statistics');
        }
    };

    const fetchRecentInvoices = async () => {
        try {
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=all_invoices'));
            const data = await response.json();
            if (data.success) {
                // Get the 5 most recent invoices
                setRecentInvoices(data.invoices.slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching recent invoices:', error);
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
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'paid': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'overdue': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Billing Dashboard</h2>
                    <p className="text-gray-600">Overview of your billing system and recent activities</p>
                </div>
                <div className="flex space-x-3">
                    <Link
                        to="/reception/billing/invoice"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                        <FaPlus className="h-4 w-4" />
                        <span>Generate Invoice</span>
                    </Link>
                    <Link
                        to="/manage-invoices"
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                        <FaEye className="h-4 w-4" />
                        <span>View All Invoices</span>
                    </Link>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <FaExclamationTriangle className="text-red-400 mr-2" />
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {/* Real-Time Billing Sync */}
            <RealTimeBillingSync />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <FaFileInvoice className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.total_invoices}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <FaExclamationTriangle className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.pending_invoices}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <FaCheckCircle className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Paid Invoices</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.paid_invoices}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                            <FaDollarSign className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                            <FaCalendarAlt className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Today's Invoices</p>
                            <p className="text-2xl font-semibold text-gray-900">{stats.today_invoices}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link
                    to="/reception/billing/invoice"
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-blue-500"
                >
                    <div className="flex items-center">
                        <FaFileInvoice className="h-8 w-8 text-blue-600" />
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Generate Invoice</h3>
                            <p className="text-sm text-gray-600">Create new invoice for booking</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/reception/billing/manage-invoices"
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-green-500"
                >
                    <div className="flex items-center">
                        <FaEye className="h-8 w-8 text-green-600" />
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Manage Invoices</h3>
                            <p className="text-sm text-gray-600">View and edit all invoices</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/reception/billing/payment"
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-purple-500"
                >
                    <div className="flex items-center">
                        <FaCreditCard className="h-8 w-8 text-purple-600" />
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Process Payment</h3>
                            <p className="text-sm text-gray-600">Handle payment processing</p>
                        </div>
                    </div>
                </Link>

                <Link
                    to="/reception/billing/stats"
                    className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-orange-500"
                >
                    <div className="flex items-center">
                        <FaChartBar className="h-8 w-8 text-orange-500" />
                        <div className="ml-4">
                            <h3 className="text-lg font-medium text-gray-900">Billing Reports</h3>
                            <p className="text-sm text-gray-600">Detailed analytics and reports</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
                        <Link
                            to="/reception/billing/manage-invoices"
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                            View All
                        </Link>
                    </div>
                </div>
                
                {recentInvoices.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        No invoices available yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Invoice
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Guest
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
                                {recentInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {invoice.invoice_number}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(invoice.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{invoice.guest_name}</div>
                                            <div className="text-sm text-gray-500">Room {invoice.room_number}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatCurrency(invoice.total_amount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <Link
                                                    to={`/manage-invoices`}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    View
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        // Open invoice in new window
                                                        window.open(buildApiUrl(`api/comprehensive_billing_api.php?action=invoice_details&invoice_id=${invoice.id}`), '_blank');
                                                    }}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Print
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
        </div>
    );
};

export default BillingDashboard;
