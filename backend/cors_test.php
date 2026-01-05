<?php
require_once 'config/cors.php';

// Set Content-Type header only if not already set
if (!defined('CONTENT_TYPE_HEADER_SENT')) {
    define('CONTENT_TYPE_HEADER_SENT', true);
    header('Content-Type: application/json');
}

// Get all headers to check for duplicates
$headers = headers_list();

echo json_encode(array(
    "success" => true,
    "message" => "CORS test",
    "headers" => $headers,
    "timestamp" => date('Y-m-d H:i:s')
));
?>
