<?php
// Debug script for check-in functionality
require_once '../config/cors.php';
header('Content-Type: application/json');

try {
    require_once '../config/database.php';
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit();
    }
    
    $debug = [];
    
    // Test 1: Check database connection
    $debug['database_connection'] = 'Connected successfully';
    
    // Test 2: Check if required tables exist
    $tables = ['bookings', 'guests', 'rooms', 'room_types', 'activity_logs'];
    foreach ($tables as $table) {
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        $exists = $stmt->rowCount() > 0;
        $debug['tables'][$table] = $exists;
    }
    
    // Test 3: Check if we have any data
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM bookings");
    $stmt->execute();
    $bookingCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $debug['total_bookings'] = $bookingCount['count'];
    
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM rooms");
    $stmt->execute();
    $roomCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $debug['total_rooms'] = $roomCount['count'];
    
    // Test 4: Check for confirmed bookings
    $stmt = $conn->prepare("
        SELECT b.id, b.room_number, b.status, g.first_name, g.last_name
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        WHERE b.status = 'confirmed'
        LIMIT 5
    ");
    $stmt->execute();
    $confirmedBookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['confirmed_bookings'] = $confirmedBookings;
    
    // Test 5: Check room statuses
    $stmt = $conn->prepare("
        SELECT room_number, status
        FROM rooms
        ORDER BY room_number
        LIMIT 10
    ");
    $stmt->execute();
    $roomStatuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $debug['room_statuses'] = $roomStatuses;
    
    // Test 6: Check if we can find a valid check-in candidate
    $validCheckIn = null;
    if (!empty($confirmedBookings)) {
        foreach ($confirmedBookings as $booking) {
            $stmt = $conn->prepare("
                SELECT r.room_number, r.status
                FROM rooms r
                WHERE r.room_number = ?
            ");
            $stmt->execute([$booking['room_number']]);
            $room = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($room && ($room['status'] === 'available' || $room['status'] === 'booked')) {
                $validCheckIn = [
                    'booking_id' => $booking['id'],
                    'room_number' => $booking['room_number'],
                    'guest_name' => $booking['first_name'] . ' ' . $booking['last_name'],
                    'current_booking_status' => $booking['status'],
                    'current_room_status' => $room['status']
                ];
                break;
            }
        }
    }
    $debug['valid_checkin_candidate'] = $validCheckIn;
    
    // Test 7: If we have a valid candidate, test the actual check-in process
    if ($validCheckIn) {
        $debug['checkin_test'] = 'Testing actual check-in process...';
        
        try {
            // Start transaction
            $conn->beginTransaction();
            
            // Verify the booking exists
            $verifySql = "SELECT b.id, b.room_number, b.status, r.id as room_id, r.status as room_status
                         FROM bookings b 
                         LEFT JOIN rooms r ON b.room_number = r.room_number 
                         WHERE b.id = ? AND b.room_number = ?";
            $verifyStmt = $conn->prepare($verifySql);
            $verifyStmt->execute([$validCheckIn['booking_id'], $validCheckIn['room_number']]);
            $booking = $verifyStmt->fetch(PDO::FETCH_ASSOC);
            
            $debug['verification_result'] = $booking;
            
            if ($booking) {
                // Test update booking status
                $updateBookingSql = "UPDATE bookings SET status = 'checked_in' WHERE id = ? AND room_number = ?";
                $stmt = $conn->prepare($updateBookingSql);
                $stmt->execute([$validCheckIn['booking_id'], $validCheckIn['room_number']]);
                $debug['booking_update_result'] = $stmt->rowCount() . ' rows affected';
                
                // Test update room status
                $updateRoomSql = "UPDATE rooms SET status = 'occupied' WHERE room_number = ?";
                $stmt = $conn->prepare($updateRoomSql);
                $stmt->execute([$validCheckIn['room_number']]);
                $debug['room_update_result'] = $stmt->rowCount() . ' rows affected';
                
                // Rollback to not actually change the data
                $conn->rollBack();
                $debug['checkin_test_result'] = 'SUCCESS - All operations completed (rolled back)';
            } else {
                $conn->rollBack();
                $debug['checkin_test_result'] = 'FAILED - Could not verify booking';
            }
            
        } catch (Exception $e) {
            $conn->rollBack();
            $debug['checkin_test_result'] = 'FAILED - Error: ' . $e->getMessage();
        }
    } else {
        $debug['checkin_test'] = 'No valid check-in candidate found';
    }
    
    // Test 8: Check database schema for required columns
    $stmt = $conn->prepare("DESCRIBE bookings");
    $stmt->execute();
    $bookingColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $debug['bookings_columns'] = $bookingColumns;
    
    $stmt = $conn->prepare("DESCRIBE rooms");
    $stmt->execute();
    $roomColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $debug['rooms_columns'] = $roomColumns;
    
    echo json_encode([
        'success' => true,
        'message' => 'Debug information collected',
        'debug' => $debug,
        'timestamp' => date('Y-m-d H:i:s'),
        'recommendations' => [
            '1. Check if all required tables exist',
            '2. Verify confirmed bookings exist',
            '3. Ensure rooms have correct status values',
            '4. Check if required columns exist in tables'
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Debug failed: ' . $e->getMessage(),
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
?>

