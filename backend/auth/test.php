<?php
require_once '../utils/cors_headers.php';

header('Content-Type: application/json');

echo json_encode(array(
    "success" => true,
    "message" => "Backend is working correctly",
    "timestamp" => date('Y-m-d H:i:s'),
    "method" => $_SERVER['REQUEST_METHOD']
));
?>
