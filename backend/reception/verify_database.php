<?php
// Database verification script for check-in functionality
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
    
    $verification = [];
    
    // Check if required tables exist
    $tables = ['bookings', 'guests', 'rooms', 'room_types', 'activity_logs'];
    foreach ($tables as $table) {
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        $exists = $stmt->rowCount() > 0;
        $verification['tables'][$table] = $exists;
    }
    
    // Check if required columns exist in bookings table
    $bookingColumns = ['id', 'guest_id', 'room_number', 'status', 'check_in_date', 'check_out_date'];
    $stmt = $conn->prepare("DESCRIBE bookings");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $verification['bookings_columns'] = $columns;
    
    // Check if required columns exist in rooms table
    $roomColumns = ['id', 'room_number', 'status', 'room_type_id'];
    $stmt = $conn->prepare("DESCRIBE rooms");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $verification['rooms_columns'] = $columns;
    
    // Check sample data
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM bookings");
    $stmt->execute();
    $bookingCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $verification['sample_data']['bookings_count'] = $bookingCount['count'];
    
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM rooms");
    $stmt->execute();
    $roomCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $verification['sample_data']['rooms_count'] = $roomCount['count'];
    
    // Check for confirmed bookings
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'");
    $stmt->execute();
    $confirmedCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $verification['sample_data']['confirmed_bookings'] = $confirmedCount['count'];
    
    // Check for available rooms
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'");
    $stmt->execute();
    $availableCount = $stmt->fetch(PDO::FETCH_ASSOC);
    $verification['sample_data']['available_rooms'] = $availableCount['count'];
    
    echo json_encode([
        'success' => true,
        'message' => 'Database verification completed',
        'verification' => $verification,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database verification failed: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}
?>

