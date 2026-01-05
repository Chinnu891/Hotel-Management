<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allow any method for testing
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    echo json_encode([
        'success' => true,
        'message' => 'Test endpoint working',
        'timestamp' => date('Y-m-d H:i:s'),
        'method' => $_SERVER['REQUEST_METHOD'],
        'url_params' => $_GET
    ]);
    
} catch (Exception $e) {
    error_log("Error in test_delete_endpoint.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Test failed: ' . $e->getMessage()]);
}
?>
