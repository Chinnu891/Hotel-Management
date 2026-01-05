import React, { useState, useEffect } from 'react';
import { FaUser, FaBed, FaCalendarAlt, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const EditBookingForm = ({ booking, onSave, loading }) => {
    const [formData, setFormData] = useState({
        guest_info: {
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            address: ''
        },
        check_in_date: '',
        check_out_date: '',
        adults: 1,
        children: 0,
        room_number: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (booking) {
            setFormData({
                guest_info: {
                    first_name: booking.guest_info?.first_name || booking.first_name || '',
                    last_name: booking.guest_info?.last_name || booking.last_name || '',
                    email: booking.guest_info?.email || booking.email || '',
                    phone: booking.guest_info?.phone || booking.phone || '',
                    address: booking.guest_info?.address || booking.address || ''
                },
                check_in_date: booking.check_in_date || '',
                check_out_date: booking.check_out_date || '',
                adults: booking.adults || 1,
                children: booking.children || 0,
                room_number: booking.room_number || '',
                notes: booking.notes || ''
            });
        }
    }, [booking]);

    const handleInputChange = (field, value) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: { ...prev[parent], [child]: value }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Guest info validation
        if (!formData.guest_info.first_name.trim()) {
            newErrors['guest_info.first_name'] = 'First name is required';
        }
        if (!formData.guest_info.last_name.trim()) {
            newErrors['guest_info.last_name'] = 'Last name is required';
        }
        // Email is now optional - only validate if provided
        if (formData.guest_info.email.trim() && !/\S+@\S+\.\S+/.test(formData.guest_info.email)) {
            newErrors['guest_info.email'] = 'Please enter a valid email';
        }
        if (!formData.guest_info.phone.trim()) {
            newErrors['guest_info.phone'] = 'Phone number is required';
        }

        // Date validation
        if (!formData.check_in_date) {
            newErrors.check_in_date = 'Check-in date is required';
        }
        if (!formData.check_out_date) {
            newErrors.check_out_date = 'Check-out date is required';
        }
        if (formData.check_in_date && formData.check_out_date) {
            if (new Date(formData.check_in_date) >= new Date(formData.check_out_date)) {
                newErrors.check_out_date = 'Check-out date must be after check-in date';
            }
        }

        // Guest count validation
        if (formData.adults < 1) {
            newErrors.adults = 'At least 1 adult is required';
        }
        if (formData.children < 0) {
            newErrors.children = 'Children count cannot be negative';
        }

        // Room validation
        if (!formData.room_number.trim()) {
            newErrors.room_number = 'Room number is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (validateForm()) {
            await onSave(formData);
        }
    };

    const getFieldError = (field) => {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            return errors[parent]?.[child] || '';
        }
        return errors[field] || '';
    };

    const InputField = ({ 
        label, 
        field, 
        type = 'text', 
        placeholder = '', 
        icon: Icon,
        required = false,
        ...props 
    }) => (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                )}
                <input
                    type={type}
                    value={formData[field] || ''}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        Icon ? 'pl-10' : ''
                    } ${
                        getFieldError(field) 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300'
                    }`}
                    placeholder={placeholder}
                    {...props}
                />
            </div>
            {getFieldError(field) && (
                <p className="text-sm text-red-600">{getFieldError(field)}</p>
            )}
        </div>
    );

    const GuestInfoField = ({ 
        label, 
        field, 
        type = 'text', 
        placeholder = '', 
        icon: Icon,
        required = false,
        ...props 
    }) => (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon className="h-5 w-5 text-gray-400" />
                    </div>
                )}
                <input
                    type={type}
                    value={formData.guest_info[field] || ''}
                    onChange={(e) => handleInputChange(`guest_info.${field}`, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                        Icon ? 'pl-10' : ''
                    } ${
                        getFieldError(`guest_info.${field}`) 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-gray-300'
                    }`}
                    placeholder={placeholder}
                    {...props}
                />
            </div>
            {getFieldError(`guest_info.${field}`) && (
                <p className="text-sm text-red-600">{getFieldError(`guest_info.${field}`)}</p>
            )}
        </div>
    );

    if (!booking) return null;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Guest Information Section */}
            <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                    <FaUser className="mr-2" />
                    Guest Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GuestInfoField
                        label="First Name"
                        field="first_name"
                        placeholder="Enter first name"
                        icon={FaUser}
                        required
                    />
                    <GuestInfoField
                        label="Last Name"
                        field="last_name"
                        placeholder="Enter last name"
                        icon={FaUser}
                        required
                    />
                    <GuestInfoField
                        label="Email"
                        field="email"
                        type="email"
                        placeholder="Enter email address"
                        icon={FaEnvelope}
                        required
                    />
                    <GuestInfoField
                        label="Phone"
                        field="phone"
                        type="tel"
                        placeholder="Enter phone number"
                        icon={FaPhone}
                        required
                    />
                    <div className="md:col-span-2">
                        <GuestInfoField
                            label="Address"
                            field="address"
                            placeholder="Enter complete address"
                            icon={FaMapMarkerAlt}
                        />
                    </div>
                </div>
            </div>

            {/* Booking Details Section */}
            <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                    <FaBed className="mr-2" />
                    Booking Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                        label="Check-in Date"
                        field="check_in_date"
                        type="date"
                        icon={FaCalendarAlt}
                        required
                    />
                    <InputField
                        label="Check-out Date"
                        field="check_out_date"
                        type="date"
                        icon={FaCalendarAlt}
                        required
                    />
                    <InputField
                        label="Adults"
                        field="adults"
                        type="number"
                        min="1"
                        max="10"
                        required
                    />
                    <InputField
                        label="Children"
                        field="children"
                        type="number"
                        min="0"
                        max="10"
                    />
                    <InputField
                        label="Room Number"
                        field="room_number"
                        placeholder="Enter room number"
                        icon={FaBed}
                        required
                    />
                </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                    Additional Notes
                </label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Any additional notes or special requests..."
                />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                        </>
                    ) : (
                        <>
                            <FaUser />
                            <span>Update Booking</span>
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};

export default EditBookingForm;
