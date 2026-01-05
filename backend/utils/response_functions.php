<?php
/**
 * Common response functions for API endpoints
 */

if (!function_exists('sendResponse')) {
    /**
     * Send a standardized JSON response
     * 
     * @param int $statusCode HTTP status code
     * @param string $message Response message
     * @param mixed $data Response data (optional)
     * @return void
     */
    function sendResponse($statusCode, $message, $data = null) {
        // Ensure headers haven't been sent
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code($statusCode);
        }
        
        $response = [
            'success' => $statusCode >= 200 && $statusCode < 300,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        if ($statusCode >= 400) {
            $response['error'] = true;
        }
        
        echo json_encode($response);
        exit;
    }
}

if (!function_exists('sendErrorResponse')) {
    /**
     * Send a standardized error response
     * 
     * @param int $statusCode HTTP status code
     * @param string $message Error message
     * @param mixed $errors Additional error details (optional)
     * @return void
     */
    function sendErrorResponse($statusCode, $message, $errors = null) {
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code($statusCode);
        }
        
        $response = [
            'success' => false,
            'error' => true,
            'message' => $message,
            'errors' => $errors,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response);
        exit;
    }
}

if (!function_exists('sendSuccessResponse')) {
    /**
     * Send a standardized success response
     * 
     * @param string $message Success message
     * @param mixed $data Response data (optional)
     * @param int $statusCode HTTP status code (default: 200)
     * @return void
     */
    function sendSuccessResponse($message, $data = null, $statusCode = 200) {
        if (!headers_sent()) {
            header('Content-Type: application/json');
            http_response_code($statusCode);
        }
        
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response);
        exit;
    }
}
?>
