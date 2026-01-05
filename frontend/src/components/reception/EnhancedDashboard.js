import React, { useState, useEffect } from 'react';
import DashboardOverview from './DashboardOverview';
import DashboardClock from './DashboardClock';
import DashboardNotifications, { sampleNotifications } from './DashboardNotifications';

const EnhancedDashboard = () => {
    const [notifications, setNotifications] = useState(sampleNotifications);
    const [lastSync, setLastSync] = useState(null);

    const handleMarkAsRead = (id) => {
        setNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const handleSync = () => {
        setLastSync(new Date());
        // Additional sync logic can be added here
    };

    return (
        <div className="space-y-6">
            {/* Header with Clock and Notifications */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Dashboard Overview */}
                <div className="lg:col-span-2">
                    <DashboardOverview />
                </div>
                
                {/* Right Sidebar with Clock and Notifications */}
                <div className="space-y-6">
                    {/* Real-Time Clock */}
                    <DashboardClock 
                        serverTime="14:30:25"
                        lastSync={lastSync}
                        onSync={handleSync}
                    />
                    
                    {/* Quick Stats Summary */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Quick Stats
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Today's Revenue</span>
                                <span className="text-sm font-medium text-green-600">₹15,750</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Available Rooms</span>
                                <span className="text-sm font-medium text-blue-600">12</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Pending Tasks</span>
                                <span className="text-sm font-medium text-yellow-600">8</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Maintenance</span>
                                <span className="text-sm font-medium text-red-600">3</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Dashboard Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity Feed */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Recent Activity Feed
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    Guest checked in
                                </p>
                                <p className="text-xs text-gray-500">
                                    John Smith checked into Room 201 at 2:30 PM
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    5 minutes ago
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    Payment received
                                </p>
                                <p className="text-xs text-gray-500">
                                    ₹2,500 received for Room 105 via UPI
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    15 minutes ago
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    Maintenance request
                                </p>
                                <p className="text-xs text-gray-500">
                                    AC issue reported in Room 205
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    30 minutes ago
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    Housekeeping completed
                                </p>
                                <p className="text-xs text-gray-500">
                                    Room 301 cleaning and inspection completed
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    1 hour ago
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Today's Schedule
                    </h3>
                    <div className="space-y-4">
                        <div className="border-l-4 border-blue-500 pl-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        3:00 PM - Check-in
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Sarah Johnson - Room 105
                                    </p>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    Pending
                                </span>
                            </div>
                        </div>
                        
                        <div className="border-l-4 border-green-500 pl-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        4:30 PM - Check-out
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Mike Wilson - Room 203
                                    </p>
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                    Confirmed
                                </span>
                            </div>
                        </div>
                        
                        <div className="border-l-4 border-yellow-500 pl-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        6:00 PM - Maintenance
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Room 205 AC repair
                                    </p>
                                </div>
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                    Scheduled
                                </span>
                            </div>
                        </div>
                        
                        <div className="border-l-4 border-purple-500 pl-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">
                                        8:00 PM - Housekeeping
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Room 301 deep cleaning
                                    </p>
                                </div>
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                    In Progress
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Status and Alerts */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    System Status & Alerts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <div>
                            <p className="text-sm font-medium text-green-800">
                                Database Connection
                            </p>
                            <p className="text-xs text-green-600">All systems operational</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                        <div>
                            <p className="text-sm font-medium text-yellow-800">
                                Backup Status
                            </p>
                            <p className="text-xs text-yellow-600">Last backup: 2 hours ago</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                        <div>
                            <p className="text-sm font-medium text-blue-800">
                                API Services
                            </p>
                            <p className="text-xs text-blue-600">All endpoints responding</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedDashboard;
