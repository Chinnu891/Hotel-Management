<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

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
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->current_password) || !isset($data->new_password)) {
        http_response_code(400);
        echo json_encode(array("error" => "Current password and new password are required"));
        exit();
    }
    
    $current_password = $data->current_password;
    $new_password = $data->new_password;
    
    if (empty($current_password) || empty($new_password)) {
        http_response_code(400);
        echo json_encode(array("error" => "Passwords cannot be empty"));
        exit();
    }
    
    if (strlen($new_password) < 6) {
        http_response_code(400);
        echo json_encode(array("error" => "New password must be at least 6 characters long"));
        exit();
    }
    
    // Verify current password
    $check_stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
    $check_stmt->execute([$current_user['user_id']]);
    $user = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(array("error" => "User not found"));
        exit();
    }
    
    if (!password_verify($current_password, $user['password'])) {
        http_response_code(400);
        echo json_encode(array("error" => "Current password is incorrect"));
        exit();
    }
    
    // Hash new password
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Update password
    $update_stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update_stmt->execute([$hashed_password, $current_user['user_id']]);
    
    if ($update_stmt->rowCount() > 0) {
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Password updated successfully"
        ]);
    } else {
        http_response_code(500);
        echo json_encode(array("error" => "Failed to update password"));
    }
    
} catch (PDOException $e) {
    error_log("Database error in change_own_password.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error occurred"));
} catch (Exception $e) {
    error_log("General error in change_own_password.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error occurred"));
}
?>
