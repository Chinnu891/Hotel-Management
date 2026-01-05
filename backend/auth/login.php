<?php
// Simple, clean login endpoint

require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Set Content-Type header
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    // Get JSON input
    $input = file_get_contents("php://input");
    $data = json_decode($input);
    
    if (!$data || !isset($data->username) || !isset($data->password)) {
        http_response_code(400);
        echo json_encode(array("error" => "Username and password are required"));
        exit();
    }
    
    // Connect to database
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // First check if user exists (without checking is_active)
    $query = "SELECT id, username, password, role, full_name, email, is_active FROM users WHERE username = :username";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        http_response_code(401);
        echo json_encode(array("error" => "Invalid credentials"));
        exit();
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Check if account is deactivated
    if ($user['is_active'] == 0) {
        http_response_code(401);
        echo json_encode(array("error" => "Your account has been deactivated. Please contact the administrator."));
        exit();
    }
    
    // Verify password
    if (!password_verify($data->password, $user['password'])) {
        http_response_code(401);
        echo json_encode(array("error" => "Invalid credentials"));
        exit();
    }
    
    // Update last login
    $update_query = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":id", $user['id']);
    $update_stmt->execute();
    
    // Generate JWT token
    $token = SimpleJWTHelper::generateToken($user);
    
    // Generate refresh token
    $refresh_token = SimpleJWTHelper::generateRefreshToken($user);
    
    // Remove password and is_active from response
    unset($user['password']);
    unset($user['is_active']);
    
    // Send success response
    $response = array(
        "success" => true,
        "message" => "Login successful",
        "token" => $token,
        "refresh_token" => $refresh_token,
        "user" => $user,
        "expires_in" => 60 * 60 * 24 * 7 // 7 days in seconds
    );
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
