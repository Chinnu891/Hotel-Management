<?php
require_once 'config/cors.php';

// Set Content-Type header only if not already set
if (!defined('CONTENT_TYPE_HEADER_SENT')) {
    define('CONTENT_TYPE_HEADER_SENT', true);
    header('Content-Type: application/json');
}

try {
    require_once 'config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Check if reception user exists
    $check_query = "SELECT id FROM users WHERE username = 'reception'";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        echo json_encode(array(
            "success" => true,
            "message" => "Reception user already exists"
        ));
        exit();
    }
    
    // Create reception user
    $password_hash = password_hash('password', PASSWORD_DEFAULT);
    
    $insert_query = "INSERT INTO users (username, password, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)";
    $insert_stmt = $db->prepare($insert_query);
    $insert_stmt->execute([
        'reception',
        $password_hash,
        'reception',
        'Reception Staff',
        'reception@hotel.com',
        1
    ]);
    
    echo json_encode(array(
        "success" => true,
        "message" => "Reception user created successfully",
        "username" => "reception",
        "password" => "password",
        "role" => "reception"
    ));
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "error" => "Error: " . $e->getMessage()
    ));
}
?>
