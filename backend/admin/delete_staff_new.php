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

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
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
    error_log("Delete staff input: " . $input);
    
    // Validate required fields
    if (!$data || !isset($data->user_id)) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required']);
        exit();
    }
    
    $user_id = $data->user_id;
    
    // Database connection using Hostinger credentials
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Check if user exists and get their details
    $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Prevent deleting own account
    if ($user_id == $current_user['user_id']) {
        http_response_code(400);
        echo json_encode(['error' => 'Cannot delete your own account']);
        exit();
    }
    
    // Delete the user
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $result = $stmt->execute([$user_id]);
    
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
                    'delete_staff',
                    $user_id,
                    "Deleted {$user['role']} user: {$user['username']}",
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
            }
        } catch (Exception $e) {
            // Activity logging is optional, continue without it
            error_log("Activity logging failed: " . $e->getMessage());
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Staff member deleted successfully',
            'deleted_user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete staff member']);
    }
    
} catch (PDOException $e) {
    error_log("Database error in delete_staff_new.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error in delete_staff_new.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
