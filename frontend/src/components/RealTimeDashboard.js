import React, { useState, useEffect } from 'react';
import { useRealTime } from '../contexts/RealTimeContext';
import { FaWifi, FaWifiSlash, FaBell, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import './RealTimeDashboard.css';

const RealTimeDashboard = () => {
    const { isConnected, notifications, subscriptions } = useRealTime();
    const [stats, setStats] = useState({
        totalNotifications: 0,
        unreadNotifications: 0,
        activeChannels: 0,
        lastUpdate: null
    });

    // Update stats when notifications change
    useEffect(() => {
        const unreadCount = notifications.filter(n => !n.read).length;
        setStats({
            totalNotifications: notifications.length,
            unreadNotifications: unreadCount,
            activeChannels: subscriptions.size,
            lastUpdate: new Date().toLocaleTimeString()
        });
    }, [notifications, subscriptions]);

    // Get recent notifications by type
    const getRecentNotificationsByType = (type, limit = 5) => {
        return notifications
            .filter(n => n.type === type)
            .slice(0, limit);
    };

    // Get connection status icon
    const getConnectionIcon = () => {
        return isConnected ? <FaWifi className="connected" /> : <FaWifiSlash className="disconnected" />;
    };

    // Get notification type count
    const getNotificationTypeCount = (type) => {
        return notifications.filter(n => n.type === type).length;
    };

    return (
        <div className="realtime-dashboard">
            <div className="dashboard-header">
                <h2>Real-Time Dashboard</h2>
                <div className="connection-status">
                    {getConnectionIcon()}
                    <span className={isConnected ? 'connected' : 'disconnected'}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <FaBell />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.totalNotifications}</h3>
                        <p>Total Notifications</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon unread">
                        <FaExclamationTriangle />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.unreadNotifications}</h3>
                        <p>Unread</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <FaWifi />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.activeChannels}</h3>
                        <p>Active Channels</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        <FaCheckCircle />
                    </div>
                    <div className="stat-content">
                        <h3>{stats.lastUpdate}</h3>
                        <p>Last Update</p>
                    </div>
                </div>
            </div>

            {/* Active Subscriptions */}
            <div className="subscriptions-section">
                <h3>Active Subscriptions</h3>
                <div className="subscriptions-grid">
                    {Array.from(subscriptions).map(channel => (
                        <div key={channel} className="subscription-item">
                            <span className="channel-name">{channel}</span>
                            <span className="status-indicator active"></span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Notifications by Type */}
            <div className="notifications-overview">
                <div className="notification-type-section">
                    <h3>Maintenance Updates</h3>
                    <div className="notification-list">
                        {getRecentNotificationsByType('maintenance_update').map(notification => (
                            <div key={notification.id} className="notification-item">
                                <div className="notification-content">
                                    <span className="action">{notification.action}</span>
                                    <span className="room">Room {notification.details?.room_number}</span>
                                </div>
                                <span className="timestamp">
                                    {new Date(notification.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                        {getRecentNotificationsByType('maintenance_update').length === 0 && (
                            <p className="no-notifications">No recent maintenance updates</p>
                        )}
                    </div>
                </div>

                <div className="notification-type-section">
                    <h3>Housekeeping Updates</h3>
                    <div className="notification-list">
                        {getRecentNotificationsByType('housekeeping_update').map(notification => (
                            <div key={notification.id} className="notification-item">
                                <div className="notification-content">
                                    <span className="action">{notification.action}</span>
                                    <span className="room">Room {notification.details?.room_number}</span>
                                </div>
                                <span className="timestamp">
                                    {new Date(notification.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                        {getRecentNotificationsByType('housekeeping_update').length === 0 && (
                            <p className="no-notifications">No recent housekeeping updates</p>
                        )}
                    </div>
                </div>

                <div className="notification-type-section">
                    <h3>Room Status Updates</h3>
                    <div className="notification-list">
                        {getRecentNotificationsByType('room_status_update').map(notification => (
                            <div key={notification.id} className="notification-item">
                                <div className="notification-content">
                                    <span className="room">Room {notification.details?.room_number}</span>
                                    <span className="status-change">
                                        {notification.details?.old_status} → {notification.details?.new_status}
                                    </span>
                                </div>
                                <span className="timestamp">
                                    {new Date(notification.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                        {getRecentNotificationsByType('room_status_update').length === 0 && (
                            <p className="no-notifications">No recent room status updates</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Type Summary */}
            <div className="notification-summary">
                <h3>Notification Summary</h3>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="type">Maintenance</span>
                        <span className="count">{getNotificationTypeCount('maintenance_update')}</span>
                    </div>
                    <div className="summary-item">
                        <span className="type">Housekeeping</span>
                        <span className="count">{getNotificationTypeCount('housekeeping_update')}</span>
                    </div>
                    <div className="summary-item">
                        <span className="type">Room Status</span>
                        <span className="count">{getNotificationTypeCount('room_status_update')}</span>
                    </div>
                    <div className="summary-item">
                        <span className="type">Bookings</span>
                        <span className="count">{getNotificationTypeCount('booking_update')}</span>
                    </div>
                    <div className="summary-item">
                        <span className="type">Billing</span>
                        <span className="count">{getNotificationTypeCount('billing_update')}</span>
                    </div>
                    <div className="summary-item">
                        <span className="type">System Alerts</span>
                        <span className="count">{getNotificationTypeCount('system_alert')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealTimeDashboard;
