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
    error_log("Received force delete data: " . print_r($data, true));
    
    if (!isset($data->id) || !isset($data->confirmed) || $data->confirmed !== true) {
        http_response_code(400);
        echo json_encode(array("error" => "Room ID and confirmation are required"));
        exit();
    }
    
    // The frontend sends room.id which is actually room_number
    $room_number = trim($data->id);
    
    if (empty($room_number)) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid room number"));
        exit();
    }
    
    // Check if room exists and get room details
    $check_query = "SELECT room_number FROM rooms WHERE room_number = :room_number";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindValue(":room_number", $room_number);
    $check_stmt->execute();
    
    if ($check_stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("error" => "Room not found"));
        exit();
    }
    
    $room_data = $check_stmt->fetch(PDO::FETCH_ASSOC);
    $room_number = $room_data['room_number'];
    
    // Check if room has active bookings (using room_number instead of room_id)
    $booking_check_query = "SELECT COUNT(*) FROM bookings WHERE room_number = :room_number AND status IN ('confirmed', 'checked_in')";
    $booking_check_stmt = $db->prepare($booking_check_query);
    $booking_check_stmt->bindValue(":room_number", $room_number);
    $booking_check_stmt->execute();
    
    $active_bookings = $booking_check_stmt->fetchColumn();
    
    // Force delete room (regardless of active bookings) - use room_number as primary key
    $delete_query = "DELETE FROM rooms WHERE room_number = :room_number";
    $delete_stmt = $db->prepare($delete_query);
    $delete_stmt->bindValue(":room_number", $room_number);
    
    if ($delete_stmt->execute()) {
        // Log the action (optional - don't fail if logging fails)
        try {
            $log_query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) VALUES (:user_id, 'force_delete_room', 'rooms', :record_id, :details, :ip)";
            $log_stmt = $db->prepare($log_query);
            $log_stmt->bindValue(":user_id", $current_user['user_id']);
            $log_stmt->bindValue(":record_id", $room_number);
            $details = "Force deleted room: " . $room_number;
            if ($active_bookings > 0) {
                $details .= " (Warning: Room had " . $active_bookings . " active bookings)";
            }
            $log_stmt->bindValue(":details", $details);
            $log_stmt->bindValue(":ip", $_SERVER['REMOTE_ADDR']);
            $log_stmt->execute();
        } catch (Exception $log_error) {
            // Log error but don't fail the room deletion
            error_log("Failed to log force room deletion: " . $log_error->getMessage());
        }
        
        // Set success response
        http_response_code(200);
        $response = array(
            "success" => true,
            "message" => "Room force deleted successfully",
            "room_number" => $room_number
        );
        
        if ($active_bookings > 0) {
            $response["warning"] = "Room was force deleted with " . $active_bookings . " active booking(s)";
        }
        
        error_log("Sending force delete success response: " . json_encode($response));
        echo json_encode($response);
        
    } else {
        http_response_code(500);
        echo json_encode(array("error" => "Failed to delete room"));
    }
    
} catch (PDOException $e) {
    error_log("Database error in forceDelete.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    error_log("General error in forceDelete.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
