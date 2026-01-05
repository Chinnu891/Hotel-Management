import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../config/api';
import { toast } from 'react-toastify';
import FileViewerModal from '../common/FileViewerModal';
import { 
    FaSearch, 
    FaUser, 
    FaPhone, 
    FaEnvelope, 
    FaBed, 
    FaCalendarAlt,
    FaCheckCircle,
    FaTimesCircle,
    FaEye,
    FaEdit,
    FaTrash,
    FaFilter,
    FaDownload,
    FaSync,
    FaPrint,
    FaQrcode,
    FaCreditCard,
    FaReceipt,
    FaHistory,
    FaMapMarkerAlt,
    FaIdCard,
    FaClock,
    FaMoneyBillWave,
    FaCalendarPlus
} from 'react-icons/fa';
import './EnhancedGuestSearch.css';

const EnhancedGuestSearch = () => {
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
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState({});
    const [checkinLoading, setCheckinLoading] = useState({});
    const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
    const [showCheckinConfirm, setShowCheckinConfirm] = useState(false);
    const [guestToCheckout, setGuestToCheckout] = useState(null);
    const [guestToCheckin, setGuestToCheckin] = useState(null);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState(null);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const [advancedFilters, setAdvancedFilters] = useState({
        dateFrom: '',
        dateTo: '',
        roomType: '',
        adults: '',
        children: '',
        minAmount: '',
        maxAmount: ''
    });

    // Day Extend functionality
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

    // Load guest statistics and all guests on component mount
    useEffect(() => {
        loadGuestStats();
        loadAllGuests();
    }, []);

    // Cleanup debounce timer on component unmount
    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showSuggestions && !event.target.closest('.relative')) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSuggestions]);

    const loadGuestStats = async () => {
        try {
            const response = await fetch(`${buildApiUrl('reception/guest_search_api.php')}?action=stats`);
            const data = await response.json();
            if (data.success) {
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error loading guest stats:', error);
        }
    };

    const loadAllGuests = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${buildApiUrl('reception/guest_search_api.php')}?action=search&type=all&status=all`
            );
            const data = await response.json();
            if (data.success) {
                // Debug: Log the data to see the structure
                console.log('All guests data:', data.data);
                if (data.data && data.data.length > 0) {
                    console.log('First guest data sample:', data.data[0]);
                    console.log('Payment fields in first guest:', {
                        total_amount: data.data[0].total_amount,
                        paid_amount: data.data[0].paid_amount,
                        remaining_amount: data.data[0].remaining_amount,
                        payment_status: data.data[0].payment_status
                    });
                }
                
                // The API returns data directly as an array, not wrapped in results
                setSearchResults(data.data || []);
                toast.success(`Loaded ${data.data?.length || 0} guests`);
            }
        } catch (error) {
            console.error('Error loading all guests:', error);
            toast.error('Failed to load guests');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim() && searchType === 'all') {
            loadAllGuests();
            return;
        }

        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                action: 'search',
                type: searchType,
                term: searchTerm,
                status: statusFilter,
                ...Object.fromEntries(
                    Object.entries(advancedFilters).filter(([_, value]) => value)
                )
            });

            const response = await fetch(
                `${buildApiUrl('reception/guest_search_api.php')}?${queryParams}`
            );
            const data = await response.json();
            
            if (data.success) {
                // Debug: Log the first few results to see the data structure
                console.log('Search results data:', data.data);
                if (data.data && data.data.length > 0) {
                    console.log('First guest data sample:', data.data[0]);
                    console.log('Payment fields in first guest:', {
                        total_amount: data.data[0].total_amount,
                        paid_amount: data.data[0].paid_amount,
                        remaining_amount: data.data[0].remaining_amount,
                        payment_status: data.data[0].payment_status
                    });
                }
                
                // The API returns data directly as an array, not wrapped in results
                setSearchResults(data.data || []);
                toast.success(`Found ${data.data?.length || 0} guests`);
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

    const handleCheckin = async (guest) => {
        if (!guest.booking_id || !guest.room_number) {
            toast.error('Cannot check in: Missing booking or room information');
            return;
        }

        if (guest.booking_status !== 'confirmed') {
            toast.error('Only confirmed bookings can be checked in');
            return;
        }

        // Debug: Log the guest data to see what's available
        console.log('Guest data for check-in:', guest);
        console.log('Payment info:', {
            total_amount: guest.total_amount,
            paid_amount: guest.paid_amount,
            remaining_amount: guest.remaining_amount,
            payment_status: guest.payment_status
        });

        setGuestToCheckin(guest);
        setShowCheckinConfirm(true);
    };

    const confirmCheckin = async () => {
        if (!guestToCheckin) return;

        try {
            setCheckinLoading(prev => ({ ...prev, [guestToCheckin.booking_id]: true }));

            const response = await fetch(`${buildApiUrl('reception/checkin_checkout_api.php')}?action=checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    booking_id: guestToCheckin.booking_id,
                    room_number: guestToCheckin.room_number
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Check-in successful');
                
                // Update the guest status in search results
                setSearchResults(prev => prev.map(g => 
                    g.booking_id === guestToCheckin.booking_id 
                        ? { ...g, booking_status: 'checked_in' }
                        : g
                ));
                
                // Refresh stats
                loadGuestStats();
            } else {
                toast.error(data.message || 'Check-in failed');
            }
        } catch (error) {
            console.error('Check-in error:', error);
            toast.error('Check-in failed. Please try again.');
        } finally {
            setCheckinLoading(prev => ({ ...prev, [guestToCheckin.booking_id]: false }));
            setShowCheckinConfirm(false);
            setGuestToCheckin(null);
        }
    };

    const handleCheckout = async (guest) => {
        if (!guest.booking_id || !guest.room_number) {
            toast.error('Cannot checkout: Missing booking or room information');
            return;
        }

        if (guest.booking_status !== 'checked_in') {
            toast.error('Only checked-in guests can be checked out');
            return;
        }

        // Debug: Log the guest data to see what's available
        console.log('Guest data for checkout:', guest);
        console.log('Payment info:', {
            total_amount: guest.total_amount,
            paid_amount: guest.paid_amount,
            remaining_amount: guest.remaining_amount,
            payment_status: guest.payment_status
        });

        setGuestToCheckout(guest);
        setShowCheckoutConfirm(true);
    };

    const confirmCheckout = async () => {
        if (!guestToCheckout) return;

        try {
            setCheckoutLoading(prev => ({ ...prev, [guestToCheckout.booking_id]: true }));

            const response = await fetch(`${buildApiUrl('reception/checkin_checkout_api.php')}?action=checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    booking_id: guestToCheckout.booking_id,
                    room_number: guestToCheckout.room_number
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Checkout successful');
                
                // Update the guest status in search results
                setSearchResults(prev => prev.map(g => 
                    g.booking_id === guestToCheckout.booking_id 
                        ? { ...g, booking_status: 'checked_out' }
                        : g
                ));
                
                // Refresh stats
                loadGuestStats();
            } else {
                toast.error(data.message || 'Checkout failed');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Checkout failed. Please try again.');
        } finally {
            setCheckoutLoading(prev => ({ ...prev, [guestToCheckout.booking_id]: false }));
            setShowCheckoutConfirm(false);
            setGuestToCheckout(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'checked_in': return 'bg-green-100 text-green-800';
            case 'checked_out': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'confirmed': return <FaCheckCircle className="text-blue-600" />;
            case 'checked_in': return <FaCheckCircle className="text-green-600" />;
            case 'checked_out': return <FaTimesCircle className="text-gray-600" />;
        }
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
        setExtendForm(prev => {
            const updated = { ...prev, [field]: value };
            
            // Calculate new checkout date and suggest amount when days change
            if (field === 'days' || field === 'customDays') {
                const daysToAdd = field === 'days' ? parseInt(value) : parseInt(value) || 0;
                if (daysToAdd > 0 && guestToExtend) {
                    const currentCheckoutDate = new Date(guestToExtend.check_out_date);
                    const newCheckoutDate = new Date(currentCheckoutDate);
                    newCheckoutDate.setDate(newCheckoutDate.getDate() + daysToAdd);
                    updated.newCheckoutDate = newCheckoutDate.toISOString().split('T')[0];
                    
                    // Calculate suggested amount (assuming same daily rate)
                    const currentTotal = parseFloat(guestToExtend.total_amount) || 0;
                    const currentDays = Math.ceil((new Date(guestToExtend.check_out_date) - new Date(guestToExtend.check_in_date)) / (1000 * 60 * 60 * 24));
                    const dailyRate = currentDays > 0 ? currentTotal / currentDays : currentTotal;
                    const suggestedAmount = dailyRate * daysToAdd;
                    updated.additionalAmount = suggestedAmount.toFixed(2);
                }
            }
            
            return updated;
        });
    };

    const confirmExtend = async () => {
        if (!guestToExtend) return;

        const daysToAdd = extendForm.customDays ? parseInt(extendForm.customDays) : extendForm.days;
        if (!daysToAdd || daysToAdd <= 0) {
            toast.error('Please enter a valid number of days to extend');
            return;
        }

        try {
            setExtendLoading(true);

            const response = await fetch(`${buildApiUrl('reception/extend_booking_api.php')}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    booking_id: guestToExtend.booking_id,
                    room_number: guestToExtend.room_number,
                    days_to_extend: daysToAdd,
                    new_checkout_date: extendForm.newCheckoutDate,
                    new_checkout_time: extendForm.newCheckoutTime,
                    new_checkout_ampm: extendForm.newCheckoutAmpm,
                    additional_amount: parseFloat(extendForm.additionalAmount) || 0
                })
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Stay extended successfully');
                
                // Update the guest data in search results
                setSearchResults(prev => prev.map(g => 
                    g.booking_id === guestToExtend.booking_id 
                        ? { 
                            ...g, 
                            check_out_date: extendForm.newCheckoutDate,
                            check_out_time: extendForm.newCheckoutTime,
                            check_out_ampm: extendForm.newCheckoutAmpm,
                            total_amount: data.data?.new_total_amount || g.total_amount
                        }
                        : g
                ));
                
                // Refresh stats
                loadGuestStats();
                setShowExtendModal(false);
                setGuestToExtend(null);
            } else {
                toast.error(data.message || 'Failed to extend stay');
            }
        } catch (error) {
            console.error('Extend stay error:', error);
            toast.error('Failed to extend stay. Please try again.');
        } finally {
            setExtendLoading(false);
        }
    };
            case 'cancelled': return <FaTimesCircle className="text-red-600" />;
            case 'pending': return <FaClock className="text-yellow-600" />;
            default: return <FaClock className="text-gray-600" />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportToCSV = () => {
        const headers = [
            'Guest Name', 'Email', 'Phone', 'Room Number', 'Room Type', 
            'Check-in Date', 'Check-out Date', 'Status', 'Total Amount', 'Booking Reference'
        ];
        
        const csvContent = [
            headers.join(','),
            ...searchResults.map(guest => [
                `"${guest.first_name} ${guest.last_name}"`,
                `"${guest.email || ''}"`,
                `"${guest.phone || ''}"`,
                `"${guest.room_number || ''}"`,
                `"${guest.room_type_name || ''}"`,
                `"${formatDate(guest.check_in_date)}"`,
                `"${formatDate(guest.check_out_date)}"`,
                `"${guest.booking_status || ''}"`,
                `"${guest.total_amount || ''}"`,
                `"${guest.booking_reference || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guest_search_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Guest data exported to CSV');
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSearchType('all');
        setStatusFilter('all');
        setAdvancedFilters({
            dateFrom: '',
            dateTo: '',
            roomType: '',
            adults: '',
            children: '',
            minAmount: '',
            maxAmount: ''
        });
        loadAllGuests();
    };

    return (
        <div className="enhanced-guest-search">
            {/* Header Section */}
            <div className="header-section">
                <div className="header-content">
                    <h1 className="page-title">
                        <FaUser className="title-icon" />
                        Enhanced Guest Management
                    </h1>
                    <p className="page-subtitle">
                        Comprehensive guest search, check-in, and check-out management
                    </p>
                </div>
                
                <div className="header-actions">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className="btn btn-secondary"
                    >
                        <FaFilter className="btn-icon" />
                        {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </button>
                    <button onClick={exportToCSV} className="btn btn-success">
                        <FaDownload className="btn-icon" />
                        Export CSV
                    </button>
                    <button onClick={loadAllGuests} className="btn btn-primary">
                        <FaSync className="btn-icon" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaUser className="text-blue-600" />
                        </div>
                        <div className="stat-content">
                            <h3 className="stat-value">{stats.total_guests || 0}</h3>
                            <p className="stat-label">Total Guests</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaCheckCircle className="text-green-600" />
                        </div>
                        <div className="stat-content">
                            <h3 className="stat-value">{stats.checked_in_guests || 0}</h3>
                            <p className="stat-label">Checked In</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaTimesCircle className="text-gray-600" />
                        </div>
                        <div className="stat-content">
                            <h3 className="stat-value">{stats.checked_out_guests || 0}</h3>
                            <p className="stat-label">Checked Out</p>
                        </div>
                    </div>
                    
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FaClock className="text-yellow-600" />
                        </div>
                        <div className="stat-content">
                            <h3 className="stat-value">{stats.confirmed_bookings || 0}</h3>
                            <p className="stat-label">Confirmed</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Section */}
            <div className="search-section">
                <div className="search-form">
                    <div className="search-row">
                        <div className="search-group">
                            <label className="search-label">Search Type</label>
                            <select 
                                value={searchType} 
                                onChange={(e) => setSearchType(e.target.value)}
                                className="search-select"
                            >
                                <option value="all">All Guests</option>
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone</option>
                                <option value="room">Room Number</option>
                                <option value="booking_ref">Booking Reference</option>
                                <option value="id_proof">ID Proof</option>
                            </select>
                        </div>
                        
                        <div className="search-group">
                            <label className="search-label">Search Term</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Enter search term..."
                                className="search-input"
                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        
                        <div className="search-group">
                            <label className="search-label">Status Filter</label>
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="search-select"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="checked_in">Checked In</option>
                                <option value="checked_out">Checked Out</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        
                        <div className="search-group">
                            <button onClick={handleSearch} className="btn btn-primary search-btn">
                                <FaSearch className="btn-icon" />
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="advanced-filters">
                        <h3 className="filters-title">Advanced Filters</h3>
                        <div className="filters-grid">
                            <div className="filter-group">
                                <label className="filter-label">From Date</label>
                                <input
                                    type="date"
                                    value={advancedFilters.dateFrom}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                    className="filter-input"
                                />
                            </div>
                            
                            <div className="filter-group">
                                <label className="filter-label">To Date</label>
                                <input
                                    type="date"
                                    value={advancedFilters.dateTo}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                    className="filter-input"
                                />
                            </div>
                            
                            <div className="filter-group">
                                <label className="filter-label">Room Type</label>
                                <input
                                    type="text"
                                    value={advancedFilters.roomType}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, roomType: e.target.value }))}
                                    placeholder="Room type..."
                                    className="filter-input"
                                />
                            </div>
                            
                            <div className="filter-group">
                                <label className="filter-label">Adults</label>
                                <input
                                    type="number"
                                    value={advancedFilters.adults}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, adults: e.target.value }))}
                                    placeholder="Min adults..."
                                    className="filter-input"
                                />
                            </div>
                            
                            <div className="filter-group">
                                <label className="filter-label">Children</label>
                                <input
                                    type="number"
                                    value={advancedFilters.children}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, children: e.target.value }))}
                                    placeholder="Min children..."
                                    className="filter-input"
                                />
                            </div>
                            
                            <div className="filter-group">
                                <label className="filter-label">Amount Range</label>
                                <div className="amount-range">
                                    <input
                                        type="number"
                                        value={advancedFilters.minAmount}
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                                        placeholder="Min amount..."
                                        className="filter-input amount-input"
                                    />
                                    <span className="amount-separator">to</span>
                                    <input
                                        type="number"
                                        value={advancedFilters.maxAmount}
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                                        placeholder="Max amount..."
                                        className="filter-input amount-input"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="filters-actions">
                            <button onClick={clearFilters} className="btn btn-outline">
                                Clear All Filters
                            </button>
                            <button onClick={handleSearch} className="btn btn-primary">
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Section */}
            <div className="results-section">
                <div className="results-header">
                    <h3 className="results-title">
                        Search Results ({searchResults.length} guests)
                    </h3>
                    <div className="results-actions">
                        <button onClick={exportToCSV} className="btn btn-sm btn-success">
                            <FaDownload className="btn-icon" />
                            Export
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Searching guests...</p>
                    </div>
                ) : searchResults.length === 0 ? (
                    <div className="empty-state">
                        <FaUser className="empty-icon" />
                        <h3>No guests found</h3>
                        <p>Try adjusting your search criteria or filters</p>
                    </div>
                ) : (
                    <div className="guests-grid">
                        {searchResults.map((guest) => (
                            <div key={`${guest.booking_id}-${guest.guest_id}`} className="guest-card">
                                <div className="guest-header">
                                    <div className="guest-avatar">
                                        <FaUser className="avatar-icon" />
                                    </div>
                                    <div className="guest-info">
                                        <h4 className="guest-name">
                                            {guest.first_name} {guest.last_name}
                                        </h4>
                                        <div className="guest-meta">
                                            <span className="guest-email">
                                                <FaEnvelope className="meta-icon" />
                                                {guest.email || 'No email'}
                                            </span>
                                            <span className="guest-phone">
                                                <FaPhone className="meta-icon" />
                                                {guest.phone || 'No phone'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="guest-status">
                                        <span className={`status-badge ${getStatusColor(guest.booking_status)}`}>
                                            {getStatusIcon(guest.booking_status)}
                                            {guest.booking_status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <div className="guest-details">
                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <FaBed className="detail-icon" />
                                            Room:
                                        </span>
                                        <span className="detail-value">
                                            {guest.room_number} ({guest.room_type_name || 'N/A'})
                                        </span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <FaCalendarAlt className="detail-icon" />
                                            Dates:
                                        </span>
                                        <span className="detail-value">
                                            {formatDate(guest.check_in_date)} - {formatDate(guest.check_out_date)}
                                        </span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <FaIdCard className="detail-icon" />
                                            Booking:
                                        </span>
                                        <span className="detail-value">
                                            {guest.booking_reference}
                                        </span>
                                    </div>
                                    
                                    <div className="detail-row">
                                        <span className="detail-label">
                                            <FaMoneyBillWave className="detail-icon" />
                                            Amount:
                                        </span>
                                        <span className="detail-value">
                                            ₹{parseFloat(guest.total_amount || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="guest-actions">
                                    <button 
                                        onClick={() => {
                                            setSelectedGuest(guest);
                                            setShowDetails(true);
                                        }}
                                        className="btn btn-sm btn-outline"
                                        title="View Details"
                                    >
                                        <FaEye className="btn-icon" />
                                        Details
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            setSelectedGuest(guest);
                                            setShowFileViewer(true);
                                        }}
                                        className="btn btn-sm btn-outline"
                                        title="View Files"
                                    >
                                        📄 Files
                                    </button>
                                    
                                    {/* Check-in Button - Only show for confirmed guests */}
                                    {guest.booking_status === 'confirmed' && (
                                        <button
                                            onClick={() => handleCheckin(guest)}
                                            disabled={checkinLoading[guest.booking_id]}
                                            className="btn btn-sm btn-success"
                                            title="Check In Guest"
                                        >
                                            <FaCheckCircle className="btn-icon" />
                                            {checkinLoading[guest.booking_id] ? 'Processing...' : 'Check In'}
                                        </button>
                                    )}
                                    
                                    {/* Check-out Button - Only show for checked-in guests */}
                                    {guest.booking_status === 'checked_in' && (
                                        <button
                                            onClick={() => handleCheckout(guest)}
                                            disabled={checkoutLoading[guest.booking_id]}
                                            className="btn btn-sm btn-warning"
                                            title="Check Out Guest"
                                        >
                                            <FaTimesCircle className="btn-icon" />
                                            {checkoutLoading[guest.booking_id] ? 'Processing...' : 'Check Out'}
                                        </button>
                                    )}
                                    
                                    {/* Day Extend Button - Only show for checked-in guests */}
                                    {guest.booking_status === 'checked_in' && (
                                        <button
                                            onClick={() => handleDayExtend(guest)}
                                            className="btn btn-sm btn-info"
                                            title="Extend Stay"
                                        >
                                            <FaCalendarPlus className="btn-icon" />
                                            Day Extend
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Guest Details Modal */}
            {showDetails && selectedGuest && (
                <div className="modal-overlay" onClick={() => setShowDetails(false)}>
                    <div className="modal-content guest-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {selectedGuest.room_number} - Guest Details
                            </h3>
                            <button 
                                onClick={() => setShowDetails(false)}
                                className="modal-close"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="guest-details-grid">
                                <div className="detail-section">
                                    <h4 className="section-title">Personal Information</h4>
                                    <div className="detail-item">
                                        <span className="detail-label">Name:</span>
                                        <span className="detail-value">
                                            {selectedGuest.first_name} {selectedGuest.last_name}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Email:</span>
                                        <span className="detail-value">{selectedGuest.email || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Phone:</span>
                                        <span className="detail-value">{selectedGuest.phone || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">ID Proof:</span>
                                        <span className="detail-value">
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
                                    <div className="detail-item">
                                        <span className="detail-label">Adults:</span>
                                        <span className="detail-value">{selectedGuest.adults || 1}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Children:</span>
                                        <span className="detail-value">{selectedGuest.children || 0}</span>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h4 className="section-title">Booking Information</h4>
                                    <div className="detail-item">
                                        <span className="detail-label">Booking Reference:</span>
                                        <span className="detail-value">{selectedGuest.booking_reference}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Booking Source:</span>
                                        <span className={`detail-value ${selectedGuest.booking_source === 'corporate' ? 'text-blue-600 font-semibold' : ''}`}>
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
                                    <div className="detail-item">
                                        <span className="detail-label">Room Number:</span>
                                        <span className="detail-value">{selectedGuest.room_number}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Room Type:</span>
                                        <span className="detail-value">{selectedGuest.room_type_name || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Status:</span>
                                        <span className="detail-value">
                                            <span className={`status-badge ${getStatusColor(selectedGuest.booking_status)}`}>
                                                {selectedGuest.booking_status?.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h4 className="section-title">Stay Details</h4>
                                    <div className="detail-item">
                                        <span className="detail-label">Check-in Date:</span>
                                        <span className="detail-value">{formatDate(selectedGuest.check_in_date)}</span>
                                    </div>
                                    {selectedGuest.check_in_time && (
                                        <div className="detail-item">
                                            <span className="detail-label">Check-in Time:</span>
                                            <span className="detail-value">{selectedGuest.check_in_time} {selectedGuest.check_in_ampm || 'AM'}</span>
                                        </div>
                                    )}
                                    <div className="detail-item">
                                        <span className="detail-label">Check-out Date:</span>
                                        <span className="detail-value">{formatDate(selectedGuest.check_out_date)}</span>
                                    </div>
                                    {selectedGuest.check_out_time && (
                                        <div className="detail-item">
                                            <span className="detail-label">Check-out Time:</span>
                                            <span className="detail-value">{selectedGuest.check_out_time} {selectedGuest.check_out_ampm || 'AM'}</span>
                                        </div>
                                    )}
                                    {selectedGuest.check_in_time && selectedGuest.check_out_time && (
                                        <div className="detail-item">
                                            <span className="detail-label">Total Hours:</span>
                                            <span className="detail-value">{calculateTotalHours(
                                                selectedGuest.check_in_time, 
                                                selectedGuest.check_in_ampm || 'AM', 
                                                selectedGuest.check_out_time, 
                                                selectedGuest.check_out_ampm || 'AM',
                                                selectedGuest.check_in_date,
                                                selectedGuest.check_out_date
                                            )}</span>
                                        </div>
                                    )}
                                    <div className="detail-item">
                                        <span className="detail-label">Total Amount:</span>
                                        <span className="detail-value">₹{parseFloat(selectedGuest.total_amount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Created:</span>
                                        <span className="detail-value">{formatDate(selectedGuest.created_at || selectedGuest.booking_created_at)}</span>
                                    </div>
                                </div>

                                <div className="detail-section">
                                    <h4 className="section-title">Payment Details</h4>
                                    
                                    {/* Owner Reference Information */}
                                    {(selectedGuest.owner_reference && !(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type)) && (
                                        <div className="detail-item">
                                            <span className="detail-label">Status:</span>
                                            <span className="detail-value text-green-600 font-semibold">
                                                🏨 Reference by Owner of the Hotel
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Regular Payment Details - Only show if NOT owner reference */}
                                    {!(selectedGuest.owner_reference && !(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type)) && (
                                        <>
                                            <div className="detail-item">
                                                <span className="detail-label">Total Amount:</span>
                                                <span className="detail-value font-semibold">₹{parseFloat(selectedGuest.total_amount || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Paid Amount:</span>
                                                <span className="detail-value text-green-600 font-semibold">
                                                    ₹{parseFloat(selectedGuest.paid_amount || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Remaining Amount:</span>
                                                <span className={`detail-value font-semibold ${
                                                    (selectedGuest.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                    ₹{parseFloat(selectedGuest.remaining_amount || 0).toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Payment Status:</span>
                                                <span className={`detail-value font-semibold ${
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
                                                    <div className="detail-item">
                                                        <span className="detail-label">Payment Method:</span>
                                                        <span className="detail-value text-blue-600 font-semibold">
                                                            {(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type).replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    {selectedGuest.razorpay_payment_id && (
                                                        <div className="detail-item">
                                                            <span className="detail-label">Razorpay ID:</span>
                                                            <span className="detail-value font-mono text-xs">{selectedGuest.razorpay_payment_id}</span>
                                                        </div>
                                                    )}
                                                    {selectedGuest.payment_id && !selectedGuest.razorpay_payment_id && (
                                                        <div className="detail-item">
                                                            <span className="detail-label">Payment ID:</span>
                                                            <span className="detail-value font-mono text-xs">{selectedGuest.payment_id}</span>
                                                        </div>
                                                    )}
                                                    {selectedGuest.transaction_id && (
                                                        <div className="detail-item">
                                                            <span className="detail-label">Transaction ID:</span>
                                                            <span className="detail-value font-mono text-xs">{selectedGuest.transaction_id}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            
                                            {/* Due Amount Warning - Only show if NOT owner reference and amount > ₹1 */}
                                            {(selectedGuest.remaining_amount || 0) > 1 && !(selectedGuest.owner_reference && !(selectedGuest.payment_method || selectedGuest.payment_type || selectedGuest.booking_payment_type)) && (
                                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <div className="flex items-center">
                                                        <FaMoneyBillWave className="text-red-500 mr-2" />
                                                        <span className="text-red-800 font-medium">
                                                            Due Amount Pending: ₹{parseFloat(selectedGuest.remaining_amount || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <p className="text-red-700 text-sm mt-1">
                                                        Guest cannot be checked out until the remaining amount is collected.
                                                    </p>
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

                                <div className="detail-section">
                                    <h4 className="section-title">Corporate Information</h4>
                                    {selectedGuest.booking_source === 'corporate' && (
                                        <>
                                            <div className="detail-item">
                                                <span className="detail-label">Corporate Status:</span>
                                                <span className="detail-value text-blue-600 font-semibold">Active</span>
                                            </div>
                                            <div className="detail-item">
                                                <span className="detail-label">Corporate Type:</span>
                                                <span className="detail-value">Business Booking</span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Company Information Section - Only for Corporate Bookings */}
                                {selectedGuest.booking_source === 'corporate' && (
                                    <div className="detail-section">
                                        <h4 className="section-title">Company Details</h4>
                                        <div className="detail-item">
                                            <span className="detail-label">Company Name:</span>
                                            <span className="detail-value text-blue-600 font-semibold">
                                                {selectedGuest.company_name || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">GST Number:</span>
                                            <span className="detail-value">
                                                {selectedGuest.gst_number || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Contact Person:</span>
                                            <span className="detail-value">
                                                {selectedGuest.contact_person || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Contact Phone:</span>
                                            <span className="detail-value">
                                                {selectedGuest.contact_phone || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Contact Email:</span>
                                            <span className="detail-value">
                                                {selectedGuest.contact_email || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Billing Address:</span>
                                            <span className="detail-value">
                                                {selectedGuest.billing_address || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <div className="modal-actions">
                                {/* Check-in Action */}
                                {selectedGuest.booking_status === 'confirmed' && (
                                    <button
                                        onClick={() => {
                                            handleCheckin(selectedGuest);
                                            setShowDetails(false);
                                        }}
                                        disabled={checkinLoading[selectedGuest.booking_id]}
                                        className="btn btn-success"
                                    >
                                        <FaCheckCircle className="btn-icon" />
                                        {checkinLoading[selectedGuest.booking_id] ? 'Processing Check-in...' : 'Check In Guest'}
                                    </button>
                                )}
                                
                                {/* Check-out Action */}
                                {selectedGuest.booking_status === 'checked_in' && (
                                    <button
                                        onClick={() => {
                                            handleCheckout(selectedGuest);
                                            setShowDetails(false);
                                        }}
                                        disabled={checkoutLoading[selectedGuest.booking_id]}
                                        className="btn btn-warning"
                                    >
                                        <FaTimesCircle className="btn-icon" />
                                        {checkoutLoading[selectedGuest.booking_id] ? 'Processing Checkout...' : 'Check Out Guest'}
                                    </button>
                                )}
                                
                                {/* Day Extend Action */}
                                {selectedGuest.booking_status === 'checked_in' && (
                                    <button
                                        onClick={() => {
                                            handleDayExtend(selectedGuest);
                                            setShowDetails(false);
                                        }}
                                        className="btn btn-info"
                                    >
                                        <FaCalendarPlus className="btn-icon" />
                                        Day Extend
                                    </button>
                                )}
                                
                                <button onClick={() => setShowDetails(false)} className="btn btn-outline">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Check-out Confirmation Modal */}
            {showCheckoutConfirm && guestToCheckout && (
                <div className="modal-overlay" onClick={() => setShowCheckoutConfirm(false)}>
                    <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Checkout</h3>
                            <button 
                                onClick={() => setShowCheckoutConfirm(false)}
                                className="modal-close"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="confirmation-content">
                                <div className="confirmation-icon">
                                    <FaTimesCircle className="text-warning" />
                                </div>
                                <h4 className="confirmation-title">Check Out Guest</h4>
                                <p className="confirmation-message">
                                    Are you sure you want to check out <strong>{guestToCheckout.first_name} {guestToCheckout.last_name}</strong> 
                                    from Room <strong>{guestToCheckout.room_number}</strong>?
                                </p>
                                <div className="confirmation-details">
                                    <p><strong>Check-in Date:</strong> {formatDate(guestToCheckout.check_in_date)}</p>
                                    <p><strong>Check-out Date:</strong> {formatDate(guestToCheckout.check_out_date)}</p>
                                    <p><strong>Total Amount:</strong> ₹{parseFloat(guestToCheckout.total_amount || 0).toFixed(2)}</p>
                                    {guestToCheckout.paid_amount !== undefined && (
                                        <>
                                            <p><strong>Amount Paid:</strong> ₹{parseFloat(guestToCheckout.paid_amount || 0).toFixed(2)}</p>
                                            <p><strong>Remaining Amount:</strong> 
                                                <span className={parseFloat(guestToCheckout.remaining_amount || 0) > 0 ? 'text-orange-600 font-bold' : 'text-green-600 font-bold'}>
                                                    ₹{parseFloat(guestToCheckout.remaining_amount || 0).toFixed(2)}
                                                </span>
                                            </p>
                                        </>
                                    )}
                                </div>
                                
                                {/* Warning for remaining amount */}
                                {guestToCheckout.remaining_amount > 0 && (
                                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center">
                                            <FaMoneyBillWave className="text-orange-500 mr-2" />
                                            <div>
                                                <p className="text-sm text-orange-800 font-medium">
                                                    Outstanding Balance: ₹{parseFloat(guestToCheckout.remaining_amount).toFixed(2)}
                                                </p>
                                                <p className="text-xs text-orange-700 mt-1">
                                                    Please collect the remaining amount before checkout.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button onClick={() => setShowCheckoutConfirm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                            <button 
                                onClick={confirmCheckout}
                                disabled={checkoutLoading[guestToCheckout.booking_id]}
                                className="btn btn-warning"
                            >
                                <FaTimesCircle className="btn-icon" />
                                {checkoutLoading[guestToCheckout.booking_id] ? 'Processing...' : 
                                    guestToCheckout.remaining_amount > 0 ? 'Checkout (Amount Due)' : 'Confirm Checkout'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Check-in Confirmation Modal */}
            {showCheckinConfirm && guestToCheckin && (
                <div className="modal-overlay" onClick={() => setShowCheckinConfirm(false)}>
                    <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Confirm Check-in</h3>
                            <button 
                                onClick={() => setShowCheckinConfirm(false)}
                                className="modal-close"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="confirmation-content">
                                <div className="confirmation-icon">
                                    <FaCheckCircle className="text-success" />
                                </div>
                                <h4 className="confirmation-title">Check In Guest</h4>
                                <p className="confirmation-message">
                                    Are you sure you want to check in <strong>{guestToCheckin.first_name} {guestToCheckin.last_name}</strong> 
                                    to Room <strong>{guestToCheckin.room_number}</strong>?
                                </p>
                                <div className="confirmation-details">
                                    <p><strong>Check-in Date:</strong> {formatDate(guestToCheckin.check_in_date)}</p>
                                    <p><strong>Check-out Date:</strong> {formatDate(guestToCheckin.check_out_date)}</p>
                                    <p><strong>Total Amount:</strong> ₹{parseFloat(guestToCheckin.total_amount || 0).toFixed(2)}</p>
                                    {guestToCheckin.paid_amount !== undefined && (
                                        <>
                                            <p><strong>Amount Paid:</strong> ₹{parseFloat(guestToCheckin.paid_amount || 0).toFixed(2)}</p>
                                            <p><strong>Remaining Amount:</strong> 
                                                <span className={parseFloat(guestToCheckin.remaining_amount || 0) > 0 ? 'text-orange-600 font-bold' : 'text-green-600 font-bold'}>
                                                    ₹{parseFloat(guestToCheckin.remaining_amount || 0).toFixed(2)}
                                                </span>
                                            </p>
                                        </>
                                    )}
                                </div>
                                
                                {/* Warning for remaining amount during check-in */}
                                {guestToCheckin.remaining_amount > 0 && (
                                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div className="flex items-center">
                                            <FaMoneyBillWave className="text-orange-500 mr-2" />
                                            <div>
                                                <p className="text-sm text-orange-800 font-medium">
                                                    Outstanding Balance: ₹{parseFloat(guestToCheckin.remaining_amount).toFixed(2)}
                                                </p>
                                                <p className="text-xs text-orange-700 mt-1">
                                                    Guest has unpaid balance. Consider collecting payment before check-in.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button onClick={() => setShowCheckinConfirm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                            <button 
                                onClick={confirmCheckin}
                                disabled={checkinLoading[guestToCheckin.booking_id]}
                                className="btn btn-success"
                            >
                                <FaCheckCircle className="btn-icon" />
                                {checkinLoading[guestToCheckin.booking_id] ? 'Processing...' : 
                                    guestToCheckin.remaining_amount > 0 ? 'Check-in (Amount Due)' : 'Confirm Check-in'
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Day Extend Modal */}
            {showExtendModal && guestToExtend && (
                <div className="modal-overlay" onClick={() => setShowExtendModal(false)}>
                    <div className="modal-content extend-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Extend Stay</h3>
                            <button 
                                onClick={() => setShowExtendModal(false)}
                                className="modal-close"
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <div className="extend-content">
                                <div className="extend-icon">
                                    <FaCalendarPlus className="text-info" />
                                </div>
                                <h4 className="extend-title">Extend Guest Stay</h4>
                                <p className="extend-message">
                                    Extend stay for <strong>{guestToExtend.first_name} {guestToExtend.last_name}</strong> 
                                    in Room <strong>{guestToExtend.room_number}</strong>
                                </p>
                                
                                <div className="extend-form">
                                    <div className="form-group">
                                        <label className="form-label">Current Check-out Date:</label>
                                        <div className="current-date-display">
                                            {formatDate(guestToExtend.check_out_date)} at {guestToExtend.check_out_time || '11:00'} {guestToExtend.check_out_ampm || 'AM'}
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Extension Options:</label>
                                        <div className="extension-options">
                                            <button
                                                type="button"
                                                className={`extension-option ${extendForm.days === 1 ? 'active' : ''}`}
                                                onClick={() => handleExtendFormChange('days', 1)}
                                            >
                                                +1 Day
                                            </button>
                                            <button
                                                type="button"
                                                className={`extension-option ${extendForm.days === 2 ? 'active' : ''}`}
                                                onClick={() => handleExtendFormChange('days', 2)}
                                            >
                                                +2 Days
                                            </button>
                                            <button
                                                type="button"
                                                className={`extension-option ${extendForm.days === 3 ? 'active' : ''}`}
                                                onClick={() => handleExtendFormChange('days', 3)}
                                            >
                                                +3 Days
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Custom Extension (Days):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={extendForm.customDays}
                                            onChange={(e) => handleExtendFormChange('customDays', e.target.value)}
                                            className="form-input"
                                            placeholder="Enter number of days"
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">New Check-out Date:</label>
                                        <input
                                            type="date"
                                            value={extendForm.newCheckoutDate}
                                            onChange={(e) => handleExtendFormChange('newCheckoutDate', e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">New Check-out Time:</label>
                                        <div className="time-input-group">
                                            <input
                                                type="time"
                                                value={extendForm.newCheckoutTime}
                                                onChange={(e) => handleExtendFormChange('newCheckoutTime', e.target.value)}
                                                className="form-input time-input"
                                            />
                                            <select
                                                value={extendForm.newCheckoutAmpm}
                                                onChange={(e) => handleExtendFormChange('newCheckoutAmpm', e.target.value)}
                                                className="form-select ampm-select"
                                            >
                                                <option value="AM">AM</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label className="form-label">Additional Amount:</label>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-lg font-semibold text-gray-900">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={extendForm.additionalAmount}
                                                onChange={(e) => handleExtendFormChange('additionalAmount', e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Enter the additional amount for the extended stay
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                onClick={() => setShowExtendModal(false)} 
                                className="btn btn-outline"
                                disabled={extendLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmExtend}
                                disabled={extendLoading}
                                className="btn btn-info"
                            >
                                <FaCalendarPlus className="btn-icon" />
                                {extendLoading ? 'Processing...' : 'Extend Stay'}
                            </button>
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

export default EnhancedGuestSearch;
