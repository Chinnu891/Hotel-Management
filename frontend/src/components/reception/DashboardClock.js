import React, { useState, useEffect } from 'react';
import { FaClock, FaSync, FaGlobe, FaServer } from 'react-icons/fa';
import './DashboardClock.css';

const DashboardClock = ({ serverTime, lastSync, onSync }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeFormat, setTimeFormat] = useState('12'); // 12 or 24 hour format
    const [showSeconds, setShowSeconds] = useState(true);
    const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Update current time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Format time based on user preference
    const formatTime = (date) => {
        if (timeFormat === '12') {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                second: showSeconds ? '2-digit' : undefined,
                hour12: true
            });
        } else {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: showSeconds ? '2-digit' : undefined,
                hour12: false
            });
        }
    };

    // Format date
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format server time
    const formatServerTime = (timeString) => {
        if (!timeString) return 'Not available';
        try {
            const serverDate = new Date(`2000-01-01T${timeString}`);
            return serverDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: timeFormat === '12'
            });
        } catch (error) {
            return 'Invalid time';
        }
    };

    // Calculate time difference between local and server
    const getTimeDifference = () => {
        if (!serverTime) return null;
        try {
            const serverDate = new Date(`2000-01-01T${serverTime}`);
            const localDate = new Date();
            const localTimeOnly = new Date(`2000-01-01T${localDate.toTimeString().split(' ')[0]}`);
            const diffMs = localTimeOnly - serverDate;
            const diffMins = Math.round(diffMs / 60000);
            
            if (Math.abs(diffMins) < 1) return 'In sync';
            if (diffMins > 0) return `+${diffMins}m ahead`;
            return `${Math.abs(diffMins)}m behind`;
        } catch (error) {
            return 'Error';
        }
    };

    const timeDifference = getTimeDifference();

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FaClock className="mr-2 text-blue-600" />
                    Real-Time Clock
                </h3>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setTimeFormat(timeFormat === '12' ? '24' : '12')}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                        title={`Switch to ${timeFormat === '12' ? '24' : '12'}-hour format`}
                    >
                        {timeFormat === '12' ? '24H' : '12H'}
                    </button>
                    <button
                        onClick={() => setShowSeconds(!showSeconds)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors"
                        title={`${showSeconds ? 'Hide' : 'Show'} seconds`}
                    >
                        {showSeconds ? 'No Sec' : 'Show Sec'}
                    </button>
                </div>
            </div>

            {/* Main Clock Display */}
            <div className="text-center mb-4">
                <div className="text-4xl font-bold text-gray-900 font-mono">
                    {formatTime(currentTime)}
                </div>
                <div className="text-lg text-gray-600 mt-1">
                    {formatDate(currentTime)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                    {timezone}
                </div>
            </div>

            {/* Server Time Information */}
            {serverTime && (
                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 flex items-center">
                            <FaServer className="mr-2 text-green-600" />
                            Server Time
                        </span>
                        {onSync && (
                            <button
                                onClick={onSync}
                                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors flex items-center"
                                title="Sync with server"
                            >
                                <FaSync className="mr-1" />
                                Sync
                            </button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Server:</span>
                            <div className="font-mono text-gray-900">
                                {formatServerTime(serverTime)}
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-500">Status:</span>
                            <div className={`font-medium ${
                                timeDifference === 'In sync' ? 'text-green-600' :
                                timeDifference?.includes('ahead') ? 'text-blue-600' :
                                timeDifference?.includes('behind') ? 'text-yellow-600' :
                                'text-red-600'
                            }`}>
                                {timeDifference || 'Unknown'}
                            </div>
                        </div>
                    </div>

                    {lastSync && (
                        <div className="text-xs text-gray-500 mt-2 text-center">
                            Last synced: {new Date(lastSync).toLocaleTimeString()}
                        </div>
                    )}
                </div>
            )}

            {/* Time Zone Information */}
            <div className="border-t pt-4 mt-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                        <FaGlobe className="mr-2 text-blue-600" />
                        Time Zone
                    </span>
                    <span className="text-gray-900 font-medium">
                        {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 text-center">
                    UTC {currentTime.getTimezoneOffset() / -60 > 0 ? '+' : ''}
                    {(currentTime.getTimezoneOffset() / -60).toFixed(1)}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="border-t pt-4 mt-4">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => navigator.clipboard.writeText(currentTime.toISOString())}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                        title="Copy ISO timestamp"
                    >
                        Copy ISO
                    </button>
                    <button
                        onClick={() => navigator.clipboard.writeText(currentTime.toLocaleString())}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded transition-colors"
                        title="Copy local time"
                    >
                        Copy Local
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DashboardClock;
