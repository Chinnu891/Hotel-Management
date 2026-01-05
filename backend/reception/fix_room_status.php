<?php
// Fix room status for testing check-in functionality
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
    
    // Start transaction
    $conn->beginTransaction();
    
    // Fix room 101 status - set it to 'booked' since it has a confirmed booking
    $stmt = $conn->prepare("UPDATE rooms SET status = 'booked' WHERE room_number = '101'");
    $stmt->execute();
    $room101Updated = $stmt->rowCount();
    
    // Fix room 102 status - set it to 'booked' since it has a confirmed booking
    $stmt = $conn->prepare("UPDATE rooms SET status = 'booked' WHERE room_number = '102'");
    $stmt->execute();
    $room102Updated = $stmt->rowCount();
    
    // Commit the changes
    $conn->commit();
    
    // Verify the changes
    $stmt = $conn->prepare("SELECT room_number, status FROM rooms WHERE room_number IN ('101', '102')");
    $stmt->execute();
    $roomStatuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'message' => 'Room status fixed for testing',
        'changes' => [
            'room_101_updated' => $room101Updated > 0,
            'room_102_updated' => $room102Updated > 0
        ],
        'current_room_statuses' => $roomStatuses,
        'timestamp' => date('Y-m-d H:i:s'),
        'next_step' => 'Now you can test check-in functionality'
    ]);
    
} catch (Exception $e) {
    if (isset($conn)) {
        $conn->rollBack();
    }
    echo json_encode([
        'success' => false,
        'message' => 'Failed to fix room status: ' . $e->getMessage(),
        'error' => $e->getMessage()
    ]);
}
?>
