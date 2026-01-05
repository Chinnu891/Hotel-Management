import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../config/api';
import FileViewerModal from '../common/FileViewerModal';
import { toast } from 'react-toastify';
import { FaTimesCircle } from 'react-icons/fa';
import './GuestHistory.css';

const GuestHistory = () => {
  const { token } = useAuth();
  
  // Helper function to convert 24-hour format to 12-hour format for display
  const convert24To12Hour = (timeString) => {
    if (!timeString) return { time: 'N/A', ampm: '' };
    
    try {
      const timeParts = timeString.split(':');
      if (timeParts.length < 2) return { time: 'N/A', ampm: '' };
      
      const [hours, minutes] = timeParts;
      let hour = parseInt(hours, 10);
      const min = parseInt(minutes, 10);
      
      if (isNaN(hour) || isNaN(min)) return { time: 'N/A', ampm: '' };
      
      let ampm = 'AM';
      if (hour === 0) {
        hour = 12;
        ampm = 'AM';
      } else if (hour === 12) {
        ampm = 'PM';
      } else if (hour > 12) {
        hour -= 12;
        ampm = 'PM';
      }
      
      return {
        time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
        ampm: ampm
      };
    } catch (error) {
      console.error('Error converting 24-hour to 12-hour format:', error);
      return { time: 'N/A', ampm: '' };
    }
  };

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
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [guestHistory, setGuestHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [corporateFilter, setCorporateFilter] = useState('all'); // New corporate filter

  // Load guest history and statistics on component mount
  useEffect(() => {
    loadGuestHistory();
    loadGuestStats();
  }, [activeTab, dateFilter, corporateFilter]);

  const loadGuestStats = async () => {
    try {
      const response = await fetch(`${buildApiUrl('reception/guest_search_api.php')}?action=stats`);
      const data = await response.json();
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error loading guest stats:', error);
    }
  };

  const loadGuestHistory = async () => {
    try {
      setLoading(true);
      
      // Get all guests including checked-out ones using the guest_history action
      const response = await fetch(
        `${buildApiUrl('reception/guest_search_api.php')}?action=guest_history`
      );
      
      const data = await response.json();
      if (data.success && data.data && Array.isArray(data.data)) {
        // The API returns data directly as an array, not wrapped in results
        let filteredResults = data.data;
        
        // Apply search filter if search term exists
        if (searchTerm.trim()) {
          filteredResults = filteredResults.filter(guest => 
            (guest.full_name || `${guest.first_name} ${guest.last_name}`.trim()).toLowerCase().includes(searchTerm.toLowerCase()) ||
            guest.phone.includes(searchTerm) ||
            guest.booking_reference.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
                // Apply status filter based on activeTab
        if (activeTab !== 'all') {
          filteredResults = filteredResults.filter(guest => {
            return guest.booking_status === activeTab;
          });
        }

        // Apply corporate filter
        if (corporateFilter !== 'all') {
          filteredResults = filteredResults.filter(guest => {
            if (corporateFilter === 'corporate') {
              return guest.booking_source === 'corporate';
            } else if (corporateFilter === 'regular') {
              return guest.booking_source !== 'corporate';
            }
            return true;
          });
        }

        // Apply date filter
        if (dateFilter !== 'all') {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

          filteredResults = filteredResults.filter(guest => {
            const checkInDate = new Date(guest.check_in_date);
            const checkOutDate = guest.check_out_date ? new Date(guest.check_out_date) : null;

            switch (dateFilter) {
              case 'today':
                return checkInDate >= startOfDay && checkInDate <= endOfDay;
              case 'week':
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return checkInDate >= weekAgo;
              case 'month':
                const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                return checkInDate >= monthAgo;
              default:
                return true;
            }
          });
        }
        
        setGuestHistory(filteredResults);
      } else {
        setGuestHistory([]);
        toast.error(data.message || 'Failed to load guest history');
      }
    } catch (error) {
      console.error('Error loading guest history:', error);
      setGuestHistory([]);
      toast.error('Failed to load guest history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadGuestHistory();
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDateFilter('all');
    setActiveTab('all');
    setCorporateFilter('all');
    loadGuestHistory();
  };

  const viewGuestDetails = (guest) => {
    console.log('Guest data being passed to modal:', guest);
    console.log('Guest full_name:', guest.full_name);
    console.log('Guest first_name:', guest.first_name);
    console.log('Guest last_name:', guest.last_name);
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

  const getStatusBadge = (status) => {
    const statusClasses = {
      'confirmed': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'checked_in': 'bg-green-100 text-green-800 border-green-200',
      'checked_out': 'bg-gray-100 text-gray-800 border-gray-200',
      'cancelled': 'bg-red-100 text-red-800 border-red-200',
      'pending': 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    const statusLabels = {
      'confirmed': 'Confirmed',
      'checked_in': 'Checked In',
      'checked_out': 'Checked Out',
      'cancelled': 'Cancelled',
      'pending': 'Pending'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price) => {
    if (!price) return '₹0.00';
    return `₹${parseFloat(price).toLocaleString('en-IN')}`;
  };

  const getTabLabel = (tab) => {
    const labels = {
      'all': 'All History',
      'confirmed': 'Confirmed',
      'checked_in': 'Checked In',
      'checked_out': 'Checked Out',
      'cancelled': 'Cancelled'
    };
    return labels[tab] || tab;
  };

  const handleExportCSV = () => {
    if (guestHistory.length === 0) {
      toast.info('No guest history to export.');
      return;
    }

    const csvContent = [
      ['Booking ID', 'Guest ID', 'Full Name', 'Phone', 'Email', 'Booking Reference', 'Room Number', 'Room Type', 'Check-in Date', 'Check-in Time', 'Check-out Date', 'Check-out Time', 'Total Hours', 'Adults', 'Children', 'Total Amount', 'Paid Amount', 'Remaining Amount', 'Payment Status', 'Payment Method', 'Booking Status', 'Owner Reference', 'Company Name', 'GST Number', 'Contact Person', 'Contact Phone', 'Contact Email', 'Billing Address', 'ID Proof Type', 'ID Proof Number', 'Booking Created At']
    ];

    guestHistory.forEach(guest => {
      csvContent.push([
        guest.booking_id || '',
        guest.guest_id || '',
        guest.full_name || `${guest.first_name || ''} ${guest.last_name || ''}`.trim(),
        guest.phone || '',
        guest.email || '',
        guest.booking_reference || '',
        guest.room_number || '',
        guest.room_type_name || '',
        guest.check_in_date || '',
        guest.check_in_time ? `${convert24To12Hour(guest.check_in_time).time} ${convert24To12Hour(guest.check_in_time).ampm}` : '',
        guest.check_out_date || '',
        guest.check_out_time ? `${convert24To12Hour(guest.check_out_time).time} ${convert24To12Hour(guest.check_out_time).ampm}` : '',
        guest.check_in_time && guest.check_out_time ? calculateTotalHours(
          guest.check_in_time, 
          guest.check_in_ampm, 
          guest.check_out_time, 
          guest.check_out_ampm,
          guest.check_in_date,
          guest.check_out_date
        ) : '',
        guest.adults || '',
        guest.children || '',
        guest.total_amount || '',
        guest.paid_amount || '',
        guest.remaining_amount || '',
        guest.calculated_payment_status || '',
        guest.payment_method || guest.payment_type || guest.booking_payment_type || '',
        guest.booking_status || '',
        guest.owner_reference || '',
        guest.company_name || '',
        guest.gst_number || '',
        guest.contact_person || '',
        guest.contact_phone || '',
        guest.contact_email || '',
        guest.billing_address || '',
        guest.id_proof_type || '',
        guest.id_proof_number || '',
        guest.booking_created_at || ''
      ]);
    });

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guest_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Guest history exported successfully!');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Guest History</h1>
        <p className="text-gray-600 mt-2">Complete history of all guests including check-ins and check-outs</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-blue-600">{stats.total_guests || 0}</div>
            <div className="text-sm text-gray-600">Total Guests</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">{stats.confirmed_guests || 0}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">{stats.checked_in_guests || 0}</div>
            <div className="text-sm text-gray-600">Checked In</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-gray-500">
            <div className="text-2xl font-bold text-gray-600">{stats.checked_out_guests || 0}</div>
            <div className="text-sm text-gray-600">Checked Out</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled_guests || 0}</div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
            <div className="text-2xl font-bold text-orange-600">
              {guestHistory.filter(guest => 
                guest.owner_reference && !(guest.payment_method || guest.payment_type || guest.booking_payment_type)
              ).length}
            </div>
            <div className="text-sm text-gray-600">Owner Reference</div>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search Input */}
          <div className="flex-1">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, phone, or booking reference..."
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* Date Filter */}
          <div className="md:w-48">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Corporate Filter */}
          <div className="md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">Corporate Filter</label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={corporateFilter === 'corporate'}
                  onChange={(e) => setCorporateFilter(e.target.checked ? 'corporate' : 'all')}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Corporate Only</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={corporateFilter === 'regular'}
                  onChange={(e) => setCorporateFilter(e.target.checked ? 'regular' : 'all')}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Regular Only</span>
              </label>
            </div>
          </div>

          {/* CSV Export Button */}
          <div className="md:w-auto">
            <button
              onClick={handleExportCSV}
              disabled={loading || guestHistory.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {getTabLabel(tab)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Guest History Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Guest History ({guestHistory.length})
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Showing {getTabLabel(activeTab).toLowerCase()} guests
            {dateFilter !== 'all' && ` for ${dateFilter}`}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading guest history...</p>
            </div>
          ) : guestHistory.length > 0 ? (
            <div className="space-y-4">
              {guestHistory.map((guest, index) => (
                <div key={`${guest.booking_id}-${guest.guest_id}-${index}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {guest.full_name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Booking Ref: {guest.booking_reference}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getStatusBadge(guest.booking_status)}
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
                      <p className="text-sm text-gray-600">🏠 {guest.room_type_name}</p>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Stay Details</h5>
                      <p className="text-sm text-gray-600">📅 Check-in: {formatDate(guest.check_in_date)}</p>
                      {guest.check_in_time && (
                        <p className="text-sm text-gray-600">🕐 Check-in Time: <span className="font-medium text-blue-600">{(() => {
                          const converted = convert24To12Hour(guest.check_in_time);
                          return `${converted.time} ${converted.ampm}`;
                        })()}</span></p>
                      )}
                      <p className="text-sm text-gray-600">📅 Check-out: {formatDate(guest.check_out_date)}</p>
                      {guest.check_out_time && (
                        <p className="text-sm text-gray-600">🕐 Check-out Time: <span className="font-medium text-blue-600">{(() => {
                          const converted = convert24To12Hour(guest.check_out_time);
                          return `${converted.time} ${converted.ampm}`;
                        })()}</span></p>
                      )}
                      {guest.check_in_time && guest.check_out_time && (
                        <p className="text-sm text-gray-600">⏱️ Total Hours: <span className="font-semibold text-green-600">{(() => {
                          const checkInConverted = convert24To12Hour(guest.check_in_time);
                          const checkOutConverted = convert24To12Hour(guest.check_out_time);
                          return calculateTotalHours(
                            checkInConverted.time, 
                            checkInConverted.ampm, 
                            checkOutConverted.time, 
                            checkOutConverted.ampm,
                            guest.check_in_date,
                            guest.check_out_date
                          );
                        })()}</span></p>
                      )}
                      {(!guest.check_in_time || !guest.check_out_time) && (
                        <p className="text-sm text-gray-500 italic">⏰ Time information not available</p>
                      )}
                      <p className="text-sm text-gray-600">👥 {guest.total_guests} guests ({guest.adults} adults, {guest.children} children)</p>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">Financial Details</h5>
                      
                      {/* Owner Reference Status */}
                      {(guest.owner_reference && !(guest.payment_method || guest.payment_type || guest.booking_payment_type)) ? (
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
                          <p className="text-sm text-gray-600">⚖️ Remaining: {formatPrice(guest.remaining_amount || 0)}</p>
                          
                          {/* Payment Progress Bar */}
                          {(guest.total_amount && guest.total_amount > 0) ? (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Payment Progress</span>
                                <span>{Math.round(((guest.paid_amount || 0) / guest.total_amount) * 100)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    guest.calculated_payment_status === 'completed' || guest.is_fully_paid ? 'bg-green-600' :
                                    guest.calculated_payment_status === 'partial' ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ 
                                    width: `${Math.min(((guest.paid_amount || 0) / guest.total_amount) * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-center text-xs text-gray-500">
                              <span>Payment Progress: No amount data</span>
                            </div>
                          )}
                          
                          {/* Payment Status Display */}
                          <div className="mt-2">
                            <span className={`text-sm font-semibold ${
                              guest.calculated_payment_status === 'completed' || guest.is_fully_paid ? 'text-green-600' : 
                              guest.calculated_payment_status === 'partial' ? 'text-orange-600' : 
                              guest.calculated_payment_status === 'referred_by_owner' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {guest.calculated_payment_status === 'completed' || guest.is_fully_paid ? '✅ ' + (guest.payment_summary || 'Fully Paid') :
                               guest.calculated_payment_status === 'partial' ? '⚠️ ' + (guest.payment_summary || 'Partially Paid') : 
                               guest.calculated_payment_status === 'referred_by_owner' ? '🏨 Referred by Owner' : '❌ ' + (guest.payment_summary || 'Payment Pending')}
                            </span>
                          </div>
                          
                          {/* Payment Method Display */}
                          {(guest.payment_method || guest.payment_type || guest.booking_payment_type) && (
                            <p className="text-sm text-blue-600 font-medium">
                              💳 Payment Type: {(guest.payment_method || guest.payment_type || guest.booking_payment_type).replace('_', ' ').toUpperCase()}
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
                            (guest.razorpay_payment_id || guest.payment_id || guest.transaction_id) ? (
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
                            ) : null
                          )}
                        </>
                      )}
                      
                      <p className="text-sm text-gray-600">📊 Status: {guest.booking_status}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Created: {formatDateTime(guest.booking_created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Guest History Found</h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? `No guests found matching "${searchTerm}"`
                  : `No ${getTabLabel(activeTab).toLowerCase()} guests found`
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Guest Details Modal */}
      {showDetails && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gray-50 border-b border-gray-200 p-6 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Guest Details: {selectedGuest.full_name || selectedGuest.first_name + ' ' + selectedGuest.last_name}
                </h3>
                <button
                  onClick={closeGuestDetails}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimesCircle className="text-xl" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Personal Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Personal Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Name:</span>
                      <span className="text-sm font-medium text-gray-900">{selectedGuest.full_name || selectedGuest.first_name + ' ' + selectedGuest.last_name}</span>
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
                </div>

                {/* Booking Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Booking Information</h4>
                  <div className="space-y-2">
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
                        {getStatusBadge(selectedGuest.booking_status)}
                      </span>
                    </div>
                  </div>
                </div>


                
                {/* Stay Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Stay Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Check-in Date:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(selectedGuest.check_in_date)}</span>
                    </div>
                    {selectedGuest.check_in_time && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Check-in Time:</span>
                        <span className="text-sm font-medium text-gray-900">{(() => {
                          const converted = convert24To12Hour(selectedGuest.check_in_time);
                          return `${converted.time} ${converted.ampm}`;
                        })()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <span className="text-xs font-medium text-gray-600">Check-out Date:</span>
                      <span className="text-sm font-medium text-gray-900">{formatDate(selectedGuest.check_out_date)}</span>
                    </div>
                    {selectedGuest.check_out_time && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Check-out Time:</span>
                        <span className="text-sm font-medium text-gray-900">{(() => {
                          const converted = convert24To12Hour(selectedGuest.check_out_time);
                          return `${converted.time} ${converted.ampm}`;
                        })()}</span>
                      </div>
                    )}
                    {selectedGuest.check_in_time && selectedGuest.check_out_time && (
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <span className="text-xs font-medium text-gray-600">Total Hours:</span>
                        <span className="text-sm font-medium text-gray-900">{(() => {
                          const checkInConverted = convert24To12Hour(selectedGuest.check_in_time);
                          const checkOutConverted = convert24To12Hour(selectedGuest.check_out_time);
                          return calculateTotalHours(
                            checkInConverted.time, 
                            checkInConverted.ampm, 
                            checkOutConverted.time, 
                            checkOutConverted.ampm,
                            selectedGuest.check_in_date,
                            selectedGuest.check_out_date
                          );
                        })()}</span>
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
                </div>

                {/* Payment Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Payment Details</h4>
                  <div className="space-y-2">
                    
                    {/* Owner Reference Information */}
                    {(selectedGuest.owner_reference && !(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type)) ? (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-xs font-medium text-gray-600">Status:</span>
                          <span className="text-sm font-semibold text-green-600">🏨 Reference by Owner of the Hotel</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-xs font-medium text-gray-600">Payment Required:</span>
                          <span className="text-sm font-semibold text-green-600">No Payment Required</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-xs font-medium text-gray-600">Revenue Generated:</span>
                          <span className="text-sm font-medium text-gray-500">None - Free Booking</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-xs font-medium text-gray-600">Total Amount:</span>
                          <span className="text-sm font-medium text-gray-900">{formatPrice(selectedGuest.total_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-xs font-medium text-gray-600">Paid Amount:</span>
                          <span className="text-sm font-medium text-green-600">{formatPrice(selectedGuest.paid_amount || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-xs font-medium text-gray-600">Remaining Amount:</span>
                          <span className="text-sm font-medium text-gray-900">{formatPrice(selectedGuest.remaining_amount || 0)}</span>
                        </div>
                        
                        {/* Payment Progress Bar */}
                        {(selectedGuest.total_amount && selectedGuest.total_amount > 0) ? (
                          <div className="py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-medium text-gray-600">Payment Progress</span>
                              <span className="text-xs font-medium text-gray-600">
                                {Math.round(((selectedGuest.paid_amount || 0) / selectedGuest.total_amount) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  selectedGuest.calculated_payment_status === 'completed' || selectedGuest.is_fully_paid ? 'bg-green-600' :
                                  selectedGuest.calculated_payment_status === 'partial' ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ 
                                  width: `${Math.min(((selectedGuest.paid_amount || 0) / selectedGuest.total_amount) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span>₹{selectedGuest.paid_amount || 0}</span>
                              <span>₹{selectedGuest.total_amount}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-2 border-b border-gray-100 last:border-b-0">
                            <div className="text-center text-xs text-gray-500">
                              <span>Payment Progress: No amount data available</span>
                            </div>
                          </div>
                        )}
                        

                        
                        {/* Payment Status */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <span className="text-xs font-medium text-gray-600">Payment Status:</span>
                          <span className={`text-sm font-semibold ${
                            selectedGuest.calculated_payment_status === 'completed' || selectedGuest.is_fully_paid ? 'text-green-600' : 
                            selectedGuest.calculated_payment_status === 'partial' ? 'text-orange-600' : 
                            selectedGuest.calculated_payment_status === 'referred_by_owner' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {selectedGuest.calculated_payment_status === 'completed' || selectedGuest.is_fully_paid ? '✅ ' + (selectedGuest.payment_summary || 'Fully Paid') :
                             selectedGuest.calculated_payment_status === 'partial' ? '⚠️ ' + (selectedGuest.payment_summary || 'Partially Paid') : 
                             selectedGuest.calculated_payment_status === 'referred_by_owner' ? '🏨 Referred by Owner of the Hotel' : '❌ ' + (selectedGuest.payment_summary || 'Payment Pending')}
                          </span>
                        </div>
                        
                        {/* Payment Method and ID Information */}
                        {(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type) && (
                          (selectedGuest.razorpay_payment_id || selectedGuest.payment_id || selectedGuest.transaction_id) ? (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="font-medium text-blue-800 mb-2">💳 Payment Information</p>
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
                            </div>
                          ) : (
                            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <p className="font-medium text-gray-800 mb-2">💳 Payment Method</p>
                              <div className="flex justify-between items-center py-2">
                                <span className="text-xs font-medium text-gray-600">Payment Method:</span>
                                <span className="text-sm font-semibold text-gray-600">{(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type).replace('_', ' ').toUpperCase()}</span>
                              </div>
                            </div>
                          )
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
                </div>

                {/* Corporate Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Corporate Information</h4>
                  <div className="space-y-2">
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
                </div>

                {/* Company Details - Only for Corporate Bookings */}
                {selectedGuest.booking_source === 'corporate' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">Company Details</h4>
                    <div className="space-y-2">
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
                  </div>
                )}
              </div>
            </div>
            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-6 rounded-b-lg">
              <div className="flex justify-end">
                <button onClick={closeGuestDetails} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Close
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

export default GuestHistory;
