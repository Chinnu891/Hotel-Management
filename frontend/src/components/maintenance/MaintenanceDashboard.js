import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import MaintenanceForm from './MaintenanceForm';
import MaintenanceList from './MaintenanceList';
import MaintenanceCalendar from './MaintenanceCalendar';
import './MaintenanceDashboard.css';

const MaintenanceDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [maintenanceData, setMaintenanceData] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        fetchMaintenanceData();
    }, []);

    const fetchMaintenanceData = async () => {
        try {
            setLoading(true);
            const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_GET_ALL));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                setMaintenanceData(data.data.maintenance_items || []);
                setStatistics(data.data.statistics || {});
            } else {
                setError(data.message || 'Failed to fetch maintenance data');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMaintenance = async (maintenanceData) => {
        try {
            const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_CREATE), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(maintenanceData),
            });

            const result = await response.json();
            
            if (result.success) {
                setShowForm(false);
                fetchMaintenanceData(); // Refresh data
                return { success: true, message: 'Maintenance request created successfully' };
            } else {
                return { success: false, message: result.message || 'Failed to create maintenance request' };
            }
        } catch (err) {
            return { success: false, message: err.message };
        }
    };

    const handleUpdateMaintenance = async (id, updateData) => {
        try {
            const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_UPDATE), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, ...updateData }),
            });

            const result = await response.json();
            
            if (result.success) {
                setEditingItem(null);
                fetchMaintenanceData(); // Refresh data
                return { success: true, message: 'Maintenance request updated successfully' };
            } else {
                return { success: false, message: result.message || 'Failed to update maintenance request' };
            }
        } catch (err) {
            return { success: false, message: err.message };
        }
    };

    const getPriorityColor = (priority) => {
        const colors = {
            urgent: 'text-red-600 bg-red-100',
            high: 'text-orange-600 bg-orange-100',
            medium: 'text-yellow-600 bg-yellow-100',
            low: 'text-green-600 bg-green-100'
        };
        return colors[priority] || colors.medium;
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: 'text-yellow-600 bg-yellow-100',
            in_progress: 'text-blue-600 bg-blue-100',
            completed: 'text-green-600 bg-green-100',
            cancelled: 'text-gray-600 bg-gray-100'
        };
        return colors[status] || colors.pending;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Maintenance Dashboard</h1>
                <p className="text-gray-600">Manage maintenance requests and track progress</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Maintenance</p>
                            <p className="text-2xl font-semibold text-gray-900">{statistics.total_maintenance || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Pending</p>
                            <p className="text-2xl font-semibold text-gray-900">{statistics.pending_count || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">In Progress</p>
                            <p className="text-2xl font-semibold text-gray-900">{statistics.in_progress_count || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-green-100 text-green-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Completed</p>
                            <p className="text-2xl font-semibold text-gray-900">{statistics.completed_count || 0}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Priority Alerts */}
            {(statistics.urgent_count > 0 || statistics.high_count > 0) && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Priority Alerts</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {statistics.urgent_count > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            {statistics.urgent_count} Urgent Maintenance Request{statistics.urgent_count > 1 ? 's' : ''}
                                        </h3>
                                        <p className="text-sm text-red-700 mt-1">
                                            Requires immediate attention
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {statistics.high_count > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-orange-800">
                                            {statistics.high_count} High Priority Request{statistics.high_count > 1 ? 's' : ''}
                                        </h3>
                                        <p className="text-sm text-orange-700 mt-1">
                                            Schedule within 24 hours
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Maintenance Request
                </button>
                
                <button
                    onClick={() => setActiveTab('calendar')}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    View Calendar
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'overview'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'list'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        All Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('calendar')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'calendar'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Calendar
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Maintenance Requests</h3>
                            <div className="space-y-3">
                                {maintenanceData.slice(0, 5).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                                                {item.priority}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Room {item.room_number}</p>
                                                <p className="text-xs text-gray-500">{item.description}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                            {item.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                        <span className="text-blue-800 font-medium">Create New Request</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => setActiveTab('list')}
                                    className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                >
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <span className="text-green-800 font-medium">View All Requests</span>
                                    </div>
                                </button>
                                
                                <button
                                    onClick={() => setActiveTab('calendar')}
                                    className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                >
                                    <div className="flex items-center">
                                        <svg className="w-5 h-5 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-purple-800 font-medium">Schedule View</span>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'list' && (
                    <MaintenanceList
                        maintenanceData={maintenanceData}
                        onUpdate={handleUpdateMaintenance}
                        onEdit={setEditingItem}
                        onRefresh={fetchMaintenanceData}
                    />
                )}

                {activeTab === 'calendar' && (
                    <MaintenanceCalendar
                        maintenanceData={maintenanceData}
                        onUpdate={handleUpdateMaintenance}
                    />
                )}
            </div>

            {/* Maintenance Form Modal */}
            {showForm && (
                <MaintenanceForm
                    onSubmit={handleCreateMaintenance}
                    onCancel={() => setShowForm(false)}
                    editingItem={editingItem}
                />
            )}
        </div>
    );
};

export default MaintenanceDashboard;
