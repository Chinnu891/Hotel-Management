<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Set Content-Type header
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        throw new Exception("Invalid input data");
    }
    
    $room_id = $input['room_id'] ?? null;
    $action = $input['action'] ?? null; // 'book', 'release', 'maintenance', 'available'
    $booking_id = $input['booking_id'] ?? null;
    $status = $input['status'] ?? null;
    
    if (!$room_id || !$action) {
        throw new Exception("Missing required parameters: room_id and action");
    }
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        switch ($action) {
            case 'book':
                // Mark room as occupied when booking is confirmed
                $query = "UPDATE rooms SET status = 'occupied' WHERE id = :room_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':room_id', $room_id);
                $stmt->execute();
                
                // Log the room status change
                $log_query = "INSERT INTO activity_logs (action, table_name, record_id, details, created_at) 
                             VALUES (:action, :table_name, :record_id, :details, NOW())";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->execute([
                    ':action' => 'room_booked',
                    ':table_name' => 'rooms',
                    ':record_id' => $room_id,
                    ':details' => json_encode([
                        'booking_id' => $booking_id,
                        'status' => 'occupied',
                        'timestamp' => date('Y-m-d H:i:s')
                    ])
                ]);
                break;
                
            case 'release':
                // Mark room as available when booking is cancelled or completed
                $query = "UPDATE rooms SET status = 'available' WHERE id = :room_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':room_id', $room_id);
                $stmt->execute();
                
                // Log the room status change
                $log_query = "INSERT INTO activity_logs (action, table_name, record_id, details, created_at) 
                             VALUES (:action, :table_name, :record_id, :details, NOW())";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->execute([
                    ':action' => 'room_released',
                    ':table_name' => 'rooms',
                    ':record_id' => $room_id,
                    ':details' => json_encode([
                        'booking_id' => $booking_id,
                        'status' => 'available',
                        'timestamp' => date('Y-m-d H:i:s')
                    ])
                ]);
                break;
                
            case 'maintenance':
                // Mark room as under maintenance
                $query = "UPDATE rooms SET status = 'maintenance' WHERE id = :room_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':room_id', $room_id);
                $stmt->execute();
                
                // Log the room status change
                $log_query = "INSERT INTO activity_logs (action, table_name, record_id, details, created_at) 
                             VALUES (:action, :table_name, :record_id, :details, NOW())";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->execute([
                    ':action' => 'room_maintenance',
                    ':table_name' => 'rooms',
                    ':record_id' => $room_id,
                    ':details' => json_encode([
                        'status' => 'maintenance',
                        'timestamp' => date('Y-m-d H:i:s')
                    ])
                ]);
                break;
                
            case 'available':
                // Mark room as available
                $query = "UPDATE rooms SET status = 'available' WHERE id = :room_id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':room_id', $room_id);
                $stmt->execute();
                
                // Log the room status change
                $log_query = "INSERT INTO activity_logs (action, table_name, record_id, details, created_at) 
                             VALUES (:action, :table_name, :record_id, :details, NOW())";
                $log_stmt = $db->prepare($log_query);
                $log_stmt->execute([
                    ':action' => 'room_available',
                    ':table_name' => 'rooms',
                    ':record_id' => $room_id,
                    ':details' => json_encode([
                        'status' => 'available',
                        'timestamp' => date('Y-m-d H:i:s')
                    ])
                ]);
                break;
                
            default:
                throw new Exception("Invalid action: " . $action);
        }
        
        // Commit transaction
        $db->commit();
        
        // Get updated room information
        $room_query = "SELECT r.id, r.room_number, r.status, rt.name as room_type_name 
                       FROM rooms r 
                       JOIN room_types rt ON r.room_type_id = rt.id 
                       WHERE r.id = :room_id";
        $room_stmt = $db->prepare($room_query);
        $room_stmt->bindParam(':room_id', $room_id);
        $room_stmt->execute();
        $room = $room_stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode(array(
            "success" => true,
            "message" => "Room availability updated successfully",
            "data" => array(
                "room_id" => $room_id,
                "action" => $action,
                "new_status" => $room['status'],
                "room_number" => $room['room_number'],
                "room_type" => $room['room_type_name']
            )
        ));
        
    } catch (Exception $e) {
        // Rollback transaction on error
        $db->rollBack();
        throw $e;
    }
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "error" => "Database error: " . $e->getMessage(),
        "message" => "There was an issue with the database operation"
    ));
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "error" => "Server error: " . $e->getMessage(),
        "message" => "An unexpected error occurred"
    ));
}
?>
