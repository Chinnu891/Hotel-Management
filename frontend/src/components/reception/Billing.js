import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import BillingDashboard from './BillingDashboard';
import InvoiceGenerator from './InvoiceGenerator';
import InvoiceManagement from './InvoiceManagement';
import PaymentProcessor from './PaymentProcessor';
import PaymentHistory from './PaymentHistory';
import BillingStats from './BillingStats';
import RefundManagement from './RefundManagement';
import { FaChartBar, FaFileInvoice, FaCreditCard, FaHistory, FaTachometerAlt, FaShieldAlt, FaListAlt, FaUndo } from 'react-icons/fa';
import OptimizedComponent from '../common/OptimizedComponent';
import { useOptimizedAnimation } from '../../hooks/useOptimizedAnimation';

const Billing = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: FaTachometerAlt },
    { path: '/invoice', label: 'Generate Invoice', icon: FaFileInvoice },
    { path: '/manage-invoices', label: 'Manage Invoices', icon: FaListAlt },
    { path: '/payment', label: 'Payment Processor', icon: FaCreditCard },
    { path: '/history', label: 'Payment History', icon: FaHistory },
    { path: '/refunds', label: 'Refund Management', icon: FaUndo },
    { path: '/stats', label: 'Billing Stats', icon: FaChartBar },
  ];

  // Get current path for conditional rendering
  const currentPath = location.pathname.split('/').pop() || '';
  
  // Determine the base path for navigation
  const isAdminRoute = location.pathname.startsWith('/admin');
  const basePath = isAdminRoute ? '/admin/billing' : '/billing';

  return (
    <div className="flex">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white shadow-lg min-h-screen">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Billing System</h2>
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center text-green-700">
              <FaShieldAlt className="mr-2" />
              <span className="text-sm font-medium">Production Ready</span>
            </div>
            <p className="text-xs text-green-600 mt-1">Live payment processing enabled</p>
          </div>
          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path === '/' ? basePath : `${basePath}${item.path}`}
                  className={`flex items-center px-4 py-3 rounded-lg nav-item-optimized ${
                    isActive
                      ? 'bg-green-100 text-green-700 border-r-2 border-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="mr-3 text-lg icon-optimized" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gray-50">
        {/* Conditional rendering instead of nested Routes */}
        {currentPath === '' && <BillingDashboard />}
        {currentPath === 'invoice' && <InvoiceGenerator />}
        {currentPath === 'manage-invoices' && <InvoiceManagement />}
        {currentPath === 'payment' && <PaymentProcessor />}
        {currentPath === 'history' && <PaymentHistory />}
        {currentPath === 'refunds' && <RefundManagement />}
        {currentPath === 'stats' && <BillingStats />}
      </div>
    </div>
  );
};

export default Billing;
