import React, { useState, useEffect } from 'react';
import { 
    FaFileInvoiceDollar, 
    FaCreditCard, 
    FaChartLine,
    FaCalendarAlt,
    FaUsers
} from 'react-icons/fa';

const BillingStats = ({ stats }) => {
    const [recentPayments, setRecentPayments] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRecentPayments();
        fetchMonthlyRevenue();
    }, []);

    const fetchRecentPayments = async () => {
        try {
            setLoading(true);
            const response = await fetch('http://localhost/hotel-management/backend/api/comprehensive_billing_api.php?action=payment_history&limit=5');
            const data = await response.json();
            if (data.success) {
                setRecentPayments(data.payments.slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching recent payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyRevenue = async () => {
        try {
            // Simulate monthly revenue data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            const revenue = [12000, 15000, 18000, 14000, 22000, 25000];
            setMonthlyRevenue(months.map((month, index) => ({ month, revenue: revenue[index] })));
        } catch (error) {
            console.error('Error fetching monthly revenue:', error);
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
            default: return '💰';
        }
    };

    return (
        <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-400 bg-opacity-30">
                            <FaFileInvoiceDollar className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-blue-100">Total Invoices</p>
                            <p className="text-2xl font-semibold">{stats.totalInvoices}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-400 bg-opacity-30">
                            <FaCreditCard className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-yellow-100">Pending Payments</p>
                            <p className="text-2xl font-semibold">{stats.pendingPayments}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-400 bg-opacity-30">
                            <FaChartLine className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-green-100">Total Revenue</p>
                            <p className="text-2xl font-semibold">${stats.totalRevenue.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-purple-400 bg-opacity-30">
                            <FaCalendarAlt className="h-6 w-6" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-purple-100">Today's Payments</p>
                            <p className="text-2xl font-semibold">{stats.todayPayments}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Payments */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Recent Payments</h3>
                    </div>
                    
                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : recentPayments.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            No recent payments found.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {recentPayments.map((payment) => (
                                <div key={payment.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-2xl">{getMethodIcon(payment.payment_method)}</span>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">
                                                    {payment.guest_name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {payment.receipt_number}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                ${parseFloat(payment.amount).toFixed(2)}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(payment.payment_date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Monthly Revenue Chart */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Monthly Revenue Trend</h3>
                    </div>
                    
                    <div className="p-6">
                        <div className="h-64 flex items-end justify-between space-x-2">
                            {monthlyRevenue.map((item, index) => {
                                const maxRevenue = Math.max(...monthlyRevenue.map(r => r.revenue));
                                const height = (item.revenue / maxRevenue) * 100;
                                
                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center">
                                        <div 
                                            className="w-full bg-blue-500 rounded-t"
                                            style={{ height: `${height}%` }}
                                        ></div>
                                        <div className="text-xs text-gray-500 mt-2 text-center">
                                            {item.month}
                                        </div>
                                        <div className="text-xs font-medium text-gray-900 mt-1">
                                            ${item.revenue.toLocaleString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button className="flex items-center justify-center space-x-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <FaFileInvoiceDollar className="h-6 w-6 text-blue-600" />
                            <span className="font-medium text-gray-900">Generate Invoice</span>
                        </button>
                        
                        <button className="flex items-center justify-center space-x-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <FaCreditCard className="h-6 w-6 text-green-600" />
                            <span className="font-medium text-gray-900">Process Payment</span>
                        </button>
                        
                        <button className="flex items-center justify-center space-x-3 p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            <FaChartLine className="h-6 w-6 text-purple-600" />
                            <span className="font-medium text-gray-900">View Reports</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingStats;
