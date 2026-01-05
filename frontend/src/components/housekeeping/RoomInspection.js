import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './RoomInspection.css';

const RoomInspection = ({ roomId, onComplete, readOnly = false }) => {
    const [inspection, setInspection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [room, setRoom] = useState(null);
    const [staff, setStaff] = useState([]);

    const inspectionCategories = [
        {
            name: 'cleanliness',
            label: 'Cleanliness',
            items: [
                'Floors clean and vacuumed',
                'Surfaces dusted and wiped',
                'Bathroom sanitized',
                'Bedding fresh and properly made',
                'Trash emptied',
                'Windows clean',
                'Mirrors spotless',
                'Furniture properly arranged'
            ]
        },
        {
            name: 'functionality',
            label: 'Functionality',
            items: [
                'AC/Heating working properly',
                'TV and electronics functional',
                'Lighting working correctly',
                'Plumbing functioning',
                'Doors and locks secure',
                'Curtains/blinds operational',
                'Safe working',
                'WiFi signal strong'
            ]
        },
        {
            name: 'amenities',
            label: 'Amenities',
            items: [
                'Towels and toiletries stocked',
                'Coffee/tea supplies available',
                'Mini bar properly stocked',
                'Room service menu present',
                'Emergency information visible',
                'Local area information available',
                'Extra blankets/pillows available',
                'Iron and ironing board present'
            ]
        },
        {
            name: 'safety',
            label: 'Safety & Security',
            items: [
                'Smoke detector functional',
                'Fire extinguisher accessible',
                'Emergency exit route clear',
                'No visible safety hazards',
                'Room number clearly visible',
                'Peephole working',
                'Security chain functional',
                'Balcony/terrace secure'
            ]
        }
    ];

    useEffect(() => {
        if (roomId) {
            fetchRoomData();
            fetchStaff();
            fetchInspectionData();
        }
    }, [roomId]);

    const fetchRoomData = async () => {
        try {
            const response = await fetch(buildApiUrl(`rooms/getAll.php?id=${roomId}`));
            const data = await response.json();
            if (data.success && data.rooms.length > 0) {
                setRoom(data.rooms[0]);
            }
        } catch (error) {
            console.error('Error fetching room data:', error);
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

    const fetchInspectionData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${buildApiUrl('housekeeping/room_inspection.php')}?room_id=${roomId}`);
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                setInspection(data.data[0]);
            } else {
                // Create new inspection template
                const newInspection = {
                    room_id: roomId,
                    inspector_id: null,
                    inspection_date: new Date().toISOString().split('T')[0],
                    overall_rating: 0,
                    status: 'pending',
                    notes: '',
                    categories: inspectionCategories.map(category => ({
                        name: category.name,
                        label: category.label,
                        items: category.items.map(item => ({
                            text: item,
                            status: 'pending',
                            notes: ''
                        }))
                    }))
                };
                setInspection(newInspection);
            }
        } catch (error) {
            setError('Failed to fetch inspection data');
        } finally {
            setLoading(false);
        }
    };

    const handleItemStatusChange = (categoryName, itemIndex, status) => {
        if (readOnly) return;

        setInspection(prev => ({
            ...prev,
            categories: prev.categories.map(cat => 
                cat.name === categoryName 
                    ? {
                        ...cat,
                        items: cat.items.map((item, idx) => 
                            idx === itemIndex 
                                ? { ...item, status }
                                : item
                        )
                    }
                    : cat
            )
        }));
    };

    const handleItemNotesChange = (categoryName, itemIndex, notes) => {
        if (readOnly) return;

        setInspection(prev => ({
            ...prev,
            categories: prev.categories.map(cat => 
                cat.name === categoryName 
                    ? {
                        ...cat,
                        items: cat.items.map((item, idx) => 
                            idx === itemIndex 
                                ? { ...item, notes }
                                : item
                        )
                    }
                    : cat
            )
        }));
    };

    const handleOverallRatingChange = (rating) => {
        if (readOnly) return;
        setInspection(prev => ({ ...prev, overall_rating: rating }));
    };

    const handleNotesChange = (notes) => {
        if (readOnly) return;
        setInspection(prev => ({ ...prev, notes }));
    };

    const handleInspectorChange = (inspectorId) => {
        if (readOnly) return;
        setInspection(prev => ({ ...prev, inspector_id: inspectorId }));
    };

    const calculateCategoryScore = (category) => {
        if (!category.items || category.items.length === 0) return 0;
        const completed = category.items.filter(item => item.status === 'passed').length;
        return Math.round((completed / category.items.length) * 100);
    };

    const calculateOverallScore = () => {
        if (!inspection?.categories) return 0;
        const totalItems = inspection.categories.reduce((sum, cat) => sum + cat.items.length, 0);
        const passedItems = inspection.categories.reduce((sum, cat) => 
            sum + cat.items.filter(item => item.status === 'passed').length, 0
        );
        return totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
    };

    const getStatusColor = (status) => {
        const colors = {
            passed: '#10b981',
            failed: '#ef4444',
            pending: '#6b7280',
            needs_attention: '#f59e0b'
        };
        return colors[status] || '#6b7280';
    };

    const getStatusLabel = (status) => {
        const labels = {
            passed: 'Passed',
            failed: 'Failed',
            pending: 'Pending',
            needs_attention: 'Needs Attention'
        };
        return labels[status] || 'Unknown';
    };

    const handleSave = async () => {
        if (!inspection) return;

        setSaving(true);
        try {
            const method = inspection.id ? 'PUT' : 'POST';
            const endpoint = buildApiUrl('housekeeping/room_inspection.php');
            
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(inspection)
            });

            const data = await response.json();
            if (data.success) {
                setInspection(data.data);
                onComplete && onComplete(data.data);
            }
        } catch (error) {
            console.error('Error saving inspection:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!inspection) return;

        const updatedInspection = {
            ...inspection,
            status: 'completed',
            completed_at: new Date().toISOString()
        };

        setSaving(true);
        try {
            const response = await fetch(buildApiUrl('housekeeping/room_inspection.php'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedInspection)
            });

            const data = await response.json();
            if (data.success) {
                setInspection(data.data);
                onComplete && onComplete(data.data);
            }
        } catch (error) {
            console.error('Error completing inspection:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="room-inspection-container">
                <div className="loading-spinner">Loading room inspection...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="room-inspection-container">
                <div className="error-message">
                    {error}
                    <button onClick={fetchInspectionData} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    if (!inspection || !room) {
        return (
            <div className="room-inspection-container">
                <div className="error-message">Room or inspection data not found.</div>
            </div>
        );
    }

    return (
        <div className="room-inspection-container">
            {/* Inspection Header */}
            <div className="inspection-header">
                <div className="room-info">
                    <h3>Room Inspection - {room.room_number}</h3>
                    <p className="room-details">
                        {room.type} • Floor {room.floor} • {room.status}
                    </p>
                </div>
                
                <div className="inspection-meta">
                    <div className="inspector-select">
                        <label>Inspector:</label>
                        <select
                            value={inspection.inspector_id || ''}
                            onChange={(e) => handleInspectorChange(e.target.value)}
                            disabled={readOnly}
                        >
                            <option value="">Select Inspector</option>
                            {staff.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="inspection-date">
                        <label>Date:</label>
                        <span>{new Date(inspection.inspection_date).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Overall Rating */}
            <div className="overall-rating-section">
                <h4>Overall Rating</h4>
                <div className="rating-display">
                    <div className="rating-stars">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                className={`star ${star <= inspection.overall_rating ? 'filled' : ''}`}
                                onClick={() => handleOverallRatingChange(star)}
                                disabled={readOnly}
                            >
                                ★
                            </button>
                        ))}
                    </div>
                    <span className="rating-text">
                        {inspection.overall_rating}/5 Stars
                    </span>
                </div>
            </div>

            {/* Inspection Categories */}
            <div className="inspection-categories">
                {inspection.categories.map((category, categoryIndex) => (
                    <div key={category.name} className="inspection-category">
                        <div className="category-header">
                            <h4>{category.label}</h4>
                            <div className="category-score">
                                <span className="score-label">Score:</span>
                                <span className="score-value">
                                    {calculateCategoryScore(category)}%
                                </span>
                            </div>
                        </div>
                        
                        <div className="category-items">
                            {category.items.map((item, itemIndex) => (
                                <div key={itemIndex} className="inspection-item">
                                    <div className="item-header">
                                        <span className="item-text">{item.text}</span>
                                        <select
                                            value={item.status}
                                            onChange={(e) => handleItemStatusChange(category.name, itemIndex, e.target.value)}
                                            disabled={readOnly}
                                            className="status-select"
                                            style={{ borderColor: getStatusColor(item.status) }}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="passed">Passed</option>
                                            <option value="failed">Failed</option>
                                            <option value="needs_attention">Needs Attention</option>
                                        </select>
                                    </div>
                                    
                                    <div className="item-notes">
                                        <textarea
                                            placeholder="Add notes (optional)..."
                                            value={item.notes}
                                            onChange={(e) => handleItemNotesChange(category.name, itemIndex, e.target.value)}
                                            disabled={readOnly}
                                            rows="2"
                                            className="notes-input"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Overall Score */}
            <div className="overall-score-section">
                <div className="score-display">
                    <h4>Overall Inspection Score</h4>
                    <div className="score-circle">
                        <span className="score-number">{calculateOverallScore()}%</span>
                        <span className="score-label">Pass Rate</span>
                    </div>
                </div>
            </div>

            {/* General Notes */}
            <div className="general-notes-section">
                <h4>General Notes</h4>
                <textarea
                    placeholder="Add any general notes about the room inspection..."
                    value={inspection.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    disabled={readOnly}
                    rows="4"
                    className="general-notes-input"
                />
            </div>

            {/* Action Buttons */}
            {!readOnly && (
                <div className="inspection-actions">
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Inspection'}
                    </button>
                    
                    <button
                        onClick={handleComplete}
                        className="btn btn-success"
                        disabled={saving || inspection.status === 'completed'}
                    >
                        {saving ? 'Completing...' : 'Complete Inspection'}
                    </button>
                </div>
            )}

            {/* Inspection Status */}
            <div className="inspection-status">
                <span className="status-label">Status:</span>
                <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(inspection.status) }}
                >
                    {getStatusLabel(inspection.status)}
                </span>
            </div>
        </div>
    );
};

export default RoomInspection;
