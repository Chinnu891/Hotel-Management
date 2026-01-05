import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import RoomManagement from './RoomManagement';
import PreBookedRooms from './PreBookedRooms';
import StaffManagement from './StaffManagement';
import AdminGuestHistory from './AdminGuestHistory';
import Reports from './Reports';
import AdminMaintenance from './Maintenance';
import AdminHousekeeping from './AdminHousekeeping';
import EmailManagementDashboard from '../EmailManagementDashboard';
import TallyIntegration from './TallyIntegration';
import AdminProfileDropdown from './AdminProfileDropdown';
import RoomAvailability from '../booking/RoomAvailability';
import CheckedInGuests from './CheckedInGuests';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile only
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On mobile, sidebar should be closed by default
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab]);

  // Set active tab based on current location
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/maintenance')) {
      setActiveTab('maintenance');
    } else if (path.includes('/housekeeping')) {
      setActiveTab('housekeeping');
    } else if (path.includes('/prebooked-rooms')) {
      setActiveTab('prebooked-rooms');
    } else if (path.includes('/room-availability')) {
      setActiveTab('room-availability');
    } else if (path.includes('/rooms')) {
      setActiveTab('rooms');
    } else if (path.includes('/staff')) {
      setActiveTab('staff');
    } else if (path.includes('/guest-history')) {
      setActiveTab('guest-history');
    } else if (path.includes('/reports')) {
      setActiveTab('reports');
    } else if (path.includes('/email-management')) {
      setActiveTab('email-management');
    } else if (path.includes('/tally-integration')) {
      setActiveTab('tally-integration');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl(API_ENDPOINTS.ADMIN_DASHBOARD));
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDashboardStats(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', description: 'Overview' },
    { id: 'rooms', label: 'Rooms', icon: '🏠', description: 'Manage rooms' },
    { id: 'room-availability', label: 'Room Availability', icon: '🔍', description: 'Check room status' },
    { id: 'prebooked-rooms', label: 'Pre-booked', icon: '📅', description: 'Future bookings' },
    { id: 'staff', label: 'Staff', icon: '👥', description: 'Staff management' },
    { id: 'guest-history', label: 'Guests', icon: '👤', description: 'Guest records' },
    { id: 'reports', label: 'Reports', icon: '📈', description: 'Analytics' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧', description: 'Room issues' },
    { id: 'housekeeping', label: 'Housekeeping', icon: '🧹', description: 'Cleaning tasks' },
    { id: 'email-management', label: 'Email', icon: '📧', description: 'Communications' },
    { id: 'tally-integration', label: 'Tally', icon: '🧮', description: 'Accounting' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Mobile Header */}
      <header className="bg-white shadow md:hidden fixed top-0 left-0 right-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 mr-3"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="admin-logo">
                <img 
                  src="/Logo.jpg" 
                  alt="Hotel Luxury Rooms Logo" 
                  className="admin-logo-image"
                />
              </div>
            </div>
            <AdminProfileDropdown user={user} />
          </div>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="bg-white shadow-sm hidden md:block fixed top-0 left-0 right-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <div className="admin-logo">
                <img 
                  src="/Logo.jpg" 
                  alt="Hotel Luxury Rooms Logo" 
                  className="admin-logo-image"
                />
              </div>
            </div>
            <AdminProfileDropdown user={user} />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && isMobile && (
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            style={{ top: '4rem' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          sidebar w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out 
          ${isMobile ? (sidebarOpen ? 'open' : '') : 'open'}
        `}>
          <div className="flex items-center justify-between p-4 border-b md:hidden">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                to={item.id === 'dashboard' ? '/admin' : `/admin/${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                <div className="font-medium">{item.label}</div>
              </Link>
            ))}
          </nav>

        </div>

        {/* Main Content */}
        <div className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out ${
          !isMobile ? 'main-content-with-sidebar' : ''
        } pt-16`}>
          <div className="flex-1 transition-all duration-300 ease-in-out">
            <div className="w-full px-4 sm:px-6 lg:px-8 py-4 md:py-8 transition-all duration-300 ease-in-out max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <CheckedInGuests />}
            {activeTab === 'rooms' && <RoomManagement />}
            {activeTab === 'room-availability' && <RoomAvailability />}
            {activeTab === 'prebooked-rooms' && <PreBookedRooms />}
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'guest-history' && <AdminGuestHistory />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'maintenance' && <AdminMaintenance />}
            {activeTab === 'housekeeping' && <AdminHousekeeping />}
            {activeTab === 'email-management' && <EmailManagementDashboard />}
            {activeTab === 'tally-integration' && <TallyIntegration />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default AdminDashboard;
