<?php
require_once '../utils/cors_headers.php';

require_once '../config/database.php';
require_once '../utils/response.php';
require_once '../utils/jwt_helper.php';

$response = new Response();

try {
    // Verify JWT token
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        echo json_encode($response->unauthorized('Authorization token required'));
        exit;
    }
    
    $jwt = new JWT();
    $decoded = $jwt->decode($token);
    
    if (!$decoded || $decoded->role !== 'reception') {
        echo json_encode($response->forbidden('Access denied. Reception role required.'));
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode($response->error('Method not allowed', 405));
        exit;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    $required_fields = ['room_id', 'new_status', 'reason'];
    $errors = [];
    
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            $errors[] = "$field is required";
        }
    }
    
    if (!empty($errors)) {
        echo json_encode($response->validationError($errors));
        exit;
    }
    
    // Validate status values
    $valid_statuses = ['available', 'cleaning', 'maintenance', 'occupied'];
    if (!in_array($input['new_status'], $valid_statuses)) {
        echo json_encode($response->validationError(['new_status' => 'Invalid room status']));
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if room exists
    $stmt = $db->prepare("
        SELECT r.*, rt.name as room_type
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE r.room_number = ?
    ");
    $stmt->execute([$input['room_id']]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$room) {
        echo json_encode($response->notFound('Room not found'));
        exit;
    }
    
            // Check if room can be updated to the new status
        if ($input['new_status'] === 'available' && $room['status'] === 'occupied') {
            // Check if there are any active bookings for this room
            $stmt = $db->prepare("
                SELECT COUNT(*) as active_bookings
                FROM bookings
                WHERE room_number = ? AND status IN ('confirmed', 'checked_in')
            ");
            $stmt->execute([$input['room_id']]);
            $active_bookings = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($active_bookings['active_bookings'] > 0) {
                echo json_encode($response->error('Cannot set room as available - has active bookings'));
                exit;
            }
        }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Update room status
        $stmt = $db->prepare("
            UPDATE rooms 
            SET status = ? 
            WHERE room_number = ?
        ");
        $stmt->execute([$input['new_status'], $input['room_id']]);
        
        // If setting to maintenance, create maintenance record
        if ($input['new_status'] === 'maintenance') {
            $stmt = $db->prepare("
                INSERT INTO maintenance (room_number, issue_type, description, status, assigned_to)
                VALUES (?, 'repair', ?, 'pending', ?)
            ");
            $stmt->execute([
                $input['room_id'],
                $input['reason'],
                $decoded->user_id
            ]);
        }
        
        // Log the activity
        $stmt = $db->prepare("
            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address)
            VALUES (?, 'update_room_status', 'rooms', ?, ?, ?)
        ");
        $stmt->execute([
            $decoded->user_id,
            $input['room_id'],
            "Room {$room['room_number']} status changed from {$room['status']} to {$input['new_status']} - {$input['reason']}",
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        $db->commit();
        
        // Return success response
        $data = [
            'room_id' => $input['room_id'],
            'room_number' => $room['room_number'],
            'room_type' => $room['room_type'],
            'old_status' => $room['status'],
            'new_status' => $input['new_status'],
            'reason' => $input['reason'],
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response->success($data, 'Room status updated successfully'));
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Update room status error: " . $e->getMessage());
    echo json_encode($response->error('Failed to update room status: ' . $e->getMessage()));
}
?>
