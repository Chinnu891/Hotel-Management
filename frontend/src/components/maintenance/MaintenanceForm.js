import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './MaintenanceForm.css';

const MaintenanceForm = ({ onSubmit, onCancel, initialData = null, isEdit = false }) => {
    const [formData, setFormData] = useState({
        room_id: '',
        issue_type: '',
        description: '',
        priority: 'medium',
        estimated_duration: '',
        assigned_to: '',
        notes: ''
    });
    
    const [rooms, setRooms] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const issueTypes = [
        'repair',
        'cleaning',
        'inspection',
        'upgrade',
        'replacement',
        'other'
    ];

    const priorities = [
        { value: 'low', label: 'Low', color: 'green' },
        { value: 'medium', label: 'Medium', color: 'orange' },
        { value: 'high', label: 'High', color: 'red' },
        { value: 'urgent', label: 'Urgent', color: 'darkred' }
    ];

    useEffect(() => {
        console.log('MaintenanceForm useEffect triggered');
        fetchRooms();
        fetchStaff();
        if (initialData) {
            setFormData(initialData);
        }
    }, [initialData]);

    const fetchRooms = async () => {
        try {
            console.log('Fetching rooms from:', buildApiUrl('rooms/getAll.php'));
            const response = await fetch(buildApiUrl('rooms/getAll.php'));
            console.log('Rooms response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Rooms data:', data);
            if (data.success) {
                const filteredRooms = data.rooms.filter(room => room.status !== 'maintenance' || isEdit);
                console.log('Filtered rooms:', filteredRooms);
                setRooms(filteredRooms);
            } else {
                console.error('Rooms API error:', data.message);
                setRooms([]);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
            setRooms([]);
        }
    };

    const fetchStaff = async () => {
        try {
            console.log('Fetching staff from:', buildApiUrl('maintenance/get_maintenance_staff.php'));
            const response = await fetch(buildApiUrl('maintenance/get_maintenance_staff.php'));
            console.log('Staff response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Staff data:', data);
            if (data.success) {
                setStaff(data.data);
            } else {
                console.error('Staff API error:', data.message);
                // Set default staff if API fails
                setStaff([
                    { id: 1, name: 'General Maintenance Staff', specialization: 'General Repairs' },
                    { id: 2, name: 'Housekeeping Staff', specialization: 'Cleaning & Inspection' }
                ]);
            }
        } catch (error) {
            console.error('Error fetching staff:', error);
            // Set default staff on error
            setStaff([
                { id: 1, name: 'General Maintenance Staff', specialization: 'General Repairs' },
                { id: 2, name: 'Housekeeping Staff', specialization: 'Cleaning & Inspection' }
            ]);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.room_id) newErrors.room_id = 'Room is required';
        if (!formData.issue_type) newErrors.issue_type = 'Issue type is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (!formData.priority) newErrors.priority = 'Priority is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setLoading(true);
        try {
            const endpoint = isEdit ? 
                buildApiUrl(API_ENDPOINTS.MAINTENANCE_UPDATE) : 
                buildApiUrl(API_ENDPOINTS.MAINTENANCE_CREATE);
            
            const method = isEdit ? 'PUT' : 'POST';
            const body = isEdit ? { id: initialData.id, ...formData } : formData;
            
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (data.success) {
                onSubmit(data.data);
                if (!isEdit) {
                    setFormData({
                        room_id: '',
                        issue_type: '',
                        description: '',
                        priority: 'medium',
                        estimated_duration: '',
                        assigned_to: '',
                        notes: ''
                    });
                }
            } else {
                setErrors({ general: data.message || 'Failed to save maintenance request' });
            }
        } catch (error) {
            setErrors({ general: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const getPriorityColor = (priority) => {
        const priorityObj = priorities.find(p => p.value === priority);
        return priorityObj ? priorityObj.color : 'gray';
    };

    return (
        <div className="maintenance-form-container">
            <div className="maintenance-form-header">
                <h3>{isEdit ? 'Edit Maintenance Request' : 'Create Maintenance Request'}</h3>
                <button 
                    type="button" 
                    className="close-btn"
                    onClick={onCancel}
                >
                    ×
                </button>
            </div>
            

            
            <form onSubmit={handleSubmit} className="maintenance-form">
                {errors.general && (
                    <div className="error-message general-error">
                        {errors.general}
                    </div>
                )}
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="room_id">Room *</label>
                        <select
                            id="room_id"
                            name="room_id"
                            value={formData.room_id}
                            onChange={handleInputChange}
                            className={errors.room_id ? 'error' : ''}
                            disabled={loading}
                        >
                            <option value="">{loading ? 'Loading rooms...' : 'Select a room'}</option>
                            {rooms.length > 0 ? (
                                rooms.map(room => (
                                    <option key={room.id} value={room.id}>
                                        Room {room.room_number} - {room.room_type} ({room.status})
                                    </option>
                                ))
                            ) : !loading && (
                                <option value="" disabled>No rooms available</option>
                            )}
                        </select>
                        {errors.room_id && <span className="error-text">{errors.room_id}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="issue_type">Issue Type *</label>
                        <select
                            id="issue_type"
                            name="issue_type"
                            value={formData.issue_type}
                            onChange={handleInputChange}
                            className={errors.issue_type ? 'error' : ''}
                        >
                            <option value="">Select issue type</option>
                            {issueTypes.map(type => (
                                <option key={type} value={type}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                </option>
                            ))}
                        </select>
                        {errors.issue_type && <span className="error-text">{errors.issue_type}</span>}
                    </div>
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="priority">Priority *</label>
                        <div className="priority-selector">
                            {priorities.map(priority => (
                                <label key={priority.value} className="priority-option">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value={priority.value}
                                        checked={formData.priority === priority.value}
                                        onChange={handleInputChange}
                                    />
                                    <span 
                                        className="priority-label"
                                        style={{ borderColor: priority.color }}
                                    >
                                        {priority.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                        {errors.priority && <span className="error-text">{errors.priority}</span>}
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="estimated_duration">Estimated Duration (hours)</label>
                        <input
                            type="number"
                            id="estimated_duration"
                            name="estimated_duration"
                            value={formData.estimated_duration}
                            onChange={handleInputChange}
                            min="0.5"
                            step="0.5"
                            placeholder="e.g., 2.5"
                        />
                    </div>
                </div>
                
                <div className="form-group">
                    <label htmlFor="description">Description *</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className={errors.description ? 'error' : ''}
                        rows="4"
                        placeholder="Describe the issue in detail..."
                    />
                    {errors.description && <span className="error-text">{errors.description}</span>}
                </div>
                
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="assigned_to">Assign To</label>
                        <select
                            id="assigned_to"
                            name="assigned_to"
                            value={formData.assigned_to}
                            onChange={handleInputChange}
                            disabled={loading}
                        >
                            <option value="">{loading ? 'Loading staff...' : 'Select staff member'}</option>
                            {staff.length > 0 ? (
                                staff.map(member => (
                                    <option key={member.id} value={member.id}>
                                        {member.name} - {member.specialization}
                                    </option>
                                ))
                            ) : !loading && (
                                <option value="" disabled>No staff available</option>
                            )}
                        </select>
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="notes">Additional Notes</label>
                        <textarea
                            id="notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows="3"
                            placeholder="Any additional information..."
                        />
                    </div>
                </div>
                
                <div className="form-actions">
                    <button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="btn btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default MaintenanceForm;
