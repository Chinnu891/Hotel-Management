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
    
    $room_number = $input['room_number'] ?? null;
    $user_id = $input['user_id'] ?? 1;
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        $sync_results = array();
        
        if ($room_number) {
            // Sync specific room
            $sync_results[] = syncSingleRoom($db, $room_number, $user_id);
        } else {
            // Sync all rooms
            $stmt = $db->query("SELECT room_number FROM rooms ORDER BY room_number");
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($rooms as $room) {
                $sync_results[] = syncSingleRoom($db, $room['room_number'], $user_id);
            }
        }
        
        // Commit transaction
        $db->commit();
        
        echo json_encode(array(
            "success" => true,
            "message" => "Room status sync completed successfully",
            "data" => array(
                "rooms_synced" => count($sync_results),
                "sync_results" => $sync_results
            )
        ));
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ));
}

function syncSingleRoom($db, $room_number, $user_id) {
    // Get current room status
    $stmt = $db->prepare("SELECT status FROM rooms WHERE room_number = ?");
    $stmt->execute([$room_number]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$room) {
        return array(
            "room_number" => $room_number,
            "status" => "not_found",
            "message" => "Room not found"
        );
    }
    
    $old_status = $room['status'];
    
    // Check for active bookings with current date logic
    $stmt = $db->prepare("
        SELECT 
            status, 
            COUNT(*) as count,
            check_in_date,
            check_out_date
        FROM bookings 
        WHERE room_number = ? 
        AND status IN ('confirmed', 'checked_in')
        GROUP BY status, check_in_date, check_out_date
    ");
    $stmt->execute([$room_number]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $new_status = 'available';
    $has_confirmed = false;
    $has_checked_in = false;
    $current_date = date('Y-m-d');
    
    foreach ($bookings as $booking) {
        // Check if this booking is for the current date
        $is_current_date_booking = (
            $current_date >= $booking['check_in_date'] && 
            $current_date < $booking['check_out_date']
        );
        
        if ($booking['status'] === 'confirmed' && $is_current_date_booking) {
            $has_confirmed = true;
        }
        if ($booking['status'] === 'checked_in' && $is_current_date_booking) {
            $has_checked_in = true;
        }
    }
    
    // Determine correct status based on current date logic
    if ($has_checked_in) {
        $new_status = 'occupied';
    } elseif ($has_confirmed) {
        $new_status = 'booked';
    } else {
        // Check if there are future bookings (pre-booked status)
        $stmt = $db->prepare("
            SELECT COUNT(*) as count
            FROM bookings 
            WHERE room_number = ? 
            AND status IN ('confirmed', 'checked_in')
            AND check_in_date > CURDATE()
        ");
        $stmt->execute([$room_number]);
        $future_bookings = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($future_bookings['count'] > 0) {
            // Room has future bookings but none for current date
            $new_status = 'available'; // Keep as available for current date
        } else {
            $new_status = 'available';
        }
    }
    
    // Update room status if different
    if ($new_status !== $old_status) {
        $stmt = $db->prepare("
            UPDATE rooms 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE room_number = ?
        ");
        $stmt->execute([$new_status, $room_number]);
        
        // Log the status change
        $stmt = $db->prepare("
            INSERT INTO activity_logs (action, table_name, record_id, details, ip_address) 
            VALUES (?, ?, ?, ?, ?)
        ");
        $details = json_encode([
            'old_status' => $old_status,
            'new_status' => $new_status,
            'reason' => 'auto_sync_current_date',
            'current_date' => $current_date,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
        
        $stmt->execute([
            'room_status_updated',
            'rooms',
            $room_number,
            $details,
            $_SERVER['REMOTE_ADDR'] ?? 'system'
        ]);
        
        return array(
            "room_number" => $room_number,
            "old_status" => $old_status,
            "new_status" => $new_status,
            "message" => "Status updated from {$old_status} to {$new_status}",
            "reason" => "Current date booking logic applied"
        );
    }
    
    return array(
        "room_number" => $room_number,
        "status" => $old_status,
        "message" => "Status unchanged - already correct",
        "reason" => "No update needed"
    );
}
?>
