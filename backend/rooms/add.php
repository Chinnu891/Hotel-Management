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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    // Require admin role
    $current_user = SimpleJWTHelper::requireRole('admin');
    
    $database = new Database();
    $db = $database->getConnection();
    
    $data = json_decode(file_get_contents("php://input"));
    
    // Debug logging
    error_log("Received data: " . print_r($data, true));
    
    if (!isset($data->room_number) || !isset($data->room_type_id) || !isset($data->floor) || !isset($data->price)) {
        http_response_code(400);
        echo json_encode(array("error" => "Room number, room type ID, floor, and price are required"));
        exit();
    }
    
    // Validate and convert data types
    $room_number = trim($data->room_number);
    $room_type_id = intval($data->room_type_id);
    $floor = intval($data->floor);
    $price = floatval($data->price);
    
    if (empty($room_number)) {
        http_response_code(400);
        echo json_encode(array("error" => "Room number cannot be empty"));
        exit();
    }
    
    if ($room_type_id <= 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid room type ID"));
        exit();
    }
    
    if ($floor <= 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid floor number"));
        exit();
    }
    
    // Allow price to be 0 (will use room type base price) or greater than 0
    if ($price < 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Price cannot be negative"));
        exit();
    }
    
    // Check if room number already exists
    $check_query = "SELECT id FROM rooms WHERE room_number = :room_number";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindValue(":room_number", $room_number);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Room number already exists"));
        exit();
    }
    
    // Check if room type exists
    $type_check_query = "SELECT id FROM room_types WHERE id = :type_id";
    $type_check_stmt = $db->prepare($type_check_query);
    $type_check_stmt->bindValue(":type_id", $room_type_id);
    $type_check_stmt->execute();
    
    if ($type_check_stmt->rowCount() == 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid room type ID"));
        exit();
    }
    
    // Insert new room
    $query = "INSERT INTO rooms (room_number, room_type_id, floor, status, price) VALUES (:room_number, :room_type_id, :floor, 'available', :price)";
    $stmt = $db->prepare($query);
    
    $stmt->bindValue(":room_number", $room_number);
    $stmt->bindValue(":room_type_id", $room_type_id);
    $stmt->bindValue(":floor", $floor);
    $stmt->bindValue(":price", $price);
    
    if ($stmt->execute()) {
        $room_id = $db->lastInsertId();
        
        // Log the action (optional - don't fail if logging fails)
        try {
            $log_query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (:user_id, 'add_room', 'rooms', :record_id, :details, :ip)";
            $log_stmt = $db->prepare($log_query);
            $log_stmt->bindValue(":user_id", $current_user['user_id']);
            $log_stmt->bindValue(":record_id", $room_id);
            $log_stmt->bindValue(":details", "Added new room: " . $room_number);
            $log_stmt->bindValue(":ip", $_SERVER['REMOTE_ADDR']);
            $log_stmt->execute();
        } catch (Exception $log_error) {
            // Log error but don't fail the room addition
            error_log("Failed to log room addition: " . $log_error->getMessage());
        }
        
        // Set success response
        http_response_code(200);
        $response = array(
            "success" => true,
            "message" => "Room added successfully",
            "room_id" => $room_id
        );
        
        error_log("Sending success response: " . json_encode($response));
        echo json_encode($response);
        
    } else {
        http_response_code(500);
        echo json_encode(array("error" => "Failed to add room"));
    }
    
} catch (PDOException $e) {
    error_log("Database error in add.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    error_log("General error in add.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
