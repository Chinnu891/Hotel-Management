import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { FaFileInvoiceDollar, FaCreditCard, FaChartBar, FaEnvelope, FaDownload, FaHome } from 'react-icons/fa';
import ComprehensiveBilling from './ComprehensiveBilling';
import EnhancedBillingDashboard from './EnhancedBillingDashboard';
import BillingReports from './BillingReports';

const BillingRoutes = () => {
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/billing', icon: FaHome },
        { name: 'Invoice Management', href: '/billing/invoices', icon: FaFileInvoiceDollar },
        { name: 'Payment Processing', href: '/billing/payments', icon: FaCreditCard },
        { name: 'Reports & Analytics', href: '/billing/reports', icon: FaChartBar },
        { name: 'Email Invoices', href: '/billing/email', icon: FaEnvelope },
        { name: 'Download Center', href: '/billing/downloads', icon: FaDownload }
    ];

    const isActiveRoute = (href) => {
        if (href === '/billing') {
            return location.pathname === '/billing';
        }
        return location.pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navigation Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-center h-16 bg-gradient-to-r from-blue-600 to-purple-600">
                        <div className="text-center text-white">
                            <h1 className="text-lg font-bold">SV ROYAL LUXURY ROOMS</h1>
                            <p className="text-xs text-blue-100">Billing System</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                        isActiveRoute(item.href)
                                            ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                                >
                                    <Icon className="mr-3 h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="text-center text-xs text-gray-500">
                            <p>Billing Management System</p>
                            <p>Version 2.0</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="ml-64">
                <Routes>
                    <Route path="/" element={<EnhancedBillingDashboard />} />
                    <Route path="/invoices" element={<ComprehensiveBilling />} />
                    <Route path="/payments" element={<PaymentProcessing />} />
                    <Route path="/reports" element={<BillingReports />} />
                    <Route path="/email" element={<EmailInvoices />} />
                    <Route path="/downloads" element={<DownloadCenter />} />
                </Routes>
            </div>
        </div>
    );
};

// Payment Processing Component
const PaymentProcessing = () => {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Payment Processing Center
                    </h1>
                    <p className="text-gray-600">
                        Process payments, manage payment methods, and track payment history
                    </p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <FaCreditCard className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Payment Processing</h3>
                    <p className="text-gray-500 mb-6">
                        This component will be implemented to handle payment processing, 
                        payment method management, and payment history tracking.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>Features to be implemented:</strong><br />
                            • Process various payment methods (Cash, Card, UPI, etc.)<br />
                            • Payment verification and confirmation<br />
                            • Payment history and receipts<br />
                            • Refund processing<br />
                            • Payment method configuration
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Email Invoices Component
const EmailInvoices = () => {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Email Invoice Center
                    </h1>
                    <p className="text-gray-600">
                        Send invoices via email, manage email templates, and track email delivery
                    </p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <FaEnvelope className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Email Invoice Management</h3>
                    <p className="text-gray-500 mb-6">
                        This component will be implemented to handle email invoice sending, 
                        template management, and delivery tracking.
                    </p>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-purple-800">
                            <strong>Features to be implemented:</strong><br />
                            • Send invoices via email with PDF attachments<br />
                            • Customizable email templates<br />
                            • Bulk email sending<br />
                            • Email delivery tracking<br />
                            • Email history and logs
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Download Center Component
const DownloadCenter = () => {
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Download Center
                    </h1>
                    <p className="text-gray-600">
                        Download invoices, reports, and documents in various formats
                    </p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <FaDownload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Document Download Center</h3>
                    <p className="text-gray-500 mb-6">
                        This component will be implemented to handle document downloads, 
                        format conversion, and download history.
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                            <strong>Features to be implemented:</strong><br />
                            • Download invoices in PDF, HTML, and other formats<br />
                            • Batch download multiple documents<br />
                            • Download reports and analytics<br />
                            • Document format conversion<br />
                            • Download history and logs
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BillingRoutes;
