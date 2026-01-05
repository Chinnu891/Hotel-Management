import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealTime } from '../../contexts/RealTimeContext';
import { buildApiUrl } from '../../config/api';
import { 
    FaBell, 
    FaTimes, 
    FaExclamationTriangle, 
    FaCheckCircle, 
    FaInfoCircle,
    FaClock,
    FaUserCheck,
    FaUserTimes,
    FaTools,
    FaBroom,
    FaTrash,
    FaEye,
    FaFilter,
    FaSearch,
    FaSync
} from 'react-icons/fa';
import './NotificationDashboard.css';

const NotificationDashboard = () => {
    const { token } = useAuth();
    const { notifications: realTimeNotifications, markNotificationAsRead } = useRealTime();
    
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        type: '',
        unreadOnly: false,
        searchTerm: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Fetch notifications from API
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError('');
            
            const params = new URLSearchParams({
                channel: 'reception',
                limit: 50
            });
            
            if (filters.type) params.append('type', filters.type);
            if (filters.unreadOnly) params.append('unread_only', 'true');
            
            const response = await fetch(buildApiUrl(`reception/notification_api.php?${params}`), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                setNotifications(data.data.notifications);
            } else {
                setError(data.message || 'Failed to fetch notifications');
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setError('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

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
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all notifications as read
    const handleMarkAllAsRead = async () => {
        try {
            const response = await fetch(buildApiUrl('reception/notification_api.php'), {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'mark_all_read',
                    channel: 'reception'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                setNotifications(prev => 
                    prev.map(n => ({ ...n, read_at: new Date().toISOString() }))
                );
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Delete notification
    const handleDeleteNotification = async (notificationId) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) {
            return;
        }
        
        try {
            const response = await fetch(buildApiUrl(`reception/notification_api.php?id=${notificationId}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (data.success) {
                setNotifications(prev => prev.filter(n => n.id !== notificationId));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // Get notification icon
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'check_in':
                return <FaUserCheck className="text-green-500" />;
            case 'check_out':
                return <FaUserTimes className="text-blue-500" />;
            case 'maintenance':
                return <FaTools className="text-orange-500" />;
            case 'housekeeping':
                return <FaBroom className="text-pink-500" />;
            case 'urgent':
                return <FaExclamationTriangle className="text-red-500" />;
            case 'info':
                return <FaInfoCircle className="text-blue-500" />;
            case 'success':
                return <FaCheckCircle className="text-green-500" />;
            case 'reminder':
                return <FaClock className="text-yellow-500" />;
            default:
                return <FaBell className="text-gray-500" />;
        }
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return time.toLocaleDateString();
    };

    // Filter notifications
    const filteredNotifications = notifications.filter(notification => {
        if (filters.type && notification.type !== filters.type) return false;
        if (filters.unreadOnly && notification.read_at) return false;
        if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            const title = notification.data?.title || '';
            const message = notification.data?.message || '';
            const type = notification.type || '';
            if (!title.toLowerCase().includes(searchLower) && 
                !message.toLowerCase().includes(searchLower) && 
                !type.toLowerCase().includes(searchLower)) {
                return false;
            }
        }
        return true;
    });

    // Initialize
    useEffect(() => {
        fetchNotifications();
    }, []);

    return (
        <div className="notification-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <h1 className="dashboard-title">
                        <FaBell className="title-icon" />
                        Notifications
                    </h1>
                    <div className="notification-stats">
                        <span className="stat-item">
                            <span className="stat-label">Total:</span>
                            <span className="stat-value">{notifications.length}</span>
                        </span>
                        <span className="stat-item">
                            <span className="stat-label">Unread:</span>
                            <span className="stat-value">
                                {notifications.filter(n => !n.read_at).length}
                            </span>
                        </span>
                    </div>
                </div>
                
                <div className="header-actions">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
                    >
                        <FaFilter />
                        Filters
                    </button>
                    <button
                        onClick={fetchNotifications}
                        className="btn btn-secondary"
                        disabled={loading}
                    >
                        <FaSync className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={handleMarkAllAsRead}
                        className="btn btn-primary"
                        disabled={notifications.filter(n => !n.read_at).length === 0}
                    >
                        Mark All Read
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="filters-panel">
                    <div className="filters-grid">
                        <div className="filter-group">
                            <label>Type:</label>
                            <select
                                value={filters.type}
                                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                            >
                                <option value="">All Types</option>
                                <option value="check_in">Check-in</option>
                                <option value="check_out">Check-out</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="housekeeping">Housekeeping</option>
                                <option value="billing">Billing</option>
                                <option value="system">System</option>
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={filters.unreadOnly}
                                    onChange={(e) => setFilters(prev => ({ ...prev, unreadOnly: e.target.checked }))}
                                />
                                Unread Only
                            </label>
                        </div>
                        
                        <div className="filter-group search-group">
                            <label>Search:</label>
                            <div className="search-input">
                                <FaSearch className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search notifications..."
                                    value={filters.searchTerm}
                                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications List */}
            <div className="notifications-container">
                {loading && notifications.length === 0 ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="empty-state">
                        <FaBell className="empty-icon" />
                        <p>No notifications found</p>
                        {(filters.type || filters.unreadOnly || filters.searchTerm) && (
                            <button
                                onClick={() => setFilters({ type: '', unreadOnly: false, searchTerm: '' })}
                                className="btn btn-secondary"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="notifications-list">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`notification-item ${!notification.read_at ? 'unread' : ''}`}
                            >
                                <div className="notification-icon">
                                    {getNotificationIcon(notification.type)}
                                </div>
                                
                                <div className="notification-content">
                                    <div className="notification-header">
                                        <h3 className="notification-title">
                                            {notification.data?.title || notification.type}
                                        </h3>
                                        <span className="notification-time">
                                            {formatTime(notification.created_at)}
                                        </span>
                                    </div>
                                    
                                    <p className="notification-message">
                                        {notification.data?.message || notification.message || 'No message content'}
                                    </p>
                                    
                                    {notification.data?.details && (
                                        <div className="notification-details">
                                            {Object.entries(notification.data.details).map(([key, value]) => (
                                                <span key={key} className="detail-item">
                                                    <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {value}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="notification-actions">
                                    {!notification.read_at ? (
                                        <button
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className="btn btn-sm btn-primary"
                                            title="Mark as read"
                                        >
                                            <FaEye />
                                        </button>
                                    ) : null}
                                    
                                    <button
                                        onClick={() => handleDeleteNotification(notification.id)}
                                        className="btn btn-sm btn-danger"
                                        title="Delete notification"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="error-message">
                    <FaExclamationTriangle />
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="error-close">
                        <FaTimes />
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationDashboard;
