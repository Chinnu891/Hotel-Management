<?php
// Minimal login test - no database required
require_once '../utils/cors_headers.php';

header('Content-Type: application/json');

// Simulate login response
$response = array(
    "success" => true,
    "message" => "Login test successful",
    "timestamp" => date('Y-m-d H:i:s'),
    "method" => $_SERVER['REQUEST_METHOD'],
    "origin" => $_SERVER['HTTP_ORIGIN'] ?? 'No origin header',
    "cors_working" => true
);

echo json_encode($response);
?>
