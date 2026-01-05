import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './TaskList.css';

const TaskList = ({ onEdit, onStatusChange, refreshTrigger }) => {
    const [taskList, setTaskList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        task_type: '',
        room_id: '',
        assigned_to: '',
        scheduled_date: ''
    });
    const [sortBy, setSortBy] = useState('scheduled_date');
    const [sortOrder, setSortOrder] = useState('asc');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0
    });
    const [rooms, setRooms] = useState([]);
    const [staff, setStaff] = useState([]);
    const [selectedTask, setSelectedTask] = useState(null);

    useEffect(() => {
        fetchTaskData();
        fetchRooms();
        fetchStaff();
    }, [filters, sortBy, sortOrder, pagination.page, refreshTrigger]);

    const fetchTaskData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters
            });

            const response = await fetch(`${buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_GET_TASKS)}?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setTaskList(data.data.tasks || []);
                setPagination(prev => ({
                    ...prev,
                    total: data.data.total || 0
                }));
            } else {
                setError(data.message || 'Failed to fetch task data');
            }
        } catch (error) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const response = await fetch(buildApiUrl('rooms/getAll.php'));
            const data = await response.json();
            if (data.success) {
                setRooms(data.rooms);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await fetch(buildApiUrl('maintenance/get_maintenance_staff.php'));
            const data = await response.json();
            if (data.success) {
                setStaff(data.data);
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const response = await fetch(buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_UPDATE_TASK), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, status: newStatus })
            });

            const data = await response.json();
            if (data.success) {
                onStatusChange && onStatusChange(id, newStatus);
                fetchTaskData(); // Refresh the list
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleTaskClick = (task) => {
        setSelectedTask(selectedTask?.id === task.id ? null : task);
    };

    const getPriorityColor = (priority) => {
        const colors = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444',
            urgent: '#dc2626'
        };
        return colors[priority] || '#6b7280';
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: '#f59e0b',
            'in_progress': '#3b82f6',
            completed: '#10b981',
            cancelled: '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoomNumber = (roomId) => {
        const room = rooms.find(r => r.id == roomId);
        return room ? room.room_number : 'Unknown';
    };

    const getStaffName = (staffId) => {
        const member = staff.find(s => s.id == staffId);
        return member ? member.name : 'Unassigned';
    };

    const getCompletionPercentage = (task) => {
        if (!task.checklist_items || task.checklist_items.length === 0) return 0;
        const completed = task.checklist_items.filter(item => item.completed).length;
        return Math.round((completed / task.checklist_items.length) * 100);
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            task_type: '',
            room_id: '',
            assigned_to: '',
            scheduled_date: ''
        });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    if (loading && taskList.length === 0) {
        return (
            <div className="task-list-container">
                <div className="loading-spinner">Loading housekeeping tasks...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="task-list-container">
                <div className="error-message">
                    {error}
                    <button onClick={fetchTaskData} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="task-list-container">
            {/* Filters Section */}
            <div className="filters-section">
                <h3>Filters</h3>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Priority</label>
                        <select
                            value={filters.priority}
                            onChange={(e) => handleFilterChange('priority', e.target.value)}
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Task Type</label>
                        <select
                            value={filters.task_type}
                            onChange={(e) => handleFilterChange('task_type', e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="daily_cleaning">Daily Cleaning</option>
                            <option value="deep_cleaning">Deep Cleaning</option>
                            <option value="turnover">Turnover</option>
                            <option value="inspection">Inspection</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Room</label>
                        <select
                            value={filters.room_id}
                            onChange={(e) => handleFilterChange('room_id', e.target.value)}
                        >
                            <option value="">All Rooms</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    Room {room.room_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Assigned To</label>
                        <select
                            value={filters.assigned_to}
                            onChange={(e) => handleFilterChange('assigned_to', e.target.value)}
                        >
                            <option value="">All Staff</option>
                            {staff.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Scheduled Date</label>
                        <input
                            type="date"
                            value={filters.scheduled_date}
                            onChange={(e) => handleFilterChange('scheduled_date', e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-actions">
                    <button onClick={clearFilters} className="btn btn-secondary">
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Results Summary */}
            <div className="results-summary">
                <span>Showing {taskList.length} of {pagination.total} housekeeping tasks</span>
            </div>

            {/* Task List */}
            <div className="task-list">
                {taskList.map((task) => (
                    <div key={task.id} className={`task-item priority-${task.priority}`}>
                        <div className="task-header" onClick={() => handleTaskClick(task)}>
                            <div className="task-main-info">
                                <div className="task-type-badge">
                                    {task.task_type.replace('_', ' ').charAt(0).toUpperCase() + task.task_type.replace('_', ' ').slice(1)}
                                </div>
                                <div className="task-room">
                                    Room {getRoomNumber(task.room_id)}
                                </div>
                                <div className="task-schedule">
                                    {formatDate(task.scheduled_date)} at {formatTime(task.scheduled_time)}
                                </div>
                            </div>
                            
                            <div className="task-status-section">
                                <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    className="status-select"
                                    style={{ borderColor: getStatusColor(task.status) }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                
                                <span 
                                    className="priority-badge"
                                    style={{ backgroundColor: getPriorityColor(task.priority) }}
                                >
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Task Details (Expandable) */}
                        {selectedTask?.id === task.id && (
                            <div className="task-details">
                                <div className="task-description">
                                    <strong>Description:</strong> {task.description || 'No description provided'}
                                </div>
                                
                                <div className="task-meta">
                                    <div className="meta-item">
                                        <strong>Assigned To:</strong> {getStaffName(task.assigned_to)}
                                    </div>
                                    <div className="meta-item">
                                        <strong>Estimated Duration:</strong> {task.estimated_duration || 'Not specified'} hours
                                    </div>
                                    <div className="meta-item">
                                        <strong>Notes:</strong> {task.notes || 'No notes'}
                                    </div>
                                </div>

                                {/* Checklist Progress */}
                                {task.checklist_items && task.checklist_items.length > 0 && (
                                    <div className="checklist-section">
                                        <div className="checklist-header">
                                            <strong>Checklist Progress</strong>
                                            <span className="completion-percentage">
                                                {getCompletionPercentage(task)}% Complete
                                            </span>
                                        </div>
                                        <div className="checklist-progress-bar">
                                            <div 
                                                className="progress-fill"
                                                style={{ width: `${getCompletionPercentage(task)}%` }}
                                            ></div>
                                        </div>
                                        <div className="checklist-items">
                                            {task.checklist_items.map((item, index) => (
                                                <div key={index} className="checklist-item">
                                                    <span className={`checklist-checkbox ${item.completed ? 'completed' : ''}`}>
                                                        {item.completed ? '✓' : '○'}
                                                    </span>
                                                    <span className="checklist-text">{item.item_text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="task-actions">
                                    <button
                                        onClick={() => onEdit(task)}
                                        className="btn btn-primary btn-sm"
                                    >
                                        Edit Task
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(task.id, 'completed')}
                                        className="btn btn-success btn-sm"
                                        disabled={task.status === 'completed'}
                                    >
                                        Mark Complete
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="btn btn-secondary"
                    >
                        Previous
                    </button>
                    
                    <span className="page-info">
                        Page {pagination.page} of {totalPages}
                    </span>
                    
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === totalPages}
                        className="btn btn-secondary"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default TaskList;
