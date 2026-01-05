#!/bin/bash

echo "Starting WebSocket Server for Hotel Management System..."
echo

# Check if PHP is available
if ! command -v php &> /dev/null; then
    echo "Error: PHP is not installed or not in PATH"
    echo "Please install PHP and ensure it's in your system PATH"
    exit 1
fi

# Check if Composer dependencies are installed
if [ ! -f "vendor/autoload.php" ]; then
    echo "Installing Composer dependencies..."
    composer install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install Composer dependencies"
        exit 1
    fi
fi

echo "Starting WebSocket server on port 8080..."
echo "Press Ctrl+C to stop the server"
echo

# Start the WebSocket server
php websocket_server.php
