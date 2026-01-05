import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';
import './Checklist.css';

const Checklist = ({ taskId, onUpdate, readOnly = false }) => {
    const [checklistItems, setChecklistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [newItemText, setNewItemText] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    useEffect(() => {
        if (taskId) {
            fetchChecklistItems();
        }
    }, [taskId]);

    const fetchChecklistItems = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${buildApiUrl(API_ENDPOINTS.HOUSEKEEPING_GET_TASKS)}?task_id=${taskId}`);
            const data = await response.json();

            if (data.success && data.data.tasks && data.data.tasks.length > 0) {
                const task = data.data.tasks[0];
                setChecklistItems(task.checklist_items || []);
            } else {
                setChecklistItems([]);
            }
        } catch (error) {
            setError('Failed to fetch checklist items');
        } finally {
            setLoading(false);
        }
    };

    const handleItemToggle = async (itemId, completed) => {
        if (readOnly) return;

        try {
            const response = await fetch(buildApiUrl('housekeeping/update_checklist_item.php'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: itemId,
                    completed: completed
                })
            });

            const data = await response.json();
            if (data.success) {
                setChecklistItems(prev => 
                    prev.map(item => 
                        item.id === itemId 
                            ? { ...item, completed: completed }
                            : item
                    )
                );
                onUpdate && onUpdate();
            }
        } catch (error) {
            console.error('Error updating checklist item:', error);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemText.trim()) return;

        try {
            const response = await fetch(buildApiUrl('housekeeping/add_checklist_item.php'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_id: taskId,
                    item_text: newItemText.trim()
                })
            });

            const data = await response.json();
            if (data.success) {
                setChecklistItems(prev => [...prev, data.data]);
                setNewItemText('');
                setShowAddForm(false);
                onUpdate && onUpdate();
            }
        } catch (error) {
            console.error('Error adding checklist item:', error);
        }
    };

    const handleEditItem = async (itemId, newText) => {
        if (!newText.trim()) return;

        try {
            const response = await fetch(buildApiUrl('housekeeping/update_checklist_item.php'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: itemId,
                    item_text: newText.trim()
                })
            });

            const data = await response.json();
            if (data.success) {
                setChecklistItems(prev => 
                    prev.map(item => 
                        item.id === itemId 
                            ? { ...item, item_text: newText.trim() }
                            : item
                    )
                );
                setEditingItem(null);
                onUpdate && onUpdate();
            }
        } catch (error) {
            console.error('Error updating checklist item:', error);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Are you sure you want to delete this checklist item?')) return;

        try {
            const response = await fetch(buildApiUrl('housekeeping/delete_checklist_item.php'), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: itemId })
            });

            const data = await response.json();
            if (data.success) {
                setChecklistItems(prev => prev.filter(item => item.id !== itemId));
                onUpdate && onUpdate();
            }
        } catch (error) {
            console.error('Error deleting checklist item:', error);
        }
    };

    const getCompletionPercentage = () => {
        if (checklistItems.length === 0) return 0;
        const completed = checklistItems.filter(item => item.completed).length;
        return Math.round((completed / checklistItems.length) * 100);
    };

    const getCompletionStatus = () => {
        const percentage = getCompletionPercentage();
        if (percentage === 0) return 'Not Started';
        if (percentage === 100) return 'Completed';
        if (percentage >= 75) return 'Almost Done';
        if (percentage >= 50) return 'In Progress';
        return 'Getting Started';
    };

    const getCompletionColor = () => {
        const percentage = getCompletionPercentage();
        if (percentage === 100) return '#10b981';
        if (percentage >= 75) return '#059669';
        if (percentage >= 50) return '#f59e0b';
        if (percentage >= 25) return '#ef4444';
        return '#6b7280';
    };

    if (loading) {
        return (
            <div className="checklist-container">
                <div className="loading-spinner">Loading checklist...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="checklist-container">
                <div className="error-message">
                    {error}
                    <button onClick={fetchChecklistItems} className="retry-btn">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div className="checklist-container">
            {/* Checklist Header */}
            <div className="checklist-header">
                <h3>Task Checklist</h3>
                <div className="completion-overview">
                    <div className="completion-status">
                        <span className="status-text">{getCompletionStatus()}</span>
                        <span className="completion-percentage">{getCompletionPercentage()}%</span>
                    </div>
                    <div className="completion-bar">
                        <div 
                            className="completion-fill"
                            style={{ 
                                width: `${getCompletionPercentage()}%`,
                                backgroundColor: getCompletionColor()
                            }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Checklist Items */}
            <div className="checklist-items">
                {checklistItems.length === 0 ? (
                    <div className="no-items">
                        <p>No checklist items yet.</p>
                        {!readOnly && (
                            <button 
                                onClick={() => setShowAddForm(true)}
                                className="btn btn-primary"
                            >
                                Add First Item
                            </button>
                        )}
                    </div>
                ) : (
                    checklistItems.map((item, index) => (
                        <div key={item.id} className={`checklist-item ${item.completed ? 'completed' : ''}`}>
                            <div className="item-content">
                                <button
                                    className={`checkbox ${item.completed ? 'checked' : ''}`}
                                    onClick={() => handleItemToggle(item.id, !item.completed)}
                                    disabled={readOnly}
                                    title={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                                >
                                    {item.completed ? '✓' : ''}
                                </button>
                                
                                <div className="item-text">
                                    {editingItem === item.id ? (
                                        <input
                                            type="text"
                                            value={item.item_text}
                                            onChange={(e) => {
                                                setChecklistItems(prev => 
                                                    prev.map(i => 
                                                        i.id === item.id 
                                                            ? { ...i, item_text: e.target.value }
                                                            : i
                                                    )
                                                );
                                            }}
                                            onBlur={() => handleEditItem(item.id, item.item_text)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleEditItem(item.id, item.item_text);
                                                }
                                            }}
                                            autoFocus
                                            className="edit-input"
                                        />
                                    ) : (
                                        <span 
                                            className={item.completed ? 'completed-text' : ''}
                                            onDoubleClick={() => !readOnly && setEditingItem(item.id)}
                                        >
                                            {item.item_text}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!readOnly && (
                                <div className="item-actions">
                                    <button
                                        onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}
                                        className="action-btn edit-btn"
                                        title="Edit item"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="action-btn delete-btn"
                                        title="Delete item"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add New Item Form */}
            {!readOnly && showAddForm && (
                <div className="add-item-form">
                    <form onSubmit={handleAddItem}>
                        <div className="form-group">
                            <input
                                type="text"
                                value={newItemText}
                                onChange={(e) => setNewItemText(e.target.value)}
                                placeholder="Enter checklist item..."
                                className="add-item-input"
                                autoFocus
                            />
                        </div>
                        <div className="form-actions">
                            <button 
                                type="button" 
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewItemText('');
                                }}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={!newItemText.trim()}
                            >
                                Add Item
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Add Item Button */}
            {!readOnly && !showAddForm && checklistItems.length > 0 && (
                <div className="add-item-section">
                    <button 
                        onClick={() => setShowAddForm(true)}
                        className="btn btn-outline-primary"
                    >
                        + Add New Item
                    </button>
                </div>
            )}

            {/* Quick Actions */}
            {!readOnly && checklistItems.length > 0 && (
                <div className="quick-actions">
                    <button
                        onClick={() => {
                            setChecklistItems(prev => 
                                prev.map(item => ({ ...item, completed: true }))
                            );
                            // Update all items as completed
                            checklistItems.forEach(item => {
                                if (!item.completed) {
                                    handleItemToggle(item.id, true);
                                }
                            });
                        }}
                        className="btn btn-success btn-sm"
                        disabled={getCompletionPercentage() === 100}
                    >
                        Mark All Complete
                    </button>
                    <button
                        onClick={() => {
                            setChecklistItems(prev => 
                                prev.map(item => ({ ...item, completed: false }))
                            );
                            // Update all items as incomplete
                            checklistItems.forEach(item => {
                                if (item.completed) {
                                    handleItemToggle(item.id, false);
                                }
                            });
                        }}
                        className="btn btn-secondary btn-sm"
                        disabled={getCompletionPercentage() === 0}
                    >
                        Mark All Incomplete
                    </button>
                </div>
            )}
        </div>
    );
};

export default Checklist;
