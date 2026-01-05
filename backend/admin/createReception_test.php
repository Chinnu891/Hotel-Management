<?php
require_once '../config/cors.php';
require_once '../config/database.php';

// Ensure proper headers
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
    // NO JWT AUTHENTICATION - bypass for testing
    
    $database = new Database();
    $db = $database->getConnection();
    
    $data = json_decode(file_get_contents("php://input"));
    
    // Debug: Log the incoming data
    error_log("createReception_test.php - Incoming data: " . json_encode($data));
    
    if (!isset($data->username) || !isset($data->password) || !isset($data->full_name)) {
        http_response_code(400);
        $error_response = array("error" => "Username, password, and full name are required");
        error_log("createReception_test.php - Validation error: " . json_encode($error_response));
        echo json_encode($error_response);
        exit();
    }
    
    // Check if username already exists
    $check_query = "SELECT id FROM users WHERE username = :username";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":username", $data->username);
    $check_stmt->execute();

    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        $error_response = array("error" => "Username already exists");
        error_log("createReception_test.php - Username exists error: " . json_encode($error_response));
        echo json_encode($error_response);
        exit();
    }

    // Hash password
    $hashed_password = password_hash($data->password, PASSWORD_DEFAULT);

    // Insert new reception user
    $query = "INSERT INTO users (username, password, role, full_name, email, phone) VALUES (:username, :password, 'reception', :full_name, :email, :phone)";
    $stmt = $db->prepare($query);
    
    $stmt->bindParam(":username", $data->username);
    $stmt->bindParam(":password", $hashed_password);
    $stmt->bindParam(":full_name", $data->full_name);
    $stmt->bindParam(":email", isset($data->email) ? $data->email : null);
    $stmt->bindParam(":phone", isset($data->phone) ? $data->phone : null);

    if ($stmt->execute()) {
        $user_id = $db->lastInsertId();
        
        $success_response = array(
            "success" => true,
            "message" => "Reception account created successfully",
            "user_id" => $user_id
        );
        
        // Debug: Log the success response
        error_log("createReception_test.php - Success response: " . json_encode($success_response));
        
        echo json_encode($success_response);
    } else {
        http_response_code(500);
        $error_response = array("error" => "Failed to create reception account");
        error_log("createReception_test.php - Database error: " . json_encode($error_response));
        echo json_encode($error_response);
    }
} catch (PDOException $e) {
    error_log("Database error in createReception_test.php: " . $e->getMessage());
    http_response_code(500);
    $error_response = array("error" => "Database error: " . $e->getMessage());
    error_log("createReception_test.php - PDO error response: " . json_encode($error_response));
    echo json_encode($error_response);
} catch (Exception $e) {
    error_log("General error in createReception_test.php: " . $e->getMessage());
    http_response_code(500);
    $error_response = array("error" => "Server error: " . $e->getMessage());
    error_log("createReception_test.php - General error response: " . json_encode($error_response));
    echo json_encode($error_response);
}
?>
