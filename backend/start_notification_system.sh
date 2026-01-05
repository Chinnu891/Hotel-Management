#!/bin/bash

# Reception Notification System - Quick Start Script
# This script starts the WebSocket server and provides testing instructions

echo "=== Reception Notification System ==="
echo "Starting WebSocket server..."

# Check if PHP is available
if ! command -v php &> /dev/null; then
    echo "❌ Error: PHP is not installed or not in PATH"
    echo "Please install PHP and try again"
    exit 1
fi

# Check if the required files exist
if [ ! -f "websocket_server.php" ]; then
    echo "❌ Error: websocket_server.php not found"
    echo "Please run this script from the backend directory"
    exit 1
fi

if [ ! -f "utils/notification_service.php" ]; then
    echo "❌ Error: Required notification service files not found"
    echo "Please ensure all files are in place"
    exit 1
fi

# Check if port 8080 is available
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Warning: Port 8080 is already in use"
    echo "The WebSocket server may not start properly"
    echo "Please stop any services using port 8080"
    echo ""
fi

echo "✅ Starting WebSocket server on port 8080..."
echo "✅ HTTP notification endpoint: http://localhost:8080/notify"
echo ""
echo "📱 To test the system:"
echo "1. Open the reception dashboard in your browser"
echo "2. Navigate to the Notifications tab"
echo "3. Send test notifications using the test script"
echo ""
echo "🧪 Run test script in another terminal:"
echo "   php test_notifications.php"
echo ""
echo "🛑 Press Ctrl+C to stop the server"
echo ""

# Start the WebSocket server
php websocket_server.php
