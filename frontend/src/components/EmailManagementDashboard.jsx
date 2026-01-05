import React, { useState, useEffect } from 'react';
import { buildApiUrl } from '../config/api';
import { 
    EnvelopeIcon, 
    DocumentTextIcon, 
    CheckCircleIcon, 
    XCircleIcon,
    CogIcon,
    ChartBarIcon,
    PaperAirplaneIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import OptimizedComponent from './common/OptimizedComponent';
import { useOptimizedLoading } from '../hooks/useOptimizedAnimation';

const EmailManagementDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [emailStats, setEmailStats] = useState({
        total_emails: 0,
        successful_emails: 0,
        failed_emails: 0,
        success_rate: 0,
        booking_confirmations: 0,
        invoice_emails: 0,
        payment_receipts: 0
    });
    const [emailLogs, setEmailLogs] = useState([]);
    const [emailConfig, setEmailConfig] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Email configuration form state
    const [configForm, setConfigForm] = useState({
        host: '',
        username: '',
        password: '',
        port: '587'
    });

    // Test email form state
    const [testEmail, setTestEmail] = useState('');

    // Invoice email form state
    const [invoiceForm, setInvoiceForm] = useState({
        invoice_id: '',
        guest_email: ''
    });

    // Bulk invoice form state
    const [bulkForm, setBulkForm] = useState({
        invoice_ids: '',
        guest_emails: ''
    });

    useEffect(() => {
        loadEmailStats();
        loadEmailLogs();
        loadEmailConfig();
    }, []);

    const loadEmailStats = async () => {
        try {
            const response = await fetch(`${buildApiUrl('api/email_management_api.php')}?action=get_email_stats`);
            const data = await response.json();
            if (data.success) {
                setEmailStats(data.data);
            }
        } catch (error) {
            console.error('Error loading email stats:', error);
        }
    };

    const loadEmailLogs = async () => {
        try {
            const response = await fetch(`${buildApiUrl('api/email_management_api.php')}?action=get_email_logs&limit=20`);
            const data = await response.json();
            if (data.success) {
                setEmailLogs(data.data.logs);
            }
        } catch (error) {
            console.error('Error loading email logs:', error);
        }
    };

    const loadEmailConfig = async () => {
        try {
            const response = await fetch(`${buildApiUrl('api/email_management_api.php')}?action=get_email_config`);
            const data = await response.json();
            if (data.success) {
                setEmailConfig(data.data.config);
                // Populate form with existing config
                setConfigForm({
                    host: data.data.config.host || '',
                    username: data.data.config.username || '',
                    password: '',
                    port: data.data.config.port || '587'
                });
            }
        } catch (error) {
            console.error('Error loading email config:', error);
        }
    };

    const updateEmailConfig = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${buildApiUrl('api/email_management_api.php')}?action=update_email_config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(configForm)
            });

            const data = await response.json();
            if (data.success) {
                setMessage('Email configuration updated successfully!');
                loadEmailConfig();
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            setMessage('Error updating email configuration');
        } finally {
            setLoading(false);
        }
    };

    const testEmailConfiguration = async (e) => {
        e.preventDefault();
        if (!testEmail) {
            setMessage('Please enter a test email address');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${buildApiUrl('api/email_management_api.php')}?action=test_email_config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ test_email: testEmail })
            });

            const data = await response.json();
            if (data.success) {
                setMessage('Test email sent successfully! Please check your inbox.');
                setTestEmail('');
            } else {
                setMessage(`Test email failed: ${data.message}`);
            }
        } catch (error) {
            setMessage('Error sending test email');
        } finally {
            setLoading(false);
        }
    };

    const sendInvoiceEmail = async (e) => {
        e.preventDefault();
        if (!invoiceForm.invoice_id) {
            setMessage('Please enter an invoice ID');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${buildApiUrl('api/email_management_api.php')}?action=send_invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(invoiceForm)
            });

            const data = await response.json();
            if (data.success) {
                setMessage('Invoice email sent successfully!');
                setInvoiceForm({ invoice_id: '', guest_email: '' });
                loadEmailStats();
                loadEmailLogs();
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            setMessage('Error sending invoice email');
        } finally {
            setLoading(false);
        }
    };

    const bulkSendInvoices = async (e) => {
        e.preventDefault();
        if (!bulkForm.invoice_ids) {
            setMessage('Please enter invoice IDs');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const invoiceIds = bulkForm.invoice_ids.split(',').map(id => id.trim()).filter(id => id);
            const guestEmails = bulkForm.guest_emails ? bulkForm.guest_emails.split(',').map(email => email.trim()).filter(email => email) : [];

            const response = await fetch(`${buildApiUrl('api/email_management_api.php')}?action=bulk_send_invoices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoice_ids: invoiceIds,
                    guest_emails: guestEmails
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessage(`Bulk email operation completed! ${data.data.successful} successful, ${data.data.failed} failed.`);
                setBulkForm({ invoice_ids: '', guest_emails: '' });
                loadEmailStats();
                loadEmailLogs();
            } else {
                setMessage(`Error: ${data.message}`);
            }
        } catch (error) {
            setMessage('Error in bulk email operation');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        return status === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
        ) : (
            <XCircleIcon className="h-5 w-5 text-red-500" />
        );
    };

    const getEmailTypeColor = (type) => {
        const colors = {
            invoice: 'bg-blue-100 text-blue-800',
            booking_confirmation: 'bg-green-100 text-green-800',
            payment_receipt: 'bg-purple-100 text-purple-800',
            test: 'bg-gray-100 text-gray-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
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
            
            return date.toLocaleString();
        } catch (error) {
            console.error('Error formatting date:', error, 'Input:', dateString);
            return 'N/A';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Email Management Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage email communications for SV ROYAL LUXURY ROOMS</p>
                </div>

                {/* Message Display */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg ${
                        message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="mb-6">
                    <nav className="flex space-x-8">
                        {[
                            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
                            { id: 'send_emails', name: 'Send Emails', icon: PaperAirplaneIcon },
                            { id: 'booking_confirmations', name: 'Booking Confirmations', icon: CheckCircleIcon },
                            { id: 'email_logs', name: 'Email Logs', icon: EnvelopeIcon },
                            { id: 'configuration', name: 'Configuration', icon: CogIcon }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                                    activeTab === tab.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <tab.icon className="h-5 w-5" />
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Emails</p>
                                    <p className="text-2xl font-bold text-gray-900">{emailStats.total_emails}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Successful</p>
                                    <p className="text-2xl font-bold text-gray-900">{emailStats.successful_emails}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center">
                                <div className="p-2 bg-red-100 rounded-lg">
                                    <XCircleIcon className="h-6 w-6 text-red-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Failed</p>
                                    <p className="text-2xl font-bold text-gray-900">{emailStats.failed_emails}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">{emailStats.success_rate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Booking Confirmations Tab */}
                {activeTab === 'booking_confirmations' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <CheckCircleIcon className="h-5 w-5 mr-2" />
                                Automatic Booking Confirmation Emails
                            </h3>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                                    </div>
                                    <div className="ml-3">
                                        <h4 className="text-sm font-medium text-blue-800">Automatic Email System</h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            When a new booking is successfully created, an automatic confirmation email is immediately sent to the guest's email address. 
                                            This system ensures guests receive instant confirmation without manual intervention.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-green-800">Booking Confirmations</p>
                                            <p className="text-2xl font-bold text-green-900">{emailStats.booking_confirmations}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-blue-800">Invoice Emails</p>
                                            <p className="text-2xl font-bold text-blue-900">{emailStats.invoice_emails}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <EnvelopeIcon className="h-6 w-6 text-purple-600" />
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-purple-800">Payment Receipts</p>
                                            <p className="text-2xl font-bold text-purple-900">{emailStats.payment_receipts}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-800 mb-2">How It Works:</h4>
                                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                                    <li>Guest makes a booking through the system</li>
                                    <li>System validates booking details and creates the reservation</li>
                                    <li>Automatic confirmation email is generated with booking details</li>
                                    <li>Email is sent to guest's registered email address</li>
                                    <li>Email delivery status is logged for monitoring</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}

                {/* Send Emails Tab */}
                {activeTab === 'send_emails' && (
                    <div className="space-y-6">
                        {/* Send Invoice Email */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <DocumentTextIcon className="h-5 w-5 mr-2" />
                                Send Invoice Email
                            </h3>
                            <form onSubmit={sendInvoiceEmail} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Invoice ID *
                                        </label>
                                        <input
                                            type="text"
                                            value={invoiceForm.invoice_id}
                                            onChange={(e) => setInvoiceForm({...invoiceForm, invoice_id: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter invoice ID"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Guest Email (Optional)
                                        </label>
                                        <input
                                            type="email"
                                            value={invoiceForm.guest_email}
                                            onChange={(e) => setInvoiceForm({...invoiceForm, guest_email: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Override guest email"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Sending...' : 'Send Invoice Email'}
                                </button>
                            </form>
                        </div>

                        {/* Bulk Send Invoices */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <EnvelopeIcon className="h-5 w-5 mr-2" />
                                Bulk Send Invoices
                            </h3>
                            <form onSubmit={bulkSendInvoices} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Invoice IDs *
                                    </label>
                                    <textarea
                                        value={bulkForm.invoice_ids}
                                        onChange={(e) => setBulkForm({...bulkForm, invoice_ids: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter invoice IDs separated by commas (e.g., 1,2,3)"
                                        rows="3"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Guest Emails (Optional)
                                    </label>
                                    <textarea
                                        value={bulkForm.guest_emails}
                                        onChange={(e) => setBulkForm({...bulkForm, guest_emails: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter guest emails separated by commas (optional)"
                                        rows="3"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Sending...' : 'Bulk Send Invoices'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Email Logs Tab */}
                {activeTab === 'email_logs' && (
                    <div className="bg-white rounded-lg shadow-sm border">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900">Recent Email Logs</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Recipient
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Sent At
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Error
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {emailLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEmailTypeColor(log.email_type)}`}>
                                                    {log.email_type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.recipient_email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {getStatusIcon(log.status)}
                                                    <span className="ml-2 text-sm text-gray-900 capitalize">
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(log.sent_at)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {log.error_message || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {emailLogs.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    No email logs found
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Configuration Tab */}
                {activeTab === 'configuration' && (
                    <div className="space-y-6">
                        {/* Email Configuration */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <CogIcon className="h-5 w-5 mr-2" />
                                SMTP Configuration
                            </h3>
                            <form onSubmit={updateEmailConfig} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            SMTP Host *
                                        </label>
                                        <input
                                            type="text"
                                            value={configForm.host}
                                            onChange={(e) => setConfigForm({...configForm, host: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., smtp.gmail.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Port *
                                        </label>
                                        <input
                                            type="number"
                                            value={configForm.port}
                                            onChange={(e) => setConfigForm({...configForm, port: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="587"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Username *
                                        </label>
                                        <input
                                            type="text"
                                            value={configForm.username}
                                            onChange={(e) => setConfigForm({...configForm, username: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="your-email@gmail.com"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Password/App Password *
                                        </label>
                                        <input
                                            type="password"
                                            value={configForm.password}
                                            onChange={(e) => setConfigForm({...configForm, password: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter password or app password"
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Updating...' : 'Update Configuration'}
                                </button>
                            </form>
                        </div>

                        {/* Test Email Configuration */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <EnvelopeIcon className="h-5 w-5 mr-2" />
                                Test Email Configuration
                            </h3>
                            <form onSubmit={testEmailConfiguration} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Test Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="test@example.com"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Sending...' : 'Send Test Email'}
                                </button>
                            </form>
                        </div>

                        {/* Current Configuration Display */}
                        {Object.keys(emailConfig).length > 0 && (
                            <div className="bg-white p-6 rounded-lg shadow-sm border">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Configuration</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries(emailConfig).map(([key, value]) => (
                                        <div key={key}>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                {key.charAt(0).toUpperCase() + key.slice(1)}
                                            </label>
                                            <input
                                                type="text"
                                                value={value}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50"
                                                readOnly
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailManagementDashboard;
