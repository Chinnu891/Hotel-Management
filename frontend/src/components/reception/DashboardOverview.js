import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    FaClock, 
    FaUsers, 
    FaBed, 
    FaTools, 
    FaBroom, 
    FaMoneyBillWave,
    FaExclamationTriangle,
    FaCheckCircle,
    FaHourglassHalf,
    FaCalendarAlt,
    FaSync,
    FaBell
} from 'react-icons/fa';
import { buildApiUrl } from '../../config/api';
import RealTimeBillingSync from './RealTimeBillingSync';
import OptimizedComponent from '../common/OptimizedComponent';
import { useOptimizedLoading } from '../../hooks/useOptimizedAnimation';
import './DashboardOverview.css';

const DashboardOverview = () => {
    const [dashboardData, setDashboardData] = useState({
        today_checkins: { total: 0, completed: 0, pending: 0 },
        today_checkouts: { total: 0, completed: 0, pending: 0 },
        overdue_checkouts: { total: 0, overdue: 0 },
        current_guests: 0,
        room_status_summary: { available: 0, occupied: 0, cleaning: 0, maintenance: 0, total: 0 },
        maintenance_summary: { total: 0, high_priority: 0, medium_priority: 0, low_priority: 0, open: 0, in_progress: 0, completed: 0 },
        housekeeping_summary: { total: 0, pending: 0, in_progress: 0, completed: 0 },
        billing_summary: { total_revenue: 0, today_revenue: 0, pending_payments: 0, monthly_trend: [] },
        recent_activity: [],
        upcoming_checkins: [],
        timestamp: '',
        server_time: ''
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdated, setLastUpdated] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
    
    // Use optimized loading hook
    const { loadingDelay, startLoading, stopLoading } = useOptimizedLoading();

    // Update current time every second
    useEffect(() => {
        const timeInterval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timeInterval);
    }, []);

    // Auto-refresh dashboard data
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchDashboardData();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);

    // Initial data fetch
    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = useCallback(async () => {
        try {
            startLoading();
            setLoading(true);
            setError('');
            
            const response = await fetch(buildApiUrl('reception/dashboard_stats.php'), {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setDashboardData(data.data);
                    setLastUpdated(new Date().toLocaleTimeString());
                } else {
                    throw new Error(data.message || 'Failed to fetch dashboard data');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
            stopLoading();
        }
    }, [startLoading, stopLoading]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
            case 'available':
                return 'text-green-600 bg-green-100';
            case 'pending':
            case 'cleaning':
                return 'text-yellow-600 bg-yellow-100';
            case 'in_progress':
                return 'text-blue-600 bg-blue-100';
            case 'overdue':
            case 'maintenance':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return 'text-red-600 bg-red-100';
            case 'medium':
                return 'text-yellow-600 bg-yellow-100';
            case 'low':
                return 'text-green-600 bg-green-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    if (loading && Object.keys(dashboardData).length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                {loadingDelay && (
                    <div className="spinner-optimized rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Cards - Horizontal Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Today's Check-ins */}
                <OptimizedComponent animationType="fade-in" delay={100}>
                    <div className="bg-white overflow-hidden shadow rounded-lg card-animate">
                        <div className="p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                        <FaUsers className="text-white text-lg icon-optimized" />
                                    </div>
                                </div>
                                <div className="ml-3 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Today's Check-ins
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {dashboardData.today_checkins.completed}/{dashboardData.today_checkins.total}
                                        </dd>
                                        <dd className="text-sm text-gray-500">
                                            {dashboardData.today_checkins.pending} pending
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </OptimizedComponent>

                {/* Today's Check-outs */}
                <OptimizedComponent animationType="fade-in" delay={200}>
                    <div className="bg-white overflow-hidden shadow rounded-lg card-animate">
                        <div className="p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                        <FaBed className="text-white text-lg icon-optimized" />
                                    </div>
                                </div>
                                <div className="ml-3 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Today's Check-outs
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {dashboardData.today_checkouts.completed}/{dashboardData.today_checkouts.total}
                                        </dd>
                                        <dd className="text-sm text-gray-500">
                                            {dashboardData.today_checkouts.pending} pending
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </OptimizedComponent>

                {/* Current Guests */}
                <OptimizedComponent animationType="fade-in" delay={300}>
                    <div className="bg-white overflow-hidden shadow rounded-lg card-animate">
                        <div className="p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                        <FaUsers className="text-white text-lg icon-optimized" />
                                    </div>
                                </div>
                                <div className="ml-3 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">
                                            Current Guests
                                        </dt>
                                        <dd className="text-lg font-medium text-gray-900">
                                            {dashboardData.current_guests}
                                        </dd>
                                        <dd className="text-sm text-gray-500">
                                            In house
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </OptimizedComponent>

                {/* Overdue Check-outs */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-4">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                    <FaExclamationTriangle className="text-white text-lg" />
                                </div>
                            </div>
                            <div className="ml-3 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Overdue Check-outs
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {dashboardData.overdue_checkouts?.overdue || 0}
                                    </dd>
                                    <dd className="text-sm text-gray-500">
                                        Requires attention
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Horizontal Layout for Room Status, Maintenance, Housekeeping, and Billing */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Room Status */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <FaBed className="mr-2" />
                        Room Status
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Available</span>
                            <span className="text-xs font-medium text-green-600">
                                {dashboardData.room_status_summary.available}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Occupied</span>
                            <span className="text-xs font-medium text-blue-600">
                                {dashboardData.room_status_summary.occupied}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Cleaning</span>
                            <span className="text-xs font-medium text-yellow-600">
                                {dashboardData.room_status_summary.cleaning}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Maintenance</span>
                            <span className="text-xs font-medium text-red-600">
                                {dashboardData.room_status_summary.maintenance}
                            </span>
                        </div>
                        <div className="border-t pt-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-900">Total</span>
                                <span className="text-xs font-bold text-gray-900">
                                    {dashboardData.room_status_summary.total}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Summary */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <FaTools className="mr-2" />
                        Maintenance
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">High Priority</span>
                            <span className="text-xs font-medium text-red-600">
                                {dashboardData.maintenance_summary.high_priority}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">In Progress</span>
                            <span className="text-xs font-medium text-blue-600">
                                {dashboardData.maintenance_summary.in_progress}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Open</span>
                            <span className="text-xs font-medium text-yellow-600">
                                {dashboardData.maintenance_summary.open}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Completed</span>
                            <span className="text-xs font-medium text-green-600">
                                {dashboardData.maintenance_summary.completed}
                            </span>
                        </div>
                        <div className="border-t pt-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-900">Total</span>
                                <span className="text-xs font-bold text-gray-900">
                                    {dashboardData.maintenance_summary.total}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Housekeeping Tasks */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <FaBroom className="mr-2" />
                        Housekeeping
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Pending</span>
                            <span className="text-xs font-medium text-yellow-600">
                                {dashboardData.housekeeping_summary.pending}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">In Progress</span>
                            <span className="text-xs font-medium text-blue-600">
                                {dashboardData.housekeeping_summary.in_progress}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Completed</span>
                            <span className="text-xs font-medium text-green-600">
                                {dashboardData.housekeeping_summary.completed}
                            </span>
                        </div>
                        <div className="border-t pt-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-gray-900">Total</span>
                                <span className="text-xs font-bold text-gray-900">
                                    {dashboardData.housekeeping_summary.total}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Real-Time Billing Sync */}
                <div className="col-span-2">
                    <RealTimeBillingSync />
                </div>

                {/* Billing Summary */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <FaMoneyBillWave className="mr-2" />
                        Billing
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Today's Revenue</span>
                            <span className="text-xs font-medium text-green-600">
                                {formatCurrency(dashboardData.billing_summary.today_revenue)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Total Revenue</span>
                            <span className="text-xs font-medium text-blue-600">
                                {formatCurrency(dashboardData.billing_summary.total_revenue)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-gray-600">Pending Payments</span>
                            <span className="text-xs font-medium text-yellow-600">
                                {dashboardData.billing_summary.pending_payments}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Horizontal Layout for Recent Activity and Upcoming Check-ins */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent Activity */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <FaBell className="mr-2" />
                        Recent Activity
                    </h3>
                    <div className="space-y-2">
                        {dashboardData.recent_activity.length > 0 ? (
                            dashboardData.recent_activity.slice(0, 5).map((activity, index) => (
                                <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                                    <div className="flex items-center">
                                        <div className={`w-2 h-2 rounded-full mr-2 ${
                                            activity.type === 'check_in' ? 'bg-green-500' : 'bg-blue-500'
                                        }`}></div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-900">
                                                {activity.guest_name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Room {activity.room_number} • {activity.type === 'check_in' ? 'Checked In' : 'Checked Out'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {formatTime(activity.time)}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 text-center py-2">No recent activity</p>
                        )}
                    </div>
                </div>

                {/* Upcoming Check-ins */}
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <FaCalendarAlt className="mr-2" />
                        Upcoming Check-ins
                    </h3>
                    <div className="space-y-2">
                        {dashboardData.upcoming_checkins.length > 0 ? (
                            dashboardData.upcoming_checkins.slice(0, 5).map((checkin, index) => (
                                <div key={index} className="flex items-center justify-between py-1 border-b border-gray-100">
                                    <div>
                                        <p className="text-xs font-medium text-gray-900">
                                            {checkin.guest_name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Room {checkin.room_number} • {checkin.room_type}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500">
                                            {checkin.check_in_date}
                                        </span>
                                        <p className="text-xs text-blue-600">
                                            {checkin.days_until === 0 ? 'Today' : 
                                             checkin.days_until === 1 ? 'Tomorrow' : 
                                             `in ${checkin.days_until} days`}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 text-center py-2">No upcoming check-ins</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
