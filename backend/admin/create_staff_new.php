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

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    error_log("Create staff input: " . $input);
    
    // Validate required fields
    if (!$data || !isset($data->username) || !isset($data->password) || !isset($data->full_name) || !isset($data->role)) {
        http_response_code(400);
        echo json_encode(['error' => 'Username, password, full name, and role are required']);
        exit();
    }
    
    // Validate role
    $allowed_roles = ['admin', 'reception'];
    if (!in_array($data->role, $allowed_roles)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid role. Must be either "admin" or "reception"']);
        exit();
    }
    
    // Database connection using Hostinger credentials
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Check if username already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$data->username]);
    
    if ($stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Username already exists']);
        exit();
    }
    
    // Check if email already exists (if provided)
    if (!empty($data->email)) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$data->email]);
        
        if ($stmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already exists']);
            exit();
        }
    }
    
    // Hash the password
    $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);
    
    // Insert new staff member
    $stmt = $pdo->prepare("
        INSERT INTO users (username, password, role, full_name, email, phone, is_active, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, 1, NOW())
    ");
    
    $result = $stmt->execute([
        $data->username,
        $hashed_password,
        $data->role,
        $data->full_name,
        $data->email ?? '',
        $data->phone ?? ''
    ]);
    
    if ($result) {
        $user_id = $pdo->lastInsertId();
        
        // Log the action if activity_logs table exists
        try {
            $check_logs_table = $pdo->query("SHOW TABLES LIKE 'activity_logs'");
            if ($check_logs_table->rowCount() > 0) {
                $log_stmt = $pdo->prepare("
                    INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                    VALUES (?, ?, 'users', ?, ?, ?)
                ");
                $log_stmt->execute([
                    $current_user['user_id'], // Use current user ID for logging
                    'create_staff',
                    $user_id,
                    "Created new {$data->role} user: {$data->username} ({$data->full_name})",
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
            }
        } catch (Exception $e) {
            // Activity logging is optional, continue without it
            error_log("Activity logging failed: " . $e->getMessage());
        }
        
        echo json_encode([
            'success' => true,
            'message' => ucfirst($data->role) . ' user created successfully',
            'user_id' => $user_id,
            'role' => $data->role
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create staff member']);
    }
    
} catch (PDOException $e) {
    error_log("Database error in create_staff_new.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error in create_staff_new.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
