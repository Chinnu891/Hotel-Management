<?php
// CORS Configuration - Disabled for now
// Let Apache handle CORS headers

// Only handle OPTIONS requests
if (php_sapi_name() !== 'cli') {
    // Handle preflight OPTIONS request
    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        header('Content-Type: text/plain; charset=utf-8');
        header('Content-Length: 0');
        exit(0);
    }
}
?>
