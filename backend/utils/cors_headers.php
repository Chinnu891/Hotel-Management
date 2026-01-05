<?php
/**
 * Centralized CORS Headers Utility
 * Include this file at the very top of your API endpoints to ensure proper CORS handling
 */

// Only run CORS logic in web context (not CLI)
if (php_sapi_name() !== 'cli') {
    // Clear any existing output buffer to prevent "headers already sent" errors
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    // Start output buffering to ensure we can set headers
    if (!ob_get_level()) {
        ob_start();
    }
    
    // Remove any existing CORS headers to prevent duplication
    if (function_exists('header_remove')) {
        header_remove('Access-Control-Allow-Origin');
        header_remove('Access-Control-Allow-Methods');
        header_remove('Access-Control-Allow-Headers');
        header_remove('Access-Control-Allow-Credentials');
        header_remove('Access-Control-Max-Age');
    }
    
    // Define allowed origins
    $allowed_origins = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:8080',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5173'
    ];
    
    // Get the requesting origin
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Set CORS headers
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    } else {
        // Fallback for development - allow all origins
        header('Access-Control-Allow-Origin: *');
    }
    
    // Set other CORS headers
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
    header('Access-Control-Max-Age: 86400');
    
    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        // Clear any output buffer content first
        if (ob_get_level()) {
            ob_end_clean();
        }
        
        http_response_code(200);
        header('Content-Type: text/plain; charset=utf-8');
        header('Content-Length: 0');
        
        // Ensure no output is sent
        exit(0);
    }
}
?>
