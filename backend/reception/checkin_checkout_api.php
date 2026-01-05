<?php
// Check-In/Check-Out Management API
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
    
    if ($method !== 'POST') {
        echo json_encode(['success' => false, 'message' => 'Only POST method allowed']);
        exit();
    }
    
    switch ($action) {
        case 'checkin':
            handleCheckIn($conn);
            break;
            
        case 'checkout':
            handleCheckOut($conn);
            break;
            
        case 'get_booking_status':
            getBookingStatus($conn);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    error_log("Check-In/Check-Out API Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}

function handleCheckIn($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $bookingId = $input['booking_id'] ?? null;
    $roomNumber = $input['room_number'] ?? null;
    
    error_log("Check-in request received: " . json_encode($input));
    
    if (!$bookingId || !$roomNumber) {
        echo json_encode(['success' => false, 'message' => 'Booking ID and room number are required']);
        return;
    }
    
    try {
        $conn->beginTransaction();
        
        // Verify booking exists and is confirmed
        $stmt = $conn->prepare("
            SELECT b.*, g.first_name, g.last_name, r.status as room_status
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            LEFT JOIN rooms r ON b.room_number = r.room_number
            WHERE b.id = ? AND b.room_number = ?
        ");
        $stmt->execute([$bookingId, $roomNumber]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$booking) {
            throw new Exception('Booking not found');
        }
        
        if ($booking['status'] !== 'confirmed') {
            throw new Exception('Only confirmed bookings can be checked in');
        }
        
        // Check if the check-in date is valid (should be today or in the past)
        $current_date = date('Y-m-d');
        error_log("Check-in validation: Current date: $current_date, Booking check-in date: {$booking['check_in_date']}");
        
        if ($booking['check_in_date'] > $current_date) {
            error_log("Check-in rejected: Future date check-in attempted");
            throw new Exception('Cannot check in for future dates. Check-in date must be today or in the past.');
        }
        
        // Check if room is available for check-in
        if (!in_array($booking['room_status'], ['booked', 'available'])) {
            throw new Exception('Room is not available for check-in');
        }
        
        // Update booking status to checked_in
        $stmt = $conn->prepare("
            UPDATE bookings 
            SET status = 'checked_in'
            WHERE id = ?
        ");
        $stmt->execute([$bookingId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Failed to update booking status');
        }
        
        // Update room status to occupied
        $stmt = $conn->prepare("
            UPDATE rooms 
            SET status = 'occupied', 
                updated_at = NOW()
            WHERE room_number = ?
        ");
        $stmt->execute([$roomNumber]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Failed to update room status');
        }
        
        // Log the activity
        $stmt = $conn->prepare("
            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
            VALUES (?, 'check_in', 'bookings', ?, ?, ?, NOW())
        ");
        $stmt->execute([
            1, // Default user ID
            $bookingId,
            "Guest {$booking['first_name']} {$booking['last_name']} checked into room {$roomNumber}",
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        $conn->commit();
        
        error_log("Check-in successful for booking ID: {$bookingId}, room: {$roomNumber}");
        
        echo json_encode([
            'success' => true,
            'message' => "Guest {$booking['first_name']} {$booking['last_name']} successfully checked into room {$roomNumber}",
            'data' => [
                'booking_id' => $bookingId,
                'room_number' => $roomNumber,
                'status' => 'checked_in',
                'check_in_time' => date('Y-m-d H:i:s'),
                'guest_name' => "{$booking['first_name']} {$booking['last_name']}"
            ]
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        error_log("Check-in failed: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Check-in failed: ' . $e->getMessage()
        ]);
    }
}

function handleCheckOut($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $bookingId = $input['booking_id'] ?? null;
    $roomNumber = $input['room_number'] ?? null;
    
    error_log("Check-out request received: " . json_encode($input));
    
    if (!$bookingId || !$roomNumber) {
        echo json_encode(['success' => false, 'message' => 'Booking ID and room number are required']);
        return;
    }
    
    try {
        $conn->beginTransaction();
        
        // Verify booking exists and is checked in
        $stmt = $conn->prepare("
            SELECT b.*, g.first_name, g.last_name, r.status as room_status
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            LEFT JOIN rooms r ON b.room_number = r.room_number
            WHERE b.id = ? AND b.room_number = ?
        ");
        $stmt->execute([$bookingId, $roomNumber]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$booking) {
            throw new Exception('Booking not found');
        }
        
        if ($booking['status'] !== 'checked_in') {
            throw new Exception('Only checked-in guests can be checked out');
        }
        
        // Check if room is occupied
        if ($booking['room_status'] !== 'occupied') {
            throw new Exception('Room is not occupied');
        }
        
        // Update booking status to checked_out
        $stmt = $conn->prepare("
            UPDATE bookings 
            SET status = 'checked_out'
            WHERE id = ?
        ");
        $stmt->execute([$bookingId]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Failed to update booking status');
        }
        
        // Update room status to available
        $stmt = $conn->prepare("
            UPDATE rooms 
            SET status = 'available'
            WHERE room_number = ?
        ");
        $stmt->execute([$roomNumber]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Failed to update room status');
        }
        
        // Log the activity
        $stmt = $conn->prepare("
            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
            VALUES (?, 'check_out', 'bookings', ?, ?, ?, NOW())
        ");
        $stmt->execute([
            1, // Default user ID
            $bookingId,
            "Guest {$booking['first_name']} {$booking['last_name']} checked out from room {$roomNumber}",
            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        
        $conn->commit();
        
        error_log("Check-out successful for booking ID: {$bookingId}, room: {$roomNumber}");
        
        echo json_encode([
            'success' => true,
            'message' => "Guest {$booking['first_name']} {$booking['last_name']} successfully checked out from room {$roomNumber}",
            'data' => [
                'booking_id' => $bookingId,
                'room_number' => $roomNumber,
                'status' => 'checked_out',
                'guest_name' => "{$booking['first_name']} {$booking['last_name']}"
            ]
        ]);
        
    } catch (Exception $e) {
        $conn->rollBack();
        error_log("Check-out failed: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Check-out failed: ' . $e->getMessage()
        ]);
    }
}

function getBookingStatus($conn) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $bookingId = $input['booking_id'] ?? null;
    
    if (!$bookingId) {
        echo json_encode(['success' => false, 'message' => 'Booking ID is required']);
        return;
    }
    
    try {
        $stmt = $conn->prepare("
            SELECT b.status, b.room_number, b.total_amount, b.paid_amount, b.remaining_amount, 
                   b.check_in_date, b.check_out_date, b.adults, b.children,
                   g.first_name, g.last_name, g.phone, g.email
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            WHERE b.id = ?
        ");
        $stmt->execute([$bookingId]);
        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$booking) {
            echo json_encode(['success' => false, 'message' => 'Booking not found']);
            return;
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'booking_id' => $bookingId,
                'status' => $booking['status'],
                'room_number' => $booking['room_number'],
                'total_amount' => floatval($booking['total_amount']),
                'paid_amount' => floatval($booking['paid_amount']),
                'remaining_amount' => floatval($booking['remaining_amount']),
                'check_in_date' => $booking['check_in_date'],
                'check_out_date' => $booking['check_out_date'],
                'adults' => intval($booking['adults']),
                'children' => intval($booking['children']),
                'first_name' => $booking['first_name'],
                'last_name' => $booking['last_name'],
                'phone' => $booking['phone'],
                'email' => $booking['email'],
                'guest_name' => "{$booking['first_name']} {$booking['last_name']}"
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Get booking status failed: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Failed to get booking status: ' . $e->getMessage()
        ]);
    }
}
?>
