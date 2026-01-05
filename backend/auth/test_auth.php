<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

header('Content-Type: application/json');

// Test endpoint to verify authentication setup
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Test database connection
        $database = new Database();
        $db = $database->getConnection();
        
        if ($db) {
            echo json_encode([
                'success' => true,
                'message' => 'Database connection successful',
                'database' => 'u748955918_royal_hotel',
                'timestamp' => date('Y-m-d H:i:s')
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed'
            ]);
        }
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Error: ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
