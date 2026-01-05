<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Set Content-Type header (after CORS headers)
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
    $data = json_decode($input, true);
    
    // Get token from request body or Authorization header as fallback
    $token = null;
    if ($data && isset($data['refresh_token'])) {
        $token = $data['refresh_token'];
    } else {
        // Try to get from Authorization header as fallback
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $auth_header = $headers['Authorization'];
            if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
                $token = $matches[1];
            }
        }
    }
    
    if (!$token) {
        http_response_code(400);
        echo json_encode(array(
            "success" => false,
            "error" => "Refresh token is required"
        ));
        exit();
    }
    
    // Validate the token (can be refresh token or access token)
    $decoded = SimpleJWTHelper::validateToken($token);
    
    if (!$decoded) {
        http_response_code(401);
        echo json_encode(array(
            "success" => false,
            "error" => "Invalid or expired token"
        ));
        exit();
    }
    
    // If it's not a refresh token, we'll still allow it (for backward compatibility)
    // but we'll generate new tokens
    $is_refresh_token = isset($decoded['type']) && $decoded['type'] === 'refresh';
    
    // Connect to database to get fresh user data
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Get current user data - check if is_active column exists
    try {
        $query = "SELECT id, username, role, full_name, email FROM users WHERE id = :id AND (is_active = 1 OR is_active IS NULL)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $decoded['user_id']);
        $stmt->execute();
    } catch (Exception $e) {
        // If is_active column doesn't exist, try without it
        $query = "SELECT id, username, role, full_name, email FROM users WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $decoded['user_id']);
        $stmt->execute();
    }
    
    if ($stmt->rowCount() === 0) {
        http_response_code(401);
        echo json_encode(array(
            "success" => false,
            "error" => "User account not found"
        ));
        exit();
    }
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Generate new access token
    $new_token = SimpleJWTHelper::generateToken($user);
    
    // Generate new refresh token
    $new_refresh_token = SimpleJWTHelper::generateRefreshToken($user);
    
    // Send success response
    echo json_encode(array(
        "success" => true,
        "message" => "Token refreshed successfully",
        "token" => $new_token,
        "refresh_token" => $new_refresh_token,
        "user" => $user,
        "expires_in" => 60 * 60 * 24 * 7 // 7 days in seconds
    ));
    
} catch (Exception $e) {
    error_log("Refresh token error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "error" => "Server error: " . $e->getMessage()
    ));
}
?>
