import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRealTime } from '../../contexts/RealTimeContext';
import { useAuth } from '../../contexts/AuthContext';
import { buildApiUrl } from '../../config/api';
import { toast } from 'react-toastify';
import FileViewerModal from '../common/FileViewerModal';
import { 
    FaSearch, 
    FaFilter, 
    FaDownload, 
    FaEye,
    FaEdit,
    FaCalendarAlt,
    FaUser,
    FaPhone,
    FaEnvelope,
    FaBed,
    FaMoneyBillWave,
    FaSync,
    FaTimes,
    FaChartBar,
    FaHistory,
    FaBuilding,
    FaCreditCard,
    FaCheckCircle,
    FaExclamationTriangle,
    FaDoorOpen,
    FaHome,
    FaUsers,
    FaBan
} from 'react-icons/fa';
import '../reception/GuestSearch.css';
import './AdminGuestHistory.css';
import './AdminGuestHistoryMobile.css';

const AdminGuestHistory = () => {
    const { user } = useAuth();
    const { isConnected, subscribeToChannel } = useRealTime();
    const [guestHistory, setGuestHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState(null);
    const [showGuestDetails, setShowGuestDetails] = useState(false);
    const [showFileViewer, setShowFileViewer] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEditBookingModal, setShowEditBookingModal] = useState(false);
    const [modalClickPosition, setModalClickPosition] = useState(null);
    const [editingGuest, setEditingGuest] = useState(null);
    const [editingBooking, setEditingBooking] = useState(null);
    const [editingSection, setEditingSection] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [roomAvailability, setRoomAvailability] = useState({ rooms: [], room_types: [] });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [itemsPerPage] = useState(20);
    const [activeTab, setActiveTab] = useState('current'); // New state for tab management
    const [stats, setStats] = useState({
        total_guests: 0,
        checked_in_guests: 0,
        checked_out_guests: 0,
        guests_with_due: 0,
        corporate_bookings: 0
    });

    const [filters, setFilters] = useState({
        status: 'all',
        date_from: '',
        date_to: '',
        search: '',
        searchType: 'all',
        corporate: 'all',
        dueAmount: 'all'
    });
    const [showFilters, setShowFilters] = useState(false);

    // Real-time updates
    useEffect(() => {
        if (isConnected && user?.role === 'admin') {
            subscribeToChannel('admin');
        }
    }, [isConnected, user?.role, subscribeToChannel]);

    // Load guest history on component mount and filter changes
    useEffect(() => {
        loadGuestHistory();
    }, [currentPage, filters]);

    // Initialize statistics on component mount
    useEffect(() => {
        calculateStatistics([]);
    }, []);

    const loadRoomAvailability = useCallback(async (checkInDate, checkOutDate, excludeBookingId = null) => {
        try {
            if (!checkInDate || !checkOutDate) return;
            
            const token = localStorage.getItem('token');
            if (!token) return;
            
            let apiUrl = `${buildApiUrl('admin/room_availability_api.php')}?check_in_date=${checkInDate}&check_out_date=${checkOutDate}`;
            if (excludeBookingId) {
                apiUrl += `&exclude_booking_id=${excludeBookingId}`;
            }
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                setRoomAvailability(data.data);
            }
        } catch (error) {
            console.error('Error loading room availability:', error);
        }
    }, []);

    const calculateStatistics = useCallback((guests) => {
        try {
            // Calculate statistics from the guest data
            const allGuests = guests || [];
            
            const statsData = {
                total_guests: allGuests.length,
                checked_in_guests: allGuests.filter(guest => guest.is_current).length,
                checked_out_guests: allGuests.filter(guest => !guest.is_current).length,
                guests_with_due: allGuests.filter(guest => (parseFloat(guest.remaining_amount) || 0) > 0).length,
                corporate_bookings: allGuests.filter(guest => guest.booking_source === 'corporate').length
            };
            
            setStats(statsData);
        } catch (error) {
            console.error('Error calculating statistics:', error);
        }
    }, []);

    const loadGuestHistory = useCallback(async () => {
        try {
            setLoading(true);
            
            // Use the new dedicated admin API endpoint that gets all guest data in one call
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Authentication token not found');
                return;
            }
            
            const response = await fetch(`${buildApiUrl('admin/admin_guest_data_api.php')}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('🔍 Response status:', response.status);
            console.log('🔍 Response headers:', response.headers);
            
            const responseText = await response.text();
            console.log('🔍 Raw response text:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse JSON response:', parseError);
                console.error('❌ Raw response:', responseText);
                toast.error('Invalid response from server');
                return;
            }
            console.log('🔍 Admin guest data API response:', data);
            console.log('🔍 Response type:', typeof data);
            console.log('🔍 Response keys:', Object.keys(data));
            console.log('🔍 Response data:', data.data);
            
            if (data.success && data.data) {
                const allGuests = data.data.map(guest => {
                    // Determine if guest is current based on booking status and dates
                    const currentDate = new Date().toISOString().split('T')[0];
                    const checkInDate = guest.check_in_date;
                    const checkOutDate = guest.check_out_date;
                    
                    const isCurrentGuest = 
                        guest.booking_status === 'checked_in' || 
                        (guest.booking_status === 'confirmed' && 
                         checkInDate && checkOutDate && 
                         currentDate >= checkInDate && 
                         currentDate <= checkOutDate);

                    return {
                        ...guest,
                        source: 'admin',
                        is_current: isCurrentGuest
                    };
                });
                
                console.log('✅ All guests loaded:', allGuests.length, 'records');
                console.log('📊 Stats from API:', data.stats);
                
                // Apply filters
                let filteredResults = allGuests;
                
                // Search filter
                if (filters.search && filters.search.trim()) {
                    const searchTerm = filters.search.toLowerCase();
                    filteredResults = filteredResults.filter(guest => {
                    const searchFields = [
                        guest.first_name || '',
                        guest.last_name || '',
                        guest.full_name || '',
                        guest.phone || '',
                        guest.email || '',
                        guest.booking_reference || ''
                    ].map(field => field.toLowerCase());
                    
                    return searchFields.some(field => field.includes(searchTerm));
                });
            }
            
            // Status filter
            if (filters.status && filters.status !== 'all') {
                console.log(`🔍 Applying status filter: ${filters.status}`);
                const beforeCount = filteredResults.length;
                filteredResults = filteredResults.filter(guest => 
                    guest.booking_status === filters.status
                );
                console.log(`📊 Status filter: ${beforeCount} → ${filteredResults.length} guests`);
            }
            
            // Corporate filter
            if (filters.corporate && filters.corporate !== 'all') {
                console.log(`🔍 Applying corporate filter: ${filters.corporate}`);
                const beforeCount = filteredResults.length;
                filteredResults = filteredResults.filter(guest => 
                    guest.booking_source === filters.corporate
                );
                console.log(`📊 Corporate filter: ${beforeCount} → ${filteredResults.length} guests`);
            }
            
            // Date filters
            if (filters.date_from && filters.date_from.trim()) {
                console.log(`🔍 Applying date_from filter: ${filters.date_from}`);
                const beforeCount = filteredResults.length;
                filteredResults = filteredResults.filter(guest => 
                    new Date(guest.check_in_date) >= new Date(filters.date_from)
                );
                console.log(`📊 Date from filter: ${beforeCount} → ${filteredResults.length} guests`);
            }
            if (filters.date_to && filters.date_to.trim()) {
                console.log(`🔍 Applying date_to filter: ${filters.date_to}`);
                const beforeCount = filteredResults.length;
                filteredResults = filteredResults.filter(guest => 
                    new Date(guest.check_out_date) <= new Date(filters.date_to)
                );
                console.log(`📊 Date to filter: ${beforeCount} → ${filteredResults.length} guests`);
            }
            
            // Due amount filter
            if (filters.dueAmount === 'with_due') {
                console.log(`🔍 Applying due amount filter: with_due`);
                const beforeCount = filteredResults.length;
                filteredResults = filteredResults.filter(guest => 
                    (parseFloat(guest.remaining_amount) || 0) > 0
                );
                console.log(`📊 Due amount filter: ${beforeCount} → ${filteredResults.length} guests`);
            } else if (filters.dueAmount === 'fully_paid') {
                console.log(`🔍 Applying due amount filter: fully_paid`);
                const beforeCount = filteredResults.length;
                filteredResults = filteredResults.filter(guest => 
                    (parseFloat(guest.remaining_amount) || 0) === 0
                );
                console.log(`📊 Due amount filter: ${beforeCount} → ${filteredResults.length} guests`);
            }
            
            setGuestHistory(filteredResults);
            calculateStatistics(filteredResults);
            
            console.log('🎯 Final filtered results:', filteredResults.length, 'records');
            console.log('🔍 Active filters:', filters);
            
            } else {
                console.log('❌ Admin guest data API failed:', data);
                setGuestHistory([]);
                calculateStatistics([]);
            }
            
        } catch (error) {
            console.error('❌ Error loading guest data:', error);
            setGuestHistory([]);
            calculateStatistics([]);
            toast.error('Network error while loading guest data');
        } finally {
            setLoading(false);
        }
    }, [filters, calculateStatistics]);

    // Real-time updates handler - defined after loadGuestHistory
    useEffect(() => {
        if (isConnected && user?.role === 'admin') {
            // Listen for booking status changes
            const handleRealTimeUpdate = (data) => {
                if (data.type === 'booking_confirmed' || data.type === 'booking_checked_in' || data.type === 'booking_updated') {
                    console.log('🔄 Real-time update received, refreshing guest data:', data);
                    // Refresh guest data to show updated booking status
                    loadGuestHistory();
                }
            };
            
            // Add event listener for real-time updates
            window.addEventListener('booking_updated', handleRealTimeUpdate);
            window.addEventListener('guest_updated', handleRealTimeUpdate);
            
            return () => {
                window.removeEventListener('booking_updated', handleRealTimeUpdate);
                window.removeEventListener('guest_updated', handleRealTimeUpdate);
            };
        }
    }, [isConnected, user?.role, loadGuestHistory]);

    const handleFilterChange = (key, value) => {
        console.log(`🔧 Filter changed: ${key} = ${value}`);
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
        
        // Auto-search for certain filter changes (but not for search term to avoid too many API calls)
        if (key !== 'search' && key !== 'searchType') {
            console.log(`🔄 Auto-triggering search for filter: ${key}`);
            // Small delay to avoid rapid API calls
            setTimeout(() => {
                loadGuestHistory();
            }, 300);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        console.log('🔍 Search button clicked with filters:', filters);
        loadGuestHistory();
    };

    const handleRefresh = () => {
        loadGuestHistory();
    };

    const handleClearFilters = () => {
        setFilters({
            search: '',
            searchType: 'all',
            status: 'all',
            corporate: 'all',
            date_from: '',
            date_to: '',
            dueAmount: 'all'
        });
        setCurrentPage(1);
        // Load all guests after clearing filters
        setTimeout(() => {
            loadGuestHistory();
        }, 100);
    };

    const handleViewDetails = (guest, event) => {
        console.log('🔍 handleViewDetails called with event:', event);
        
        // Capture click position for mobile modal positioning
        if (event && window.innerWidth <= 768) {
            const rect = event.currentTarget.getBoundingClientRect();
            const clickY = rect.top + rect.height / 2;
            const clickX = rect.left + rect.width / 2;
            
            console.log('📱 Mobile click detected:', {
                rect,
                clickY,
                clickX,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight
            });
            
            // Store click position for modal positioning
            setModalClickPosition({ x: clickX, y: clickY });
        } else {
            console.log('🖥️ Desktop click or no event');
        }
        
        setSelectedGuest(guest);
        setShowGuestDetails(true);
    };

    const handleCloseGuestDetails = () => {
        setShowGuestDetails(false);
        setModalClickPosition(null); // Reset click position
    };

    const handleViewFiles = (guest) => {
        setSelectedGuest(guest);
        setShowFileViewer(true);
    };

    const handleEditGuest = (guest) => {
        setEditingGuest(guest);
        setShowEditModal(true);
    };

    const handleEditBooking = (guest) => {
        setEditingBooking(guest);
        setShowEditBookingModal(true);
    };

    const handleUpdateGuest = async (updatedData) => {
        try {
            const response = await fetch(buildApiUrl('admin/guest_history_api.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'update_guest_info',
                    guest_id: editingGuest.guest_id,
                    ...updatedData
                })
            });

            const data = await response.json();
            
            if (data.success) {
                toast.success('Guest information updated successfully! Reception guest search will also show updated data.');
                setShowEditModal(false);
                setEditingGuest(null);
                loadGuestHistory();
            } else {
                toast.error(data.message || 'Failed to update guest information');
            }
        } catch (error) {
            console.error('Error updating guest:', error);
            toast.error('Failed to update guest information');
        }
    };

    const handleUpdateBooking = async (updatedData) => {
        try {
            const response = await fetch(buildApiUrl('admin/guest_history_api.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'update_booking_info',
                    booking_id: editingBooking.booking_id,
                    ...updatedData
                })
            });

            const data = await response.json();
            
            if (data.success) {
                toast.success('Booking information updated successfully! Reception will also see updated data.');
                setShowEditBookingModal(false);
                setEditingBooking(null);
                loadGuestHistory();
            } else {
                toast.error(data.message || 'Failed to update booking information');
            }
        } catch (error) {
            console.error('Error updating booking:', error);
            toast.error('Failed to update booking information');
        }
    };

    const handleExport = async (format = 'csv') => {
        try {
            console.log('🚀 Starting export process for format:', format);
            
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('Authentication required for export');
                return;
            }

            const requestBody = {
                action: 'export_guest_history',
                format: format,
                date_from: filters.date_from || '',
                date_to: filters.date_to || ''
            };
            
            console.log('📤 Request body:', requestBody);
            console.log('🔑 Token exists:', !!token);

            const response = await fetch(buildApiUrl('admin/guest_history_api.php'), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            console.log('📥 Response received:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                url: response.url
            });

            if (format === 'csv') {
                // Check if response is CSV or JSON error
                const contentType = response.headers.get('content-type');
                
                if (contentType && contentType.includes('text/csv')) {
                    // It's CSV data
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `guest_history_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success('CSV exported successfully!');
                } else {
                    // It might be a JSON error response
                    try {
                        const errorData = await response.json();
                        console.error('Export error:', errorData);
                        toast.error(errorData.message || 'Failed to export CSV');
                    } catch (parseError) {
                        console.error('Failed to parse response:', parseError);
                        toast.error('Failed to export CSV - invalid response format');
                    }
                }
            } else {
                const data = await response.json();
                if (data.success) {
                    const jsonString = JSON.stringify(data.data.export_data, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `guest_history_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    toast.success('JSON exported successfully!');
                } else {
                    toast.error(data.message || 'Failed to export JSON');
                }
            }
            
            toast.success(`Guest history exported as ${format.toUpperCase()}`);
        } catch (error) {
            console.error('Error exporting guest history:', error);
            toast.error('Failed to export guest history');
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'confirmed': { color: 'bg-blue-100 text-blue-800', text: 'Booked', icon: FaBed },
            'checked_in': { color: 'bg-green-100 text-green-800', text: 'Checked In', icon: FaDoorOpen },
            'checked_out': { color: 'bg-gray-100 text-gray-800', text: 'Checked Out', icon: FaHistory },
            'cancelled': { color: 'bg-red-100 text-red-800', text: 'Cancelled', icon: FaBan }
        };
        
        const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', text: status, icon: FaUser };
        const IconComponent = config.icon;
        
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <IconComponent className="mr-1 w-3 h-3" />
                {config.text}
            </span>
        );
    };

    const getPaymentStatusBadge = (status, remainingAmount) => {
        if (remainingAmount > 0) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <FaExclamationTriangle className="mr-1 w-3 h-3" />
                    Due: {formatCurrency(remainingAmount)}
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaCheckCircle className="mr-1 w-3 h-3" />
                    Paid
                </span>
            );
        }
    };

    const handleEditSection = (guest, section) => {
        console.log('Edit section clicked:', { guest, section });
        
        setEditingGuest(guest);
        setEditingSection(section);
        
        // Initialize form data based on section
        let initialData = {};
        
        switch (section) {
            case 'contact':
                initialData = {
                    first_name: guest.first_name || '',
                    last_name: guest.last_name || '',
                    full_name: guest.full_name || '',
                    phone: guest.phone || '',
                    email: guest.email || '',
                    address: guest.address || ''
                };
                break;
            case 'room':
                initialData = {
                    room_number: guest.room_number || '',
                    room_type_name: guest.room_type_name || '',
                    room_type_id: guest.room_type_id || ''
                };
                break;
            case 'stay':
                initialData = {
                    check_in_date: guest.check_in_date || '',
                    check_out_date: guest.check_out_date || '',
                    adults: guest.adults || 1,
                    children: guest.children || 0
                };
                break;
            case 'financial':
                initialData = {
                    total_amount: guest.total_amount || 0,
                    paid_amount: guest.paid_amount || 0,
                    remaining_amount: guest.remaining_amount || 0,
                    payment_type: guest.payment_type || '',
                    payment_method: guest.payment_method || '',
                    booking_payment_type: guest.booking_payment_type || '',
                    payment_id: guest.payment_id || '',
                    razorpay_payment_id: guest.razorpay_payment_id || '',
                    transaction_id: guest.transaction_id || ''
                };
                break;
            default:
                break;
        }
        
        console.log('Initial form data:', initialData);
        setEditFormData(initialData);
        setShowEditModal(true);
        
        // Load room availability if editing room section
        if (section === 'room' && guest.check_in_date && guest.check_out_date) {
            loadRoomAvailability(guest.check_in_date, guest.check_out_date, guest.booking_id);
        }
    };

    const handleSaveEdit = async () => {
        try {
            // Special handling for room updates - show availability info
            if (editingSection === 'room' && editFormData.room_number) {
                const currentRoom = editingGuest.room_number;
                const newRoom = editFormData.room_number;
                
                if (currentRoom !== newRoom) {
                    // Show confirmation for room change
                    const confirmed = window.confirm(
                        `Are you sure you want to change the room from ${currentRoom} to ${newRoom}?\n\n` +
                        `The system will check if Room ${newRoom} is available for the current booking dates:\n` +
                        `${editingGuest.check_in_date} to ${editingGuest.check_out_date}`
                    );
                    
                    if (!confirmed) {
                        return;
                    }
                }
            }
            
            console.log('Saving edit data:', {
                action: 'update_section',
                guest_id: editingGuest.guest_id,
                booking_id: editingGuest.booking_id,
                section: editingSection,
                data: editFormData
            });

            const apiUrl = buildApiUrl('admin/guest_history_api.php');
            console.log('API URL:', apiUrl);

            const requestBody = {
                action: 'update_section',
                guest_id: editingGuest.guest_id,
                booking_id: editingGuest.booking_id,
                section: editingSection,
                data: editFormData
            };

            console.log('Request body:', requestBody);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const responseText = await response.text();
            console.log('Response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                toast.error('Invalid response from server');
                return;
            }
            
            console.log('Parsed response data:', data);
            
            if (data.success) {
                toast.success(`${editingSection.charAt(0).toUpperCase() + editingSection.slice(1)} information updated successfully!`);
                setShowEditModal(false);
                setEditingGuest(null);
                setEditingSection(null);
                setEditFormData({});
                loadGuestHistory();
            } else {
                // Enhanced error handling for room availability conflicts
                if (editingSection === 'room' && data.message && data.message.includes('Room') && data.message.includes('not available')) {
                    // Format room availability error for better display
                    const errorMessage = data.message.replace(/\n/g, '\n• ');
                    toast.error(
                        <div>
                            <div className="font-semibold mb-2">🚫 Room Not Available</div>
                            <div className="text-sm whitespace-pre-line">{errorMessage}</div>
                        </div>,
                        {
                            autoClose: 8000, // Show for 8 seconds
                            closeButton: true,
                            draggable: true,
                            position: "top-center"
                        }
                    );
                } else {
                    toast.error(data.message || 'Failed to update information');
                }
            }
        } catch (error) {
            console.error('Error updating information:', error);
            toast.error('Failed to update information: ' + error.message);
        }
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingGuest(null);
        setEditingSection(null);
        setEditFormData({});
    };

    // Edit Section Modal
    const renderEditModal = () => {
        console.log('Render edit modal called:', { showEditModal, editingGuest, editingSection });
        
        if (!showEditModal || !editingGuest || !editingSection) {
            console.log('Modal not showing - conditions not met');
            return null;
        }

        const renderFormFields = () => {
            switch (editingSection) {
                case 'contact':
                    return (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={editFormData.first_name || ''}
                                    onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={editFormData.last_name || ''}
                                    onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="tel"
                                    value={editFormData.phone || ''}
                                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editFormData.email || ''}
                                    onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    value={editFormData.address || ''}
                                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="3"
                                />
                            </div>
                        </div>
                    );
                case 'room':
                    return (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                                <select
                                    value={editFormData.room_number || ''}
                                    onChange={(e) => setEditFormData({...editFormData, room_number: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a room</option>
                                    {roomAvailability.rooms && roomAvailability.rooms.map((room) => (
                                        <option 
                                            key={room.room_number} 
                                            value={room.room_number}
                                            disabled={room.availability_status === 'occupied'}
                                            className={room.availability_status === 'occupied' ? 'text-red-600' : 'text-green-600'}
                                        >
                                            {room.display_text}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    Available rooms are shown in green. Occupied rooms are shown in red and disabled.
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                                <select
                                    value={editFormData.room_type_id || ''}
                                    onChange={(e) => {
                                        const selectedType = roomAvailability.room_types?.find(rt => rt.id == e.target.value);
                                        setEditFormData({
                                            ...editFormData, 
                                            room_type_id: e.target.value,
                                            room_type_name: selectedType?.name || ''
                                        });
                                    }}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select room type</option>
                                    {roomAvailability.room_types && roomAvailability.room_types.map((roomType) => (
                                        <option key={roomType.id} value={roomType.id}>
                                            {roomType.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-blue-800">Room Availability Check</h3>
                                        <div className="mt-2 text-sm text-blue-700">
                                            <p>Current booking dates: <strong>{editingGuest?.check_in_date} to {editingGuest?.check_out_date}</strong></p>
                                            <p className="mt-1">Showing real-time room availability for these dates. Only available rooms can be selected.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                case 'stay':
                    return (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                                <input
                                    type="date"
                                    value={editFormData.check_in_date || ''}
                                    onChange={(e) => setEditFormData({...editFormData, check_in_date: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                                <input
                                    type="date"
                                    value={editFormData.check_out_date || ''}
                                    onChange={(e) => setEditFormData({...editFormData, check_out_date: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                                <input
                                    type="number"
                                    value={editFormData.adults || 1}
                                    onChange={(e) => setEditFormData({...editFormData, adults: parseInt(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                                <input
                                    type="number"
                                    value={editFormData.children || 0}
                                    onChange={(e) => setEditFormData({...editFormData, children: parseInt(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    min="0"
                                />
                            </div>
                        </div>
                    );
                case 'financial':
                    return (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                                <input
                                    type="number"
                                    value={editFormData.total_amount || 0}
                                    onChange={(e) => setEditFormData({...editFormData, total_amount: parseFloat(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount</label>
                                <input
                                    type="number"
                                    value={editFormData.paid_amount || 0}
                                    onChange={(e) => setEditFormData({...editFormData, paid_amount: parseFloat(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining Amount</label>
                                <input
                                    type="number"
                                    value={editFormData.remaining_amount || 0}
                                    onChange={(e) => setEditFormData({...editFormData, remaining_amount: parseFloat(e.target.value)})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    step="0.01"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                                <select
                                    value={editFormData.payment_type || ''}
                                    onChange={(e) => setEditFormData({...editFormData, payment_type: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Payment Type</option>
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="debit_card">Debit Card</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="net_banking">Net Banking</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                <select
                                    value={editFormData.payment_method || ''}
                                    onChange={(e) => setEditFormData({...editFormData, payment_method: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select Payment Method</option>
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="debit_card">Debit Card</option>
                                    <option value="credit_card">Credit Card</option>
                                    <option value="net_banking">Net Banking</option>
                                    <option value="razorpay">Razorpay (Online)</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="online_wallet">Online Wallet</option>
                                </select>
                            </div>
                        </div>
                    );
                default:
                    return null;
            }
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto edit-modal">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                            Edit {editingSection.charAt(0).toUpperCase() + editingSection.slice(1)} Information
                        </h3>
                        <button
                            onClick={handleCancelEdit}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <FaTimes className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="p-6">
                        {renderFormFields()}
                    </div>

                    <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                        <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-1 sm:p-3 md:p-4 lg:p-6 admin-guest-history-mobile">
            {/* Header Section */}
            <div className="max-w-6xl mx-auto mb-4 sm:mb-6 admin-guest-management-header">
                <div className="text-center mb-3 sm:mb-6">
                    <h1 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                        Admin Guest Management
                    </h1>
                    <p className="text-xs sm:text-base text-gray-600 max-w-2xl mx-auto px-1 sm:px-2">
                        Comprehensive view of both current guests (reception) and guest history (past bookings)
                    </p>
                    <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row justify-center space-y-1 sm:space-y-0 sm:space-x-3">
                        <div className="flex items-center justify-center text-xs text-blue-600">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            Reception Data (Current)
                        </div>
                        <div className="flex items-center justify-center text-xs text-green-600">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Guest History (Past)
                        </div>
                    </div>
                </div>

                {/* Statistics Cards - Mobile Responsive */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-3 mb-3 sm:mb-6">
                    <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border border-gray-200 hover:shadow-lg transition-all duration-200">
                        <div className="text-center">
                            <div className="p-1 sm:p-2 bg-blue-100 rounded-full w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 flex items-center justify-center">
                                <FaUsers className="text-sm sm:text-lg text-blue-600" />
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{stats.total_guests}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">TOTAL</div>
                            <div className="text-xs text-gray-500 hidden sm:block">Total GUESTS</div>
                            <div className="text-xs text-gray-500 sm:hidden">GUESTS</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border border-gray-200 hover:shadow-lg transition-all duration-200">
                        <div className="text-center">
                            <div className="p-1 sm:p-2 bg-green-100 rounded-full w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 flex items-center justify-center">
                                <FaDoorOpen className="text-sm sm:text-lg text-green-600" />
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{stats.checked_in_guests}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">CHECKED</div>
                            <div className="text-xs text-gray-500 hidden sm:block">Active IN</div>
                            <div className="text-xs text-gray-500 sm:hidden">IN</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-md shadow-md p-2 sm:p-3 border border-gray-200 hover:shadow-lg transition-all duration-200">
                        <div className="text-center">
                            <div className="p-1 sm:p-2 bg-gray-100 rounded-full w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 flex items-center justify-center">
                                <FaHistory className="text-sm sm:text-lg text-gray-600" />
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{stats.checked_out_guests}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">CHECKED</div>
                            <div className="text-xs text-gray-500 hidden sm:block">Past OUT</div>
                            <div className="text-xs text-gray-500 sm:hidden">OUT</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border border-gray-200 hover:shadow-lg transition-all duration-200">
                        <div className="text-center">
                            <div className="p-1 sm:p-2 bg-yellow-100 rounded-full w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 flex items-center justify-center">
                                <FaMoneyBillWave className="text-sm sm:text-lg text-yellow-600" />
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{stats.guests_with_due}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">WITH DUE</div>
                            <div className="text-xs text-gray-500 hidden sm:block">Pending AMOUNT</div>
                            <div className="text-xs text-gray-500 sm:hidden">DUE</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-2 sm:p-3 border border-gray-200 hover:shadow-lg transition-all duration-200 col-span-2 sm:col-span-1">
                        <div className="text-center">
                            <div className="p-1 sm:p-2 bg-purple-100 rounded-full w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 flex items-center justify-center">
                                <FaBuilding className="text-sm sm:text-lg text-purple-600" />
                            </div>
                            <div className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{stats.corporate_bookings}</div>
                            <div className="text-xs sm:text-sm text-gray-600 font-medium mb-1">CORPORATE</div>
                            <div className="text-xs text-gray-500 hidden sm:block">Business BOOKINGS</div>
                            <div className="text-xs text-gray-500 sm:hidden">BOOKINGS</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters Section */}
            <div className="max-w-6xl mx-auto mb-3 sm:mb-6">
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-2 sm:p-4 search-filters-container">
                    <div className="mb-2 sm:mb-3">
                        <h2 className="text-xs sm:text-base font-semibold text-gray-900 mb-1">Search & Filter All Guests</h2>
                        <p className="text-xs text-gray-600">Search across both current reception guests and guest history records</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
                        {/* Search Input */}
                        <div className="search-input-group">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Search Query</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name, phone, email, or booking reference..."
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch();
                                        }
                                    }}
                                    className="w-full pl-8 pr-3 py-2 sm:py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-500 search-input"
                                />
                                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none search-icon">
                                    <FaSearch className="h-3 w-3 text-gray-400" />
                                </div>
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                                    <div className="flex items-center space-x-1 bg-green-50 px-1.5 py-0.5 rounded-full">
                                        <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs text-green-700 font-medium">LIVE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search Type Selector */}
                        <div className="form-field">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Search Type</label>
                            <select
                                value={filters.searchType}
                                onChange={(e) => handleFilterChange('searchType', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-900 bg-white search-type-selector"
                            >
                                <option value="all">All Fields</option>
                                <option value="name">Name</option>
                                <option value="phone">Phone</option>
                                <option value="email">Email</option>
                                <option value="booking_reference">Booking Reference</option>
                            </select>
                        </div>
                    </div>

                    {/* Action Buttons Row - Mobile Responsive */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-2 mb-2 sm:mb-3 action-buttons">
                        <button
                            onClick={handleSearch}
                            className="action-button primary col-span-2 sm:col-span-1"
                        >
                            <FaSearch className="mr-1" />
                            Search
                        </button>
                        
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="action-button secondary"
                        >
                            <FaFilter className="mr-1" />
                            {showFilters ? 'Hide' : 'Filters'}
                        </button>
                        
                        <button
                            onClick={handleClearFilters}
                            className="action-button danger"
                        >
                            <FaTimes className="mr-1" />
                            Clear
                        </button>
                        
                        <button
                            onClick={() => handleExport('csv')}
                            className="action-button secondary"
                        >
                            <FaDownload className="mr-1" />
                            Export
                        </button>
                    </div>

                {/* Advanced Filters Section */}
                {showFilters && (
                    <div className="border-t border-gray-200 pt-4 advanced-filters">
                        <div className="mb-3">
                            <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-2">Advanced Filters</h3>
                            <p className="text-xs text-gray-600">Refine your search with specific criteria</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 filters-grid">
                            <div className="filter-field">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Booking Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="checked_in">Checked In</option>
                                    <option value="checked_out">Checked Out</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            
                            <div className="filter-field">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Booking Type</label>
                                <select
                                    value={filters.corporate}
                                    onChange={(e) => handleFilterChange('corporate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                                >
                                    <option value="all">All Bookings</option>
                                    <option value="corporate">Corporate Only</option>
                                    <option value="regular">Regular Only</option>
                                </select>
                            </div>
                            
                            <div className="filter-field">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">Payment Status</label>
                                <select
                                    value={filters.dueAmount}
                                    onChange={(e) => handleFilterChange('dueAmount', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                                >
                                    <option value="all">All Payments</option>
                                    <option value="with_due">Has Due Amount</option>
                                    <option value="fully_paid">Fully Paid</option>
                                </select>
                            </div>
                            
                            <div className="filter-field">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">From Date</label>
                                <input
                                    type="date"
                                    value={filters.date_from}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                                />
                            </div>
                            
                            <div className="filter-field">
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">To Date</label>
                                <input
                                    type="date"
                                    value={filters.date_to}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 bg-white text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Guest History Results Section */}
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-lg shadow-md border border-gray-100 p-2 sm:p-4 guest-results-container">
                    <div className="mb-3 sm:mb-4">
                        {/* Tab Navigation */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                            <h2 className="text-sm sm:text-lg font-bold text-gray-900 mb-2 sm:mb-0">
                                Guest Results
                            </h2>
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                <button
                                    onClick={() => setActiveTab('current')}
                                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                                        activeTab === 'current'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="flex items-center">
                                        <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                                        Current ({guestHistory.filter(g => g.is_current).length})
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('past')}
                                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors border-l border-gray-200 ${
                                        activeTab === 'past'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="flex items-center">
                                        <span className="w-1.5 h-1.5 bg-current rounded-full mr-2"></span>
                                        Past ({guestHistory.filter(g => !g.is_current).length})
                                    </span>
                                </button>
                            </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">
                            {activeTab === 'current' 
                                ? 'Showing currently checked-in guests' 
                                : 'Showing historical guest records'
                            }
                        </p>
                    </div>

                    <div className="results-content">
                        {(() => {
                            const filteredGuests = guestHistory.filter(guest => 
                                activeTab === 'current' ? guest.is_current : !guest.is_current
                            );

                            if (loading) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-8 sm:py-12 loading-state">
                                        <FaSync className="animate-spin text-3xl sm:text-4xl text-blue-600 mb-4" />
                                        <p className="text-base sm:text-lg text-gray-600">Loading guest history...</p>
                                    </div>
                                );
                            }

                            if (filteredGuests.length > 0) {
                                return (
                                    <div className="space-y-2 sm:space-y-4">
                                        {filteredGuests.map((guest, index) => (
                                    <div key={`${guest.booking_id}-${guest.guest_id}-${index}`} className="bg-gray-50 rounded-lg p-2 sm:p-4 border border-gray-200 hover:shadow-md transition-all duration-300 hover:border-blue-300 guest-card">
                                        {/* Guest Header - Mobile Responsive */}
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 sm:mb-4 guest-header">
                                            {/* Left side - Guest info */}
                                            <div className="flex-1 mb-3 sm:mb-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center mb-2">
                                                    <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                                                        <h3 className="text-base sm:text-lg font-bold text-gray-900">
                                                            {guest.full_name || `${guest.first_name} ${guest.last_name}`}
                                                        </h3>
                                                        {/* Data Source Indicator - positioned beside guest name */}
                                                        <div className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                                            guest.is_current 
                                                                ? 'bg-blue-100 text-blue-800' 
                                                                : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {guest.is_current ? 'Current' : 'Past'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                                                    <span className="flex items-center">
                                                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                                        Booking Ref: {guest.booking_reference}
                                                    </span>
                                                    <span className="flex items-center">
                                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                        Room {guest.room_number}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Right side - Action buttons and status */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                                                {getStatusBadge(guest.booking_status)}
                                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                                                    <button
                                                        onClick={(e) => handleViewDetails(guest, e)}
                                                        className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors text-sm font-medium"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewFiles(guest)}
                                                        className="w-full sm:w-auto px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors text-sm font-medium"
                                                    >
                                                        📄 View Files
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Guest Information Grid - Mobile Responsive */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 guest-info-grid">
                                            {/* Contact Information */}
                                            <div className="bg-white rounded-md p-1.5 sm:p-3 border border-gray-200">
                                                <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                                                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Contact Information</h4>
                                                    <button
                                                        onClick={() => handleEditSection(guest, 'contact')}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">👤</span>
                                                        {guest.full_name || `${guest.first_name} ${guest.last_name}`}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">📱</span>
                                                        {guest.phone}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">📧</span>
                                                        {guest.email || 'N/A'}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">🏢</span>
                                                        <span className={`font-medium ${guest.booking_source === 'corporate' ? 'text-blue-600' : 'text-gray-600'}`}>
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
                                            </div>
                                            
                                            {/* Room Details */}
                                            <div className="bg-white rounded-md p-1.5 sm:p-3 border border-gray-200">
                                                <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                                                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Room Details</h4>
                                                    <button
                                                        onClick={() => handleEditSection(guest, 'room')}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">🚪</span>
                                                        Room {guest.room_number}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">🏠</span>
                                                        {guest.room_type_name || 'Executive'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Stay Details */}
                                            <div className="bg-white rounded-md p-1.5 sm:p-3 border border-gray-200">
                                                <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                                                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Stay Details</h4>
                                                    <button
                                                        onClick={() => handleEditSection(guest, 'stay')}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">📅</span>
                                                        Check-in: {formatDate(guest.check_in_date)}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">📅</span>
                                                        Check-out: {formatDate(guest.check_out_date)}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">👥</span>
                                                        {(guest.adults || 1) + (guest.children || 0)} guests ({guest.adults || 1} adults, {guest.children || 0} children)
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Financial Details */}
                                            <div className="bg-white rounded-md p-1.5 sm:p-3 border border-gray-200">
                                                <div className="flex justify-between items-center mb-1 sm:mb-1.5">
                                                    <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Financial Details</h4>
                                                    <button
                                                        onClick={() => handleEditSection(guest, 'financial')}
                                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                </div>
                                                <div className="space-y-1 text-xs text-gray-600">
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">💰</span>
                                                        Total: ₹{guest.total_amount || 0}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">💳</span>
                                                        Paid: ₹{guest.paid_amount || 0}
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">📊</span>
                                                        <span className={`font-medium ${(parseFloat(guest.remaining_amount) || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            Due: ₹{guest.remaining_amount || 0}
                                                        </span>
                                                    </p>
                                                    <p className="flex items-center">
                                                        <span className="w-4 h-4 mr-2">🏦</span>
                                                        {guest.payment_method || guest.payment_type || 'N/A'}
                                                    </p>
                                                    {guest.transaction_id && (
                                                        <p className="flex items-center">
                                                            <span className="w-4 h-4 mr-2">🆔</span>
                                                            Txn: {guest.transaction_id}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Additional Information */}
                                        <div className="mt-4 additional-info">
                                            {/* Owner Reference Status */}
                                            {(guest.owner_reference && !(guest.payment_type || guest.booking_payment_type)) ? (
                                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                                                    <div className="flex items-center">
                                                        <span className="text-yellow-800 font-medium text-sm">
                                                            🏨 This is an owner reference booking - no payment required
                                                        </span>
                                                    </div>
                                                    <p className="text-yellow-700 text-xs mt-1">
                                                        Room was booked under hotel owner's reference. No revenue generated.
                                                    </p>
                                                </div>
                                            ) : null}
                                            
                                            {/* Payment Due Warning */}
                                            {(parseFloat(guest.remaining_amount) || 0) > 0 && (
                                                <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                                                    <div className="flex items-center">
                                                        <span className="text-red-800 font-medium text-sm">
                                                            ⚠️ Payment Due: ₹{guest.remaining_amount}
                                                        </span>
                                                    </div>
                                                    <p className="text-red-700 text-xs mt-1">
                                                        Guest cannot be checked out until the remaining amount is collected.
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {/* Creation Date */}
                                            <div className="mt-2 text-xs text-gray-500">
                                                <span>Created: {formatDate(guest.created_at || guest.booking_created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                        ))}
                                    </div>
                                );
                            }

                            return (
                                <div className="text-center py-8 sm:py-12 empty-state">
                                    <div className="text-gray-400 text-4xl sm:text-6xl mb-4">
                                        {activeTab === 'current' ? '🏨' : '📋'}
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">
                                        {activeTab === 'current' ? 'No current guests' : 'No past guests found'}
                                    </h3>
                                    <p className="text-sm sm:text-base text-gray-600">
                                        {activeTab === 'current' 
                                            ? 'No guests are currently checked in'
                                            : 'Try adjusting your search criteria or filters'
                                        }
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </div>

            {/* Guest Details Modal */}
            {showGuestDetails && selectedGuest && (
                <>
                    {console.log('🎭 Rendering GuestDetailsModal with:', { showGuestDetails, selectedGuest, modalClickPosition })}
                    <GuestDetailsModal
                        guest={selectedGuest}
                        onClose={handleCloseGuestDetails}
                        clickPosition={modalClickPosition}
                    />
                </>
            )}

            {/* Edit Section Modal */}
            {renderEditModal()}

            {/* File Viewer Modal */}
            <FileViewerModal
                guest={selectedGuest}
                isOpen={showFileViewer}
                onClose={() => setShowFileViewer(false)}
            />
        </div>
        </div>
        </>
    );
};

export default AdminGuestHistory;

// Guest Details Modal Component
const GuestDetailsModal = ({ guest, onClose, clickPosition }) => {
    // No need for useRef anymore since we're positioning during render

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN');
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

    // Calculate modal position based on click position for mobile
    const getModalStyle = () => {
        if (clickPosition && window.innerWidth <= 768) {
            console.log('🎯 getModalStyle called with clickPosition:', clickPosition);
            return {
                position: 'fixed',
                top: `${clickPosition.y}px`,
                left: `${clickPosition.x}px`,
                transform: 'translate(-50%, -50%)',
                maxHeight: '70vh',
                width: '95vw',
                zIndex: 9999,
                backgroundColor: 'white',
                border: '2px solid #3b82f6',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
            };
        }
        return {};
    };

    console.log('🎭 GuestDetailsModal rendering with clickPosition:', clickPosition);
    
    return (
        <div className="modal-overlay" style={{ zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div 
                className={`modal-content extra-large ${clickPosition && window.innerWidth <= 768 ? 'click-positioned' : ''}`}
                style={getModalStyle()}
            >
                <div className="modal-header">
                    <h3 className="modal-title">Guest Details - {guest.full_name || `${guest.first_name} ${guest.last_name}`}</h3>
                    <button onClick={onClose} className="modal-close">
                        <FaTimes />
                    </button>
                </div>

                <div className="modal-body">
                    <div className="guest-details-grid">
                        <div className="detail-section">
                            <h4 className="section-title">Personal Information</h4>
                            <div className="detail-item">
                                <span className="detail-label">Name:</span>
                                <span className="detail-value">{guest.full_name || `${guest.first_name} ${guest.last_name}`}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Email:</span>
                                <span className="detail-value">{guest.email || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Phone:</span>
                                <span className="detail-value">{guest.phone}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">ID Proof:</span>
                                <span className="detail-value">{guest.id_proof_type} {guest.id_proof_number}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Adults:</span>
                                <span className="detail-value">{guest.adults || 1}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Children:</span>
                                <span className="detail-value">{guest.children || 0}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h4 className="section-title">Booking Information</h4>
                            <div className="detail-item">
                                <span className="detail-label">Booking Reference:</span>
                                <span className="detail-value">{guest.booking_reference}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Booking Source:</span>
                                <span className={`detail-value ${guest.booking_source === 'corporate' ? 'text-blue-600 font-semibold' : ''}`}>
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
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Room Number:</span>
                                <span className="detail-value">{guest.room_number}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Room Type:</span>
                                <span className="detail-value">{guest.room_type_name}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Status:</span>
                                <span className="detail-value">{guest.booking_status}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Plan Type:</span>
                                <span className="detail-value">{guest.plan_type || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h4 className="section-title">Stay Details</h4>
                            <div className="detail-item">
                                <span className="detail-label">Check-in Date:</span>
                                <span className="detail-value">{formatDate(guest.check_in_date)}</span>
                            </div>
                            {guest.check_in_time && (
                                <div className="detail-item">
                                    <span className="detail-label">Check-in Time:</span>
                                    <span className="detail-value">{guest.check_in_time} {guest.check_in_ampm || 'AM'}</span>
                                </div>
                            )}
                            <div className="detail-item">
                                <span className="detail-label">Check-out Date:</span>
                                <span className="detail-value">{formatDate(guest.check_out_date)}</span>
                            </div>
                            {guest.check_out_time && (
                                <div className="detail-item">
                                    <span className="detail-label">Check-out Time:</span>
                                    <span className="detail-value">{guest.check_out_time} {guest.check_out_ampm || 'AM'}</span>
                                </div>
                            )}
                            {guest.check_in_time && guest.check_out_time && (
                                <div className="detail-item">
                                    <span className="detail-label">Total Hours:</span>
                                    <span className="detail-value">{calculateTotalHours(
                                        guest.check_in_time, 
                                        guest.check_in_ampm || 'AM', 
                                        guest.check_out_time, 
                                        guest.check_out_ampm || 'AM',
                                        guest.check_in_date,
                                        guest.check_out_date
                                    )}</span>
                                </div>
                            )}
                            <div className="detail-item">
                                <span className="detail-label">Total Amount:</span>
                                <span className="detail-value">{formatCurrency(guest.total_amount)}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Created:</span>
                                <span className="detail-value">{formatDate(guest.created_at || guest.booking_created_at)}</span>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h4 className="section-title">Payment Details</h4>
                            
                            {/* Owner Reference Information */}
                            {(guest.owner_reference && !(guest.payment_type || guest.booking_payment_type)) && (
                                <div className="detail-item">
                                    <span className="detail-label">Status:</span>
                                    <span className="detail-value text-green-600 font-semibold">
                                        🏨 Reference by Owner of the Hotel
                                    </span>
                                </div>
                            )}
                            
                            {/* Regular Payment Details - Only show if NOT owner reference */}
                            {!(guest.owner_reference && !(guest.payment_type || guest.booking_payment_type)) && (
                                <>
                                    <div className="detail-item">
                                        <span className="detail-label">Total Amount:</span>
                                        <span className="detail-value font-semibold">{formatCurrency(guest.total_amount)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Paid Amount:</span>
                                        <span className="detail-value text-green-600 font-semibold">
                                            {formatCurrency(guest.paid_amount || 0)}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Remaining Amount:</span>
                                        <span className={`detail-value font-semibold ${
                                            (guest.remaining_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                            {formatCurrency(guest.remaining_amount || 0)}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">Payment Status:</span>
                                        <span className={`detail-value font-semibold ${
                                            guest.calculated_payment_status === 'completed' ? 'text-green-600' : 
                                            guest.calculated_payment_status === 'partial' ? 'text-orange-600' : 
                                            guest.calculated_payment_status === 'referred_by_owner' ? 'text-yellow-600' : 'text-red-600'
                                        }`}>
                                            {guest.payment_summary || 
                                             (guest.calculated_payment_status === 'completed' ? '✅ Fully Paid' :
                                              guest.calculated_payment_status === 'partial' ? '⚠️ Partially Paid' : 
                                              guest.calculated_payment_status === 'referred_by_owner' ? '🏨 Referred by Owner of the Hotel' : '❌ Pending Payment')}
                                        </span>
                                    </div>
                                    
                                    {/* Payment Method and ID Information */}
                                    {(guest.payment_type || guest.booking_payment_type) && (
                                        <>
                                            <div className="detail-item">
                                                <span className="detail-label">Payment Type:</span>
                                                <span className="detail-value text-blue-600 font-semibold">
                                                    {(guest.payment_type || guest.booking_payment_type).replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                            {guest.razorpay_payment_id && (
                                                <div className="detail-item">
                                                    <span className="detail-label">Razorpay ID:</span>
                                                    <span className="detail-value font-mono text-xs">{guest.razorpay_payment_id}</span>
                                                </div>
                                            )}
                                            {guest.payment_id && !guest.razorpay_payment_id && (
                                                <div className="detail-item">
                                                    <span className="detail-label">Payment ID:</span>
                                                    <span className="detail-value font-mono text-xs">{guest.payment_id}</span>
                                                </div>
                                            )}
                                            {guest.transaction_id && (
                                                <div className="detail-item">
                                                    <span className="detail-label">Transaction ID:</span>
                                                    <span className="detail-value font-mono text-xs">{guest.transaction_id}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    
                                    {/* Due Amount Warning - Only show if NOT owner reference */}
                                    {(guest.remaining_amount || 0) > 0 && !(guest.owner_reference && !(guest.payment_type || guest.booking_payment_type)) && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <div className="flex items-center">
                                                <FaMoneyBillWave className="text-red-500 mr-2" />
                                                <span className="text-red-800 font-medium">
                                                    Due Amount Pending: {formatCurrency(guest.remaining_amount)}
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
                            {(guest.owner_reference && !(guest.payment_type || guest.booking_payment_type)) && (
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
                            {guest.booking_source === 'corporate' && (
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
                        {guest.booking_source === 'corporate' && (
                            <div className="detail-section">
                                <h4 className="section-title">Company Details</h4>
                                <div className="detail-item">
                                    <span className="detail-label">Company Name:</span>
                                    <span className="detail-value text-blue-600 font-semibold">
                                        {guest.company_name || 'N/A'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">GST Number:</span>
                                    <span className="detail-value">
                                        {guest.gst_number || 'N/A'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Contact Person:</span>
                                    <span className="detail-value">
                                        {guest.contact_person || 'N/A'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Contact Phone:</span>
                                    <span className="detail-value">
                                        {guest.contact_phone || 'N/A'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Contact Email:</span>
                                    <span className="detail-value">
                                        {guest.contact_email || 'N/A'}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Billing Address:</span>
                                    <span className="detail-value">
                                        {guest.billing_address || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="modal-button secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};




