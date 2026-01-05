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
    error_log("Edit staff input: " . $input);
    
    // Validate required fields
    if (!$data || !isset($data->staff_id) || !isset($data->full_name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Staff ID and full name are required']);
        exit();
    }
    
    $staff_id = $data->staff_id;
    $full_name = trim($data->full_name);
    $email = trim($data->email ?? '');
    $phone = trim($data->phone ?? '');
    
    if (empty($full_name)) {
        http_response_code(400);
        echo json_encode(['error' => 'Full name cannot be empty']);
        exit();
    }
    
    // Validate email format if provided
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid email format']);
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
    
    // Check if email is already taken by another user
    if (!empty($email)) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $stmt->execute([$email, $staff_id]);
        
        if ($stmt->rowCount() > 0) {
            http_response_code(400);
            echo json_encode(['error' => 'Email is already taken by another user']);
            exit();
        }
    }
    
    // Update the user
    $stmt = $pdo->prepare("UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?");
    $result = $stmt->execute([$full_name, $email, $phone, $staff_id]);
    
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
                    'update_staff',
                    $staff_id,
                    "Updated {$user['role']} user: {$user['username']} - name: '{$full_name}', email: '{$email}', phone: '{$phone}'",
                    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ]);
            }
        } catch (Exception $e) {
            // Activity logging is optional, continue without it
            error_log("Activity logging failed: " . $e->getMessage());
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Staff member updated successfully',
            'updated_user' => [
                'id' => $staff_id,
                'username' => $user['username'],
                'role' => $user['role'],
                'full_name' => $full_name,
                'email' => $email,
                'phone' => $phone
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update staff member']);
    }
    
} catch (PDOException $e) {
    error_log("Database error in editStaff.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error in editStaff.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
