import React, { useState, useEffect } from 'react';
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
    FaBroom
} from 'react-icons/fa';
import './DashboardNotifications.css';

const DashboardNotifications = ({ notifications = [], onDismiss, onMarkAsRead }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const count = notifications.filter(n => !n.read).length;
        setUnreadCount(count);
    }, [notifications]);

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

    const getNotificationColor = (type, priority) => {
        if (priority === 'high') return 'border-l-red-500 bg-red-50';
        if (priority === 'medium') return 'border-l-yellow-500 bg-yellow-50';
        if (priority === 'low') return 'border-l-green-500 bg-green-50';
        
        switch (type) {
            case 'check_in':
                return 'border-l-green-500 bg-green-50';
            case 'check_out':
                return 'border-l-blue-500 bg-blue-50';
            case 'maintenance':
                return 'border-l-orange-500 bg-orange-50';
            case 'housekeeping':
                return 'border-l-pink-500 bg-pink-50';
            case 'urgent':
                return 'border-l-red-500 bg-red-50';
            case 'info':
                return 'border-l-blue-500 bg-blue-50';
            case 'success':
                return 'border-l-green-500 bg-green-50';
            case 'reminder':
                return 'border-l-yellow-500 bg-yellow-50';
            default:
                return 'border-l-gray-500 bg-gray-50';
        }
    };

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

    const handleNotificationClick = (notification) => {
        if (!notification.read && onMarkAsRead) {
            onMarkAsRead(notification.id);
        }
        
        // Handle navigation based on notification type
        switch (notification.type) {
            case 'check_in':
                // Navigate to check-in page or guest details
                break;
            case 'check_out':
                // Navigate to check-out page or guest details
                break;
            case 'maintenance':
                // Navigate to maintenance page
                break;
            case 'housekeeping':
                // Navigate to housekeeping page
                break;
            default:
                break;
        }
    };

    return (
        <div className="relative">
            {/* Notification Bell */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            >
                <FaBell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-2">
                        {/* Header */}
                        <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <FaTimes className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-500">
                                    <FaBell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`px-4 py-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            getNotificationColor(notification.type, notification.priority)
                                        } ${!notification.read ? 'bg-white' : 'bg-gray-50'}`}
                                        onClick={() => handleNotificationClick(notification)}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="notification-details">
                                                    <h4 className="notification-title">
                                                        {notification.data?.title || notification.title || notification.type}
                                                    </h4>
                                                    <p className="notification-message">
                                                        {notification.data?.message || notification.message || 'No message available'}
                                                    </p>
                                                    <div className="notification-time">
                                                        {formatTime(notification.timestamp || notification.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            {!notification.read && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-2 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        // Mark all as read
                                        notifications.forEach(n => {
                                            if (!n.read && onMarkAsRead) {
                                                onMarkAsRead(n.id);
                                            }
                                        });
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Mark all as read
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

// Sample notification data structure
export const sampleNotifications = [
    {
        id: 1,
        type: 'check_in',
        title: 'Guest Check-in',
        message: 'John Smith has checked into Room 201',
        timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
        priority: 'medium',
        read: false
    },
    {
        id: 2,
        type: 'check_out',
        title: 'Guest Check-out',
        message: 'Sarah Johnson has checked out of Room 105',
        timestamp: new Date(Date.now() - 15 * 60000), // 15 minutes ago
        priority: 'low',
        read: false
    },
    {
        id: 3,
        type: 'maintenance',
        title: 'Maintenance Request',
        message: 'High priority maintenance request for Room 205 - AC not working',
        timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
        priority: 'high',
        read: false
    },
    {
        id: 4,
        type: 'housekeeping',
        title: 'Housekeeping Task',
        message: 'Room 301 cleaning completed and ready for inspection',
        timestamp: new Date(Date.now() - 45 * 60000), // 45 minutes ago
        priority: 'low',
        read: true
    },
    {
        id: 5,
        type: 'reminder',
        title: 'Check-out Reminder',
        message: '3 guests have overdue check-outs that require attention',
        timestamp: new Date(Date.now() - 60 * 60000), // 1 hour ago
        priority: 'high',
        read: false
    }
];

export default DashboardNotifications;
