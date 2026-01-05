import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './MaintenanceCalendar.css';

const MaintenanceCalendar = ({ onTaskClick, onDateSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [maintenanceData, setMaintenanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [calendarView, setCalendarView] = useState('month'); // month, week, day
    const [dragData, setDragData] = useState(null);

    useEffect(() => {
        fetchMaintenanceData();
    }, [currentDate, calendarView]);

    const fetchMaintenanceData = async () => {
        setLoading(true);
        try {
            const startDate = getStartOfPeriod();
            const endDate = getEndOfPeriod();
            
            const queryParams = new URLSearchParams({
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0]
            });

            const response = await fetch(`${buildApiUrl(API_ENDPOINTS.MAINTENANCE_GET_ALL)}?${queryParams}`);
            const data = await response.json();

            if (data.success) {
                setMaintenanceData(data.data.maintenance || []);
            }
        } catch (error) {
            console.error('Error fetching maintenance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStartOfPeriod = () => {
        const date = new Date(currentDate);
        if (calendarView === 'month') {
            date.setDate(1);
        } else if (calendarView === 'week') {
            const day = date.getDay();
            date.setDate(date.getDate() - day);
        }
        return date;
    };

    const getEndOfPeriod = () => {
        const date = new Date(currentDate);
        if (calendarView === 'month') {
            date.setMonth(date.getMonth() + 1, 0);
        } else if (calendarView === 'week') {
            const day = date.getDay();
            date.setDate(date.getDate() + (6 - day));
        }
        return date;
    };

    const navigatePeriod = (direction) => {
        const newDate = new Date(currentDate);
        if (calendarView === 'month') {
            newDate.setMonth(newDate.getMonth() + direction);
        } else if (calendarView === 'week') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        } else if (calendarView === 'day') {
            newDate.setDate(newDate.getDate() + direction);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(null);
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];
        
        // Add previous month's days
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const prevDate = new Date(year, month, -i);
            days.push({
                date: prevDate,
                isCurrentMonth: false,
                isToday: isToday(prevDate)
            });
        }

        // Add current month's days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push({
                date: date,
                isCurrentMonth: true,
                isToday: isToday(date)
            });
        }

        // Add next month's days to complete the grid
        const remainingDays = 42 - days.length; // 6 rows * 7 days
        for (let i = 1; i <= remainingDays; i++) {
            const nextDate = new Date(year, month + 1, i);
            days.push({
                date: nextDate,
                isCurrentMonth: false,
                isToday: isToday(nextDate)
            });
        }

        return days;
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const getMaintenanceForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return maintenanceData.filter(item => {
            const itemDate = new Date(item.scheduled_date || item.created_at);
            return itemDate.toISOString().split('T')[0] === dateStr;
        });
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

    const handleDateClick = (date) => {
        setSelectedDate(date);
        onDateSelect && onDateSelect(date);
    };

    const handleTaskClick = (task, event) => {
        event.stopPropagation();
        onTaskClick && onTaskClick(task);
    };

    const handleDragStart = (event, task) => {
        setDragData(task);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (event, targetDate) => {
        event.preventDefault();
        if (!dragData) return;

        try {
            const response = await fetch(buildApiUrl(API_ENDPOINTS.MAINTENANCE_UPDATE), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: dragData.id,
                    scheduled_date: targetDate.toISOString().split('T')[0]
                })
            });

            const data = await response.json();
            if (data.success) {
                fetchMaintenanceData(); // Refresh the calendar
            }
        } catch (error) {
            console.error('Error updating task date:', error);
        }

        setDragData(null);
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDay = (date) => {
        return date.getDate();
    };

    const formatWeekday = (date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    if (loading) {
        return (
            <div className="maintenance-calendar-container">
                <div className="loading-spinner">Loading calendar...</div>
            </div>
        );
    }

    return (
        <div className="maintenance-calendar-container">
            {/* Calendar Header */}
            <div className="calendar-header">
                <div className="calendar-navigation">
                    <button 
                        onClick={() => navigatePeriod(-1)}
                        className="nav-btn"
                    >
                        ‹
                    </button>
                    <h2 className="current-period">{formatDate(currentDate)}</h2>
                    <button 
                        onClick={() => navigatePeriod(1)}
                        className="nav-btn"
                    >
                        ›
                    </button>
                </div>
                
                <div className="calendar-controls">
                    <div className="view-selector">
                        <button
                            className={`view-btn ${calendarView === 'month' ? 'active' : ''}`}
                            onClick={() => setCalendarView('month')}
                        >
                            Month
                        </button>
                        <button
                            className={`view-btn ${calendarView === 'week' ? 'active' : ''}`}
                            onClick={() => setCalendarView('week')}
                        >
                            Week
                        </button>
                        <button
                            className={`view-btn ${calendarView === 'day' ? 'active' : ''}`}
                            onClick={() => setCalendarView('day')}
                        >
                            Day
                        </button>
                    </div>
                    <button onClick={goToToday} className="today-btn">
                        Today
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
                {/* Weekday Headers */}
                <div className="weekday-headers">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="weekday-header">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="calendar-days">
                    {getDaysInMonth().map((day, index) => {
                        const maintenanceTasks = getMaintenanceForDate(day.date);
                        const isSelected = selectedDate && selectedDate.toDateString() === day.date.toDateString();
                        
                        return (
                            <div
                                key={index}
                                className={`calendar-day ${day.isCurrentMonth ? 'current-month' : 'other-month'} ${day.isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleDateClick(day.date)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, day.date)}
                            >
                                <div className="day-header">
                                    <span className="day-number">{formatDay(day.date)}</span>
                                    {maintenanceTasks.length > 0 && (
                                        <span className="task-count">{maintenanceTasks.length}</span>
                                    )}
                                </div>
                                
                                <div className="day-tasks">
                                    {maintenanceTasks.slice(0, 3).map((task, taskIndex) => (
                                        <div
                                            key={task.id}
                                            className="calendar-task"
                                            style={{
                                                borderLeftColor: getPriorityColor(task.priority),
                                                backgroundColor: getStatusColor(task.status) + '20'
                                            }}
                                            onClick={(e) => handleTaskClick(task, e)}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task)}
                                        >
                                            <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>
                                            <div className="task-content">
                                                <div className="task-title">
                                                    {task.issue_type.charAt(0).toUpperCase() + task.issue_type.slice(1)}
                                                </div>
                                                <div className="task-room">
                                                    Room {task.room_id}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {maintenanceTasks.length > 3 && (
                                        <div className="more-tasks">
                                            +{maintenanceTasks.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
                <div className="selected-date-details">
                    <h3>Tasks for {selectedDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</h3>
                    
                    <div className="date-tasks-list">
                        {getMaintenanceForDate(selectedDate).length === 0 ? (
                            <p className="no-tasks">No maintenance tasks scheduled for this date.</p>
                        ) : (
                            getMaintenanceForDate(selectedDate).map(task => (
                                <div
                                    key={task.id}
                                    className="date-task-item"
                                    onClick={() => onTaskClick && onTaskClick(task)}
                                >
                                    <div className="task-priority-indicator" style={{ backgroundColor: getPriorityColor(task.priority) }}></div>
                                    <div className="task-info">
                                        <div className="task-main">
                                            <span className="task-type">{task.issue_type.charAt(0).toUpperCase() + task.issue_type.slice(1)}</span>
                                            <span className="task-room">Room {task.room_id}</span>
                                        </div>
                                        <div className="task-description">{task.description}</div>
                                        <div className="task-meta">
                                            <span className="task-status" style={{ color: getStatusColor(task.status) }}>
                                                {task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.replace('_', ' ').slice(1)}
                                            </span>
                                            <span className="task-priority" style={{ color: getPriorityColor(task.priority) }}>
                                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaintenanceCalendar;
