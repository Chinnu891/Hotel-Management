import React, { useEffect, useState } from 'react';
import { FaTimes, FaSave, FaSpinner } from 'react-icons/fa';

const EditPopup = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    onSave, 
    loading = false,
    saveButtonText = "Save Changes",
    size = "md" // sm, md, lg, xl
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsAnimating(true);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => {
                setIsVisible(false);
                document.body.style.overflow = 'unset';
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleSave = async () => {
        if (onSave && !loading) {
            await onSave();
        }
    };

    if (!isVisible) return null;

    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-2xl", 
        lg: "max-w-4xl",
        xl: "max-w-6xl"
    };

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
                isAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black transition-all duration-300 ${
                isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
            }`} />
            
            {/* Modal */}
            <div className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden transition-all duration-300 transform ${
                isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
            }`}>
                {/* Modal Container */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">{title}</h2>
                            <button
                                onClick={handleClose}
                                disabled={loading}
                                className="text-blue-100 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-blue-600 disabled:opacity-50"
                            >
                                <FaTimes className="text-lg" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                        {children}
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={handleClose}
                                disabled={loading}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" />
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <>
                                        <FaSave />
                                        <span>{saveButtonText}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditPopup;
