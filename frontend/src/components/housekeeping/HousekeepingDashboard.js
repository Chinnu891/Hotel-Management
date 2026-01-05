import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import TaskList from './TaskList';
import Checklist from './Checklist';
import RoomInspection from './RoomInspection';
import './HousekeepingDashboard.css';

const HousekeepingDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [tasks, setTasks] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_GET_TASKS));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                setTasks(data.data.tasks || []);
                setStatistics(data.data.statistics || {});
            } else {
                setError(data.message || 'Failed to fetch housekeeping tasks');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (taskData) => {
        try {
            const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_CREATE_TASK), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(taskData),
            });

            const result = await response.json();
            
            if (result.success) {
                setShowTaskForm(false);
                fetchTasks(); // Refresh data
                return { success: true, message: 'Housekeeping task created successfully' };
            } else {
                return { success: false, message: result.message || 'Failed to create housekeeping task' };
            }
        } catch (err) {
            return { success: false, message: err.message };
        }
    };

    const handleUpdateTask = async (id, updateData) => {
        try {
            const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_UPDATE_TASK), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, ...updateData }),
            });

            const result = await response.json();
            
            if (result.success) {
                fetchTasks(); // Refresh data
                return { success: true, message: 'Task updated successfully' };
            } else {
                return { success: false, message: result.message || 'Failed to update task' };
            }
        } catch (err) {
            return { success: false, message: err.message };
        }
    };

    const getTaskTypeColor = (taskType) => {
        const colors = {
            daily_cleaning: 'text-blue-600 bg-blue-100',
            deep_cleaning: 'text-purple-600 bg-purple-100',
            post_checkout: 'text-orange-600 bg-orange-100',
            pre_checkin: 'text-green-600 bg-green-100',
            inspection: 'text-indigo-600 bg-indigo-100'
        };
        return colors[taskType] || colors.daily_cleaning;
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
            verified: 'text-purple-600 bg-purple-100'
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
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Housekeeping Dashboard</h1>
                <p className="text-gray-600">Manage cleaning tasks, inspections, and room preparation</p>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                            <p className="text-2xl font-semibold text-gray-900">{statistics.total_tasks || 0}</p>
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

            {/* Today's Tasks Summary */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Tasks</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{statistics.today_count || 0}</p>
                        <p className="text-sm text-blue-800">Scheduled Today</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{statistics.completed_count || 0}</p>
                        <p className="text-sm text-green-800">Completed</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">{statistics.pending_count || 0}</p>
                        <p className="text-sm text-yellow-800">Pending</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 mb-6">
                <button
                    onClick={() => setShowTaskForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    New Task
                </button>
                
                <button
                    onClick={() => setActiveTab('inspection')}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Room Inspection
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
                        onClick={() => setActiveTab('tasks')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'tasks'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        All Tasks
                    </button>
                    <button
                        onClick={() => setActiveTab('checklist')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'checklist'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Checklists
                    </button>
                    <button
                        onClick={() => setActiveTab('inspection')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'inspection'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Inspections
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tasks</h3>
                            <div className="space-y-3">
                                {tasks.slice(0, 5).map((task) => (
                                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskTypeColor(task.task_type)}`}>
                                                {task.task_type.replace('_', ' ')}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Room {task.room_number}</p>
                                                <p className="text-xs text-gray-500">{task.scheduled_date}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                            {task.status.replace('_', ' ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Type Distribution</h3>
                            <div className="space-y-3">
                                {statistics.type_distribution?.map((type) => (
                                    <div key={type.task_type} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 capitalize">
                                            {type.task_type.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900">{type.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'tasks' && (
                    <TaskList
                        tasks={tasks}
                        onUpdate={handleUpdateTask}
                        onSelect={setSelectedTask}
                        onRefresh={fetchTasks}
                    />
                )}

                {activeTab === 'checklist' && (
                    <Checklist
                        tasks={tasks}
                        onUpdate={handleUpdateTask}
                    />
                )}

                {activeTab === 'inspection' && (
                    <RoomInspection
                        onUpdate={handleUpdateTask}
                    />
                )}
            </div>

            {/* Task Form Modal */}
            {showTaskForm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
                            {/* Task form would go here */}
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setShowTaskForm(false)}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowTaskForm(false)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HousekeepingDashboard;
