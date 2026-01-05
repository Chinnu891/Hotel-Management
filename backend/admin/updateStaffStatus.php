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
    error_log("Update staff status input: " . $input);
    
    // Validate required fields
    if (!$data || !isset($data->staff_id) || !isset($data->is_active)) {
        http_response_code(400);
        echo json_encode(['error' => 'Staff ID and is_active status are required']);
        exit();
    }
    
    $staff_id = $data->staff_id;
    $is_active = $data->is_active;
    
    // Validate is_active value
    if (!is_bool($is_active) && !in_array($is_active, [0, 1, '0', '1'])) {
        http_response_code(400);
        echo json_encode(['error' => 'is_active must be a boolean value (true/false or 1/0)']);
        exit();
    }
    
    // Convert to integer for database
    $is_active_int = $is_active ? 1 : 0;
    
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
    
    // Prevent deactivating own account
    if ($staff_id == $current_user['user_id'] && !$is_active_int) {
        http_response_code(400);
        echo json_encode(['error' => 'Cannot deactivate your own account']);
        exit();
    }
    
    // Update the user status
    $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
    $result = $stmt->execute([$is_active_int, $staff_id]);
    
    if ($result) {
        // Log the action if activity_logs table exists
        try {
            $check_logs_table = $pdo->query("SHOW TABLES LIKE 'activity_logs'");
            if ($check_logs_table->rowCount() > 0) {
                $status_text = $is_active_int ? 'activated' : 'deactivated';
                $log_stmt = $pdo->prepare("
                    INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                    VALUES (?, ?, 'users', ?, ?, ?)
                ");
                $log_stmt->execute([
                    $current_user['user_id'],
                    'update_staff_status',
                    $staff_id,
                    "{$status_text} {$user['role']} user: {$user['username']}",
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
            }
        } catch (Exception $e) {
            // Activity logging is optional, continue without it
            error_log("Activity logging failed: " . $e->getMessage());
        }
        
        $status_text = $is_active_int ? 'activated' : 'deactivated';
        echo json_encode([
            'success' => true,
            'message' => "Staff member {$status_text} successfully",
            'updated_user' => [
                'id' => $staff_id,
                'username' => $user['username'],
                'role' => $user['role'],
                'is_active' => $is_active_int
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update staff status']);
    }
    
} catch (PDOException $e) {
    error_log("Database error in updateStaffStatus.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error in updateStaffStatus.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
