<?php
// Setup test data for check-in functionality
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
    
    $setup = [];
    
    // Check if we have the required tables
    $tables = ['guests', 'bookings', 'rooms', 'room_types'];
    foreach ($tables as $table) {
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        $exists = $stmt->rowCount() > 0;
        $setup['tables'][$table] = $exists;
        
        if (!$exists) {
            echo json_encode([
                'success' => false,
                'message' => "Required table '$table' does not exist. Please create the database schema first."
            ]);
            exit();
        }
    }
    
    // Check if we have any data
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM guests");
    $stmt->execute();
    $guestCount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM rooms");
    $stmt->execute();
    $roomCount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM bookings");
    $stmt->execute();
    $bookingCount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $setup['current_data'] = [
        'guests' => $guestCount['count'],
        'rooms' => $roomCount['count'],
        'bookings' => $bookingCount['count']
    ];
    
    // If no data exists, create some test data
    if ($guestCount['count'] == 0 || $roomCount['count'] == 0 || $bookingCount['count'] == 0) {
        $setup['creating_test_data'] = 'Creating test data...';
        
        // Create a room type if it doesn't exist
        $stmt = $conn->prepare("SELECT COUNT(*) as count FROM room_types");
        $stmt->execute();
        $roomTypeCount = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($roomTypeCount['count'] == 0) {
            $stmt = $conn->prepare("INSERT INTO room_types (name, description, base_price) VALUES (?, ?, ?)");
            $stmt->execute(['Executive', 'Premium executive room with luxury features', 3500.00]);
            $setup['room_type_created'] = 'Executive room type created';
        }
        
        // Create a test room
        if ($roomCount['count'] == 0) {
            $stmt = $conn->prepare("INSERT INTO rooms (room_number, room_type_id, status, floor) VALUES (?, ?, ?, ?)");
            $stmt->execute(['101', 1, 'available', 1]);
            $setup['room_created'] = 'Room 101 created with status: available';
        }
        
        // Create a test guest
        if ($guestCount['count'] == 0) {
            $stmt = $conn->prepare("INSERT INTO guests (first_name, last_name, email, phone, address, id_proof_number) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute(['John', 'Doe', 'john.doe@test.com', '1234567890', '123 Test St', 'TEST123']);
            $setup['guest_created'] = 'Test guest John Doe created';
        }
        
        // Create a test booking
        if ($bookingCount['count'] == 0) {
            $stmt = $conn->prepare("INSERT INTO bookings (guest_id, room_number, check_in_date, check_out_date, adults, children, total_amount, status, booking_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([1, '101', '2024-01-15', '2024-01-17', 2, 0, 200.00, 'confirmed', 'TEST001']);
            $setup['booking_created'] = 'Test booking created with status: confirmed';
            
            // Update room status to booked
            $stmt = $conn->prepare("UPDATE rooms SET status = 'booked' WHERE room_number = ?");
            $stmt->execute(['101']);
            $setup['room_status_updated'] = 'Room 101 status updated to: booked';
        }
        
        $setup['test_data_created'] = 'Test data setup completed';
    } else {
        $setup['test_data_created'] = 'Test data already exists';
    }
    
    // Verify the test data
    $stmt = $conn->prepare("
        SELECT b.id, b.room_number, b.status, g.first_name, g.last_name, r.status as room_status
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        LEFT JOIN rooms r ON b.room_number = r.room_number
        WHERE b.status = 'confirmed'
        LIMIT 1
    ");
    $stmt->execute();
    $testBooking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($testBooking) {
        $setup['test_booking_ready'] = [
            'booking_id' => $testBooking['id'],
            'room_number' => $testBooking['room_number'],
            'guest_name' => $testBooking['first_name'] . ' ' . $testBooking['last_name'],
            'booking_status' => $testBooking['status'],
            'room_status' => $testBooking['room_status']
        ];
    } else {
        $setup['test_booking_ready'] = 'No confirmed bookings found for testing';
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Test data setup completed',
        'setup' => $setup,
        'timestamp' => date('Y-m-d H:i:s'),
        'next_steps' => [
            '1. Run debug_checkin.php to verify setup',
            '2. Run test_actual_checkin.php to test check-in',
            '3. Check if the frontend can now perform check-in'
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Setup failed: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}
?>

