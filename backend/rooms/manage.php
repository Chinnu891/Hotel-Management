<?php
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

// Require admin role
$current_user = SimpleJWTHelper::requireRole('admin');

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->action)) {
    http_response_code(400);
    echo json_encode(array("error" => "Action is required"));
    exit();
}

try {
    switch ($data->action) {
        case 'add_room':
            if (!isset($data->room_number) || !isset($data->room_type_id) || !isset($data->floor)) {
                http_response_code(400);
                echo json_encode(array("error" => "Room number, room type ID, and floor are required"));
                exit();
            }
            
            // Check if room number already exists
            $check_query = "SELECT id FROM rooms WHERE room_number = :room_number";
            $check_stmt = $db->prepare($check_query);
            $check_stmt->bindParam(":room_number", $data->room_number);
            $check_stmt->execute();
            
            if ($check_stmt->rowCount() > 0) {
                http_response_code(400);
                echo json_encode(array("error" => "Room number already exists"));
                exit();
            }
            
            // Check if room type exists
            $type_check_query = "SELECT id FROM room_types WHERE id = :type_id";
            $type_check_stmt = $db->prepare($type_check_query);
            $type_check_stmt->bindParam(":type_id", $data->room_type_id);
            $type_check_stmt->execute();
            
            if ($type_check_stmt->rowCount() == 0) {
                http_response_code(400);
                echo json_encode(array("error" => "Invalid room type ID"));
                exit();
            }
            
            // Insert new room
            $query = "INSERT INTO rooms (room_number, room_type_id, floor, status) VALUES (:room_number, :room_type_id, :floor, 'available')";
            $stmt = $db->prepare($query);
            
            $stmt->bindParam(":room_number", $data->room_number);
            $stmt->bindParam(":room_type_id", $data->room_type_id);
            $stmt->bindParam(":floor", $data->floor);
            
            if ($stmt->execute()) {
                $room_id = $db->lastInsertId();
                
                // Log the action
                $log_query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (:user_id, 'add_room', 'rooms', :record_id, :details, :ip)";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->bindParam(":user_id", $current_user['user_id']);
                $log_stmt->bindParam(":record_id", $room_id);
                $log_stmt->bindParam(":details", "Added new room: " . $data->room_number);
                $log_stmt->bindParam(":ip", $_SERVER['REMOTE_ADDR']);
                $log_stmt->execute();
                
                echo json_encode(array(
                    "success" => true,
                    "message" => "Room added successfully",
                    "room_id" => $room_id
                ));
            } else {
                http_response_code(500);
                echo json_encode(array("error" => "Failed to add room"));
            }
            break;
            
        case 'update_room_status':
            if (!isset($data->room_id) || !isset($data->status)) {
                http_response_code(400);
                echo json_encode(array("error" => "Room ID and status are required"));
                exit();
            }
            
            $valid_statuses = ['available', 'occupied', 'maintenance', 'cleaning'];
            if (!in_array($data->status, $valid_statuses)) {
                http_response_code(400);
                echo json_encode(array("error" => "Invalid status. Must be: " . implode(', ', $valid_statuses)));
                exit();
            }
            
            $query = "UPDATE rooms SET status = :status WHERE id = :room_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":status", $data->status);
            $stmt->bindParam(":room_id", $data->room_id);
            
            if ($stmt->execute()) {
                // Log the action
                $log_query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (:user_id, 'update_room_status', 'rooms', :record_id, :details, :ip)";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->bindParam(":user_id", $current_user['user_id']);
                $log_stmt->bindParam(":record_id", $data->room_id);
                $log_stmt->bindParam(":details", "Updated room status to: " . $data->status);
                $log_stmt->bindParam(":ip", $_SERVER['REMOTE_ADDR']);
                $log_stmt->execute();
                
                echo json_encode(array(
                    "success" => true,
                    "message" => "Room status updated successfully"
                ));
            } else {
                http_response_code(500);
                echo json_encode(array("error" => "Failed to update room status"));
            }
            break;
            
        case 'delete_room':
            if (!isset($data->room_id)) {
                http_response_code(400);
                echo json_encode(array("error" => "Room ID is required"));
                exit();
            }
            
            // Check if room is currently occupied
            $check_query = "SELECT status FROM rooms WHERE id = :room_id";
            $check_stmt = $db->prepare($check_query);
            $check_stmt->bindParam(":room_id", $data->room_id);
            $check_stmt->execute();
            
            if ($check_stmt->rowCount() == 0) {
                http_response_code(404);
                echo json_encode(array("error" => "Room not found"));
                exit();
            }
            
            $room = $check_stmt->fetch(PDO::FETCH_ASSOC);
            if ($room['status'] === 'occupied') {
                http_response_code(400);
                echo json_encode(array("error" => "Cannot delete occupied room"));
                exit();
            }
            
            $query = "DELETE FROM rooms WHERE id = :room_id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":room_id", $data->room_id);
            
            if ($stmt->execute()) {
                // Log the action
                $log_query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (:user_id, 'delete_room', 'rooms', :record_id, :details, :ip)";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->bindParam(":user_id", $current_user['user_id']);
                $log_stmt->bindParam(":record_id", $data->room_id);
                $log_stmt->bindParam(":details", "Deleted room");
                $log_stmt->bindParam(":ip", $_SERVER['REMOTE_ADDR']);
                $log_stmt->execute();
                
                echo json_encode(array(
                    "success" => true,
                    "message" => "Room deleted successfully"
                ));
            } else {
                http_response_code(500);
                echo json_encode(array("error" => "Failed to delete room"));
            }
            break;
            
        default:
            http_response_code(400);
            echo json_encode(array("error" => "Invalid action. Valid actions: add_room, update_room_status, delete_room"));
            break;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
