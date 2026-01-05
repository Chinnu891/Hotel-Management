<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Ensure proper headers
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed. Use GET"));
    exit();
}

try {
    // Require authentication
    $current_user = SimpleJWTHelper::requireAuth();
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Fetch current user's profile information
    $query = "SELECT id, username, full_name, email, phone, role, created_at FROM users WHERE id = ?";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute([$current_user['user_id']])) {
        $userData = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($userData) {
            // Remove sensitive information
            unset($userData['password']);
            
            http_response_code(200);
            echo json_encode([
                "success" => true,
                "message" => "Profile retrieved successfully",
                "user" => $userData
            ]);
        } else {
            http_response_code(404);
            echo json_encode(array("error" => "User not found"));
        }
    } else {
        http_response_code(500);
        echo json_encode(array("error" => "Failed to retrieve profile"));
    }
    
} catch (PDOException $e) {
    error_log("Database error in get_profile.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error occurred"));
} catch (Exception $e) {
    error_log("General error in get_profile.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error occurred"));
}
?>
