<?php
// Start output buffering to catch any errors before headers are set
ob_start();

// Capture any errors that might occur
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors directly
ini_set('log_errors', 1);

// Set error handler to catch fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR)) {
        // Clear any output
        if (ob_get_level()) {
            ob_clean();
        }
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'PHP Fatal Error',
            'details' => [
                'message' => $error['message'],
                'file' => $error['file'],
                'line' => $error['line']
            ]
        ]);
        exit();
    }
});

// Function to safely send JSON response
function sendJsonResponse($data) {
    // Clear any output that might have been generated
    if (ob_get_level()) {
        ob_clean();
    }
    
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

// Function to handle errors and send JSON error response
function handleError($message, $exception = null) {
    $errorData = [
        'success' => false,
        'error' => $message
    ];
    
    if ($exception) {
        $errorData['details'] = [
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine()
        ];
    }
    
    sendJsonResponse($errorData);
}

try {
    // Step 1: Include CORS configuration
    require_once '../config/cors.php';
    
    // Step 2: Check request method
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        sendJsonResponse(['message' => 'OPTIONS request handled']);
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendJsonResponse(['error' => 'Method not allowed. Use POST']);
    }
    
    // Step 3: Include database configuration
    require_once '../config/database.php';
    
    // Step 4: Include JWT helper
    require_once '../utils/jwt_helper.php';
    
    // Step 5: Authenticate user
    $current_user = JWTHelper::requireAuth();
    
    // Step 6: Get database connection
    $database = new Database();
    $db = $database->getConnection();
    
    // Step 7: Parse input data
    $input = file_get_contents("php://input");
    $data = json_decode($input);
    
    if (!isset($data->new_password)) {
        sendJsonResponse(['error' => 'New password is required']);
    }
    
    $new_password = trim($data->new_password);
    
    if (strlen($new_password) < 6) {
        sendJsonResponse(['error' => 'Password must be at least 6 characters long']);
    }
    
    // Step 8: Hash the new password
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Step 9: Update password in database
    $update_query = "UPDATE users SET password = :password, last_password_change = NOW() WHERE id = :user_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":password", $hashed_password);
    $update_stmt->bindParam(":user_id", $current_user['user_id']);
    
    if ($update_stmt->execute()) {
        // Log the action (optional)
        try {
            $check_logs_table = $db->query("SHOW TABLES LIKE 'activity_logs'");
            if ($check_logs_table->rowCount() > 0) {
                $log_query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (:user_id, 'change_own_password', 'users', :record_id, :details, :ip)";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->bindParam(":user_id", $current_user['user_id']);
                $log_stmt->bindParam(":record_id", $current_user['user_id']);
                $log_stmt->bindParam(":details", "User changed their own password");
                $log_stmt->bindParam(":ip", $_SERVER['REMOTE_ADDR']);
                $log_stmt->execute();
            }
        } catch (Exception $e) {
            // Activity logging is optional, continue without it
            error_log("Activity logging failed: " . $e->getMessage());
        }
        
        sendJsonResponse([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    } else {
        sendJsonResponse(['error' => 'Failed to change password']);
    }
    
} catch (PDOException $e) {
    error_log("Database error in change_own_password_debug.php: " . $e->getMessage());
    handleError("Database error occurred", $e);
} catch (Exception $e) {
    error_log("General error in change_own_password_debug.php: " . $e->getMessage());
    handleError("Server error occurred", $e);
}

// This should never be reached, but just in case
sendJsonResponse(['error' => 'Unexpected end of script']);
?>
