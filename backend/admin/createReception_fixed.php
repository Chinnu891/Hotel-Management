<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/jwt_helper.php';

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
    // Require admin role
    $current_user = JWTHelper::requireRole('admin');
    
    $database = new Database();
    $db = $database->getConnection();
    
    $data = json_decode(file_get_contents("php://input"));
    
    // Debug: Log the incoming data
    error_log("createReception_fixed.php - Incoming data: " . json_encode($data));
    
    if (!isset($data->username) || !isset($data->password) || !isset($data->full_name)) {
        http_response_code(400);
        $error_response = array("error" => "Username, password, and full name are required");
        error_log("createReception_fixed.php - Validation error: " . json_encode($error_response));
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
        error_log("createReception_fixed.php - Username exists error: " . json_encode($error_response));
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
        
        // Try to log the action, but don't fail if logging fails
        try {
            // Check if activity_logs table exists
            $check_logs = "SHOW TABLES LIKE 'activity_logs'";
            $logs_stmt = $db->prepare($check_logs);
            $logs_stmt->execute();
            
            if ($logs_stmt->rowCount() > 0) {
                // Table exists, try to log
                $log_query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (:user_id, 'create_reception', 'users', :record_id, :details, :ip)";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->bindParam(":user_id", $current_user['user_id']);
                $log_stmt->bindParam(":record_id", $user_id);
                $log_stmt->bindParam(":details", "Created reception account: " . $data->username);
                $log_stmt->bindParam(":ip", $_SERVER['REMOTE_ADDR']);
                $log_stmt->execute();
            }
        } catch (Exception $e) {
            // Logging failed, but don't fail the main operation
            error_log("Activity logging failed in createReception.php: " . $e->getMessage());
        }

        $success_response = array(
            "success" => true,
            "message" => "Reception account created successfully",
            "user_id" => $user_id
        );
        
        // Debug: Log the success response
        error_log("createReception_fixed.php - Success response: " . json_encode($success_response));
        
        echo json_encode($success_response);
    } else {
        http_response_code(500);
        $error_response = array("error" => "Failed to create reception account");
        error_log("createReception_fixed.php - Database error: " . json_encode($error_response));
        echo json_encode($error_response);
    }
} catch (PDOException $e) {
    error_log("Database error in createReception.php: " . $e->getMessage());
    http_response_code(500);
    $error_response = array("error" => "Database error: " . $e->getMessage());
    error_log("createReception_fixed.php - PDO error response: " . json_encode($error_response));
    echo json_encode($error_response);
} catch (Exception $e) {
    error_log("General error in createReception.php: " . $e->getMessage());
    http_response_code(500);
    $error_response = array("error" => "Server error: " . $e->getMessage());
    error_log("createReception_fixed.php - General error response: " . json_encode($error_response));
    echo json_encode($error_response);
}
?>
