<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Set Content-Type header
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception("Invalid input data");
    }
    
    $room_number = $input['room_number'] ?? null;
    $new_status = $input['new_status'] ?? null;
    $user_id = $input['user_id'] ?? 1;
    $notes = $input['notes'] ?? '';
    
    if (!$room_number || !$new_status) {
        throw new Exception("Missing required parameters: room_number and new_status");
    }
    
    // Validate status
    $valid_statuses = ['available', 'booked', 'occupied', 'maintenance', 'cleaning'];
    if (!in_array($new_status, $valid_statuses)) {
        throw new Exception("Invalid status. Must be one of: " . implode(', ', $valid_statuses));
    }
    
    // Check if room exists
    $stmt = $db->prepare("
        SELECT r.*, rt.name as room_type
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE r.room_number = ?
    ");
    $stmt->execute([$room_number]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$room) {
        echo json_encode(array(
            "success" => false,
            "message" => "Room not found"
        ));
        exit;
    }
    
    // Check if room can be updated to the new status
    if ($new_status === 'available' && $room['status'] === 'occupied') {
        // Check if there are any active bookings for this room
        $stmt = $db->prepare("
            SELECT COUNT(*) as active_bookings
            FROM bookings
            WHERE room_number = ? AND status IN ('confirmed', 'checked_in')
        ");
        $stmt->execute([$room_number]);
        $active_bookings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($active_bookings['active_bookings'] > 0) {
            echo json_encode(array(
                "success" => false,
                "message" => "Cannot set room as available - has active bookings"
            ));
            exit;
        }
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Update room status
        $stmt = $db->prepare("
            UPDATE rooms 
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE room_number = ?
        ");
        $updateResult = $stmt->execute([$new_status, $room_number]);
        
        if (!$updateResult) {
            throw new Exception("Failed to update room status");
        }
        
        // Log the room status change
        $stmt = $db->prepare("
            INSERT INTO activity_logs (
                user_id, action, table_name, record_id, details, ip_address, created_at
            ) VALUES (?, ?, 'rooms', ?, ?, ?, NOW())
        ");
        $logDetails = json_encode([
            'room_number' => $room_number,
            'old_status' => $room['status'],
            'new_status' => $new_status,
            'notes' => $notes,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        $stmt->execute([
            $user_id,
            'room_status_updated',
            $room_number,
            $logDetails,
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        // Commit transaction
        $db->commit();
        
        // Get updated room information
        $stmt = $db->prepare("
            SELECT r.room_number, r.status, r.updated_at, rt.name as room_type_name 
            FROM rooms r 
            JOIN room_types rt ON r.room_type_id = rt.id 
            WHERE r.room_number = ?
        ");
        $stmt->execute([$room_number]);
        $updated_room = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            "success" => true,
            "message" => "Room status updated successfully",
            "data" => array(
                "room_number" => $updated_room['room_number'],
                "old_status" => $room['status'],
                "new_status" => $updated_room['status'],
                "room_type" => $updated_room['room_type_name'],
                "updated_at" => $updated_room['updated_at'],
                "notes" => $notes
            )
        ));
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ));
}
?>
