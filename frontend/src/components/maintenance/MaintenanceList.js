import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './MaintenanceList.css';

const MaintenanceList = ({ onEdit, onStatusChange, refreshTrigger }) => {
    const [maintenanceList, setMaintenanceList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        priority: '',
        issue_type: '',
        room_id: '',
        assigned_to: ''
    });
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0
    });
    const [rooms, setRooms] = useState([]);
    const [staff, setStaff] = useState([]);

    useEffect(() => {
        fetchMaintenanceData();
        fetchRooms();
        fetchStaff();
    }, [filters, sortBy, sortOrder, pagination.page, refreshTrigger]);

    const fetchMaintenanceData = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                sort_by: sortBy,
                sort_order: sortOrder,
                ...filters
            });

            const response = await fetch(`${buildApiUrl(API_ENDPOINTS.MAINTENANCE_GET_ALL)}?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setMaintenanceList(data.data.maintenance || []);
                setPagination(prev => ({
                    ...prev,
                    total: data.data.total || 0
                }));
            } else {
                setError(data.message || 'Failed to fetch maintenance data');
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
            const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_UPDATE), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, status: newStatus })
            });

            const data = await response.json();
            if (data.success) {
                onStatusChange && onStatusChange(id, newStatus);
                fetchMaintenanceData(); // Refresh the list
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
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
            day: 'numeric',
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

    const clearFilters = () => {
        setFilters({
            status: '',
            priority: '',
            issue_type: '',
            room_id: '',
            assigned_to: ''
        });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    if (loading && maintenanceList.length === 0) {
        return (
            <div className="maintenance-list-container">
                <div className="loading-spinner">Loading maintenance requests...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="maintenance-list-container">
                <div className="error-message">
                    {error}
                    <button onClick={fetchMaintenanceData} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="maintenance-list-container">
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
                        <label>Issue Type</label>
                        <select
                            value={filters.issue_type}
                            onChange={(e) => handleFilterChange('issue_type', e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="repair">Repair</option>
                            <option value="cleaning">Cleaning</option>
                            <option value="inspection">Inspection</option>
                            <option value="upgrade">Upgrade</option>
                            <option value="replacement">Replacement</option>
                            <option value="other">Other</option>
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
                </div>

                <div className="filter-actions">
                    <button onClick={clearFilters} className="btn btn-secondary">
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Results Summary */}
            <div className="results-summary">
                <span>Showing {maintenanceList.length} of {pagination.total} maintenance requests</span>
            </div>

            {/* Maintenance List Table */}
            <div className="table-container">
                <table className="maintenance-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('id')} className="sortable">
                                ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('room_id')} className="sortable">
                                Room {sortBy === 'room_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('issue_type')} className="sortable">
                                Issue Type {sortBy === 'issue_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Description</th>
                            <th onClick={() => handleSort('priority')} className="sortable">
                                Priority {sortBy === 'priority' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th onClick={() => handleSort('status')} className="sortable">
                                Status {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Assigned To</th>
                            <th onClick={() => handleSort('created_at')} className="sortable">
                                Created {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {maintenanceList.map((item) => (
                            <tr key={item.id} className={`priority-${item.priority}`}>
                                <td>#{item.id}</td>
                                <td>
                                    <span className="room-number">
                                        Room {getRoomNumber(item.room_id)}
                                    </span>
                                </td>
                                <td>
                                    <span className="issue-type">
                                        {item.issue_type.charAt(0).toUpperCase() + item.issue_type.slice(1)}
                                    </span>
                                </td>
                                <td>
                                    <div className="description-cell">
                                        <span className="description-text" title={item.description}>
                                            {item.description.length > 50 
                                                ? `${item.description.substring(0, 50)}...` 
                                                : item.description
                                            }
                                        </span>
                                    </div>
                                </td>
                                <td>
                                    <span 
                                        className="priority-badge"
                                        style={{ backgroundColor: getPriorityColor(item.priority) }}
                                    >
                                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                                    </span>
                                </td>
                                <td>
                                    <select
                                        value={item.status}
                                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                        className="status-select"
                                        style={{ borderColor: getStatusColor(item.status) }}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </td>
                                <td>
                                    <span className="assigned-to">
                                        {getStaffName(item.assigned_to)}
                                    </span>
                                </td>
                                <td>
                                    <span className="date-created">
                                        {formatDate(item.created_at)}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            onClick={() => onEdit(item)}
                                            className="btn btn-sm btn-primary"
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(item.id, 'completed')}
                                            className="btn btn-sm btn-success"
                                            title="Mark Complete"
                                            disabled={item.status === 'completed'}
                                        >
                                            ✓
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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

export default MaintenanceList;
