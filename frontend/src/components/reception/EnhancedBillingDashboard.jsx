import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaCreditCard, FaEnvelope, FaDownload, FaChartBar, FaExclamationTriangle, FaCalendarAlt, FaUsers, FaMoneyBillWave } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { buildApiUrl } from '../../config/api';

const EnhancedBillingDashboard = () => {
    const [stats, setStats] = useState({
        totalInvoices: 0,
        pendingPayments: 0,
        totalRevenue: 0,
        todayPayments: 0,
        overdueInvoices: 0
    });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [recentPayments, setRecentPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            
            // Fetch billing stats
            const statsResponse = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=billing_stats'));
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                if (statsData.success) {
                    setStats(statsData.data);
                }
            }

            // Fetch recent invoices
            const invoicesResponse = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=all_invoices'));
            if (invoicesResponse.ok) {
                const invoicesData = await invoicesResponse.json();
                if (invoicesData.success) {
                    setRecentInvoices(invoicesData.data.slice(0, 5)); // Get latest 5
                }
            }

            // Fetch recent payments (you'll need to create this endpoint)
            // For now, we'll use mock data
            setRecentPayments([
                {
                    id: 1,
                    receipt_number: 'RCPT202412001',
                    amount: 2500.00,
                    payment_method: 'Credit Card',
                    payment_date: new Date().toISOString(),
                    guest_name: 'John Doe'
                },
                {
                    id: 2,
                    receipt_number: 'RCPT202412002',
                    amount: 1800.00,
                    payment_method: 'UPI',
                    payment_date: new Date(Date.now() - 86400000).toISOString(),
                    guest_name: 'Jane Smith'
                }
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data. Please try again.');
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

    const getPaymentMethodIcon = (method) => {
        const methodIcons = {
            'cash': '💵',
            'credit_card': '💳',
            'debit_card': '💳',
            'upi': '📱',
            'bank_transfer': '🏦',
            'cheque': '📄',
            'online_wallet': '📱'
        };
        return methodIcons[method] || '💳';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        SV ROYAL LUXURY ROOMS - Billing Dashboard
                    </h1>
                    <p className="text-gray-600">
                        Comprehensive overview of billing activities and financial performance
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <FaExclamationTriangle className="text-red-500 mr-3" />
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Link to="/billing/create" className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-3xl mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold">Create Invoice</h3>
                                <p className="text-blue-100">Generate new invoice</p>
                            </div>
                        </div>
                    </Link>
                    
                    <Link to="/reception/billing/payment" className="bg-green-600 text-white rounded-lg p-6 hover:bg-green-700 transition-colors">
                        <div className="flex items-center">
                            <FaCreditCard className="text-3xl mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold">Process Payment</h3>
                                <p className="text-green-100">Record payments</p>
                            </div>
                        </div>
                    </Link>
                    
                    <Link to="/reception/billing/manage-invoices" className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors">
                        <div className="flex items-center">
                            <FaEnvelope className="text-3xl mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold">Send Invoices</h3>
                                <p className="text-purple-100">Email to guests</p>
                            </div>
                        </div>
                    </Link>
                    
                    <Link to="/reception/billing/stats" className="bg-orange-600 text-white rounded-lg p-6 hover:bg-orange-700 transition-colors">
                        <div className="flex items-center">
                            <FaChartBar className="text-3xl mr-4" />
                            <div>
                                <h3 className="text-lg font-semibold">Reports</h3>
                                <p className="text-orange-100">View analytics</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center">
                            <FaFileInvoiceDollar className="text-blue-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <div className="flex items-center">
                            <FaExclamationTriangle className="text-yellow-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center">
                            <FaMoneyBillWave className="text-green-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center">
                            <FaCalendarAlt className="text-blue-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Today's Payments</p>
                                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.todayPayments)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                        <div className="flex items-center">
                            <FaExclamationTriangle className="text-red-500 text-2xl mr-4" />
                            <div>
                                <p className="text-sm font-medium text-gray-600">Overdue</p>
                                <p className="text-2xl font-bold text-gray-900">{stats.overdueInvoices}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Invoices */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                                <Link to="/reception/billing/manage-invoices" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    View All
                                </Link>
                            </div>
                        </div>
                        <div className="p-6">
                            {recentInvoices.length > 0 ? (
                                <div className="space-y-4">
                                    {recentInvoices.map((invoice) => (
                                        <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center">
                                                <FaFileInvoiceDollar className="text-blue-500 mr-3" />
                                                <div>
                                                    <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                                                    <p className="text-sm text-gray-600">{invoice.guest_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</p>
                                                {getStatusBadge(invoice.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FaFileInvoiceDollar className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Create your first invoice to get started.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Payments */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                                <Link to="/billing/payments" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                    View All
                                </Link>
                            </div>
                        </div>
                        <div className="p-6">
                            {recentPayments.length > 0 ? (
                                <div className="space-y-4">
                                    {recentPayments.map((payment) => (
                                        <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center">
                                                <span className="text-2xl mr-3">{getPaymentMethodIcon(payment.payment_method.toLowerCase())}</span>
                                                <div>
                                                    <p className="font-medium text-gray-900">{payment.receipt_number}</p>
                                                    <p className="text-sm text-gray-600">{payment.guest_name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-medium text-gray-900">{formatCurrency(payment.amount)}</p>
                                                <p className="text-sm text-gray-600">{payment.payment_method}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FaCreditCard className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No payments yet</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Process payments to see them here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Row */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-blue-100 rounded-full">
                                <FaUsers className="text-blue-600 text-xl" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Active Guests</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.pendingPayments + Math.floor(stats.totalRevenue / 1000)}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-green-100 rounded-full">
                                <FaMoneyBillWave className="text-green-600 text-xl" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Average Invoice</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.totalInvoices > 0 ? formatCurrency(stats.totalRevenue / stats.totalInvoices) : formatCurrency(0)}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="p-3 bg-purple-100 rounded-full">
                                <FaChartBar className="text-purple-600 text-xl" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Payment Rate</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {stats.totalInvoices > 0 ? Math.round(((stats.totalInvoices - stats.pendingPayments) / stats.totalInvoices) * 100) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Call to Action */}
                <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-8 text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">Ready to streamline your billing?</h2>
                    <p className="text-blue-100 mb-6">
                        Create invoices, process payments, and manage your hotel's financial operations efficiently.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/billing/create"
                            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            Create Invoice
                        </Link>
                        <Link
                            to="/billing/invoices"
                            className="bg-transparent border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                        >
                            View All Invoices
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedBillingDashboard;
