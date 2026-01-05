<?php
require_once '../config/cors.php';
// Test editStaff functionality (FOR TESTING ONLY)
// REMOVE THIS FILE IN PRODUCTION

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Accept both PUT and POST for testing
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed. Use PUT or POST"));
    exit();
}

try {
    // Add debug logging
    error_log("test_editStaff.php: Starting execution with method: " . $_SERVER['REQUEST_METHOD']);
    
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    error_log("test_editStaff.php: Database connection established");
    
    // Get input data
    $input_data = file_get_contents("php://input");
    error_log("test_editStaff.php: Raw input: " . $input_data);
    
    $data = json_decode($input_data);
    error_log("test_editStaff.php: Decoded data: " . print_r($data, true));
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid JSON data received"));
        exit();
    }
    
    if (!isset($data->staff_id) || !isset($data->full_name)) {
        http_response_code(400);
        echo json_encode(array("error" => "Staff ID and full name are required"));
        exit();
    }
    
    $staff_id = intval($data->staff_id);
    $full_name = trim($data->full_name);
    $email = isset($data->email) ? trim($data->email) : null;
    $phone = isset($data->phone) ? trim($data->phone) : null;
    
    error_log("test_editStaff.php: Processing staff_id: $staff_id, full_name: $full_name");
    
    if ($staff_id <= 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid staff ID"));
        exit();
    }
    
    if (empty($full_name)) {
        http_response_code(400);
        echo json_encode(array("error" => "Full name cannot be empty"));
        exit();
    }
    
    // Validate email if provided
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid email format"));
        exit();
    }
    
    // Check if staff member exists
    $check_query = "SELECT id, username, role FROM users WHERE id = :staff_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":staff_id", $staff_id);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("error" => "Staff member not found with ID: $staff_id"));
        exit();
    }
    
    $staff_member = $check_stmt->fetch(PDO::FETCH_ASSOC);
    error_log("test_editStaff.php: Found staff member: " . $staff_member['username']);
    
    // Update staff details
    $update_query = "UPDATE users SET full_name = :full_name, email = :email, phone = :phone WHERE id = :staff_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":full_name", $full_name);
    $update_stmt->bindParam(":email", $email);
    $update_stmt->bindParam(":phone", $phone);
    $update_stmt->bindParam(":staff_id", $staff_id);
    
    error_log("test_editStaff.php: Executing update query");
    
    if ($update_stmt->execute()) {
        error_log("test_editStaff.php: Update successful");
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Staff details updated successfully",
            "staff_id" => $staff_id,
            "updated_data" => [
                "full_name" => $full_name,
                "email" => $email,
                "phone" => $phone
            ]
        ]);
    } else {
        error_log("test_editStaff.php: Update failed");
        http_response_code(500);
        echo json_encode(array("error" => "Failed to update staff details"));
    }
    
} catch (PDOException $e) {
    error_log("Database error in test_editStaff.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    error_log("General error in test_editStaff.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
