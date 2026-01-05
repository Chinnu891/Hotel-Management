import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

const RealTimeContext = createContext();

export const useRealTime = () => {
    const context = useContext(RealTimeContext);
    if (!context) {
        throw new Error('useRealTime must be used within a RealTimeProvider');
    }
    return context;
};

export const RealTimeProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [subscriptions, setSubscriptions] = useState(new Set());
    const { user, isAuthenticated } = useAuth();

    // Initialize WebSocket connection
    const connectWebSocket = useCallback(() => {
        if (!isAuthenticated || socket) return;

        try {
            // Dynamically detect WebSocket URL based on current hostname
            const currentHost = window.location.hostname;
            const wsUrl = currentHost === 'localhost' || currentHost === '127.0.0.1' 
                ? 'ws://localhost:8080' 
                : `ws://${currentHost}:8080`;
            
            console.log('WebSocket - Current hostname:', currentHost);
            console.log('WebSocket - Using URL:', wsUrl);
            
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('WebSocket connected to:', wsUrl);
                setIsConnected(true);
                
                // Subscribe to channels based on user role
                if (user && user.role) {
                    const channels = ['admin'];
                    
                    if (user.role === 'reception') {
                        channels.push('reception');
                    } else if (user.role === 'housekeeping') {
                        channels.push('housekeeping');
                    } else if (user.role === 'maintenance') {
                        channels.push('maintenance');
                    }
                    
                    channels.forEach(channel => {
                        ws.send(JSON.stringify({
                            type: 'subscribe',
                            channel: channel
                        }));
                        setSubscriptions(prev => new Set([...prev, channel]));
                    });
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            ws.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                setSocket(null);
                
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    if (isAuthenticated) {
                        connectWebSocket();
                    }
                }, 5000);
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnected(false);
            };

            setSocket(ws);
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
        }
    }, [isAuthenticated, user, socket]);

    // Handle incoming WebSocket messages
    const handleWebSocketMessage = useCallback((data) => {
        switch (data.type) {
            case 'notification':
                handleNotification(data);
                break;
            case 'subscribed':
                console.log(`Subscribed to ${data.channel} channel`);
                break;
            case 'unsubscribed':
                console.log(`Unsubscribed from ${data.channel} channel`);
                break;
            case 'pong':
                // Handle ping-pong for connection health
                break;
            case 'booking_confirmed':
                handleBookingConfirmation(data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }, []);

    // Handle notifications
    const handleNotification = useCallback((data) => {
        const notification = {
            id: Date.now() + Math.random(),
            ...data.data,
            timestamp: data.timestamp,
            channel: data.channel,
            read: false
        };

        setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications

        // Show browser notification if permission is granted
        if (Notification.permission === 'granted') {
            const title = getNotificationTitle(notification);
            const body = getNotificationBody(notification);
            
            new Notification(title, {
                body: body,
                icon: '/favicon.ico',
                tag: notification.id
            });
        }

        // Play notification sound
        playNotificationSound();
    }, []);

    // Handle booking confirmations
    const handleBookingConfirmation = useCallback((data) => {
        const notification = {
            id: Date.now() + Math.random(),
            type: 'booking_confirmed',
            title: 'New Booking Confirmed!',
            message: `Booking ${data.booking_reference} confirmed for ${data.guest_name}`,
            data: data,
            timestamp: data.timestamp,
            channel: 'reception',
            read: false
        };

        setNotifications(prev => [notification, ...prev.slice(0, 49)]);

        // Show browser notification
        if (Notification.permission === 'granted') {
            new Notification('New Booking Confirmed!', {
                body: `Booking ${data.booking_reference} confirmed for ${data.guest_name} in Room ${data.room_number}`,
                icon: '/favicon.ico',
                tag: notification.id
            });
        }

        // Play notification sound
        playNotificationSound();

        // Show toast notification (if toast library is available)
        if (window.toast) {
            window.toast.success(`New booking confirmed: ${data.guest_name} - Room ${data.room_number}`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        }
    }, []);

    // Get notification title based on type
    const getNotificationTitle = (notification) => {
        switch (notification.type) {
            case 'maintenance_update':
                return 'Maintenance Update';
            case 'housekeeping_update':
                return 'Housekeeping Update';
            case 'room_status_update':
                return 'Room Status Update';
            case 'booking_update':
                return 'Booking Update';
            case 'billing_update':
                return 'Billing Update';
            case 'system_alert':
                return 'System Alert';
            default:
                return 'New Notification';
        }
    };

    // Get notification body based on type
    const getNotificationBody = (notification) => {
        switch (notification.type) {
            case 'maintenance_update':
                return `Maintenance request ${notification.action} for Room ${notification.details?.room_number || 'Unknown'}`;
            case 'housekeeping_update':
                return `Housekeeping task ${notification.action} for Room ${notification.details?.room_number || 'Unknown'}`;
            case 'room_status_update':
                return `Room ${notification.details?.room_number || 'Unknown'} status changed to ${notification.details?.new_status}`;
            case 'booking_update':
                return `Booking ${notification.action} for Room ${notification.details?.room_number || 'Unknown'}`;
            case 'billing_update':
                return `Billing record ${notification.action}`;
            case 'system_alert':
                return notification.message;
            default:
                return 'You have a new notification';
        }
    };

    // Play notification sound
    const playNotificationSound = () => {
        try {
            const audio = new Audio('/notification.mp3'); // You'll need to add this sound file
            audio.volume = 0.5;
            audio.play().catch(error => {
                console.log('Could not play notification sound:', error);
            });
        } catch (error) {
            console.log('Failed to play notification sound:', error);
        }
    };

    // Request notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return Notification.permission === 'granted';
    }, []);

    // Mark notification as read
    const markNotificationAsRead = useCallback((notificationId) => {
        setNotifications(prev => 
            prev.map(notification => 
                notification.id === notificationId 
                    ? { ...notification, read: true }
                    : notification
            )
        );
    }, []);

    // Mark all notifications as read
    const markAllNotificationsAsRead = useCallback(() => {
        setNotifications(prev => 
            prev.map(notification => ({ ...notification, read: true }))
        );
    }, []);

    // Clear notifications
    const clearNotifications = useCallback(() => {
        setNotifications([]);
    }, []);

    // Subscribe to a channel
    const subscribeToChannel = useCallback((channel) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'subscribe',
                channel: channel
            }));
            setSubscriptions(prev => new Set([...prev, channel]));
        }
    }, [socket]);

    // Unsubscribe from a channel
    const unsubscribeFromChannel = useCallback((channel) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'unsubscribe',
                channel: channel
            }));
            setSubscriptions(prev => {
                const newSet = new Set(prev);
                newSet.delete(channel);
                return newSet;
            });
        }
    }, [socket]);

    // Send message to WebSocket server
    const sendMessage = useCallback((message) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }, [socket]);

    // Initialize WebSocket connection when user authenticates
    useEffect(() => {
        if (isAuthenticated && user) {
            requestNotificationPermission();
            connectWebSocket();
        }
    }, [isAuthenticated, user, connectWebSocket, requestNotificationPermission]);

    // Cleanup WebSocket connection
    useEffect(() => {
        return () => {
            if (socket) {
                socket.close();
            }
        };
    }, [socket]);

    // Send ping to keep connection alive
    useEffect(() => {
        if (socket && isConnected) {
            const pingInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000); // Send ping every 30 seconds

            return () => clearInterval(pingInterval);
        }
    }, [socket, isConnected]);

    const value = {
        isConnected,
        notifications,
        subscriptions,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        subscribeToChannel,
        unsubscribeFromChannel,
        sendMessage,
        requestNotificationPermission
    };

    return (
        <RealTimeContext.Provider value={value}>
            {children}
        </RealTimeContext.Provider>
    );
};
