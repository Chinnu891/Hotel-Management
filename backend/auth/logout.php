<?php
/**
 * SV ROYAL LUXURY ROOMS - Logout Endpoint
 * 
 * This endpoint handles user logout by clearing all authentication data
 * including JWT tokens, cookies, and session data.
 */

require_once '../utils/cors_headers.php';
require_once '../config/database.php';

// Set Content-Type header
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    // Start session if not already started
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    // Clear session data
    session_unset();
    session_destroy();
    
    // Clear cookies
    if (isset($_COOKIE['auth_token'])) {
        setcookie('auth_token', '', time() - 3600, '/');
    }
    if (isset($_COOKIE['refresh_token'])) {
        setcookie('refresh_token', '', time() - 3600, '/');
    }
    if (isset($_COOKIE['user_role'])) {
        setcookie('user_role', '', time() - 3600, '/');
    }
    
    // Clear any other authentication cookies
    $cookies = $_COOKIE;
    foreach ($cookies as $name => $value) {
        if (strpos($name, 'auth') !== false || strpos($name, 'token') !== false) {
            setcookie($name, '', time() - 3600, '/');
        }
    }
    
    // Send success response
    $response = array(
        "success" => true,
        "message" => "Logout successful",
        "redirect" => "../login.html"
    );
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
