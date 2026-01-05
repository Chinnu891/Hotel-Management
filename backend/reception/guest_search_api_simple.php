<?php
// Simplified Guest Search API for testing
require_once '../config/cors.php';
require_once '../utils/simple_jwt_helper.php';
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
                case 'stats':
                    // Get guest statistics
                    $sql = "SELECT 
                                COUNT(*) as total_guests,
                                COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                                COUNT(CASE WHEN b.status = 'checked_in' THEN 1 END) as checked_in_guests,
                                COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                                COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings
                            FROM bookings b
                            WHERE b.status != 'checked_out'";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $stats
                    ]);
                    break;
                    
                default:
                    echo json_encode(['success' => false, 'message' => 'Invalid action']);
            }
            break;
            
        case 'POST':
            switch ($action) {
                case 'checkin':
                    // Simplified check-in without authentication
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    $bookingId = $input['booking_id'] ?? null;
                    $roomNumber = $input['room_number'] ?? null;
                    $checkInTime = $input['check_in_time'] ?? '12:00';
                    $checkOutTime = $input['check_out_time'] ?? '12:00';
                    $checkInAMPM = $input['check_in_ampm'] ?? 'AM';
                    $checkOutAMPM = $input['check_out_ampm'] ?? 'AM';
                    
                    if (!$bookingId || !$roomNumber) {
                        echo json_encode(['success' => false, 'message' => 'Booking ID and room number are required']);
                        break;
                    }
                    
                    try {
                        $conn->beginTransaction();
                        
                        // Get booking details
                        $stmt = $conn->prepare("
                            SELECT b.*, g.first_name, g.last_name
                            FROM bookings b
                            JOIN guests g ON b.guest_id = g.id
                            WHERE b.id = ? AND b.room_number = ?
                        ");
                        $stmt->execute([$bookingId, $roomNumber]);
                        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if (!$booking) {
                            throw new Exception('Booking not found');
                        }
                        
                        // Update booking status
                        $stmt = $conn->prepare("
                            UPDATE bookings 
                            SET status = 'checked_in',
                                check_in_time = ?,
                                check_in_ampm = ?,
                                check_out_time = ?,
                                check_out_ampm = ?
                            WHERE id = ?
                        ");
                        $stmt->execute([$checkInTime, $checkInAMPM, $checkOutTime, $checkOutAMPM, $bookingId]);
                        
                        // Update room status
                        $stmt = $conn->prepare("
                            UPDATE rooms 
                            SET status = 'occupied'
                            WHERE room_number = ?
                        ");
                        $stmt->execute([$roomNumber]);
                        
                        // Get a valid user ID for activity log
                        $stmt = $conn->prepare("SELECT id FROM users WHERE role IN ('admin', 'reception') LIMIT 1");
                        $stmt->execute();
                        $user = $stmt->fetch(PDO::FETCH_ASSOC);
                        $user_id = $user ? $user['id'] : null;
                        
                        // Log activity if user found
                        if ($user_id) {
                            $stmt = $conn->prepare("
                                INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
                                VALUES (?, 'check_in', 'bookings', ?, ?, ?, NOW())
                            ");
                            $stmt->execute([
                                $user_id,
                                $bookingId,
                                "Guest {$booking['first_name']} {$booking['last_name']} checked into room {$roomNumber}",
                                $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                            ]);
                        }
                        
                        $conn->commit();
                        
                        echo json_encode([
                            'success' => true,
                            'message' => "Guest {$booking['first_name']} {$booking['last_name']} successfully checked into room {$roomNumber}",
                            'data' => [
                                'booking_id' => $bookingId,
                                'room_number' => $roomNumber,
                                'status' => 'checked_in',
                                'guest_name' => "{$booking['first_name']} {$booking['last_name']}"
                            ]
                        ]);
                        
                    } catch (Exception $e) {
                        $conn->rollBack();
                        echo json_encode([
                            'success' => false,
                            'message' => 'Check-in failed: ' . $e->getMessage()
                        ]);
                    }
                    break;
                    
                default:
                    echo json_encode(['success' => false, 'message' => 'Invalid action']);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>
