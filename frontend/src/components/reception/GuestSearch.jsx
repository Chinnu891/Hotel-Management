import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../config/api';
import { toast } from 'react-toastify';
import RazorpayPayment from './RazorpayPayment';
import CancelBooking from '../booking/CancelBooking';
import EditBookingPopup from '../booking/EditBookingPopup';
import FileViewerModal from '../common/FileViewerModal';
import { 
    FaSearch, 
    FaBed, 
    FaTimesCircle,
    FaTimes,
    FaEye,
    FaSync,
    FaSignInAlt,
    FaSignOutAlt,
    FaMoneyBillWave,
    FaCreditCard,
    FaUndo,
    FaBan,
    FaUser,
    FaFilter,
    FaCalendarPlus
} from 'react-icons/fa';
import OptimizedComponent from '../common/OptimizedComponent';
import { useOptimizedLoading } from '../../hooks/useOptimizedAnimation';
import './GuestSearch.css';

const GuestSearch = () => {
  const { token } = useAuth();
  
  // Helper function to calculate total hours between check-in and check-out times
  const calculateTotalHours = (checkInTime, checkInAmpm, checkOutTime, checkOutAmpm, checkInDate, checkOutDate) => {
    const convertTo24Hour = (time, ampm) => {
      if (!time || !ampm) return null;
      
      try {
        const timeParts = time.split(':');
        // Handle both HH:MM and HH:MM:SS formats
        if (timeParts.length < 2 || timeParts.length > 3) return null;
        
        const [hours, minutes] = timeParts;
        let hour = parseInt(hours, 10);
        const min = parseInt(minutes, 10);
        
        // Validate hour and minute values
        if (isNaN(hour) || isNaN(min) || hour < 1 || hour > 12 || min < 0 || min > 59) {
          return null;
        }
        
        if (ampm === 'PM' && hour !== 12) {
          hour += 12;
        } else if (ampm === 'AM' && hour === 12) {
          hour = 0;
        }
        
        return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      } catch (error) {
        console.error('Error converting time in calculateTotalHours:', error);
        return null;
      }
    };
    
    const checkInTime24 = convertTo24Hour(checkInTime, checkInAmpm);
    const checkOutTime24 = convertTo24Hour(checkOutTime, checkOutAmpm);
    
    // Return error message if time conversion failed
    if (!checkInTime24 || !checkOutTime24) {
      return 'Invalid time format';
    }
    
    // Create proper datetime objects using actual dates
    const checkInDateTime = new Date(`${checkInDate}T${checkInTime24}`);
    const checkOutDateTime = new Date(`${checkOutDate}T${checkOutTime24}`);
    
    // Check if dates are valid
    if (isNaN(checkInDateTime.getTime()) || isNaN(checkOutDateTime.getTime())) {
      return 'Invalid date/time';
    }
    
    // Calculate the actual time difference
    const timeDiff = checkOutDateTime - checkInDateTime;
    
    // Convert to hours and minutes
    const totalHours = timeDiff / (1000 * 60 * 60);
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${hours}h`;
    }
  };
  const [searchType, setSearchType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [corporateFilter, setCorporateFilter] = useState('all'); // New corporate filter
  const [dueAmountFilter, setDueAmountFilter] = useState('all'); // New due amount filter
  const [includeCheckedOut, setIncludeCheckedOut] = useState(false); // New state for including checked-out guests
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState({});
  const [checkinLoading, setCheckinLoading] = useState({});
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showCheckinConfirm, setShowCheckinConfirm] = useState(false);
  const [showDuePaymentModal, setShowDuePaymentModal] = useState(false);
  const [guestToCheckout, setGuestToCheckout] = useState(null);
  const [guestToCheckin, setGuestToCheckin] = useState(null);
  const [guestForDuePayment, setGuestForDuePayment] = useState(null);
  const [duePaymentForm, setDuePaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    notes: '',
    adjusted_remaining: ''
  });
  const [duePaymentLoading, setDuePaymentLoading] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [razorpayPaymentData, setRazorpayPaymentData] = useState(null);
  const [lastDataUpdate, setLastDataUpdate] = useState(null);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Use optimized loading hook
  const { loadingDelay, startLoading, stopLoading } = useOptimizedLoading();
  
  // Cancellation states
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [guestToCancel, setGuestToCancel] = useState(null);

  // Edit booking states
  const [showEditModal, setShowEditModal] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState(null);

  // File viewer states
  const [showFileViewer, setShowFileViewer] = useState(false);

  // Day Extend states
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [guestToExtend, setGuestToExtend] = useState(null);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extendForm, setExtendForm] = useState({
    days: 1,
    customDays: '',
    newCheckoutDate: '',
    newCheckoutTime: '11:00',
    newCheckoutAmpm: 'AM',
    additionalAmount: 0
  });

  // Define functions before using them in useEffect
  const loadGuestStats = useCallback(async () => {
    try {
      const response = await fetch(`${buildApiUrl('reception/guest_search_api.php')}?action=stats`);
      const data = await response.json();
      if (data.success && data.data) {
        setStats(data.data);
        setLastDataUpdate(new Date());
      }
    } catch (error) {
      console.error('Error loading guest stats:', error);
    }
  }, []);

  const loadAllGuests = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = `${buildApiUrl('reception/guest_search_api.php')}?action=search&type=all&status=all&corporate=${corporateFilter}&include_checked_out=${includeCheckedOut}&include_future_bookings=true`;
      console.log('Loading all guests from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Guest search API response:', data);
      
      if (data.success) {
        // The API returns data directly as an array, not wrapped in results
        const results = data.data || [];
        console.log('Parsed results:', results, 'Count:', results.length);
        
        if (results && Array.isArray(results)) {
          const keys = results.map((guest, index) => `${guest.booking_id}-${guest.guest_id}-${index}`);
          const uniqueKeys = new Set(keys);
          
          if (keys.length !== uniqueKeys.size) {
            console.warn('Duplicate keys detected in search results:', {
              totalResults: keys.length,
              uniqueKeys: uniqueKeys.size,
              duplicates: keys.filter((key, index) => keys.indexOf(key) !== index)
            });
          }
          
          setSearchResults(results);
          setLastDataUpdate(new Date());
          console.log('Search results updated, count:', results.length);
        } else {
          console.warn('Results is not an array:', results);
          setSearchResults([]);
        }
      } else {
        console.error('API returned error:', data.message || 'Unknown error');
        setSearchResults([]);
        toast.error(data.message || 'Failed to load guests');
      }
    } catch (error) {
      console.error('Error loading guests:', error);
      setSearchResults([]);
      toast.error('Failed to load guests: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [corporateFilter, includeCheckedOut]);

  const checkAdminUpdates = useCallback(async () => {
    try {
      setIsCheckingUpdates(true);
      const response = await fetch(`${buildApiUrl('reception/guest_search_api.php')}?action=get_admin_updates`);
      const data = await response.json();
      
      if (data.success && data.data) {
        const { notifications, websocket_notifications, last_updated } = data.data;
        
        // Check if there are recent admin updates
        if (notifications && notifications.length > 0) {
          const recentUpdates = notifications.filter(notification => {
            const notificationTime = new Date(notification.created_at);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return notificationTime > fiveMinutesAgo;
          });
          
          if (recentUpdates.length > 0) {
            // Show notification to reception staff
            recentUpdates.forEach(update => {
              toast.info(`Admin Update: ${update.message}`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              });
            });
            
            // Refresh guest data to show updated information
            loadAllGuests();
            loadGuestStats();
          }
        }
        
        // Check WebSocket notifications
        if (websocket_notifications && websocket_notifications.length > 0) {
          const recentWSUpdates = websocket_notifications.filter(wsNotification => {
            const notificationTime = new Date(wsNotification.created_at);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return notificationTime > fiveMinutesAgo;
          });
          
          if (recentWSUpdates.length > 0) {
            // Process WebSocket notifications
            recentWSUpdates.forEach(wsNotification => {
              try {
                const wsData = JSON.parse(wsNotification.data);
                if (wsData.type === 'guest_updated' || wsData.type === 'booking_updated') {
                  toast.info(`Real-time Update: ${wsData.data.message}`, {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                  });
                  
                  // Refresh data immediately for real-time updates
                  loadAllGuests();
                  loadGuestStats();
                }
              } catch (error) {
                console.error('Error parsing WebSocket notification:', error);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking admin updates:', error);
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [loadAllGuests, loadGuestStats]);

  // Load guest statistics and all guests on component mount
  useEffect(() => {
    loadGuestStats();
    loadAllGuests();
    
    // Set up real-time updates from admin dashboard
    const adminUpdateInterval = setInterval(checkAdminUpdates, 10000); // Check every 10 seconds
    
    return () => {
      clearInterval(adminUpdateInterval);
    };
  }, [loadGuestStats, loadAllGuests, checkAdminUpdates]);
  
  // Reload guests when corporate filter changes
  useEffect(() => {
    loadAllGuests();
  }, [corporateFilter, loadAllGuests]);

  // Reload guests when due amount filter changes
  useEffect(() => {
    loadAllGuests();
  }, [dueAmountFilter, loadAllGuests]);

  // Reload guests when includeCheckedOut filter changes
  useEffect(() => {
    loadAllGuests();
  }, [includeCheckedOut, loadAllGuests]);

  // Cancellation reasons
  const cancellationReasons = [
    { value: 'guest_request', label: 'Guest Request' },
    { value: 'medical_emergency', label: 'Medical Emergency' },
    { value: 'travel_issues', label: 'Travel Issues' },
    { value: 'hotel_fault', label: 'Hotel Fault/Issue' },
    { value: 'weather_conditions', label: 'Weather Conditions' },
    { value: 'force_majeure', label: 'Force Majeure' },
    { value: 'service_issue', label: 'Service Issue' },
    { value: 'room_problem', label: 'Room Problem' },
    { value: 'other', label: 'Other' }
  ];

  // New function: Check for admin updates and refresh data if needed

  // New function: Manual refresh for reception staff
  const handleManualRefresh = async () => {
    try {
      setIsCheckingUpdates(true);
      await loadAllGuests();
      await loadGuestStats();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error during manual refresh:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsCheckingUpdates(false);
    }
  };



  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      loadAllGuests();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${buildApiUrl('reception/guest_search_api.php')}?action=search&type=${searchType}&term=${encodeURIComponent(searchTerm)}&status=${statusFilter}&corporate=${corporateFilter}&include_checked_out=${includeCheckedOut}&include_future_bookings=true`
      );
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        // The API returns data directly as an array, not wrapped in results
        const results = data.data || [];
        if (results && Array.isArray(results)) {
          const keys = results.map((guest, index) => `${guest.booking_id}-${guest.guest_id}-${index}`);
          const uniqueKeys = new Set(keys);
          
          if (keys.length !== uniqueKeys.size) {
            console.warn('Duplicate keys detected in search results:', {
              totalResults: keys.length,
              uniqueKeys: uniqueKeys.size,
              duplicates: keys.filter((key, index) => keys.indexOf(key) !== index)
            });
          }
          
          setSearchResults(results);
          if (results.length > 0) {
            toast.success(`Found ${results.length} guest(s)`);
          } else {
            toast.info(`No guests found${searchType !== 'all' ? ` matching "${searchTerm}"` : ''}`);
          }
        } else {
          console.warn('API returned invalid data structure:', data);
          setSearchResults([]);
          toast.error('Invalid data format received');
        }
      } else {
        toast.error(data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply due amount filter to search results
  const getFilteredResults = () => {
    if (dueAmountFilter === 'all') {
      return searchResults;
    } else if (dueAmountFilter === 'with_due') {
      return searchResults.filter(guest => (guest.remaining_amount || 0) > 0);
    } else if (dueAmountFilter === 'fully_paid') {
      return searchResults.filter(guest => (guest.remaining_amount || 0) <= 0);
    }
    return searchResults;
  };

  // Get status display text and color
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'confirmed':
        return { text: 'Booked', color: 'bg-blue-100 text-blue-800', icon: FaBed };
      case 'checked_in':
        return { text: 'Checked In', color: 'bg-green-100 text-green-800', icon: FaSignInAlt };
      case 'checked_out':
        return { text: 'Checked Out', color: 'bg-gray-100 text-gray-800', icon: FaSignOutAlt };
      case 'cancelled':
        return { text: 'Cancelled', color: 'bg-red-100 text-red-800', icon: FaBan };
      default:
        return { text: status, color: 'bg-gray-100 text-gray-800', icon: FaBed };
    }
  };

  // Get action button for guest
  const getActionButton = (guest) => {
    const { booking_status } = guest;
    
    // Don't show action buttons for cancelled bookings
    if (booking_status === 'cancelled') {
      return (
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1">
          <FaBan className="w-3 h-3" />
          <span>Canceled</span>
        </span>
      );
    }
    
    if (booking_status === 'confirmed') {
      return (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCheckin(guest)}
            disabled={checkinLoading[guest.booking_id]}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
          >
            <FaSignInAlt className="w-3 h-3" />
            <span>{checkinLoading[guest.booking_id] ? 'Checking In...' : 'Check In'}</span>
          </button>
          
          {/* Edit Booking Button */}
          <button
            onClick={() => handleEdit(guest)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors"
          >
            <FaEye className="w-3 h-3" />
            <span>Edit</span>
          </button>
          
          {/* Cancel Booking Button */}
          <button
            onClick={() => handleCancellation(guest)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors"
          >
            <FaBan className="w-3 h-3" />
            <span>Cancel</span>
          </button>
        </div>
      );
    } else if (booking_status === 'checked_in') {
      return (
        <div className="flex items-center space-x-2">
          {/* Check Out Button - Disabled if there's a remaining amount */}
          {(() => {
            // Use our calculated frontend payment status
            const paymentStatus = guest.frontend_payment_status;
            const totalAmount = parseFloat(guest.total_amount) || 0;
            const paidAmount = parseFloat(guest.paid_amount) || 0;
            const remainingAmount = parseFloat(guest.remaining_amount) || 0;
            
            // Determine if checkout is allowed based on payment status
            const canCheckout = paymentStatus === 'fully_paid' || paymentStatus === 'free';
            const hasDueAmount = !canCheckout && (paymentStatus === 'partially_paid' || paymentStatus === 'unpaid');
            
            return (
              <>
                <button
                  onClick={() => handleCheckout(guest)}
                  disabled={checkoutLoading[guest.booking_id] || hasDueAmount}
                  className={`px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors ${
                    hasDueAmount
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  } ${checkoutLoading[guest.booking_id] ? 'opacity-50' : ''}`}
                  title={hasDueAmount ? `Cannot check out: Payment incomplete` : 'Check out guest'}
                >
                  <FaSignOutAlt className="w-3 h-3" />
                  <span>
                    {checkoutLoading[guest.booking_id] 
                      ? 'Checking Out...' 
                      : hasDueAmount 
                        ? 'Check Out (Payment Pending)' 
                        : 'Check Out'
                    }
                  </span>
                </button>
                
                {/* Due Amount Payment Button - Only show if there's a remaining amount */}
                {hasDueAmount && (
                  <button
                    onClick={() => handleDueAmountPayment(guest)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors"
                  >
                    <FaMoneyBillWave className="w-3 h-3" />
                    <span>Pay Due</span>
                  </button>
                )}
                
                {/* Day Extend Button - Only show for checked-in guests */}
                <button
                  onClick={() => handleDayExtend(guest)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors"
                  title="Extend Stay"
                >
                  <FaCalendarPlus className="w-3 h-3" />
                  <span>Day Extend</span>
                </button>
              </>
            );
          })()}
        </div>
      );
    } else if (booking_status === 'checked_out') {
      return (
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1">
          <FaSignOutAlt className="w-3 h-3" />
          <span>Checked Out</span>
        </span>
      );
    }
    
    return null;
  };

  const handleCheckin = async (guest) => {
    if (!guest.booking_id || !guest.room_number) {
      toast.error('Cannot check in: Missing booking or room information');
      return;
    }

    if (guest.booking_status === 'checked_in') {
      toast.error('Guest is already checked in');
      return;
    }

    // Set current time as default check-in time
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Convert current time to 12-hour format
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const hour12 = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
    const currentTime = `${hour12}:${currentMinute.toString().padStart(2, '0')}`;
    const currentAMPM = currentHour >= 12 ? 'PM' : 'AM';
    
    setGuestToCheckin({
      ...guest,
      // Use current time for check-in, keep original booking time for check-out
      check_in_time: currentTime,
      check_out_time: guest.check_out_time || '05:00',
      check_in_ampm: currentAMPM,
      check_out_ampm: guest.check_out_ampm || 'PM',
      check_in_date: currentDate,
      check_out_date: guest.check_out_date
    });
    setShowCheckinConfirm(true);
  };



  const confirmCheckin = async () => {
    if (!guestToCheckin) return;

    // Validate that both times, dates and AM/PM are entered
    if (!guestToCheckin.check_in_time || !guestToCheckin.check_out_time || 
        !guestToCheckin.check_in_ampm || !guestToCheckin.check_out_ampm ||
        !guestToCheckin.check_in_date || !guestToCheckin.check_out_date) {
      toast.error('Please enter check-in date, check-out date, times, and select AM/PM for both');
      return;
    }

    // Validate that check-out date is after or equal to check-in date
    const checkInDate = new Date(guestToCheckin.check_in_date);
    const checkOutDate = new Date(guestToCheckin.check_out_date);
    
    if (checkOutDate < checkInDate) {
      toast.error('Check-out date must be after or equal to check-in date');
      return;
    }

    // Convert to 24-hour format for validation and API
    const convertTo24Hour = (time, ampm) => {
      if (!time || !ampm) return null;
      
      try {
        const timeParts = time.split(':');
        // Handle both HH:MM and HH:MM:SS formats
        if (timeParts.length < 2 || timeParts.length > 3) return null;
        
        const [hours, minutes] = timeParts;
        let hour = parseInt(hours, 10);
        const min = parseInt(minutes, 10);
        
        // Validate hour and minute values
        if (isNaN(hour) || isNaN(min) || hour < 1 || hour > 12 || min < 0 || min > 59) {
          return null;
        }
        
        if (ampm === 'PM' && hour !== 12) {
          hour += 12;
        } else if (ampm === 'AM' && hour === 12) {
          hour = 0;
        }
        
        return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      } catch (error) {
        console.error('Error converting time in confirmCheckin:', error);
        return null;
      }
    };

    const checkInTime24 = convertTo24Hour(guestToCheckin.check_in_time, guestToCheckin.check_in_ampm);
    const checkOutTime24 = convertTo24Hour(guestToCheckin.check_out_time, guestToCheckin.check_out_ampm);

    // Check if time conversion was successful
    if (!checkInTime24 || !checkOutTime24) {
      toast.error('Invalid time format. Please enter valid times.');
      return;
    }

    // Validate that check-out datetime is after check-in datetime
    const checkInDateTime = new Date(`${guestToCheckin.check_in_date}T${checkInTime24}`);
    const checkOutDateTime = new Date(`${guestToCheckin.check_out_date}T${checkOutTime24}`);
    
    // Check if dates are valid
    if (isNaN(checkInDateTime.getTime()) || isNaN(checkOutDateTime.getTime())) {
      toast.error('Invalid date/time combination. Please check your inputs.');
      return;
    }
    
    if (checkOutDateTime <= checkInDateTime) {
      toast.error('Check-out date and time must be after check-in date and time');
      return;
    }

    try {
      setCheckinLoading(prev => ({ ...prev, [guestToCheckin.booking_id]: true }));
      
      const response = await fetch(`${buildApiUrl('reception/guest_search_api.php')}?action=checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
                        body: JSON.stringify({
                  booking_id: guestToCheckin.booking_id,
                  room_number: guestToCheckin.room_number,
                  check_in_time: guestToCheckin.check_in_time,
                  check_in_ampm: guestToCheckin.check_in_ampm,
                  check_out_time: guestToCheckin.check_out_time,
                  check_out_ampm: guestToCheckin.check_out_ampm,
                  check_in_date: guestToCheckin.check_in_date,
                  check_out_date: guestToCheckin.check_out_date
                })
      });

      const data = await response.json();
      console.log('Check-in response:', data);
      
      if (data.success) {
        toast.success(data.message);
        // Update the guest status in the results
                      setSearchResults(prev => 
                prev.map(g => 
                  g.booking_id === guestToCheckin.booking_id 
                    ? { 
                        ...g, 
                        booking_status: 'checked_in', 
                        check_in_time: guestToCheckin.check_in_time,
                        check_in_ampm: guestToCheckin.check_in_ampm,
                        check_out_time: guestToCheckin.check_out_time,
                        check_out_ampm: guestToCheckin.check_out_ampm,
                        check_in_date: guestToCheckin.check_in_date,
                        check_out_date: guestToCheckin.check_out_date
                      }
                    : g
                )
              );
        // Refresh stats
        loadGuestStats();
        // Close confirmation modal
        setShowCheckinConfirm(false);
        setGuestToCheckin(null);
      } else {
        toast.error(data.message || 'Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error('Check-in failed. Please try again.');
    } finally {
      setCheckinLoading(prev => ({ ...prev, [guestToCheckin.booking_id]: false }));
    }
  };

  const cancelCheckin = () => {
    setShowCheckinConfirm(false);
    setGuestToCheckin(null);
    // Reset time fields when canceling
    if (guestToCheckin) {
      setGuestToCheckin(prev => ({ 
        ...prev, 
        check_in_time: '', 
        check_out_time: '',
        check_in_ampm: 'AM',
        check_out_ampm: 'AM'
      }));
    }
  };

  const handleCheckout = async (guest) => {
    if (!guest.booking_id || !guest.room_number) {
      toast.error('Cannot check out: Missing booking or room information');
      return;
    }

    if (guest.booking_status === 'checked_out') {
      toast.error('Guest is already checked out');
      return;
    }

    if (guest.booking_status !== 'checked_in') {
      toast.error('Guest must be checked in before checking out');
      return;
    }

    // Check if there's a remaining amount
    if (guest.remaining_amount > 0) {
      toast.error(`Cannot check out: Due amount pending (${formatPrice(guest.remaining_amount)}). Please collect payment first.`);
      return;
    }

    // Set the guest to check out and show confirmation modal
    setGuestToCheckout(guest);
    setShowCheckoutConfirm(true);
  };

  const confirmCheckout = async () => {
    if (!guestToCheckout) return;

    try {
      setCheckoutLoading(prev => ({ ...prev, [guestToCheckout.booking_id]: true }));
      
      const response = await fetch(`${buildApiUrl('reception/guest_search_api.php')}?action=checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: guestToCheckout.booking_id,
          room_number: guestToCheckout.room_number
        })
      });

      const data = await response.json();
      console.log('Check-out response:', data);
      
      if (data.success) {
        toast.success(data.message);
        // Update the guest status in the results
        setSearchResults(prev => 
          prev.map(g => 
            g.booking_id === guestToCheckout.booking_id 
              ? { ...g, booking_status: 'checked_out' }
              : g
          )
        );
        // Refresh stats
        loadGuestStats();
        // Close confirmation modal
        setShowCheckoutConfirm(false);
        setGuestToCheckout(null);
      } else {
        toast.error(data.message || 'Check-out failed');
      }
    } catch (error) {
      console.error('Check-out error:', error);
      toast.error('Check-out failed. Please try again.');
    } finally {
      setCheckoutLoading(prev => ({ ...prev, [guestToCheckout.booking_id]: false }));
    }
  };

  const cancelCheckout = () => {
    setShowCheckoutConfirm(false);
    setGuestToCheckout(null);
  };

  const handleDueAmountPayment = (guest) => {
    setGuestForDuePayment(guest);
    // Calculate the correct remaining amount based on total and paid amounts
    const totalAmount = parseFloat(guest.total_amount) || 0;
    const paidAmount = parseFloat(guest.paid_amount) || 0;
    const actualRemainingAmount = Math.max(0, totalAmount - paidAmount);
    
    setDuePaymentForm({
      amount: '', // Always start with empty payment amount
      payment_method: 'cash',
      notes: '',
      adjusted_remaining: actualRemainingAmount
    });
    setShowDuePaymentModal(true);
  };

  // Day Extend functionality
  const handleDayExtend = (guest) => {
    if (!guest.booking_id || !guest.room_number) {
      toast.error('Cannot extend stay: Missing booking or room information');
      return;
    }

    if (guest.booking_status !== 'checked_in') {
      toast.error('Only checked-in guests can extend their stay');
      return;
    }

    // Calculate new checkout date based on current checkout date
    const currentCheckoutDate = new Date(guest.check_out_date);
    const newCheckoutDate = new Date(currentCheckoutDate);
    newCheckoutDate.setDate(newCheckoutDate.getDate() + 1);

    // Calculate suggested amount for 1 day extension
    const currentTotal = parseFloat(guest.total_amount) || 0;
    const currentDays = Math.ceil((new Date(guest.check_out_date) - new Date(guest.check_in_date)) / (1000 * 60 * 60 * 24));
    const dailyRate = currentDays > 0 ? currentTotal / currentDays : currentTotal;
    const suggestedAmount = dailyRate * 1;
    
    setGuestToExtend(guest);
    setExtendForm({
      days: 1,
      customDays: '',
      newCheckoutDate: newCheckoutDate.toISOString().split('T')[0],
      newCheckoutTime: '11:00',
      newCheckoutAmpm: 'AM',
      additionalAmount: suggestedAmount.toFixed(2)
    });
    setShowExtendModal(true);
  };

  const handleExtendFormChange = (field, value) => {
    if (field === 'days') {
      setExtendForm(prev => ({
        ...prev,
        days: value,
        customDays: ''
      }));
      
      // Calculate new checkout date and suggest amount
      if (guestToExtend) {
        const currentCheckoutDate = new Date(guestToExtend.check_out_date);
        const newCheckoutDate = new Date(currentCheckoutDate);
        newCheckoutDate.setDate(newCheckoutDate.getDate() + value);
        
        // Calculate suggested amount (assuming same daily rate)
        const currentTotal = parseFloat(guestToExtend.total_amount) || 0;
        const currentDays = Math.ceil((new Date(guestToExtend.check_out_date) - new Date(guestToExtend.check_in_date)) / (1000 * 60 * 60 * 24));
        const dailyRate = currentDays > 0 ? currentTotal / currentDays : currentTotal;
        const suggestedAmount = dailyRate * value;
        
        setExtendForm(prev => ({
          ...prev,
          newCheckoutDate: newCheckoutDate.toISOString().split('T')[0],
          additionalAmount: suggestedAmount.toFixed(2)
        }));
      }
    } else if (field === 'customDays') {
      const days = parseInt(value) || 0;
      setExtendForm(prev => ({
        ...prev,
        customDays: value,
        days: 0
      }));
      
      // Calculate new checkout date and suggest amount for custom days
      if (guestToExtend && days > 0) {
        const currentCheckoutDate = new Date(guestToExtend.check_out_date);
        const newCheckoutDate = new Date(currentCheckoutDate);
        newCheckoutDate.setDate(newCheckoutDate.getDate() + days);
        
        // Calculate suggested amount (assuming same daily rate)
        const currentTotal = parseFloat(guestToExtend.total_amount) || 0;
        const currentDays = Math.ceil((new Date(guestToExtend.check_out_date) - new Date(guestToExtend.check_in_date)) / (1000 * 60 * 60 * 24));
        const dailyRate = currentDays > 0 ? currentTotal / currentDays : currentTotal;
        const suggestedAmount = dailyRate * days;
        
        setExtendForm(prev => ({
          ...prev,
          newCheckoutDate: newCheckoutDate.toISOString().split('T')[0],
          additionalAmount: suggestedAmount.toFixed(2)
        }));
      }
    } else {
      setExtendForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const confirmExtend = async () => {
    if (!guestToExtend) return;

    const daysToExtend = extendForm.days || parseInt(extendForm.customDays) || 0;
    if (daysToExtend < 1 || daysToExtend > 30) {
      toast.error('Please select between 1 and 30 days to extend');
      return;
    }

    try {
      setExtendLoading(true);
      
      const response = await fetch(buildApiUrl('reception/extend_booking_api.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: guestToExtend.booking_id,
          room_number: guestToExtend.room_number,
          days_to_extend: daysToExtend,
          new_checkout_date: extendForm.newCheckoutDate,
          new_checkout_time: extendForm.newCheckoutTime,
          new_checkout_ampm: extendForm.newCheckoutAmpm,
          additional_amount: parseFloat(extendForm.additionalAmount) || 0
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        
        // Update the guest data in search results
        setSearchResults(prev => 
          prev.map(g => 
            g.booking_id === guestToExtend.booking_id 
              ? { 
                  ...g, 
                  check_out_date: data.data.booking.check_out_date,
                  check_out_time: data.data.booking.check_out_time,
                  check_out_ampm: data.data.booking.check_out_ampm,
                  total_amount: data.data.booking.total_amount
                }
              : g
          )
        );
        
        // Also update selected guest if it's the same one
        if (selectedGuest && selectedGuest.booking_id === guestToExtend.booking_id) {
          setSelectedGuest(prev => ({
            ...prev,
            check_out_date: data.data.booking.check_out_date,
            check_out_time: data.data.booking.check_out_time,
            check_out_ampm: data.data.booking.check_out_ampm,
            total_amount: data.data.booking.total_amount
          }));
        }
        
        // Refresh guest stats
        await loadGuestStats();
        
        // Close modal and reset form
        setShowExtendModal(false);
        setGuestToExtend(null);
        setExtendForm({
          days: 1,
          customDays: '',
          newCheckoutDate: '',
          newCheckoutTime: '11:00',
          newCheckoutAmpm: 'AM',
          additionalAmount: '0.00'
        });
      } else {
        toast.error(data.message || 'Failed to extend stay');
      }
    } catch (error) {
      console.error('Extend booking error:', error);
      toast.error('Failed to extend stay. Please try again.');
    } finally {
      setExtendLoading(false);
    }
  };

  const confirmDueAmountPayment = async () => {
    console.log('confirmDueAmountPayment called');
    console.log('guestForDuePayment:', guestForDuePayment);
    console.log('duePaymentForm:', duePaymentForm);
    
    // Make function globally accessible for debugging
    window.confirmDueAmountPayment = confirmDueAmountPayment;
    
    if (!guestForDuePayment) {
      console.error('No guest selected for payment');
      toast.error('No guest selected for payment');
      return;
    }

    // Validate form data
    if (!duePaymentForm.amount || duePaymentForm.amount < 0) {
      console.error('Invalid payment amount:', duePaymentForm.amount);
      toast.error('Please enter a valid payment amount');
      return;
    }
    
    // Check if payment amount exceeds the remaining amount
    const totalAmount = parseFloat(guestForDuePayment.total_amount) || 0;
    const paidAmount = parseFloat(guestForDuePayment.paid_amount) || 0;
    const correctRemainingAmount = Math.max(0, totalAmount - paidAmount);
    const maxAllowedAmount = duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount;
    if (duePaymentForm.amount > maxAllowedAmount) {
      console.error('Payment amount exceeds remaining amount:', duePaymentForm.amount, '>', maxAllowedAmount);
      toast.error(`Payment amount cannot exceed the remaining amount of ₹${formatPrice(maxAllowedAmount)}`);
      return;
    }

    if (!duePaymentForm.payment_method) {
      console.error('No payment method selected:', duePaymentForm.payment_method);
      toast.error('Please select a payment method');
      return;
    }

    // If payment method is Razorpay, open Razorpay modal instead of direct payment
    if (duePaymentForm.payment_method === 'razorpay') {
      setRazorpayPaymentData({
        amount: parseFloat(duePaymentForm.amount),
        bookingId: guestForDuePayment.booking_id,
        guestId: guestForDuePayment.guest_id,
        guestName: `${guestForDuePayment.first_name} ${guestForDuePayment.last_name}`,
        guestEmail: guestForDuePayment.email || '',
        guestPhone: guestForDuePayment.phone || '',
        description: `Due amount payment for booking #${guestForDuePayment.booking_reference}`,
        adjusted_remaining: duePaymentForm.adjusted_remaining !== undefined ? parseFloat(duePaymentForm.adjusted_remaining) : null
      });
      setShowRazorpayModal(true);
      setShowDuePaymentModal(false);
      return;
    }

    try {
      setDuePaymentLoading(true);
      console.log('Starting payment process...');
      
      const paymentData = {
        booking_id: guestForDuePayment.booking_id,
        amount: parseFloat(duePaymentForm.amount),
        payment_method: duePaymentForm.payment_method,
        notes: duePaymentForm.notes,
        adjusted_remaining: duePaymentForm.adjusted_remaining !== undefined ? parseFloat(duePaymentForm.adjusted_remaining) : null
      };
      
      console.log('Payment data:', paymentData);
      
      const response = await fetch(`${buildApiUrl('reception/simple_payment_api.php')}?action=pay_due_amount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      
      // Debug: Log the response data
      console.log('Payment API response:', data);
      console.log('Payment data being passed to handlePaymentSuccess:', data.data);
      
      if (data.success) {
        console.log('Payment successful!');
        toast.success(data.message);
        
        // Use the enhanced payment success handler
        handlePaymentSuccess(data.data, guestForDuePayment.booking_id);
        
        // Close modal and reset form immediately
        setShowDuePaymentModal(false);
        setGuestForDuePayment(null);
        setDuePaymentForm({ amount: '', payment_method: 'cash', notes: '', adjusted_remaining: '' });
        
        // Refresh guest data to show updated amounts
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('Payment failed:', data.message);
        toast.error(data.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Due amount payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setDuePaymentLoading(false);
    }
  };

  const cancelDueAmountPayment = () => {
    setShowDuePaymentModal(false);
    setGuestForDuePayment(null);
    setDuePaymentForm({ amount: '', payment_method: 'cash', notes: '', adjusted_remaining: '' });
  };

  const handleDuePaymentFormChange = (e) => {
    const { name, value } = e.target;
    setDuePaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Function to refresh guest data for a specific booking
  const refreshGuestData = async (bookingId) => {
    try {
      // Reload all guests to get fresh data
      await loadAllGuests();
      
      // Also refresh stats
      await loadGuestStats();
      
      console.log(`Guest data refreshed for booking ID: ${bookingId}`);
    } catch (error) {
      console.error('Error refreshing guest data:', error);
    }
  };

  // Enhanced payment success handler
  const handlePaymentSuccess = (paymentData, bookingId) => {
    // Add defensive programming to handle undefined paymentData
    if (!paymentData) {
      console.error('Payment data is undefined');
      toast.error('Payment data is missing. Please refresh the page.');
      return;
    }

    // Update the guest data in the search results
    setSearchResults(prev => 
      prev.map(g => 
        g.booking_id === bookingId 
          ? { 
              ...g, 
              paid_amount: paymentData.new_paid_amount || g.paid_amount,
              remaining_amount: paymentData.new_remaining_amount || g.remaining_amount,
              payment_status: paymentData.payment_status || g.payment_status
            }
          : g
      )
    );
    
    // Also update the selected guest if it's the same one
    if (selectedGuest && selectedGuest.booking_id === bookingId) {
      setSelectedGuest(prev => ({
        ...prev,
        paid_amount: paymentData.new_paid_amount || prev.paid_amount,
        remaining_amount: paymentData.new_remaining_amount || prev.remaining_amount,
        payment_status: paymentData.payment_status || prev.payment_status
      }));
    }
    
    // Refresh data to ensure consistency
    refreshGuestData(bookingId);
    
    // Show success message with remaining amount
    const remainingAmount = paymentData.new_remaining_amount || 0;
    if (remainingAmount > 0) {
      toast.success(`Payment successful! Remaining amount: ₹${remainingAmount}`);
    } else {
      toast.success('Payment completed! Guest is now fully paid.');
    }
  };

  // Handle Razorpay payment success
  const handleRazorpayPaymentSuccess = async (paymentData) => {
    try {
      // Process the successful payment through our backend
      const response = await fetch(`${'/simple_payment_api.php'}?action=pay_due_amount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: razorpayPaymentData.bookingId,
          amount: razorpayPaymentData.amount,
          payment_method: 'razorpay',
          notes: `Razorpay payment: ${paymentData.razorpay_payment_id}`,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_signature: paymentData.razorpay_signature,
          adjusted_remaining: razorpayPaymentData.adjusted_remaining
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        
        // Use the enhanced payment success handler
        handlePaymentSuccess(data.data, razorpayPaymentData.bookingId);
        
        // Close Razorpay modal
        setShowRazorpayModal(false);
        setRazorpayPaymentData(null);
      } else {
        toast.error(data.message || 'Failed to process payment');
      }
    } catch (error) {
      console.error('Razorpay payment processing error:', error);
      toast.error('Failed to process Razorpay payment. Please contact support.');
    }
  };

  // Handle Razorpay payment failure
  const handleRazorpayPaymentFailure = (error) => {
    console.error('Razorpay payment failed:', error);
    toast.error('Payment failed. Please try again or choose a different payment method.');
    
    // Close Razorpay modal and reopen due payment modal
    setShowRazorpayModal(false);
    setRazorpayPaymentData(null);
    setShowDuePaymentModal(true);
  };

  // Close Razorpay modal
  const closeRazorpayModal = () => {
    setShowRazorpayModal(false);
    setRazorpayPaymentData(null);
    setShowDuePaymentModal(true);
  };

  // Handle edit booking request
  const handleEdit = (guest) => {
    setGuestToEdit(guest);
    setShowEditModal(true);
  };

  // Handle cancellation request
  const handleCancellation = (guest) => {
    console.log('handleCancellation called with guest:', guest);
    
    if (guest.booking_status !== 'confirmed') {
      toast.error('Only confirmed bookings can be cancelled');
      return;
    }
    
    console.log('Setting guest to cancel:', guest);
    setGuestToCancel(guest);
    setShowCancellationModal(true);
  };

  const handleEditSuccess = (updatedBooking) => {
    toast.success('Booking updated successfully!');
    setShowEditModal(false);
    setGuestToEdit(null);
    // Refresh the guest list
    loadAllGuests();
    loadGuestStats();
  };

  const handleCancellationSuccess = (cancellationData) => {
    console.log('Cancellation success with data:', cancellationData);
    const successMessage = cancellationData.cancellation_fee > 0 
      ? `Booking cancelled successfully! Cancellation Fee: ₹${cancellationData.cancellation_fee}, Refund: ₹${cancellationData.refund_amount}`
      : `Booking cancelled successfully! Full refund: ₹${cancellationData.refund_amount}`;
    
    toast.success(successMessage);
    setShowCancellationModal(false);
    setGuestToCancel(null);
    
    // Refresh the guest list to show updated status
    loadAllGuests();
    loadGuestStats();
    
    // Show additional info about room availability
    if (cancellationData.room_number) {
      toast.info(`Room ${cancellationData.room_number} is now available for new bookings`);
    }
  };

  // Note: Cancellation is now handled by the CancelBooking component
  // The old cancellation form has been removed in favor of the more comprehensive CancelBooking component

  const viewGuestDetails = (guest) => {
    setSelectedGuest(guest);
    setShowDetails(true);
  };

  const viewGuestFiles = (guest) => {
    setSelectedGuest(guest);
    setShowFileViewer(true);
  };

  const closeGuestDetails = () => {
    setShowDetails(false);
    setSelectedGuest(null);
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
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Input:', dateString);
      return 'N/A';
    }
  };

  const formatPrice = (amount) => {
    // Handle invalid amounts
    if (amount === null || amount === undefined || isNaN(amount) || amount < 0) {
      amount = 0;
    }
    
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format time in 12-hour format with AM/PM
  const formatTime12Hour = (timeString) => {
    if (!timeString) return '';
    
    try {
      // Parse the time string (HH:MM:SS or HH:MM format)
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      
      // Convert to 12-hour format
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      
      return `${displayHour}:${displayMinute} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return timeString; // Return original if parsing fails
    }
  };

  // Helper function to convert 12-hour time with AM/PM to 24-hour format
  const convertTo24Hour = (time, ampm) => {
    if (!time || !ampm) return null;
    
    try {
      const timeParts = time.split(':');
      // Handle both HH:MM and HH:MM:SS formats
      if (timeParts.length < 2 || timeParts.length > 3) return null;
      
      const [hours, minutes] = timeParts;
      let hour = parseInt(hours, 10);
      const min = parseInt(minutes, 10);
      
      // Validate hour and minute values
      if (isNaN(hour) || isNaN(min) || hour < 1 || hour > 12 || min < 0 || min > 59) {
        return null;
      }
      
      if (ampm === 'PM' && hour !== 12) {
        hour += 12;
      } else if (ampm === 'AM' && hour === 12) {
        hour = 0;
      }
      
      return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error converting time:', error);
      return null;
    }
  };

  return (
    <div className="guest-search-container">
      {/* Header - Minimized */}
      <div className="search-header-minimized">
        <div className="search-title-minimized">
          <FaSearch className="search-icon-minimized" />
          <span>Guest Search & Management</span>
        </div>
        <p className="search-subtitle-minimized">
          Search and manage guest information across all bookings - All guests are always saved and accessible
        </p>
      </div>

      {/* Statistics Cards - Compact */}
      <div className="stats-grid-compact">
          <div className="stat-card-compact">
            <div className="stat-icon-compact bg-blue-100">
              <FaSearch className="text-blue-600" />
            </div>
            <div className="stat-value-compact">{stats?.total_guests || 0}</div>
            <div className="stat-label-compact">Total Guests</div>
          </div>
          <div className="stat-card-compact">
            <div className="stat-icon-compact bg-green-100">
              <FaBed className="text-green-600" />
            </div>
            <div className="stat-value-compact">{stats?.confirmed_bookings || 0}</div>
            <div className="stat-label-compact">Booked</div>
          </div>
          <div className="stat-card-compact">
            <div className="stat-icon-compact bg-green-100">
              <FaSignInAlt className="text-green-600" />
            </div>
            <div className="stat-value-compact">{stats?.checked_in_guests || 0}</div>
            <div className="stat-label-compact">Checked In</div>
          </div>
          <div className="stat-card-compact">
            <div className="stat-icon-compact bg-gray-100">
              <FaSignOutAlt className="text-gray-600" />
            </div>
            <div className="stat-value-compact">{stats?.checked_out_guests || 0}</div>
            <div className="stat-label-compact">Checked Out</div>
          </div>
          <div className="stat-card-compact">
            <div className="stat-icon-compact bg-yellow-100">
              <FaMoneyBillWave className="text-yellow-600" />
            </div>
            <div className="stat-value-compact">
              {(() => {
                if (!searchResults || searchResults.length === 0) {
                  return formatPrice(0);
                }
                const totalDue = searchResults.reduce((total, guest) => {
                  // Exclude owner reference bookings from due amount calculation
                  if (guest.owner_reference && !(guest.payment_method || guest.payment_type || guest.booking_payment_type)) {
                    return total; // No due amount for owner reference bookings
                  }
                  const remainingAmount = parseFloat(guest.remaining_amount) || 0;
                  return total + remainingAmount;
                }, 0);
                return formatPrice(totalDue || 0);
              })()}
            </div>
            <div className="stat-label-compact">Total Due Amount</div>
          </div>
          
          <div className="stat-card-compact">
            <div className="stat-icon-compact bg-purple-100">
              <FaUser className="text-purple-600" />
            </div>
            <div className="stat-value-compact">
              {searchResults.filter(guest => 
                guest.owner_reference && !(guest.payment_method || guest.payment_type || guest.booking_payment_type)
              ).length}
            </div>
            <div className="stat-label-compact">Owner Reference Bookings</div>
          </div>
        </div>

      {/* Search Form - Compact */}
      <div className="search-form-container-compact">
        <form onSubmit={handleSearch} className="search-form-compact">
          <div className="search-input-compact">
            <FaSearch className="search-icon-compact" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search guests by name, phone, email, room number, or booking reference..."
            />
          </div>
          
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="search-type-select-compact"
          >
            <option value="all">All Fields</option>
            <option value="name">Name</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="room">Room Number</option>
            <option value="booking_reference">Booking Reference</option>
          </select>
          
          <button
            type="submit"
            onClick={handleSearch}
            className="search-button-compact"
          >
            Search
          </button>
          
          <div className="action-buttons-compact">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="filter-button-compact"
            >
              <FaFilter />
              Advanced Filters
            </button>
            <button
              type="button"
              onClick={loadAllGuests}
              className="refresh-button-compact"
            >
              <FaSync />
              Refresh
            </button>
          </div>
        </form>
        
        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status Filter</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Booked</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Corporate Filter</label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={corporateFilter === 'corporate'}
                      onChange={(e) => setCorporateFilter(e.target.checked ? 'corporate' : 'all')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">Corporate Only</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Due Amount</label>
                <select
                  value={dueAmountFilter}
                  onChange={(e) => setDueAmountFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="with_due">With Due Amount</option>
                  <option value="without_due">Without Due Amount</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Include Checked Out</label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={includeCheckedOut}
                      onChange={(e) => setIncludeCheckedOut(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-600">Show Checked Out</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Search Results */}
      <div className="search-results-container">
        <div className="results-header">
          <h3 className="results-title">
            Search Results ({getFilteredResults().length})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading guests...</p>
          </div>
        ) : getFilteredResults().length > 0 ? (
          <div className="space-y-4">
            {getFilteredResults().map((guest, index) => {
              const statusDisplay = getStatusDisplay(guest.booking_status);
              const StatusIcon = statusDisplay.icon;
              
              return (
                <div key={`${guest.booking_id}-${guest.guest_id}-${index}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* Show cancellation status prominently for cancelled bookings */}
                  {guest.booking_status === 'cancelled' && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4">
                      <div className="flex items-center">
                        <FaBan className="text-red-400 mr-2" />
                        <div className="text-sm">
                          <p className="font-medium text-red-800">Booking Cancelled</p>
                          <p className="text-red-600">Room {guest.room_number} is now available for new bookings</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          {guest.full_name || `${guest.first_name} ${guest.last_name}`.trim()}
                        </h4>
                        {/* Due Amount Badge - Only show if amount > ₹1 */}
                        {guest.remaining_amount > 1 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <FaMoneyBillWave className="w-3 h-3 mr-1" />
                            Due: {formatPrice(guest.remaining_amount)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Booking Ref: {guest.booking_reference}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusDisplay.text}
                      </span>
                      <button
                        onClick={() => viewGuestDetails(guest)}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm hover:bg-blue-200 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => viewGuestFiles(guest)}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-sm hover:bg-green-200 transition-colors"
                      >
                        📄 View Files
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Contact Information</h5>
                      <p className="text-sm text-gray-600">👤 {guest.full_name || `${guest.first_name} ${guest.last_name}`.trim()}</p>
                      <p className="text-sm text-gray-600">📱 {guest.phone}</p>
                      <p className="text-sm text-gray-600">📧 {guest.email || 'N/A'}</p>
                      <p className="text-sm text-gray-600">
                        🏢 Source: <span className={`font-medium ${guest.booking_source === 'corporate' ? 'text-blue-600' : 'text-gray-600'}`}>
                          {(() => {
                            const sourceMap = {
                              'corporate': '🏢 Corporate',
                              'MMT': '🌐 MakeMyTrip',
                              'Agoda': '🌐 Agoda',
                              'Travel Plus': '🌐 Travel Plus',
                              'Phone Call Booking': '📞 Phone Call Booking',
                              'walk_in': '🚶 Walk In'
                            };
                            return sourceMap[guest.booking_source] || guest.booking_source || 'N/A';
                          })()}
                        </span>
                      </p>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Room Details</h5>
                      <p className="text-sm text-gray-600">🚪 Room {guest.room_number}</p>
                      <p className="text-sm text-gray-600">🏠 {guest.room_type_name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">🍽️ Plan: {(() => {
                        const planType = guest.plan_type;
                        if (planType === 'EP') return 'Room Only';
                        if (planType === 'CP') return 'With Breakfast';
                        if (planType) return planType;
                        return 'Room Only';
                      })()}</p>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Stay Details</h5>
                      <p className="text-sm text-gray-600">📅 Check-in: {formatDate(guest.check_in_date)}</p>
                      {guest.check_in_time && (
                        <p className="text-sm text-gray-600">🕐 Check-in Time: {guest.check_in_time} {guest.check_in_ampm || 'AM'}</p>
                      )}
                      <p className="text-sm text-gray-600">📅 Check-out: {formatDate(guest.check_out_date)}</p>
                      {guest.check_out_time && (
                        <p className="text-sm text-gray-600">🕐 Check-out Time: {guest.check_out_time} {guest.check_out_ampm || 'AM'}</p>
                      )}
                      {guest.check_in_time && guest.check_out_time && (
                        <p className="text-sm text-gray-600">⏱️ Total Hours: {calculateTotalHours(
                          guest.check_in_time, 
                          guest.check_in_ampm || 'AM', 
                          guest.check_out_time, 
                          guest.check_out_ampm || 'AM',
                          guest.check_in_date,
                          guest.check_out_date
                        )}</p>
                      )}
                      <p className="text-sm text-gray-600">👥 {guest.total_guests || 1} guests ({guest.adults || 1} adults, {guest.children || 0} children)</p>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Financial Details</h5>
                      
                      {/* Owner Reference Status */}
                      {(guest.owner_reference || guest.payment_status === 'referred_by_owner') ? (
                        <div>
                          <p className="text-sm text-green-600 font-medium">
                            🏨 Reference by Owner of the Hotel
                          </p>
                          <p className="text-sm text-gray-500">
                            No payment required - Free booking
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600">💰 Total: {formatPrice(guest.total_amount)}</p>
                          <p className="text-sm text-gray-600">💳 Paid: {formatPrice(guest.paid_amount || 0)}</p>
                          
                          {/* Complete Payment Status Logic - Overrides all backend calculations */}
                          {(() => {
                            const totalAmount = parseFloat(guest.total_amount) || 0;
                            const paidAmount = parseFloat(guest.paid_amount) || 0;
                            const remainingAmount = parseFloat(guest.remaining_amount) || 0;
                            
                            // Calculate actual payment percentage
                            const paymentPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
                            
                            // Determine payment status based on actual amounts (ignore backend fields)
                            let paymentStatus, statusColor, statusIcon, statusText;
                            
                            if (totalAmount === 0) {
                              // Free booking (owner reference or zero amount)
                              paymentStatus = 'free';
                              statusColor = 'text-green-600';
                              statusIcon = '🏨';
                              statusText = 'Free Booking';
                            } else if ((paidAmount >= totalAmount && remainingAmount <= 0) || 
                                       (paidAmount >= totalAmount - 1 && remainingAmount <= 1)) {
                              // Fully paid (including overpayment) or small discrepancy (≤₹1)
                              paymentStatus = 'fully_paid';
                              statusColor = 'text-green-600';
                              statusIcon = '✅';
                              statusText = 'Fully Paid';
                            } else if (paidAmount > 0 && paidAmount < totalAmount) {
                              // Partially paid
                              paymentStatus = 'partially_paid';
                              statusColor = 'text-orange-600';
                              statusIcon = '⚠️';
                              statusText = `Partially Paid (${Math.round(paymentPercentage)}%)`;
                            } else if (paidAmount <= 0) {
                              // No payment made
                              paymentStatus = 'unpaid';
                              statusColor = 'text-red-600';
                              statusIcon = '❌';
                              statusText = 'Payment Pending';
                            } else {
                              // Edge case - fallback
                              paymentStatus = 'unknown';
                              statusColor = 'text-gray-600';
                              statusIcon = '❓';
                              statusText = 'Payment Status Unknown';
                            }
                            
                            // Store payment status in guest object for use in other components
                            guest.frontend_payment_status = paymentStatus;
                            guest.frontend_payment_percentage = paymentPercentage;
                            
                            return (
                              <p className={`text-sm font-medium ${statusColor}`}>
                                {statusIcon} {statusText}
                              </p>
                            );
                          })()}
                          
                          {/* Show remaining amount only if not fully paid and amount > ₹1 */}
                          {guest.remaining_amount > 1 && (
                            <p className="text-sm text-red-600 font-medium">
                              ⚠️ Due: {formatPrice(guest.remaining_amount)}
                            </p>
                          )}
                          
                          {/* Show payment progress bar */}
                          {guest.total_amount > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Payment Progress</span>
                                <span>{Math.round(((guest.paid_amount || 0) / guest.total_amount) * 100)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(((guest.paid_amount || 0) / guest.total_amount) * 100, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {/* Payment Method Display */}
                          {(guest.payment_method || guest.payment_type) && (
                            <p className="text-sm text-blue-600 font-medium">
                              💳 Payment Type: {(guest.payment_method || guest.payment_type).replace('_', ' ').toUpperCase()}
                            </p>
                          )}
                          
                          {/* Show payment method from original booking if no payment method set */}
                          {!guest.payment_method && !guest.payment_type && guest.booking_payment_type && (
                            <p className="text-sm text-blue-600 font-medium">
                              💳 Payment Type: {guest.booking_payment_type.replace('_', ' ').toUpperCase()}
                            </p>
                          )}
                          
                          {/* Payment ID Information */}
                          {(guest.payment_method || guest.payment_type || guest.booking_payment_type) && (
                            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              {guest.razorpay_payment_id && (
                                <p className="text-sm text-blue-700">
                                  🆔 Razorpay ID: {guest.razorpay_payment_id}
                                </p>
                              )}
                              {guest.payment_id && !guest.razorpay_payment_id && (
                                <p className="text-sm text-blue-700">
                                  🆔 Payment ID: {guest.payment_id}
                                </p>
                              )}
                              {guest.transaction_id && (
                                <p className="text-sm text-blue-700">
                                  🔢 Transaction ID: {guest.transaction_id}
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}
                      
                      <p className="text-sm text-gray-600">📊 Status: {guest.booking_status}</p>
                    </div>
                  </div>
                  
                  {/* Due Amount Warning Message - Uses frontend payment status */}
                  {(() => {
                    // Use our calculated frontend payment status
                    const paymentStatus = guest.frontend_payment_status;
                    const totalAmount = parseFloat(guest.total_amount) || 0;
                    const paidAmount = parseFloat(guest.paid_amount) || 0;
                    const remainingAmount = parseFloat(guest.remaining_amount) || 0;
                    const isOwnerReference = guest.owner_reference || guest.payment_status === 'referred_by_owner';
                    
                    // Show appropriate message based on payment status
                    if (paymentStatus === 'fully_paid' && !isOwnerReference) {
                      // Success message for fully paid guests
                      return (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center">
                            <FaMoneyBillWave className="text-green-500 mr-2" />
                            <span className="text-green-800 font-medium">
                              ✅ Payment Complete
                            </span>
                          </div>
                          <p className="text-green-700 text-sm mt-1">
                            All payments have been collected. Guest can be checked out.
                          </p>
                        </div>
                      );
                    } else if (paymentStatus === 'partially_paid' && !isOwnerReference && remainingAmount > 1) {
                      // Warning for partially paid guests (only if remaining amount > ₹1)
                      return (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center">
                            <FaMoneyBillWave className="text-red-500 mr-2" />
                            <span className="text-red-800 font-medium">
                              ⚠️ Due Amount Pending: {formatPrice(remainingAmount)}
                            </span>
                          </div>
                          <p className="text-red-700 text-sm mt-1">
                            This guest cannot be checked out until the remaining amount is collected. 
                            Please use the "Pay Due" button to collect payment.
                          </p>
                        </div>
                      );
                    } else if (paymentStatus === 'unpaid' && !isOwnerReference) {
                      // Warning for unpaid guests
                      return (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center">
                            <FaMoneyBillWave className="text-red-500 mr-2" />
                            <span className="text-red-800 font-medium">
                              ⚠️ Full Payment Required: {formatPrice(totalAmount)}
                            </span>
                          </div>
                          <p className="text-red-700 text-sm mt-1">
                            This guest cannot be checked out until the full payment is collected. 
                            Please collect payment before proceeding.
                          </p>
                        </div>
                      );
                    } else if (paymentStatus === 'free') {
                      // Info message for free bookings
                      return (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center">
                            <FaMoneyBillWave className="text-blue-500 mr-2" />
                            <span className="text-blue-800 font-medium">
                              🏨 Free Booking
                            </span>
                          </div>
                          <p className="text-blue-700 text-sm mt-1">
                            This is a free booking (owner reference or zero amount). No payment required.
                          </p>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      <span>Created: {formatDate(guest.created_at || guest.booking_created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-2">

                      {getActionButton(guest)}
                    </div>
                  </div>
                  

                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Guests Found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `No guests found matching "${searchTerm}"`
                : 'No guests available. Try adjusting your search criteria or load all guests.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Check-in Confirmation Modal */}
      {showCheckinConfirm && guestToCheckin && (
        <div className="checkin-modal-overlay">
          <div className="checkin-modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Check-in</h3>
              <button onClick={cancelCheckin} className="modal-close">
                <FaTimesCircle />
              </button>
            </div>
            <div className="modal-body p-4">
              {/* Guest Information Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg mb-4 border border-blue-200">
                <div className="flex items-center space-x-2">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center">
                    <span className="font-semibold text-sm">{guestToCheckin.first_name?.[0]}{guestToCheckin.last_name?.[0]}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      Check-in: {guestToCheckin.first_name} {guestToCheckin.last_name}
                    </h3>
                    <p className="text-blue-600 font-medium text-sm">Room {guestToCheckin.room_number}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-1">
                  This will update the booking status to "Checked In" and mark the room as occupied.
                </p>
              </div>
              
              {/* Check-in & Check-out Form */}
              <div className="space-y-3">
                {/* Dates Section */}
                <div className="bg-gray-50 p-2 rounded border">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center">
                    📅 Booking Dates
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="check_in_date" className="block text-xs font-medium text-gray-600 mb-1">
                        CHECK-IN DATE *
                      </label>
                      <input
                        type="date"
                        id="check_in_date"
                        name="check_in_date"
                        value={guestToCheckin.check_in_date || ''}
                        onChange={(e) => setGuestToCheckin(prev => ({ ...prev, check_in_date: e.target.value }))}
                        required
                        className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="check_out_date" className="block text-xs font-medium text-gray-600 mb-1">
                        CHECK-OUT DATE *
                      </label>
                      <input
                        type="date"
                        id="check_out_date"
                        name="check_out_date"
                        value={guestToCheckin.check_out_date || ''}
                        onChange={(e) => setGuestToCheckin(prev => ({ ...prev, check_out_date: e.target.value }))}
                        required
                        min={guestToCheckin.check_in_date || ''}
                        className={`w-full px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                          guestToCheckin.check_in_date && guestToCheckin.check_out_date && 
                          new Date(guestToCheckin.check_out_date) >= new Date(guestToCheckin.check_in_date)
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Times Section */}
                <div className="bg-gray-50 p-2 rounded border">
                  <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center">
                    ⏰ Check-in & Check-out Times
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="check_in_time" className="block text-xs font-medium text-gray-600 mb-1">
                        ACTUAL CHECK-IN TIME *
                      </label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          id="check_in_time"
                          name="check_in_time"
                          placeholder="--:--"
                          value={guestToCheckin.check_in_time || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow only numbers and colon, format as HH:MM
                            const formatted = value.replace(/[^\d:]/g, '').replace(/^(\d{2})(\d)/, '$1:$2');
                            if (formatted.length <= 5) {
                              setGuestToCheckin(prev => ({ ...prev, check_in_time: formatted }));
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            // Validate and format time input
                            if (value && value.match(/^\d{1,2}:\d{2}$/)) {
                              const [hours, minutes] = value.split(':');
                              const h = parseInt(hours, 10);
                              const m = parseInt(minutes, 10);
                              if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
                                const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                setGuestToCheckin(prev => ({ ...prev, check_in_time: formattedTime }));
                              }
                            }
                          }}
                          required
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <select
                          value={guestToCheckin.check_in_ampm || 'AM'}
                          onChange={(e) => setGuestToCheckin(prev => ({ ...prev, check_in_ampm: e.target.value }))}
                          className="w-12 px-1 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="check_out_time" className="block text-xs font-medium text-gray-600 mb-1">
                        EXPECTED CHECK-OUT TIME *
                      </label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          id="check_out_time"
                          name="check_out_time"
                          placeholder="--:--"
                          value={guestToCheckin.check_out_time || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow only numbers and colon, format as HH:MM
                            const formatted = value.replace(/[^\d:]/g, '').replace(/^(\d{2})(\d)/, '$1:$2');
                            if (formatted.length <= 5) {
                              setGuestToCheckin(prev => ({ ...prev, check_out_time: formatted }));
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            // Validate and format time input
                            if (value && value.match(/^\d{1,2}:\d{2}$/)) {
                              const [hours, minutes] = value.split(':');
                              const h = parseInt(hours, 10);
                              const m = parseInt(minutes, 10);
                              if (h >= 1 && h <= 12 && m >= 0 && m <= 59) {
                                const formattedTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                                setGuestToCheckin(prev => ({ ...prev, check_out_time: formattedTime }));
                              }
                            }
                          }}
                          required
                          className={`flex-1 px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                            guestToCheckin.check_in_time && guestToCheckin.check_out_time && 
                            guestToCheckin.check_in_ampm && guestToCheckin.check_out_ampm &&
                            guestToCheckin.check_in_date && guestToCheckin.check_out_date &&
                            (() => {
                              const checkInTime24 = convertTo24Hour(guestToCheckin.check_in_time, guestToCheckin.check_in_ampm);
                              const checkOutTime24 = convertTo24Hour(guestToCheckin.check_out_time, guestToCheckin.check_out_ampm);
                              const checkInDateTime = new Date(`${guestToCheckin.check_in_date}T${checkInTime24}`);
                              const checkOutDateTime = new Date(`${guestToCheckin.check_out_date}T${checkOutTime24}`);
                              return checkOutDateTime > checkInDateTime;
                            })()
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-300'
                          }`}
                        />
                        <select
                          value={guestToCheckin.check_out_ampm || 'AM'}
                          onChange={(e) => setGuestToCheckin(prev => ({ ...prev, check_out_ampm: e.target.value }))}
                          className="w-12 px-1 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Date & Time Summary */}
              {guestToCheckin.check_in_time && guestToCheckin.check_out_time && guestToCheckin.check_in_date && guestToCheckin.check_out_date && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <div className="text-blue-800 font-medium mb-1">Summary</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Check-in:</span>
                      <span className="text-blue-800">
                        {new Date(guestToCheckin.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {guestToCheckin.check_in_time} {guestToCheckin.check_in_ampm}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-600">Check-out:</span>
                      <span className="text-blue-800">
                        {new Date(guestToCheckin.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {guestToCheckin.check_out_time} {guestToCheckin.check_out_ampm}
                      </span>
                    </div>
                    {(() => {
                      const checkInDate = new Date(guestToCheckin.check_in_date);
                      const checkOutDate = new Date(guestToCheckin.check_out_date);
                      const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
                      return daysDiff > 0 && (
                        <div className="text-center text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          {daysDiff === 1 ? '1 night' : `${daysDiff} nights`}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer bg-gray-50 px-4 py-3 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={cancelCheckin} 
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmCheckin} 
                  disabled={!guestToCheckin.check_in_time || !guestToCheckin.check_out_time || 
                            !guestToCheckin.check_in_ampm || !guestToCheckin.check_out_ampm ||
                            !guestToCheckin.check_in_date || !guestToCheckin.check_out_date}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded hover:from-blue-700 hover:to-blue-800 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  ✓ Confirm Check-in
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Confirmation Modal */}
      {showCheckoutConfirm && guestToCheckout && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Check-out</h3>
              <button onClick={cancelCheckout} className="modal-close">
                <FaTimesCircle />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to check out <strong>{guestToCheckout.first_name} {guestToCheckout.last_name}</strong> from Room <strong>{guestToCheckout.room_number}</strong>?
              </p>
            </div>
            <div className="modal-footer bg-gray-50 px-4 py-3 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={cancelCheckout} 
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-gray-500 text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmCheckout} 
                  className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded hover:from-red-700 hover:to-red-800 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                >
                  ✓ Confirm Check-out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-out Confirmation Modal */}
      {showCheckoutConfirm && guestToCheckout && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Confirm Check-out</h3>
              <button onClick={cancelCheckout} className="modal-close">
                <FaTimesCircle />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to check out <strong>{guestToCheckout.first_name} {guestToCheckout.last_name}</strong> from Room <strong>{guestToCheckout.room_number}</strong>?
              </p>
              
              {/* Due Amount Warning - Uses frontend payment status */}
              {(() => {
                // Use our calculated frontend payment status
                const paymentStatus = guestToCheckout.frontend_payment_status;
                const totalAmount = parseFloat(guestToCheckout.total_amount) || 0;
                const paidAmount = parseFloat(guestToCheckout.paid_amount) || 0;
                const remainingAmount = parseFloat(guestToCheckout.remaining_amount) || 0;
                
                if (paymentStatus === 'fully_paid') {
                  return (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <FaMoneyBillWave className="text-green-500 mr-2" />
                        <span className="text-green-800 font-medium">
                          ✅ Payment Complete
                        </span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        All payments have been collected. Guest can be checked out.
                      </p>
                    </div>
                  );
                } else if (paymentStatus === 'partially_paid') {
                  return (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <FaMoneyBillWave className="text-red-500 mr-2" />
                        <span className="text-red-800 font-medium">
                          Due Amount Pending: {formatPrice(remainingAmount)}
                        </span>
                      </div>
                      <p className="text-red-700 text-sm mt-1">
                        Please collect the remaining payment before checking out the guest.
                      </p>
                    </div>
                  );
                } else if (paymentStatus === 'unpaid') {
                  return (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <FaMoneyBillWave className="text-red-500 mr-2" />
                        <span className="text-red-800 font-medium">
                          Full Payment Required: {formatPrice(totalAmount)}
                        </span>
                      </div>
                      <p className="text-red-700 text-sm mt-1">
                        Please collect the full payment before checking out the guest.
                      </p>
                    </div>
                  );
                } else if (paymentStatus === 'free') {
                  return (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <FaMoneyBillWave className="text-blue-500 mr-2" />
                        <span className="text-blue-800 font-medium">
                          🏨 Free Booking
                        </span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        This is a free booking. No payment required.
                      </p>
                    </div>
                  );
                }
                
                return null;
              })()}
              
              <p className="modal-note">
                This will update the booking status to "Checked Out" and mark the room as available.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={cancelCheckout} className="modal-button secondary">
                Cancel
              </button>
              
              {/* Show Pay Due button if there's a remaining amount */}
              {(() => {
                // Use our calculated frontend payment status
                const paymentStatus = guestToCheckout.frontend_payment_status;
                const canCheckout = paymentStatus === 'fully_paid' || paymentStatus === 'free';
                const hasDueAmount = !canCheckout && (paymentStatus === 'partially_paid' || paymentStatus === 'unpaid');
                
                if (hasDueAmount) {
                  return (
                    <button 
                      onClick={() => {
                        setShowCheckoutConfirm(false);
                        handleDueAmountPayment(guestToCheckout);
                      }} 
                      className="modal-button primary bg-blue-600 hover:bg-blue-700"
                    >
                      <FaMoneyBillWave className="mr-2" />
                      Pay Due Amount First
                    </button>
                  );
                } else {
                  return (
                    <button onClick={confirmCheckout} className="modal-button primary">
                      Confirm Check-out
                    </button>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Due Amount Payment Modal */}
      {showDuePaymentModal && guestForDuePayment && (() => {
        // Calculate the correct remaining amount based on total and paid amounts
        const totalAmount = parseFloat(guestForDuePayment.total_amount) || 0;
        const paidAmount = parseFloat(guestForDuePayment.paid_amount) || 0;
        const correctRemainingAmount = Math.max(0, totalAmount - paidAmount);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-blue-600 text-white p-6 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FaMoneyBillWave className="text-2xl" />
                    <div>
                      <h2 className="text-xl font-semibold">Pay Due Amount</h2>
                      <p className="text-blue-100 text-sm">Collect remaining payment from guest</p>
                    </div>
                  </div>
                  <button
                    onClick={cancelDueAmountPayment}
                    className="text-blue-100 hover:text-white transition-colors"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Guest: <strong>{guestForDuePayment.first_name} {guestForDuePayment.last_name}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Room: <strong>{guestForDuePayment.room_number}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Total Amount: <strong>{formatPrice(guestForDuePayment.total_amount)}</strong>
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    Paid Amount: <strong>{formatPrice(guestForDuePayment.paid_amount || 0)}</strong>
                  </p>
                  <p className="text-sm text-red-600 font-medium mb-4">
                    Due Amount: <strong>{formatPrice(correctRemainingAmount)}</strong>
                  </p>
                
                {/* Payment Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Payment Progress</span>
                    <span>{Math.round((paidAmount / totalAmount) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((paidAmount / totalAmount) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Partial Payment Notice */}
                {paidAmount > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <FaMoneyBillWave className="text-blue-500 mr-2" />
                      <span className="text-blue-800 font-medium">
                        Partial Payment Already Made
                      </span>
                    </div>
                    <p className="text-blue-700 text-sm mt-1">
                      This guest has already paid ₹{formatPrice(paidAmount)}. 
                      You can collect the remaining ₹{formatPrice(correctRemainingAmount)} now.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Current Remaining Amount Display */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Current Remaining Amount:</span>
                    <span className="text-lg font-bold text-red-600">{formatPrice(correctRemainingAmount)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">This is the total amount still due from the guest</p>
                  
                  {/* Editable Remaining Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Adjust Remaining Amount (Optional)
                    </label>
                    <input
                      type="number"
                      name="adjusted_remaining"
                      value={duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount}
                      onChange={handleDuePaymentFormChange}
                      step="1"
                      min="0"
                      max={correctRemainingAmount}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter adjusted amount (for discounts/adjustments)"
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      💡 You can reduce this amount for discounts, adjustments, or partial settlements
                    </p>
                  </div>
                </div>

                {/* Payment Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount (Amount Being Paid) *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={duePaymentForm.amount}
                    onChange={handleDuePaymentFormChange}
                    step="1"
                    min="0"
                    max={duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter amount to pay"
                    required
                  />
                  
                  {/* Quick Payment Buttons */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDuePaymentForm(prev => ({ ...prev, amount: duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount }))}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                    >
                      Pay Full (₹{formatPrice(duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuePaymentForm(prev => ({ ...prev, amount: Math.ceil((duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) / 2) }))}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      Pay Half (₹{formatPrice(Math.ceil((duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) / 2))})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuePaymentForm(prev => ({ ...prev, amount: Math.ceil((duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) * 0.25) }))}
                      className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                    >
                      Pay 25% (₹{formatPrice(Math.ceil((duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) * 0.25))})
                    </button>
                  </div>
                </div>

                {/* New Remaining Amount After Payment */}
                {duePaymentForm.amount > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Remaining Amount After Payment:</span>
                      <span className={`text-lg font-bold ${((duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) - duePaymentForm.amount) === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                        {formatPrice(Math.max(0, (duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) - duePaymentForm.amount))}
                      </span>
                    </div>
                    <div className="mt-2 text-xs">
                      {duePaymentForm.amount >= (duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) ? (
                        <p className="text-green-600">✅ Payment will be completed - No remaining amount</p>
                      ) : (
                        <p className="text-orange-600">
                          ⚠️ {formatPrice((duePaymentForm.adjusted_remaining !== undefined ? duePaymentForm.adjusted_remaining : correctRemainingAmount) - duePaymentForm.amount)} will still be due after this payment
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-blue-600">
                  💡 You can collect partial payments. The remaining amount will be updated automatically.
                </div>
                
                                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    name="payment_method"
                    value={duePaymentForm.payment_method}
                    onChange={handleDuePaymentFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="razorpay">Razorpay (Online Payment)</option>
                  </select>
                  
                  {/* Razorpay Information */}
                  {duePaymentForm.payment_method === 'razorpay' && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center">
                        <FaCreditCard className="text-green-500 mr-2" />
                        <span className="text-green-800 font-medium">💳 Online Payment via Razorpay</span>
                      </div>
                      <p className="text-green-700 text-sm mt-1">
                        Secure payment gateway supporting UPI, debit/credit cards & net banking
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={duePaymentForm.notes}
                    onChange={handleDuePaymentFormChange}
                    rows="2"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes about this payment..."
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button 
                onClick={cancelDueAmountPayment} 
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={duePaymentLoading}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDueAmountPayment} 
                disabled={duePaymentLoading || !duePaymentForm.amount || duePaymentForm.amount < 0 || !duePaymentForm.payment_method}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  duePaymentForm.payment_method === 'razorpay' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {duePaymentLoading ? 'Processing...' : 
                 duePaymentForm.payment_method === 'razorpay' ? '💳 Pay Online with Razorpay' : '💵 Confirm Cash Payment'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Guest Details Modal */}
      {showDetails && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-50 border-b border-gray-200 p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Guest Details</h3>
                <button onClick={closeGuestDetails} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <FaTimesCircle className="text-xl" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Personal Information</h4>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.first_name} {selectedGuest.last_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Phone:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.phone}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">ID Proof:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(() => {
                        const idType = selectedGuest.id_proof_type;
                        const idNumber = selectedGuest.id_proof_number;
                        
                        // Convert database values to user-friendly labels
                        let displayType = 'N/A';
                        if (idType === 'national_id') displayType = 'Aadhar Number';
                        else if (idType === 'driving_license') displayType = 'Driving License';
                        else if (idType === 'passport') displayType = 'Passport ID';
                        else if (idType === 'other') displayType = 'Other';
                        else if (idType) displayType = idType;
                        
                        // Smart detection if no type is stored
                        if (!idType && idNumber) {
                          if (idNumber.length === 12 || idNumber.length === 13) displayType = 'Aadhar Number';
                          else if (idNumber.length === 10) displayType = 'Voter ID';
                          else if (idNumber.length === 8) displayType = 'Driving License';
                          else if (idNumber.length >= 6 && idNumber.length <= 9) displayType = 'Passport ID';
                        }
                        
                        return `${displayType}${idNumber ? ` - ${idNumber}` : ''}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Adults:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.adults || 1}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Children:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.children || 0}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Booking Information</h4>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Booking Reference:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.booking_reference}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Booking Source:</span>
                    <span className={`text-sm font-medium ${selectedGuest.booking_source === 'corporate' ? 'text-blue-600 font-semibold' : 'text-gray-900'}`}>
                      {(() => {
                        const sourceMap = {
                          'corporate': '🏢 Corporate',
                          'MMT': '🌐 MakeMyTrip',
                          'Agoda': '🌐 Agoda',
                          'Travel Plus': '🌐 Travel Plus',
                          'Phone Call Booking': '📞 Phone Call Booking',
                          'walk_in': '🚶 Walk In'
                        };
                        return sourceMap[selectedGuest.booking_source] || selectedGuest.booking_source || 'N/A';
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Room Number:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.room_number}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Room Type:</span>
                    <span className="text-sm font-medium text-gray-900">{selectedGuest.room_type_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Status:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {getStatusDisplay(selectedGuest.booking_status).text}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Plan Type:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(() => {
                        const planType = selectedGuest.plan_type;
                        if (planType === 'EP') return 'European Plan (Room Only)';
                        if (planType === 'CP') return 'Continental Plan (With Breakfast)';
                      })()}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Stay Details</h4>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Check-in Date:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(selectedGuest.check_in_date)}</span>
                  </div>
                  {selectedGuest.check_in_time && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Check-in Time:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedGuest.check_in_time} {selectedGuest.check_in_ampm || 'AM'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Check-out Date:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(selectedGuest.check_out_date)}</span>
                  </div>
                  {selectedGuest.check_out_time && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Check-out Time:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedGuest.check_out_time} {selectedGuest.check_out_ampm || 'AM'}</span>
                      </div>
                  )}
                                      {selectedGuest.check_in_time && selectedGuest.check_out_time && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Total Hours:</span>
                        <span className="text-sm font-medium text-gray-900">{calculateTotalHours(
                          selectedGuest.check_in_time, 
                          selectedGuest.check_in_ampm || 'AM', 
                          selectedGuest.check_out_time, 
                          selectedGuest.check_out_ampm || 'AM',
                          selectedGuest.check_in_date,
                          selectedGuest.check_out_date
                        )}</span>
                      </div>
                    )}
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Total Amount:</span>
                    <span className="text-sm font-medium text-gray-900">{formatPrice(selectedGuest.total_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-xs font-medium text-gray-600">Created:</span>
                    <span className="text-sm font-medium text-gray-900">{formatDate(selectedGuest.created_at || selectedGuest.booking_created_at)}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Payment Details</h4>
                  
                  {/* Owner Reference Information */}
                  {(selectedGuest.owner_reference || selectedGuest.payment_status === 'referred_by_owner') && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Status:</span>
                      <span className="text-sm font-semibold text-green-600">
                        🏨 Reference by Owner of the Hotel
                      </span>
                    </div>
                  )}
                  
                  {/* Regular Payment Details - Only show if NOT owner reference */}
                  {!(selectedGuest.owner_reference || selectedGuest.payment_status === 'referred_by_owner') && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Total Amount:</span>
                        <span className="text-sm font-semibold text-gray-900">{formatPrice(selectedGuest.total_amount)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Paid Amount:</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatPrice(selectedGuest.paid_amount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Remaining Amount:</span>
                        <span className={`text-sm font-semibold ${
                          (selectedGuest.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatPrice(selectedGuest.remaining_amount || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Payment Status:</span>
                        <span className={`text-sm font-semibold ${
                          selectedGuest.calculated_payment_status === 'completed' ? 'text-green-600' : 
                          selectedGuest.calculated_payment_status === 'partial' ? 'text-orange-600' : 
                          selectedGuest.calculated_payment_status === 'referred_by_owner' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {selectedGuest.payment_summary || 
                           (selectedGuest.calculated_payment_status === 'completed' ? '✅ Fully Paid' :
                            selectedGuest.calculated_payment_status === 'partial' ? '⚠️ Partially Paid' : 
                            selectedGuest.calculated_payment_status === 'referred_by_owner' ? '🏨 Referred by Owner of the Hotel' : '❌ Pending Payment')}
                        </span>
                      </div>
                      

                      

                      
                      {/* Payment Method and ID Information */}
                      {(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type) && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                            <span className="text-xs font-medium text-gray-600">Payment Method:</span>
                            <span className="text-sm font-semibold text-blue-600">
                              {(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type).replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          {selectedGuest.razorpay_payment_id && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                              <span className="text-xs font-medium text-gray-600">Razorpay ID:</span>
                              <span className="text-sm font-mono text-xs">{selectedGuest.razorpay_payment_id}</span>
                            </div>
                          )}
                          {selectedGuest.payment_id && !selectedGuest.razorpay_payment_id && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                              <span className="text-xs font-medium text-gray-600">Payment ID:</span>
                              <span className="text-sm font-mono text-xs">{selectedGuest.payment_id}</span>
                            </div>
                          )}
                          {selectedGuest.transaction_id && (
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                              <span className="text-xs font-medium text-gray-600">Transaction ID:</span>
                              <span className="text-sm font-mono text-xs">{selectedGuest.transaction_id}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Due Amount Warning - Only show if NOT owner reference */}
                      {(selectedGuest.remaining_amount || 0) > 0 && !(selectedGuest.owner_reference || selectedGuest.payment_status === 'referred_by_owner') && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center">
                            <FaMoneyBillWave className="text-red-500 mr-2" />
                            <span className="text-red-800 font-medium">
                              Due Amount Pending: {formatPrice(selectedGuest.remaining_amount)}
                            </span>
                          </div>
                          <p className="text-red-700 text-sm mt-1">
                            Guest cannot be checked out until the remaining amount is collected.
                          </p>
                          <button
                            onClick={() => {
                              closeGuestDetails();
                              handleDueAmountPayment(selectedGuest);
                            }}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm font-medium flex items-center space-x-1 transition-colors"
                          >
                            <FaMoneyBillWave className="w-3 h-3" />
                            <span>Pay Due Amount</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Owner Reference Notice */}
                  {(selectedGuest.owner_reference && !(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type)) && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-yellow-800 font-medium">
                          🏨 This is an owner reference booking - no payment required
                        </span>
                      </div>
                      <p className="text-yellow-700 text-sm mt-1">
                        Room was booked under hotel owner's reference. No revenue generated.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Corporate Information</h4>
                  {selectedGuest.booking_source === 'corporate' && (
                    <>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Corporate Status:</span>
                        <span className="text-sm font-semibold text-blue-600">Active</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Corporate Type:</span>
                        <span className="text-sm font-medium text-gray-900">Business Booking</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Company Information Section - Only for Corporate Bookings */}
                {selectedGuest.booking_source === 'corporate' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Company Details</h4>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Company Name:</span>
                      <span className="text-sm font-semibold text-blue-600">
                        {selectedGuest.company_name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">GST Number:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedGuest.gst_number || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Contact Person:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedGuest.contact_person || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Contact Phone:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedGuest.contact_phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Contact Email:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedGuest.contact_email || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Billing Address:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedGuest.billing_address || 'N/A'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 border-t border-gray-200 p-6 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                {/* Day Extend Button - Only show for checked-in guests */}
                {selectedGuest.booking_status === 'checked_in' && (
                  <button
                    onClick={() => {
                      handleDayExtend(selectedGuest);
                      closeGuestDetails();
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors"
                    title="Extend Stay"
                  >
                    <FaCalendarPlus className="w-4 h-4" />
                    <span>Day Extend</span>
                  </button>
                )}
                <button onClick={closeGuestDetails} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Booking Modal */}
      {showEditModal && guestToEdit && (
        <EditBookingPopup
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setGuestToEdit(null);
          }}
          booking={{
            id: guestToEdit.booking_id,
            first_name: guestToEdit.first_name,
            last_name: guestToEdit.last_name,
            email: guestToEdit.email,
            phone: guestToEdit.phone,
            address: guestToEdit.address,
            check_in_date: guestToEdit.check_in_date,
            check_out_date: guestToEdit.check_out_date,
            adults: guestToEdit.adults,
            children: guestToEdit.children,
            room_number: guestToEdit.room_number,
            notes: guestToEdit.notes
          }}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Cancellation Modal */}
      {showCancellationModal && guestToCancel && (
        <CancelBooking
          booking={{
            id: guestToCancel.booking_id,
            guest_name: `${guestToCancel.first_name} ${guestToCancel.last_name}`,
            room_number: guestToCancel.room_number,
            check_in_date: guestToCancel.check_in_date,
            check_out_date: guestToCancel.check_out_date,
            total_amount: guestToCancel.total_amount,
            status: guestToCancel.booking_status
          }}
          onClose={() => {
            setShowCancellationModal(false);
            setGuestToCancel(null);
          }}
          onCancellationSuccess={handleCancellationSuccess}
        />
      )}

      {/* Razorpay Payment Modal */}
      {showRazorpayModal && razorpayPaymentData && (
        <RazorpayPayment
          amount={razorpayPaymentData.amount}
          bookingId={razorpayPaymentData.bookingId}
          guestId={razorpayPaymentData.guestId}
          guestName={razorpayPaymentData.guestName}
          guestEmail={razorpayPaymentData.guestEmail}
          guestPhone={razorpayPaymentData.guestPhone}
          description={razorpayPaymentData.description}
          onPaymentSuccess={handleRazorpayPaymentSuccess}
          onPaymentFailure={handleRazorpayPaymentFailure}
          onClose={closeRazorpayModal}
        />
      )}

      {/* Day Extend Modal */}
      {showExtendModal && guestToExtend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FaCalendarPlus className="text-2xl" />
                  <div>
                    <h2 className="text-xl font-semibold">Extend Guest Stay</h2>
                    <p className="text-blue-100 text-sm">Extend the stay for {guestToExtend.first_name} {guestToExtend.last_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExtendModal(false)}
                  className="text-blue-100 hover:text-white transition-colors"
                  disabled={extendLoading}
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Guest: <strong>{guestToExtend.first_name} {guestToExtend.last_name}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Room: <strong>{guestToExtend.room_number}</strong>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Current Check-out: <strong>{guestToExtend.check_out_date} at {guestToExtend.check_out_time || '11:00'} {guestToExtend.check_out_ampm || 'AM'}</strong>
                </p>
              </div>
              
              <div className="extend-form">
                <div className="form-group mb-4">
                  <label className="form-label">Extension Options:</label>
                  <div className="extension-options flex space-x-2 mb-3">
                    <button
                      type="button"
                      className={`extension-option px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        extendForm.days === 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleExtendFormChange('days', 1)}
                    >
                      +1 Day
                    </button>
                    <button
                      type="button"
                      className={`extension-option px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        extendForm.days === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleExtendFormChange('days', 2)}
                    >
                      +2 Days
                    </button>
                    <button
                      type="button"
                      className={`extension-option px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        extendForm.days === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleExtendFormChange('days', 3)}
                    >
                      +3 Days
                    </button>
                  </div>
                  
                  <div className="custom-days-input">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Custom Days (1-30):</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={extendForm.customDays}
                      onChange={(e) => handleExtendFormChange('customDays', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter number of days"
                    />
                  </div>
                </div>
                
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Check-out Date:</label>
                  <input
                    type="date"
                    value={extendForm.newCheckoutDate}
                    onChange={(e) => handleExtendFormChange('newCheckoutDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Check-out Time:</label>
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      value={extendForm.newCheckoutTime}
                      onChange={(e) => handleExtendFormChange('newCheckoutTime', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={extendForm.newCheckoutAmpm}
                      onChange={(e) => handleExtendFormChange('newCheckoutAmpm', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Amount:</label>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-gray-900">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={extendForm.additionalAmount}
                      onChange={(e) => handleExtendFormChange('additionalAmount', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the additional amount for the extended stay
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border-t border-gray-200 p-6 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setShowExtendModal(false)} 
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={extendLoading}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmExtend}
                  disabled={extendLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <FaCalendarPlus className="w-4 h-4" />
                  <span>{extendLoading ? 'Processing...' : 'Extend Stay'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Viewer Modal */}
      <FileViewerModal
        guest={selectedGuest}
        isOpen={showFileViewer}
        onClose={() => setShowFileViewer(false)}
      />
    </div>
  );
};

export default GuestSearch;