<?php
/**
 * Daily Room Status Sync Script
 * 
 * This script automatically runs daily to sync room statuses based on current date.
 * It handles the transition from pre-booked to booked when the current date arrives.
 * 
 * Usage: 
 * - Run manually: php daily_room_status_sync.php
 * - Set up as cron job: 0 0 * * * /usr/bin/php /path/to/daily_room_status_sync.php
 */

require_once '../config/database.php';
require_once '../utils/response.php';

class DailyRoomStatusSync {
    private $conn;
    private $response;
    private $sync_results = [];

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    /**
     * Main sync method that processes all rooms
     */
    public function syncAllRooms() {
        try {
            echo "=== DAILY ROOM STATUS SYNC STARTED ===\n";
            echo "Date: " . date('Y-m-d H:i:s') . "\n\n";

            // Get all rooms that need status updates
            $rooms_to_sync = $this->getRoomsNeedingSync();
            
            if (empty($rooms_to_sync)) {
                echo "✅ No rooms need status updates\n";
                return $this->response->success("No rooms need status updates");
            }

            echo "Found " . count($rooms_to_sync) . " rooms to sync\n\n";

            // Process each room
            foreach ($rooms_to_sync as $room) {
                $result = $this->syncSingleRoom($room['room_number']);
                $this->sync_results[] = $result;
                
                if ($result['status'] === 'updated') {
                    echo "✅ Room {$room['room_number']}: {$result['old_status']} → {$result['new_status']}\n";
                } else {
                    echo "ℹ️  Room {$room['room_number']}: {$result['message']}\n";
                }
            }

            // Generate summary
            $summary = $this->generateSyncSummary();
            echo "\n=== SYNC SUMMARY ===\n";
            echo "Total rooms processed: " . count($this->sync_results) . "\n";
            echo "Statuses updated: " . $summary['updated'] . "\n";
            echo "Statuses unchanged: " . $summary['unchanged'] . "\n";
            echo "Sync completed: " . date('Y-m-d H:i:s') . "\n";

            return $this->response->success([
                'message' => 'Daily room status sync completed',
                'summary' => $summary,
                'details' => $this->sync_results
            ]);

        } catch (Exception $e) {
            error_log("Daily room status sync error: " . $e->getMessage());
            return $this->response->error("Daily sync failed: " . $e->getMessage(), 500);
        }
    }

