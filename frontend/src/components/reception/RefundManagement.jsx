import React, { useState } from 'react';
import RefundProcessor from './RefundProcessor';
import RefundHistory from './RefundHistory';
import { 
    FaUndo, 
    FaHistory, 
    FaChartBar, 
    FaCog,
    FaMoneyBillWave,
    FaExclamationTriangle
} from 'react-icons/fa';

const RefundManagement = () => {
    const [activeTab, setActiveTab] = useState('processor');

    const navItems = [
        { 
            id: 'processor', 
            label: 'Process Refunds', 
            icon: FaUndo, 
            description: 'Process new refunds for completed payments',
            color: 'bg-blue-500 hover:bg-blue-600'
        },
        { 
            id: 'history', 
            label: 'Refund History', 
            icon: FaHistory, 
            description: 'View and track all processed refunds',
            color: 'bg-green-500 hover:bg-green-600'
        }
    ];

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'processor':
                return <RefundProcessor />;
            case 'history':
                return <RefundHistory />;
            default:
                return <RefundProcessor />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Refund Management</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Comprehensive refund processing and tracking system
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                <FaMoneyBillWave className="h-4 w-4" />
                                <span>Hotel Management System</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-8">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                                        activeTab === item.id
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FaUndo className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Refunds</p>
                                <p className="text-lg font-semibold text-gray-900">-</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FaMoneyBillWave className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                                <p className="text-lg font-semibold text-gray-900">-</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                                <FaExclamationTriangle className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-lg font-semibold text-gray-900">-</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <FaChartBar className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-600">Today</p>
                                <p className="text-lg font-semibold text-gray-900">-</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1">
                {renderActiveTab()}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-gray-200 mt-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                            <span>SV Royal Hotel Management System</span>
                            <span>•</span>
                            <span>Refund Management Module</span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span>Version 2.0</span>
                            <span>•</span>
                            <span>© 2024 All rights reserved</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundManagement;
