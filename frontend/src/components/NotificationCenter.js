import React, { useState, useEffect } from 'react';
import { useRealTime } from '../contexts/RealTimeContext';
import { FaBell, FaTimes, FaCheck, FaTrash, FaCog } from 'react-icons/fa';
import './NotificationCenter.css';

const NotificationCenter = () => {
    const { 
        notifications, 
        isConnected, 
        markNotificationAsRead, 
        markAllNotificationsAsRead, 
        clearNotifications 
    } = useRealTime();
    
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState('all'); // all, unread, read
    const [unreadCount, setUnreadCount] = useState(0);

    // Calculate unread count
    useEffect(() => {
        const count = notifications.filter(n => !n.read).length;
        setUnreadCount(count);
        
        // Update document title with unread count
        if (count > 0) {
            document.title = `(${count}) Hotel Management System`;
        } else {
            document.title = 'Hotel Management System';
        }
    }, [notifications]);

    // Filter notifications based on current filter
    const filteredNotifications = notifications.filter(notification => {
        if (filter === 'unread') return !notification.read;
        if (filter === 'read') return notification.read;
        return true;
    });

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'maintenance_update':
                return '🔧';
            case 'housekeeping_update':
                return '🧹';
            case 'room_status_update':
                return '🚪';
            case 'booking_update':
                return '📅';
            case 'billing_update':
                return '💰';
            case 'system_alert':
                return '⚠️';
            default:
                return '📢';
        }
    };

    // Get notification priority color
    const getNotificationColor = (notification) => {
        if (notification.severity === 'critical') return 'critical';
        if (notification.severity === 'error') return 'error';
        if (notification.severity === 'warning') return 'warning';
        return 'info';
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return date.toLocaleDateString();
    };

    // Handle notification click
    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markNotificationAsRead(notification.id);
        }
        
        // Handle navigation based on notification type
        switch (notification.type) {
            case 'maintenance_update':
                // Navigate to maintenance page
                break;
            case 'housekeeping_update':
                // Navigate to housekeeping page
                break;
            case 'room_status_update':
                // Navigate to rooms page
                break;
            case 'booking_update':
                // Navigate to bookings page
                break;
            case 'billing_update':
                // Navigate to billing page
                break;
            default:
                break;
        }
    };

    return (
        <div className="notification-center">
            {/* Notification Bell */}
            <div className="notification-bell" onClick={() => setIsOpen(!isOpen)}>
                <FaBell className="bell-icon" />
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
                {!isConnected && (
                    <span className="connection-status offline" title="Disconnected">●</span>
                )}
            </div>

            {/* Notification Panel */}
            {isOpen && (
                <div className="notification-panel">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        <div className="notification-actions">
                            <button 
                                onClick={markAllNotificationsAsRead}
                                className="action-btn"
                                title="Mark all as read"
                            >
                                <FaCheck />
                            </button>
                            <button 
                                onClick={clearNotifications}
                                className="action-btn"
                                title="Clear all"
                            >
                                <FaTrash />
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="action-btn"
                                title="Close"
                            >
                                <FaTimes />
                            </button>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="notification-filters">
                        <button 
                            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                            onClick={() => setFilter('all')}
                        >
                            All ({notifications.length})
                        </button>
                        <button 
                            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                            onClick={() => setFilter('unread')}
                        >
                            Unread ({unreadCount})
                        </button>
                        <button 
                            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                            onClick={() => setFilter('read')}
                        >
                            Read ({notifications.filter(n => n.read).length})
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="notifications-list">
                        {filteredNotifications.length === 0 ? (
                            <div className="no-notifications">
                                <p>No notifications to display</p>
                            </div>
                        ) : (
                            filteredNotifications.map(notification => (
                                <div 
                                    key={notification.id}
                                    className={`notification-item ${notification.read ? 'read' : 'unread'} ${getNotificationColor(notification)}`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="notification-icon">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">
                                            {getNotificationTitle(notification)}
                                        </div>
                                        <div className="notification-message">
                                            {getNotificationMessage(notification)}
                                        </div>
                                        <div className="notification-meta">
                                            <span className="timestamp">
                                                {formatTimestamp(notification.timestamp)}
                                            </span>
                                            <span className="channel">
                                                {notification.channel}
                                            </span>
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <div className="unread-indicator"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Connection Status */}
                    <div className="connection-info">
                        <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
                            {isConnected ? '● Connected' : '● Disconnected'}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper functions for notification display
const getNotificationTitle = (notification) => {
    switch (notification.type) {
        case 'maintenance_update':
            return `Maintenance ${notification.action}`;
        case 'housekeeping_update':
            return `Housekeeping ${notification.action}`;
        case 'room_status_update':
            return 'Room Status Changed';
        case 'booking_update':
            return `Booking ${notification.action}`;
        case 'billing_update':
            return `Billing ${notification.action}`;
        case 'system_alert':
            return notification.alert_type || 'System Alert';
        default:
            return 'Notification';
    }
};

const getNotificationMessage = (notification) => {
    switch (notification.type) {
        case 'maintenance_update':
            return `Room ${notification.details?.room_number || 'Unknown'}: ${notification.details?.description || notification.action}`;
        case 'housekeeping_update':
            return `Room ${notification.details?.room_number || 'Unknown'}: ${notification.action}`;
        case 'room_status_update':
            return `Room ${notification.details?.room_number || 'Unknown'} is now ${notification.details?.new_status}`;
        case 'booking_update':
            return `Room ${notification.details?.room_number || 'Unknown'}: ${notification.action}`;
        case 'billing_update':
            return `Billing record ${notification.action}`;
        case 'system_alert':
            return notification.message;
        default:
            return 'You have a new notification';
    }
};

export default NotificationCenter;
