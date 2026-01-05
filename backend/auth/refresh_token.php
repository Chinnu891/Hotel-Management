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
    $data = json_decode($input);
    
    if (!$data || !isset($data->refresh_token)) {
        http_response_code(400);
        echo json_encode(array("error" => "Refresh token is required"));
        exit();
    }
    
    // Validate the refresh token
    $decoded = SimpleJWTHelper::validateToken($data->refresh_token);
    
    if (!$decoded || !isset($decoded['type']) || $decoded['type'] !== 'refresh') {
        http_response_code(401);
        echo json_encode(array("error" => "Invalid or expired refresh token"));
        exit();
    }
    
    // Connect to database to get fresh user data
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Get current user data
    $query = "SELECT id, username, role, full_name, email FROM users WHERE id = :id AND is_active = 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $decoded['user_id']);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        http_response_code(401);
        echo json_encode(array("error" => "User account not found or deactivated"));
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
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
