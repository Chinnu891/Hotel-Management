<?php
require_once '../config/cors.php';
// Simple test endpoint for staff creation (NO JWT - for testing only)
// REMOVE THIS FILE IN PRODUCTION

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    echo "✅ Database connection successful<br>";
    
    $data = json_decode(file_get_contents("php://input"));
    
    if (!isset($data->username) || !isset($data->password) || !isset($data->full_name)) {
        http_response_code(400);
        echo json_encode(array("error" => "Username, password, and full name are required"));
        exit();
    }
    
    // Check if username already exists
    $check_query = "SELECT id FROM users WHERE username = :username";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":username", $data->username);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Username already exists"));
        exit();
    }
    
    // Hash password
    $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);
    
    // Insert new reception user
    $query = "INSERT INTO users (username, password, role, full_name, email, phone, is_active, created_at) VALUES (:username, :password, 'reception', :full_name, :email, :phone, 1, NOW())";
    $stmt = $db->prepare($query);
    
    $stmt->bindParam(":username", $data->username);
    $stmt->bindParam(":password", $hashed_password);
    $stmt->bindParam(":full_name", $data->full_name);
    $stmt->bindParam(":email", isset($data->email) ? $data->email : null);
    $stmt->bindParam(":phone", isset($data->phone) ? $data->phone : null);
    
    if ($stmt->execute()) {
        $user_id = $db->lastInsertId();
        
        echo json_encode(array(
            "success" => true,
            "message" => "Test reception account created successfully",
            "user_id" => $user_id,
            "username" => $data->username,
            "full_name" => $data->full_name
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("error" => "Failed to create test reception account"));
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("error" => "General error: " . $e->getMessage()));
}
?>
