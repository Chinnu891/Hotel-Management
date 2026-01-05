<?php
require_once '../utils/cors_headers.php';

// Set Content-Type header (after CORS headers)
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

// Simple test response
echo json_encode(array(
    "success" => true,
    "message" => "Minimal refresh token endpoint working",
    "method" => $_SERVER['REQUEST_METHOD'],
    "origin" => $_SERVER['HTTP_ORIGIN'] ?? 'No origin',
    "timestamp" => date('Y-m-d H:i:s')
));
?>
