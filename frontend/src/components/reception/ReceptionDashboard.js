import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { 
    FaHome, 
    FaBed, 
    FaUsers, 
    FaCalculator, 
    FaHistory, 
    FaMoneyBillWave, 
    FaEnvelope, 
    FaSearch, 
    FaTools, 
    FaBroom, 
    FaBell,
    FaSync,
    FaCheckCircle,
    FaExclamationTriangle,
    FaSignOutAlt,
    FaTimes,
    FaEye,
    FaCreditCard,
    FaUserCheck,
    FaUserTimes,
    FaCheckDouble,
    FaTimesCircle,
    FaDoorOpen,
    FaClock,
    FaExclamationCircle,
    FaWrench,
    FaCalendarAlt
} from 'react-icons/fa';
import DashboardOverview from './DashboardOverview';
import NewBooking from './NewBooking';
import RoomAvailability from '../booking/RoomAvailability';
import Prebooked from '../booking/Prebooked';
import PricingCalculator from '../booking/PricingCalculator';
import GuestHistory from './GuestHistory';
import Billing from './Billing';
import EmailManagementDashboard from '../EmailManagementDashboard';
import GuestSearch from './GuestSearch.jsx';
import ReceptionMaintenance from './ReceptionMaintenance';
import ReceptionMaintenanceReports from './ReceptionMaintenanceReports';
import ReceptionMaintenanceStatus from './ReceptionMaintenanceStatus';
import HousekeepingDashboard from '../housekeeping/HousekeepingDashboard';
import NotificationDashboard from './NotificationDashboard';
import OptimizedComponent from '../common/OptimizedComponent';
import { useOptimizedAnimation } from '../../hooks/useOptimizedAnimation';
import { buildApiUrl } from '../../config/api';
import ReceptionProfileEditor from './ReceptionProfileEditor';
import './ReceptionDashboard.css';


const ReceptionDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncStatus, setSyncStatus] = useState('syncing'); // 'syncing', 'synced', 'error'
  const [lastSync, setLastSync] = useState(new Date());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    notifications: true,
    autoSync: true,
    theme: 'light',
    language: 'en',
    timezone: 'UTC'
  });
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile only
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout, user, token, updateUser, refreshUserProfile } = useAuth();
  const { notifications: realTimeNotifications, markNotificationAsRead } = useRealTime();
  const basePath = '/reception';

  // Check if mobile and handle sidebar state
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

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    return () => {
      // Cleanup: ensure body scroll is restored when component unmounts
      if (isMobile && sidebarOpen) {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      }
    };
  }, [isMobile, sidebarOpen]);

  // Handle URL parameters for tab and booking data
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'new-booking', 'room-availability', 'prebooked', 'pricing-calculator', 'guest-history', 'billing', 'email-management', 'guest-search', 'maintenance', 'maintenance-reports', 'maintenance-status', 'housekeeping', 'notifications'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else {
      // Parse URL path to determine active tab
      const pathSegments = location.pathname.split('/').filter(segment => segment);
      if (pathSegments.length > 1 && pathSegments[0] === 'reception') {
        const tabFromPath = pathSegments[1];
        if (['dashboard', 'new-booking', 'room-availability', 'prebooked', 'pricing-calculator', 'guest-history', 'billing', 'email-management', 'guest-search', 'maintenance', 'maintenance-reports', 'maintenance-status', 'housekeeping', 'notifications'].includes(tabFromPath)) {
          setActiveTab(tabFromPath);
        }
      }
    }
  }, [searchParams, location.pathname]);

  // Debug user data changes
  useEffect(() => {
    console.log('User data changed in ReceptionDashboard:', user);
  }, [user]);

  // Navigation items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome, description: 'Overview and quick actions' },
    { id: 'new-booking', label: 'New Booking', icon: FaBed, description: 'Create new guest bookings' },
    { id: 'room-availability', label: 'Room Availability', icon: FaBed, description: 'Check room status and availability' },
    { id: 'prebooked', label: 'Prebooked', icon: FaCalendarAlt, description: 'View and manage future bookings' },
    { id: 'pricing-calculator', label: 'Pricing Calculator', icon: FaCalculator, description: 'Calculate room rates and charges' },
    { id: 'guest-history', label: 'Guest History', icon: FaHistory, description: 'Search and view guest records' },
    { id: 'billing', label: 'Billing', icon: FaMoneyBillWave, description: 'Manage invoices and payments' },
    { id: 'email-management', label: 'Email Management', icon: FaEnvelope, description: 'Send and manage guest communications' },
    { id: 'guest-search', label: 'Guest Search', icon: FaSearch, description: 'Search and manage guest information' },
    { id: 'maintenance', label: 'Maintenance', icon: FaTools, description: 'Create and track maintenance requests' },
    { id: 'maintenance-reports', label: 'Maintenance Reports', icon: FaTools, description: 'View maintenance analytics and reports' },
    { id: 'maintenance-status', label: 'Maintenance Status', icon: FaTools, description: 'Monitor maintenance request status' },
    { id: 'housekeeping', label: 'Housekeeping', icon: FaBroom, description: 'Manage cleaning tasks and room status' },
    { id: 'notifications', label: 'Notifications', icon: FaBell, description: 'View system notifications and alerts' }
  ];

  // Auto-sync every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus('syncing');
      // Simulate sync process
      setTimeout(() => {
        setSyncStatus('synced');
        setLastSync(new Date());
      }, 1000);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownOpen && !event.target.closest('.notification-dropdown')) {
        setNotificationDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationDropdownOpen]);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setNotificationLoading(true);
      const response = await fetch(buildApiUrl('reception/notification_api.php?channel=reception&limit=10'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Check content type to ensure we're getting JSON
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        console.error('Content-type check failed. Expected application/json, got:', contentType);
        throw new Error('Server returned non-JSON response. Please check server logs.');
      }
      
      const data = await response.json();
      if (data.success) {
        // Parse the nested JSON data in each notification
        const parsedNotifications = data.data.notifications.map(notification => {
          try {
            // Parse the nested JSON data field
            const parsedData = JSON.parse(notification.data);
            return {
              ...notification,
              parsedData: parsedData,
              // Extract commonly used fields for easier access
              title: parsedData.title || parsedData.type || 'Notification',
              message: parsedData.message || 'No message available',
              priority: parsedData.priority || 'medium',
              notificationType: parsedData.type || 'unknown'
            };
          } catch (parseError) {
            console.warn('Failed to parse notification data:', parseError);
            // Return notification with fallback values if parsing fails
            return {
              ...notification,
              parsedData: null,
              title: 'Notification',
              message: 'Unable to parse notification data',
              priority: 'low',
              notificationType: 'unknown'
            };
          }
        });
        
        console.log('Parsed notifications:', parsedNotifications);
        setNotifications(parsedNotifications);
        const unread = parsedNotifications.filter(n => !n.read_at).length;
        setUnreadCount(unread);
        setNotificationError(null); // Clear any previous errors
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set empty notifications on error to prevent UI issues
      setNotifications([]);
      setUnreadCount(0);
      setNotificationError(error.message);
    } finally {
      setNotificationLoading(false);
    }
  };

  // Fetch notifications on component mount and when token changes
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  // Retry mechanism for failed notification fetches
  useEffect(() => {
    if (token && notifications.length === 0 && !notificationLoading) {
      // If we have no notifications and we're not loading, try to fetch again after a delay
      const timer = setTimeout(() => {
        if (token) {
          fetchNotifications();
        }
      }, 5000); // Retry after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [token, notifications.length, notificationLoading]);

  // Update unread count when real-time notifications change
  useEffect(() => {
    const unread = realTimeNotifications.filter(n => !n.read_at).length;
    setUnreadCount(unread);
  }, [realTimeNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(buildApiUrl('reception/notification_api.php'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notification_id: notificationId,
          action: 'mark_read'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        throw new Error('Server returned non-JSON response');
      }
      
      const data = await response.json();
      if (data.success) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
        markNotificationAsRead(notificationId);
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read_at);
      const promises = unreadNotifications.map(n => handleMarkAsRead(n.id));
      await Promise.all(promises);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (notificationType) => {
    switch (notificationType) {
      case 'payment_confirmed':
        return <FaCreditCard className="w-4 h-4 text-green-600" />;
      case 'guest_checkin':
        return <FaUserCheck className="w-4 h-4 text-blue-600" />;
      case 'guest_checkout':
        return <FaUserTimes className="w-4 h-4 text-orange-600" />;
      case 'booking_confirmed':
        return <FaCheckDouble className="w-4 h-4 text-green-600" />;
      case 'booking_cancelled':
        return <FaTimesCircle className="w-4 h-4 text-red-600" />;
      case 'room_available':
        return <FaDoorOpen className="w-4 h-4 text-blue-600" />;
      case 'checkout_deadline_alert':
        return <FaClock className="w-4 h-4 text-red-600" />;
      case 'early_checkout':
        return <FaUserTimes className="w-4 h-4 text-blue-600" />;
      case 'late_checkout':
        return <FaExclamationCircle className="w-4 h-4 text-red-600" />;
      case 'payment_overdue':
        return <FaExclamationTriangle className="w-4 h-4 text-red-600" />;
      case 'maintenance_completed':
        return <FaWrench className="w-4 h-4 text-green-600" />;
      case 'housekeeping_completed':
        return <FaBroom className="w-4 h-4 text-green-600" />;
      default:
        return <FaBell className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get notification priority styling
  const getNotificationPriorityStyle = (notificationType) => {
    switch (notificationType) {
      case 'checkout_deadline_alert':
      case 'late_checkout':
      case 'payment_overdue':
      case 'booking_cancelled':
        return 'border-l-red-500 bg-red-50';
      case 'payment_confirmed':
      case 'booking_confirmed':
      case 'maintenance_completed':
      case 'housekeeping_completed':
        return 'border-l-green-500 bg-green-50';
      case 'guest_checkin':
      case 'guest_checkout':
      case 'room_available':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  // Get notification priority text
  const getNotificationPriorityText = (notificationType) => {
    switch (notificationType) {
      case 'checkout_deadline_alert':
      case 'late_checkout':
      case 'payment_overdue':
      case 'booking_cancelled':
        return 'High Priority';
      case 'payment_confirmed':
      case 'booking_confirmed':
      case 'guest_checkin':
      case 'guest_checkout':
        return 'Medium Priority';
      default:
        return 'Normal Priority';
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <FaSync className="spinner-optimized text-yellow-600" />;
      case 'synced':
        return <FaCheckCircle className="icon-optimized text-green-600" />;
      case 'error':
        return <FaExclamationTriangle className="icon-optimized text-red-600" />;
      default:
        return <FaSync className="icon-optimized text-gray-400" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Auto-sync active';
      case 'error':
        return 'Sync error';
      default:
        return 'Unknown status';
    }
  };

  const handleLogout = async () => {
    console.log('Logout button clicked');
    
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to logout?')) {
      console.log('User confirmed logout');
      setIsLoggingOut(true);
      
      try {
        // Clear all storage first
        localStorage.clear();
        sessionStorage.clear();
        console.log('Local storage cleared');
        
        // Use the AuthContext logout function
        logout();
        console.log('AuthContext logout completed');
        
        // Small delay to ensure logout completes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Force redirect to login page using window.location
        console.log('Redirecting to login page');
        window.location.href = '/login';
        
      } catch (error) {
        console.error('Error during logout:', error);
        setIsLoggingOut(false);
        // Force redirect even if there's an error
        window.location.href = '/login';
      }
    } else {
      console.log('User cancelled logout');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordMessage('Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage('');

    try {
      console.log('Attempting to change password...');
      console.log('API URL:', buildApiUrl('reception/simple_change_password.php'));
      console.log('Token:', token ? 'Present' : 'Missing');
      
      let response = await fetch(buildApiUrl('reception/simple_change_password.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_password: newPassword
        })
      });

      // If simple endpoint fails, try debug endpoint as fallback
      if (!response.ok) {
        console.log('Simple endpoint failed, trying debug endpoint as fallback...');
        response = await fetch(buildApiUrl('reception/change_own_password_debug.php'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            new_password: newPassword
          })
        });
      }

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        // If not JSON, get the text and show it as an error
        const errorText = await response.text();
        console.error('Non-JSON response (first 500 chars):', errorText.substring(0, 500));
        console.error('Full HTML response:', errorText);
        setPasswordMessage(`Server error detected. Check console for details. Error preview: ${errorText.substring(0, 100)}...`);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setPasswordMessage('Password changed successfully!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordMessage('');
        }, 2000);
      } else {
        setPasswordMessage(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setPasswordMessage('An error occurred while changing password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center space-x-4">
              {/* Hamburger Menu Button - Mobile Only */}
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 mr-2 md:hidden"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div className="admin-logo">
                <img 
                  src="/Logo.jpg" 
                  alt="Hotel Luxury Rooms Logo" 
                  className="admin-logo-image"
                />
              </div>
              {/* Temporarily hidden sync status and timestamp
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                {getSyncStatusIcon()}
                <span>{getSyncStatusText()}</span>
                <span className="text-gray-400">•</span>
                <span>Last updated: {lastSync.toLocaleTimeString()}</span>
              </div>
              */}
            </div>
            <div className="flex items-center space-x-4">

              
              {/* Notification Icon and Dropdown */}
              <div className="relative notification-dropdown">
                <button
                  onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                  className="relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                >
                  <FaBell className="w-6 h-6 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown Menu */}
                {notificationDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200 max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {notificationLoading ? (
                      <div className="px-4 py-8 text-center">
                        <FaSync className="w-6 h-6 text-gray-400 mx-auto mb-2 animate-spin" />
                        <p className="text-gray-500">Loading notifications...</p>
                      </div>
                    ) : notificationError ? (
                      <div className="px-4 py-8 text-center">
                        <FaExclamationCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                        <p className="text-red-600 font-medium mb-2">Failed to load notifications</p>
                        <p className="text-sm text-gray-500 mb-3">{notificationError}</p>
                        <button
                          onClick={() => {
                            setNotificationError(null);
                            fetchNotifications();
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          Retry
                        </button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <FaBell className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                                                {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 transition-colors duration-150 ${
                              !notification.read_at ? getNotificationPriorityStyle(notification.notificationType) : ''
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  {getNotificationIcon(notification.notificationType)}
                                  <p className={`text-sm font-medium ${
                                    !notification.read_at ? 'text-gray-900' : 'text-gray-700'
                                  }`}>
                                    {notification.title}
                                  </p>
                                  {!notification.read_at && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      notification.priority === 'high'
                                        ? 'bg-red-100 text-red-700' 
                                        : notification.priority === 'medium'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {notification.priority.charAt(0).toUpperCase() + notification.priority.slice(1)} Priority
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                {notification.parsedData && notification.parsedData.details && (
                                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                    {Object.entries(notification.parsedData.details).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                                        <span>{value}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">
                                    {new Date(notification.created_at).toLocaleString()}
                                  </span>
                                  {!notification.read_at && (
                                    <button
                                      onClick={() => handleMarkAsRead(notification.id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                                    >
                                      <FaEye className="w-3 h-3" />
                                      <span>Mark as read</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              {!notification.read_at && (
                                <div className="ml-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    notification.priority === 'high'
                                      ? 'bg-red-500' 
                                      : notification.priority === 'medium'
                                        ? 'bg-blue-500'
                                        : 'bg-gray-500'
                                  }`}></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-gray-100">
                        <Link
                          to={`${basePath}/notifications`}
                          onClick={() => setNotificationDropdownOpen(false)}
                          className="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View all notifications
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* User Profile Dropdown */}
              <div className="relative profile-dropdown">
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-700 hidden md:block">
                    Welcome, {user?.full_name || user?.username || 'User'}
                  </div>
                  <button
                    onClick={() => {
                      console.log('Profile dropdown clicked, current user:', user);
                      setProfileDropdownOpen(!profileDropdownOpen);
                    }}
                    className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                    </div>
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {/* Profile Dropdown Menu */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-semibold">{user?.full_name || user?.username || 'User'}</div>
                      <div className="text-gray-500 text-xs">Reception Staff</div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setEditProfileOpen(true);
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Edit Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowSettingsModal(true);
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Settings</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowPasswordModal(true);
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span>Change Password</span>
                    </button>
                    
                    <div className="border-t border-gray-100 my-1"></div>
                    
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    >
                      {isLoggingOut ? (
                        <FaSync className="h-4 w-4 spinner-optimized" />
                      ) : (
                        <FaSignOutAlt className="h-4 w-4" />
                      )}
                      <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 z-[9998] bg-black bg-opacity-50 md:hidden"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        reception-mobile-sidebar
        ${isMobile ? (sidebarOpen ? 'translate-x-0' : '-translate-x-full') : 'hidden'}
      `}>
        <div className="flex items-center justify-between p-4 border-b">
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to={`${basePath}/${item.id}`}
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
                <Icon className={`mr-3 h-5 w-5 ${
                  activeTab === item.id 
                    ? 'text-white' 
                    : 'text-gray-600 group-hover:text-blue-600'
                }`} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Horizontal Navigation Bar - Desktop Only */}
        <div className="mb-6 hidden md:block">
          <nav className="nav-container flex flex-wrap gap-2 justify-center lg:justify-start overflow-x-auto pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to={`${basePath}/${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`nav-item nav-item-optimized group flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium ${
                    activeTab === item.id
                      ? 'active bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 border-2 border-blue-400'
                      : 'text-gray-700 bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:text-blue-600 hover:shadow-md hover:shadow-blue-500/20 border border-gray-200 hover:border-blue-300'
                  }`}
                  style={activeTab === item.id ? { color: 'white' } : {}}
                >
                  <Icon className={`nav-icon icon-optimized h-5 w-5 ${
                    activeTab === item.id 
                      ? 'text-white animate-pulse' 
                      : 'text-gray-600 group-hover:text-blue-600'
                  }`} />
                  <span className="whitespace-nowrap font-semibold">{item.label}</span>
                  {activeTab === item.id && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="w-full">
          {/* Page Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {activeTab === 'dashboard' ? 'Dashboard Overview' : navItems.find(item => item.id === activeTab)?.label || 'Page'}
            </h2>
            <p className="text-gray-600 mt-1">
              {navItems.find(item => item.id === activeTab)?.description || 'Manage your hotel operations'}
            </p>
          </div>
            
          {/* Conditional rendering instead of nested Routes */}
          {activeTab === 'dashboard' && <DashboardOverview />}
                          {activeTab === 'new-booking' && <NewBooking key="reception-new-booking" />}
          {activeTab === 'room-availability' && <RoomAvailability />}
          {activeTab === 'prebooked' && <Prebooked />}
          {activeTab === 'pricing-calculator' && <PricingCalculator />}
          {activeTab === 'guest-history' && <GuestHistory />}
          {activeTab === 'billing' && <Billing />}
          {activeTab === 'email-management' && <EmailManagementDashboard />}
          {activeTab === 'guest-search' && <GuestSearch />}
          {activeTab === 'maintenance' && <ReceptionMaintenance />}
          {activeTab === 'maintenance-reports' && <ReceptionMaintenanceReports />}
          {activeTab === 'maintenance-status' && <ReceptionMaintenanceStatus />}
          {activeTab === 'housekeeping' && <HousekeepingDashboard />}
          {activeTab === 'notifications' && <NotificationDashboard />}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editProfileOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4">
            <ReceptionProfileEditor 
              user={user}
              onClose={() => setEditProfileOpen(false)}
              onProfileUpdated={(updatedUser) => {
                console.log('Profile updated:', updatedUser);
                setEditProfileOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                {passwordMessage && (
                  <div className={`text-sm p-2 rounded ${
                    passwordMessage.includes('successfully') 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {passwordMessage}
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      setPasswordMessage('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
                     </div>
         </div>
       )}

       {/* Settings Modal */}
       {showSettingsModal && (
         <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
           <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
             <div className="mt-3">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                 <button
                   onClick={() => setShowSettingsModal(false)}
                   className="text-gray-400 hover:text-gray-600"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
               
               <form onSubmit={(e) => {
                 e.preventDefault();
                 // Save settings logic here
                 console.log('Settings saved:', settingsForm);
                 alert('Settings saved successfully!');
                 setShowSettingsModal(false);
               }} className="space-y-4">
                 
                 {/* Notifications Settings */}
                 <div className="flex items-center justify-between">
                   <div>
                     <label className="text-sm font-medium text-gray-700">Enable Notifications</label>
                     <p className="text-xs text-gray-500">Receive system alerts and updates</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input
                       type="checkbox"
                       checked={settingsForm.notifications}
                       onChange={(e) => setSettingsForm({...settingsForm, notifications: e.target.checked})}
                       className="sr-only peer"
                     />
                     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                 </div>

                 {/* Auto Sync Settings */}
                 <div className="flex items-center justify-between">
                   <div>
                     <label className="text-sm font-medium text-gray-700">Auto Sync</label>
                     <p className="text-xs text-gray-500">Automatically sync data every 10 seconds</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input
                       type="checkbox"
                       checked={settingsForm.autoSync}
                       onChange={(e) => setSettingsForm({...settingsForm, autoSync: e.target.checked})}
                       className="sr-only peer"
                     />
                     <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                 </div>

                 {/* Theme Settings */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                   <select
                     value={settingsForm.theme}
                     onChange={(e) => setSettingsForm({...settingsForm, theme: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   >
                     <option value="light">Light</option>
                     <option value="dark">Dark</option>
                     <option value="auto">Auto (System)</option>
                   </select>
                 </div>

                 {/* Language Settings */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                   <select
                     value={settingsForm.language}
                     onChange={(e) => setSettingsForm({...settingsForm, language: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   >
                     <option value="en">English</option>
                     <option value="es">Spanish</option>
                     <option value="fr">French</option>
                     <option value="de">German</option>
                     <option value="hi">Hindi</option>
                   </select>
                 </div>

                 {/* Timezone Settings */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                   <select
                     value={settingsForm.timezone}
                     onChange={(e) => setSettingsForm({...settingsForm, timezone: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   >
                     <option value="UTC">UTC</option>
                     <option value="America/New_York">Eastern Time</option>
                     <option value="America/Chicago">Central Time</option>
                     <option value="America/Denver">Mountain Time</option>
                     <option value="America/Los_Angeles">Pacific Time</option>
                     <option value="Europe/London">London</option>
                     <option value="Europe/Paris">Paris</option>
                     <option value="Asia/Tokyo">Tokyo</option>
                     <option value="Asia/Kolkata">India</option>
                   </select>
                 </div>

                 <div className="flex space-x-3 pt-4">
                   <button
                     type="submit"
                     className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     Save Settings
                   </button>
                   <button
                     type="button"
                     onClick={() => setShowSettingsModal(false)}
                     className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                   >
                     Cancel
                   </button>
                 </div>
               </form>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };

export default ReceptionDashboard;
