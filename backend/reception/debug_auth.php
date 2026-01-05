<?php
// Debug authentication issues
require_once '../config/cors.php';
require_once '../utils/simple_jwt_helper.php';
header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'message' => 'Debug authentication test',
    'timestamp' => date('Y-m-d H:i:s'),
    'debug_info' => [
        'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'Unknown',
        'request_uri' => $_SERVER['REQUEST_URI'] ?? 'Unknown',
        'http_host' => $_SERVER['HTTP_HOST'] ?? 'Unknown',
        'headers_available' => function_exists('getallheaders'),
        'apache_headers_available' => function_exists('apache_request_headers'),
        'all_headers' => function_exists('getallheaders') ? getallheaders() : 'Not available',
        'authorization_header' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'Not found',
        'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'Not found'
    ]
]);

// Test JWT token extraction
$token = SimpleJWTHelper::getTokenFromHeader();
echo json_encode([
    'token_extraction' => [
        'token_found' => $token ? 'Yes' : 'No',
        'token_length' => $token ? strlen($token) : 0,
        'token_preview' => $token ? substr($token, 0, 20) . '...' : 'None'
    ]
]);

// Test token validation if token exists
if ($token) {
    $decoded = SimpleJWTHelper::validateToken($token);
    echo json_encode([
        'token_validation' => [
            'valid' => $decoded ? 'Yes' : 'No',
            'decoded_data' => $decoded ? $decoded : 'Invalid token'
        ]
    ]);
}
?>
