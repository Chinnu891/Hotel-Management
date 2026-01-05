<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Set Content-Type header
header('Content-Type: application/json');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    // Get the token from Authorization header
    $token = SimpleJWTHelper::getTokenFromHeader();
    
    if (!$token) {
        http_response_code(401);
        echo json_encode(array("error" => "No token provided"));
        exit();
    }
    
    // Validate the token
    $decoded = SimpleJWTHelper::validateToken($token);
    
    if (!$decoded) {
        http_response_code(401);
        echo json_encode(array("error" => "Invalid or expired token"));
        exit();
    }
    
    // Token is valid, return user info
    echo json_encode(array(
        "success" => true,
        "user" => array(
            "user_id" => $decoded['user_id'],
            "username" => $decoded['username'],
            "role" => $decoded['role']
        ),
        "message" => "Token is valid"
    ));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
