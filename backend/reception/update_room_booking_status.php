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
    $required_fields = ['action', 'room_number'];
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
    
    $action = $input['action'];
    $roomNumber = $input['room_number'];
    
    // Validate action values
    $valid_actions = ['book', 'unbook'];
    if (!in_array($action, $valid_actions)) {
        echo json_encode($response->validationError(['action' => 'Invalid action. Must be "book" or "unbook"']));
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
    $stmt->execute([$roomNumber]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$room) {
        echo json_encode($response->notFound('Room not found'));
        exit;
    }
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        if ($action === 'book') {
            // Set room as booked
            if ($room['status'] !== 'available') {
                throw new Exception("Room {$roomNumber} is not available for booking. Current status: {$room['status']}");
            }
            
            $stmt = $db->prepare("UPDATE rooms SET status = 'booked' WHERE room_number = ?");
            $stmt->execute([$roomNumber]);
            
            $message = "Room {$roomNumber} is now booked and not available for new bookings.";
            $newStatus = 'booked';
            
        } else { // unbook
            // Set room as available
            if ($room['status'] !== 'booked') {
                throw new Exception("Room {$roomNumber} is not currently booked. Current status: {$room['status']}");
            }
            
            $stmt = $db->prepare("UPDATE rooms SET status = 'available' WHERE room_number = ?");
            $stmt->execute([$roomNumber]);
            
            $message = "Room {$roomNumber} is now available for new bookings.";
            $newStatus = 'available';
        }
        
        // Log the activity
        $stmt = $db->prepare("
            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address)
            VALUES (?, ?, 'rooms', ?, ?, ?)
        ");
        $stmt->execute([
            $decoded->user_id ?? 1,
            $action === 'book' ? 'book_room' : 'unbook_room',
            $roomNumber,
            "Room {$roomNumber} status changed from {$room['status']} to {$newStatus}",
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        $db->commit();
        
        // Return success response
        $data = [
            'room_number' => $roomNumber,
            'room_type' => $room['room_type'],
            'old_status' => $room['status'],
            'new_status' => $newStatus,
            'action' => $action,
            'updated_at' => date('Y-m-d H:i:s')
        ];
        
        echo json_encode($response->success($data, $message));
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("Room booking status update error: " . $e->getMessage());
    echo json_encode($response->error('Room booking status update failed: ' . $e->getMessage()));
}
?>
