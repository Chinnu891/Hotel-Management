import React, { useState, useEffect } from 'react';
import { FaSearch, FaCreditCard, FaCheck, FaTimes } from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';

const PaymentProcessor = () => {
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        payment_method: '',
        transaction_id: '',
        notes: ''
    });

    useEffect(() => {
        fetchPendingInvoices();
        fetchPaymentMethods();
    }, []);

    const fetchPendingInvoices = async () => {
        try {
            setLoading(true);
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=all_invoices&status=pending'));
            const data = await response.json();
            if (data.success) {
                setInvoices(data.invoices);
            } else {
                setMessage(data.message || 'Failed to fetch invoices');
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setMessage('Error fetching invoices');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentMethods = async () => {
        try {
            // For now, use hardcoded payment methods since the endpoint doesn't exist
            const methods = [
                { id: 'cash', name: 'Cash', description: 'Cash payment' },
                { id: 'card', name: 'Credit/Debit Card', description: 'Card payment' },
                { id: 'upi', name: 'UPI', description: 'UPI payment' },
                { id: 'bank_transfer', name: 'Bank Transfer', description: 'Bank transfer' },
                { id: 'cheque', name: 'Cheque', description: 'Cheque payment' }
            ];
            setPaymentMethods(methods);
        } catch (error) {
            console.error('Error setting payment methods:', error);
        }
    };

    const selectInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentForm({
            ...paymentForm,
            amount: invoice.total_amount.toString()
        });
    };

    const handlePaymentFormChange = (e) => {
        const { name, value } = e.target;
        setPaymentForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const processPayment = async (invoiceId, amount, paymentMethod) => {
        try {
            setLoading(true); // Changed from setProcessingPayment to setLoading
            const response = await fetch(buildApiUrl('api/comprehensive_billing_api.php?action=process_payment'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoice_id: invoiceId,
                    amount: parseFloat(amount),
                    payment_method: paymentMethod,
                    user_id: 1 // Replace with actual user ID from auth
                }),
            });

            const data = await response.json();
            if (data.success) {
                setMessage(`Payment processed successfully! Payment ID: ${data.payment_id}`);
                setSelectedInvoice(null);
                setPaymentForm({ amount: '', payment_method: '', transaction_id: '', notes: '' });
                fetchPendingInvoices(); // Refresh the list
            } else {
                setMessage(data.message || 'Failed to process payment');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            setMessage('Error processing payment');
        } finally {
            setLoading(false); // Changed from setProcessingPayment to setLoading
        }
    };

    const filteredInvoices = invoices.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.guest_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Process Payment</h2>
                <p className="text-gray-600">Select an invoice and process payment</p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg ${
                    message.includes('successfully') 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                }`}>
                    <div className="flex items-center justify-between">
                        <span>{message}</span>
                        <button onClick={() => setMessage('')} className="text-gray-500 hover:text-gray-700">
                            <FaTimes />
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Invoices List */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Pending Invoices</h3>
                    </div>
                    
                    <div className="p-4 border-b border-gray-200">
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    
                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                            No pending invoices available.
                        </div>
                    ) : (
                        <div className="max-h-96 overflow-y-auto">
                            {filteredInvoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    onClick={() => selectInvoice(invoice)}
                                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                                        selectedInvoice?.id === invoice.id ? 'bg-blue-50 border-blue-200' : ''
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {invoice.invoice_number}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {invoice.guest_name} - {invoice.room_number}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-gray-900">
                                                ${parseFloat(invoice.total_amount).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payment Form */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {selectedInvoice ? (
                            <>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-blue-900 mb-2">Selected Invoice</h4>
                                    <div className="text-sm text-blue-700">
                                        <div><strong>Invoice #:</strong> {selectedInvoice.invoice_number}</div>
                                        <div><strong>Guest:</strong> {selectedInvoice.guest_name}</div>
                                        <div><strong>Amount:</strong> ${parseFloat(selectedInvoice.total_amount).toFixed(2)}</div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Amount *
                                    </label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={paymentForm.amount}
                                        onChange={handlePaymentFormChange}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Method *
                                    </label>
                                    <select
                                        name="payment_method"
                                        value={paymentForm.payment_method}
                                        onChange={handlePaymentFormChange}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select payment method</option>
                                        {paymentMethods.map((method) => (
                                            <option key={method.id} value={method.method_code}>
                                                {method.method_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Transaction ID
                                    </label>
                                    <input
                                        type="text"
                                        name="transaction_id"
                                        value={paymentForm.transaction_id}
                                        onChange={handlePaymentFormChange}
                                        placeholder="Transaction ID (optional)"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Notes
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={paymentForm.notes}
                                        onChange={handlePaymentFormChange}
                                        rows="3"
                                        placeholder="Additional notes..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <button
                                    onClick={() => processPayment(selectedInvoice.id, paymentForm.amount, paymentForm.payment_method)}
                                    disabled={loading}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaCheck className="h-4 w-4" />
                                            <span>Process Payment</span>
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <FaCreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>Select an invoice from the list to process payment</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentProcessor;
