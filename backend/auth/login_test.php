<?php
require_once '../utils/cors_headers.php';
// Minimal login test endpoint
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

// Simple test response
$response = array(
    "success" => true,
    "message" => "Login test endpoint working",
    "timestamp" => date('Y-m-d H:i:s'),
    "test" => "This should work without any undefined responses"
);

echo json_encode($response);
?>
