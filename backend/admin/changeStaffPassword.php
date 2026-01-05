<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow PUT requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Require authentication
    $current_user = SimpleJWTHelper::requireAuth();
    
    // Get the JSON data from the request
    $input = file_get_contents('php://input');
    $data = json_decode($input);
    
    // Debug: Log the received data
    error_log("Change staff password input: " . $input);
    
    // Validate required fields
    if (!$data || !isset($data->staff_id) || !isset($data->new_password)) {
        http_response_code(400);
        echo json_encode(['error' => 'Staff ID and new password are required']);
        exit();
    }
    
    $staff_id = $data->staff_id;
    $new_password = $data->new_password;
    
    if (empty($new_password)) {
        http_response_code(400);
        echo json_encode(['error' => 'New password cannot be empty']);
        exit();
    }
    
    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'New password must be at least 6 characters long']);
        exit();
    }
    
    // Database connection using Hostinger credentials
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
    $stmt->execute([$staff_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Hash the new password
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Update the password
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $result = $stmt->execute([$hashed_password, $staff_id]);
    
    if ($result) {
        // Log the action if activity_logs table exists
        try {
            $check_logs_table = $pdo->query("SHOW TABLES LIKE 'activity_logs'");
            if ($check_logs_table->rowCount() > 0) {
                $log_stmt = $pdo->prepare("
                    INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                    VALUES (?, ?, 'users', ?, ?, ?)
                ");
                $log_stmt->execute([
                    $current_user['user_id'],
                    'change_staff_password',
                    $staff_id,
                    "Changed password for {$user['role']} user: {$user['username']}",
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
            }
        } catch (Exception $e) {
            // Activity logging is optional, continue without it
            error_log("Activity logging failed: " . $e->getMessage());
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Password changed successfully',
            'updated_user' => [
                'id' => $staff_id,
                'username' => $user['username'],
                'role' => $user['role']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to change password']);
    }
    
} catch (PDOException $e) {
    error_log("Database error in changeStaffPassword.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error in changeStaffPassword.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
