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
    
    // Allow housekeeping and admin roles
    if (!$decoded || !in_array($decoded->role, ['housekeeping', 'admin'])) {
        echo json_encode($response->forbidden('Access denied. Housekeeping or admin role required.'));
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode($response->error('Method not allowed', 405));
        exit;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    if (!isset($input['room_number']) || empty($input['room_number'])) {
        echo json_encode($response->validationError(['room_number is required']));
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if room exists and is in cleaning status
    $stmt = $db->prepare("
        SELECT r.*, rt.name as room_type
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE r.room_number = ? AND r.status = 'cleaning'
    ");
    $stmt->execute([$input['room_number']]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$room) {
        echo json_encode($response->notFound('Room not found or not in cleaning status'));
        exit;
    }
    
    // Check if there are any active bookings for this room
    $stmt = $db->prepare("
        SELECT COUNT(*) as active_bookings
        FROM bookings
        WHERE room_number = ? AND status IN ('confirmed', 'checked_in')
    ");
    $stmt->execute([$input['room_number']]);
    $active_bookings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($active_bookings['active_bookings'] > 0) {
        echo json_encode($response->error('Cannot mark room as available - has active bookings'));
        exit;
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Update room status from 'cleaning' to 'available'
        $stmt = $db->prepare("
            UPDATE rooms 
            SET status = 'available' 
            WHERE room_number = ?
        ");
        $stmt->execute([$input['room_number']]);
        
        // Log the activity
        $stmt = $db->prepare("
            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address)
            VALUES (?, 'complete_cleaning', 'rooms', ?, ?, ?)
        ");
        $stmt->execute([
            $decoded->user_id,
            $input['room_number'],
            "Room {$input['room_number']} cleaning completed - status changed to available",
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        $db->commit();
        
        // Return success response
        $data = [
            'room_number' => $input['room_number'],
            'room_type' => $room['room_type'],
            'old_status' => 'cleaning',
            'new_status' => 'available',
            'completed_at' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response->success($data, 'Room cleaning completed successfully'));
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Complete cleaning error: " . $e->getMessage());
    echo json_encode($response->error('Complete cleaning failed: ' . $e->getMessage()));
}
?>
