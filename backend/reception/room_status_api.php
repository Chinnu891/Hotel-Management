<?php
// Room Status Management API
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

try {
    require_once '../config/database.php';
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit();
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'room_statuses':
                    // Get all room statuses
                    $sql = "SELECT 
                                r.id,
                                r.room_number,
                                r.status,
                                r.floor,
                                r.price,
                                rt.name as room_type_name,
                                CASE 
                                    WHEN b.status = 'confirmed' THEN 'booked'
                                    WHEN b.status = 'checked_in' THEN 'occupied'
                                    WHEN b.status = 'checked_out' THEN 'available'
                                    ELSE r.status
                                END as effective_status,
                                b.id as booking_id,
                                b.status as booking_status,
                                g.first_name,
                                g.last_name
                            FROM rooms r
                            LEFT JOIN room_types rt ON r.room_type_id = rt.id
                            LEFT JOIN bookings b ON r.room_number = b.room_number AND b.status IN ('confirmed', 'checked_in')
                            LEFT JOIN guests g ON b.guest_id = g.id
                            ORDER BY r.room_number";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    $result = [
                        'success' => true,
                        'data' => $rooms
                    ];
                    break;
                    
                case 'available_rooms':
                    // Get only available rooms for new bookings
                    $sql = "SELECT 
                                r.id,
                                r.room_number,
                                r.floor,
                                r.price,
                                rt.name as room_type_name
                            FROM rooms r
                            LEFT JOIN room_types rt ON r.room_type_id = rt.id
                            WHERE r.status = 'available'
                            ORDER BY r.room_number";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $availableRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    $result = [
                        'success' => true,
                        'data' => $availableRooms
                    ];
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        case 'POST':
            switch ($action) {
                case 'update_room_status':
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    $roomNumber = $input['room_number'] ?? null;
                    $newStatus = $input['status'] ?? null;
                    $reason = $input['reason'] ?? 'Manual update';
                    
                    if (!$roomNumber || !$newStatus) {
                        $result = ['success' => false, 'message' => 'Room number and status are required'];
                        break;
                    }
                    
                    // Validate status
                    $validStatuses = ['available', 'booked', 'occupied', 'cleaning', 'maintenance'];
                    if (!in_array($newStatus, $validStatuses)) {
                        $result = ['success' => false, 'message' => 'Invalid room status'];
                        break;
                    }
                    
                    try {
                        $conn->beginTransaction();
                        
                        // Update room status
                        $stmt = $conn->prepare("UPDATE rooms SET status = ? WHERE room_number = ?");
                        $stmt->execute([$newStatus, $roomNumber]);
                        
                        if ($stmt->rowCount() === 0) {
                            throw new Exception('Room not found or status unchanged');
                        }
                        
                        // Log the activity
                        $stmt = $conn->prepare("
                            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address)
                            VALUES (?, 'update_room_status', 'rooms', ?, ?, ?)
                        ");
                        $stmt->execute([
                            1, // Default user ID
                            $roomNumber,
                            "Room {$roomNumber} status updated to {$newStatus}. Reason: {$reason}",
                            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                        ]);
                        
                        $conn->commit();
                        
                        $result = [
                            'success' => true,
                            'message' => "Room {$roomNumber} status updated to {$newStatus}",
                            'data' => [
                                'room_number' => $roomNumber,
                                'new_status' => $newStatus
                            ]
                        ];
                        
                    } catch (Exception $e) {
                        $conn->rollBack();
                        $result = [
                            'success' => false,
                            'message' => 'Failed to update room status: ' . $e->getMessage()
                        ];
                    }
                    break;
                    
                case 'sync_room_statuses':
                    // Sync room statuses with booking statuses
                    try {
                        $conn->beginTransaction();
                        
                        // Update rooms with confirmed bookings to 'booked'
                        $stmt = $conn->prepare("
                            UPDATE rooms r 
                            INNER JOIN bookings b ON r.room_number = b.room_number 
                            SET r.status = 'booked' 
                            WHERE b.status = 'confirmed' AND r.status != 'booked'
                        ");
                        $stmt->execute();
                        $bookedCount = $stmt->rowCount();
                        
                        // Update rooms with checked-in bookings to 'occupied'
                        $stmt = $conn->prepare("
                            UPDATE rooms r 
                            INNER JOIN bookings b ON r.room_number = b.room_number 
                            SET r.status = 'occupied' 
                            WHERE b.status = 'checked_in' AND r.status != 'occupied'
                        ");
                        $stmt->execute();
                        $occupiedCount = $stmt->rowCount();
                        
                        // Update rooms with checked-out bookings to 'available'
                        $stmt = $conn->prepare("
                            UPDATE rooms r 
                            INNER JOIN bookings b ON r.room_number = b.room_number 
                            SET r.status = 'available' 
                            WHERE b.status = 'checked_out' AND r.status != 'available'
                        ");
                        $stmt->execute();
                        $availableCount = $stmt->rowCount();
                        
                        $conn->commit();
                        
                        $result = [
                            'success' => true,
                            'message' => 'Room statuses synchronized with bookings',
                            'data' => [
                                'rooms_booked' => $bookedCount,
                                'rooms_occupied' => $occupiedCount,
                                'rooms_available' => $availableCount
                            ]
                        ];
                        
                    } catch (Exception $e) {
                        $conn->rollBack();
                        $result = [
                            'success' => false,
                            'message' => 'Failed to sync room statuses: ' . $e->getMessage()
                        ];
                    }
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Method not allowed'];
    }
    
} catch (Exception $e) {
    $result = ['success' => false, 'message' => 'Server error: ' . $e->getMessage()];
}

echo json_encode($result);
?>
