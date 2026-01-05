<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response.php';
require_once '../utils/simple_jwt_helper.php';

$response = new Response();

try {
    // Verify JWT token
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        echo json_encode($response->unauthorized('Authorization token required'));
        exit;
    }
    
    $decoded = SimpleJWTHelper::validateToken($token);
    
    if (!$decoded || $decoded['role'] !== 'admin') {
        echo json_encode($response->forbidden('Access denied. Admin role required.'));
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        echo json_encode($response->error('Method not allowed', 405));
        exit;
    }
    
    // Get query parameters
    $check_in_date = $_GET['check_in_date'] ?? '';
    $check_out_date = $_GET['check_out_date'] ?? '';
    $exclude_booking_id = $_GET['exclude_booking_id'] ?? null;
    
    if (!$check_in_date || !$check_out_date) {
        echo json_encode($response->error('Check-in and check-out dates are required'));
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Get all rooms with their availability status for the specified dates
    $sql = "
        SELECT 
            r.room_number,
            rt.name as room_type_name,
            rt.id as room_type_id,
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM bookings b 
                    WHERE b.room_number = r.room_number 
                    AND b.id != ? 
                    AND b.status IN ('confirmed', 'checked_in', 'prebooked')
                    AND (
                        (b.check_in_date <= ? AND b.check_out_date > ?) OR
                        (b.check_in_date < ? AND b.check_out_date >= ?) OR
                        (b.check_in_date >= ? AND b.check_out_date <= ?)
                    )
                ) THEN 'occupied'
                ELSE 'available'
            END as availability_status,
            COALESCE(
                (SELECT b.booking_reference 
                 FROM bookings b 
                 WHERE b.room_number = r.room_number 
                 AND b.status IN ('confirmed', 'checked_in', 'prebooked')
                 AND (
                     (b.check_in_date <= ? AND b.check_out_date > ?) OR
                     (b.check_in_date < ? AND b.check_out_date >= ?) OR
                     (b.check_in_date >= ? AND b.check_out_date <= ?)
                 )
                 LIMIT 1), ''
            ) as conflicting_booking,
            COALESCE(
                (SELECT CONCAT(g.first_name, ' ', g.last_name)
                 FROM bookings b 
                 JOIN guests g ON b.guest_id = g.id
                 WHERE b.room_number = r.room_number 
                 AND b.status IN ('confirmed', 'checked_in', 'prebooked')
                 AND (
                     (b.check_in_date <= ? AND b.check_out_date > ?) OR
                     (b.check_in_date < ? AND b.check_out_date >= ?) OR
                     (b.check_in_date >= ? AND b.check_out_date <= ?)
                 )
                 LIMIT 1), ''
            ) as conflicting_guest
        FROM rooms r
        LEFT JOIN room_types rt ON r.room_type_id = rt.id
        ORDER BY r.room_number
    ";
    
    $stmt = $db->prepare($sql);
    $stmt->execute([
        $exclude_booking_id,
        $check_in_date, $check_in_date,
        $check_out_date, $check_out_date,
        $check_in_date, $check_out_date,
        $check_in_date, $check_in_date,
        $check_out_date, $check_out_date,
        $check_in_date, $check_out_date,
        $check_in_date, $check_in_date,
        $check_out_date, $check_out_date,
        $check_in_date, $check_out_date
    ]);
    
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get unique room types for the dropdown
    $room_types_sql = "
        SELECT DISTINCT rt.id, rt.name
        FROM room_types rt
        JOIN rooms r ON rt.id = r.room_type_id
        ORDER BY rt.name
    ";
    
    $room_types_stmt = $db->prepare($room_types_sql);
    $room_types_stmt->execute();
    $room_types = $room_types_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the response
    $formatted_rooms = [];
    foreach ($rooms as $room) {
        $formatted_rooms[] = [
            'room_number' => $room['room_number'],
            'room_type_name' => $room['room_type_name'],
            'room_type_id' => $room['room_type_id'],
            'availability_status' => $room['availability_status'],
            'conflicting_booking' => $room['conflicting_booking'],
            'conflicting_guest' => $room['conflicting_guest'],
            'display_text' => $room['room_number'] . ' - ' . $room['room_type_name'] . 
                             ($room['availability_status'] === 'occupied' ? 
                              ' (Occupied by ' . $room['conflicting_guest'] . ')' : 
                              ' (Available)')
        ];
    }
    
    echo json_encode($response->success([
        'rooms' => $formatted_rooms,
        'room_types' => $room_types,
        'check_in_date' => $check_in_date,
        'check_out_date' => $check_out_date
    ], 'Room availability retrieved successfully'));
    
} catch (Exception $e) {
    error_log("Room availability API error: " . $e->getMessage());
    echo json_encode($response->error('Failed to get room availability: ' . $e->getMessage()));
}
?>
