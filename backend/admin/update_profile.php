<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Ensure proper headers
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed. Use POST"));
    exit();
}

try {
    // Require authentication
    $current_user = SimpleJWTHelper::requireAuth();
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Get JSON input
    $input = file_get_contents("php://input");
    $data = json_decode($input);
    
    // Debug: Log the received data
    error_log("Update profile input: " . $input);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid JSON data"));
        exit();
    }
    
    if (!isset($data->full_name) || !isset($data->email)) {
        http_response_code(400);
        echo json_encode(array("error" => "Full name and email are required"));
        exit();
    }
    
    $full_name = trim($data->full_name);
    $email = trim($data->email);
    
    if (empty($full_name)) {
        http_response_code(400);
        echo json_encode(array("error" => "Full name cannot be empty"));
        exit();
    }
    
    if (empty($email)) {
        http_response_code(400);
        echo json_encode(array("error" => "Email cannot be empty"));
        exit();
    }
    
    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid email format"));
        exit();
    }
    
    // Check if email is already taken by another user
    $check_stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $check_stmt->execute([$email, $current_user['user_id']]);
    
    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Email is already taken by another user"));
        exit();
    }
    
    // Update the user's profile
    $update_query = "UPDATE users SET full_name = ?, email = ? WHERE id = ?";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->execute([$full_name, $email, $current_user['user_id']]);
    
    if ($update_stmt->rowCount() > 0) {
        // Log the action (only if activity_logs table exists)
        try {
            $check_logs_table = $db->query("SHOW TABLES LIKE 'activity_logs'");
            if ($check_logs_table->rowCount() > 0) {
                $log_stmt = $db->prepare("
                    INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                    VALUES (?, 'update_profile', 'users', ?, ?, ?)
                ");
                $log_stmt->execute([
                    $current_user['user_id'],
                    $current_user['user_id'],
                    "Updated profile information: name='{$full_name}', email='{$email}'",
                    $_SERVER['REMOTE_ADDR']
                ]);
            }
        } catch (Exception $e) {
            // Activity logging is optional, continue without it
            error_log("Activity logging failed: " . $e->getMessage());
        }
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Profile updated successfully",
            "data" => [
                "full_name" => $full_name,
                "email" => $email
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(array("error" => "Failed to update profile - no changes made"));
    }
    
} catch (PDOException $e) {
    error_log("Database error in update_profile.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error occurred"));
} catch (Exception $e) {
    error_log("General error in update_profile.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error occurred"));
}
?>
