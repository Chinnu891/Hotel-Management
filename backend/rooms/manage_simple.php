<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';

// Set Content-Type header
header('Content-Type: application/json');

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

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
            $type_check_query = "SELECT id, name FROM room_types WHERE id = :type_id";
            $type_check_stmt = $db->prepare($type_check_query);
            $type_check_stmt->bindParam(":type_id", $data->room_type_id);
            $type_check_stmt->execute();
            
            if ($type_check_stmt->rowCount() == 0) {
                http_response_code(400);
                echo json_encode(array("error" => "Invalid room type ID"));
                exit();
            }
            
            $room_type = $type_check_stmt->fetch(PDO::FETCH_ASSOC);
            
            // Insert new room
            $query = "INSERT INTO rooms (room_number, room_type_id, floor, status) VALUES (:room_number, :room_type_id, :floor, 'available')";
            $stmt = $db->prepare($query);
            
            $stmt->bindParam(":room_number", $data->room_number);
            $stmt->bindParam(":room_type_id", $data->room_type_id);
            $stmt->bindParam(":floor", $data->floor);
            
            if ($stmt->execute()) {
                $room_id = $db->lastInsertId();
                
                echo json_encode(array(
                    "success" => true,
                    "message" => "Room added successfully",
                    "room_id" => $room_id,
                    "room_number" => $data->room_number,
                    "room_type" => $room_type['name'],
                    "floor" => $data->floor
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