    /**
     * Get rooms that need status updates based on current date
     */
    private function getRoomsNeedingSync() {
        $current_date = date('Y-m-d');
        
        $query = "SELECT DISTINCT 
                    r.room_number,
                    r.status as current_room_status,
                    b.id as booking_id,
                    b.status as booking_status,
                    b.check_in_date,
                    b.check_out_date
                  FROM rooms r
                  LEFT JOIN bookings b ON r.room_number = b.room_number
                  WHERE b.status IN ('confirmed', 'checked_in')
                  AND (
                      -- Rooms with current date bookings that need status update
                      (b.check_in_date <= :current_date AND b.check_out_date > :current_date) OR
                      -- Rooms with future bookings that might affect current status
                      (b.check_in_date > :current_date)
                  )
                  ORDER BY r.room_number";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':current_date', $current_date);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Sync a single room's status based on current date
     */
    private function syncSingleRoom($room_number) {
        try {
            // Get current room status
            $stmt = $this->conn->prepare("SELECT status FROM rooms WHERE room_number = ?");
            $stmt->execute([$room_number]);
            $room = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$room) {
                return [
                    "room_number" => $room_number,
                    "status" => "error",
                    "message" => "Room not found"
                ];
            }
            
            $old_status = $room['status'];
            $current_date = date('Y-m-d');
            
            // Check for current date bookings
            $stmt = $this->conn->prepare("
                SELECT 
                    status, 
                    COUNT(*) as count
                FROM bookings 
                WHERE room_number = ? 
                AND status IN ('confirmed', 'checked_in')
                AND :current_date BETWEEN check_in_date AND DATE_SUB(check_out_date, INTERVAL 1 DAY)
                GROUP BY status
            ");
            $stmt->execute([$room_number, $current_date]);
            $current_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $new_status = 'available';
            $has_confirmed = false;
            $has_checked_in = false;
            
            foreach ($current_bookings as $booking) {
                if ($booking['status'] === 'confirmed') {
                    $has_confirmed = true;
                }
                if ($booking['status'] === 'checked_in') {
                    $has_checked_in = true;
                }
            }
            
            // Determine correct status for current date
            if ($has_checked_in) {
                $new_status = 'occupied';
            } elseif ($has_confirmed) {
                $new_status = 'booked';
            } else {
                // Check if there are future bookings (pre-booked for future dates)
                $stmt = $this->conn->prepare("
                    SELECT COUNT(*) as count
                    FROM bookings 
                    WHERE room_number = ? 
                    AND status IN ('confirmed', 'checked_in')
                    AND check_in_date > :current_date
                ");
                $stmt->execute([$room_number, $current_date]);
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
                $stmt = $this->conn->prepare("
                    UPDATE rooms 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP 
                    WHERE room_number = ?
                ");
                $stmt->execute([$new_status, $room_number]);
                
                // Log the status change
                $this->logStatusChange($room_number, $old_status, $new_status, 'daily_sync');
                
                return [
                    "room_number" => $room_number,
                    "status" => "updated",
                    "old_status" => $old_status,
                    "new_status" => $new_status,
                    "message" => "Status updated from {$old_status} to {$new_status}",
                    "reason" => "Daily sync - current date logic applied"
                ];
            }
            
            return [
                "room_number" => $room_number,
                "status" => "unchanged",
                "old_status" => $old_status,
                "new_status" => $new_status,
                "message" => "Status unchanged - already correct",
                "reason" => "No update needed"
            ];
            
        } catch (Exception $e) {
            error_log("Error syncing room {$room_number}: " . $e->getMessage());
            return [
                "room_number" => $room_number,
                "status" => "error",
                "message" => "Sync failed: " . $e->getMessage()
            ];
        }
    }

    /**
     * Log room status changes
     */
    private function logStatusChange($room_number, $old_status, $new_status, $reason) {
        try {
            $stmt = $this->conn->prepare("
                INSERT INTO activity_logs (action, table_name, record_id, details, ip_address) 
                VALUES (?, ?, ?, ?, ?)
            ");
            
            $details = json_encode([
                'old_status' => $old_status,
                'new_status' => $new_status,
                'reason' => $reason,
                'current_date' => date('Y-m-d'),
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
            $stmt->execute([
                'room_status_updated',
                'rooms',
                $room_number,
                $details,
                'system_daily_sync'
            ]);
            
        } catch (Exception $e) {
            error_log("Failed to log status change for room {$room_number}: " . $e->getMessage());
        }
    }

    /**
     * Generate sync summary
     */
    private function generateSyncSummary() {
        $updated = 0;
        $unchanged = 0;
        $errors = 0;
        
        foreach ($this->sync_results as $result) {
            switch ($result['status']) {
                case 'updated':
                    $updated++;
                    break;
                case 'unchanged':
                    $unchanged++;
                    break;
                case 'error':
                    $errors++;
                    break;
            }
        }
        
        return [
            'updated' => $updated,
            'unchanged' => $unchanged,
            'errors' => $errors,
            'total' => count($this->sync_results)
        ];
    }
}

// Handle command line execution
if (php_sapi_name() === 'cli') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $sync = new DailyRoomStatusSync($db);
        $result = $sync->syncAllRooms();
        
        if ($result['status'] === 'success') {
            exit(0); // Success
        } else {
            exit(1); // Error
        }
        
    } catch (Exception $e) {
        echo "❌ Fatal error: " . $e->getMessage() . "\n";
        exit(1);
    }
}

// Handle web request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $sync = new DailyRoomStatusSync($db);
        $result = $sync->syncAllRooms();
        
        http_response_code($result['status']);
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
