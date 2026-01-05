import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const InvoiceRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Determine the correct billing path based on the current route
    let billingPath = '/reception/billing';
    
    if (location.pathname === '/invoice') {
      billingPath = '/reception/billing/invoice';
    } else if (location.pathname === '/manage-invoices') {
      billingPath = '/reception/billing/manage-invoices';
    } else if (location.pathname === '/payment') {
      billingPath = '/reception/billing/payment';
    } else if (location.pathname === '/history') {
      billingPath = '/reception/billing/history';
    } else if (location.pathname === '/stats') {
      billingPath = '/reception/billing/stats';
    }

    // Redirect to the correct billing path
    navigate(billingPath, { replace: true });
  }, [navigate, location.pathname]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Redirecting...</h2>
        <p className="text-gray-600">Taking you to the billing system</p>
      </div>
    </div>
  );
};

export default InvoiceRedirect;
