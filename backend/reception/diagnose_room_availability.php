<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/response.php';

header('Content-Type: application/json');

class RoomAvailabilityDiagnostic {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function diagnoseRoom($roomNumber) {
        try {
            $issues = [];
            $fixes = [];

            // Check 1: Room exists
            $roomSql = "SELECT r.*, rt.name as room_type_name 
                       FROM rooms r 
                       LEFT JOIN room_types rt ON r.room_type_id = rt.id 
                       WHERE r.room_number = :roomNumber";
            
            $stmt = $this->conn->prepare($roomSql);
            $stmt->bindParam(':roomNumber', $roomNumber);
            $stmt->execute();
            $room = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$room) {
                $issues[] = "Room $roomNumber does not exist in the database";
                return $this->response->error("Room $roomNumber not found", 404);
            }

            // Check 2: Room type association
            if (!$room['room_type_id'] || !$room['room_type_name']) {
                $issues[] = "Room $roomNumber has no associated room type";
                $fixes[] = "Assign a room type to this room";
            }

            // Check 3: Room status validity
            $validStatuses = ['available', 'occupied', 'cleaning', 'maintenance'];
            if (!in_array($room['status'], $validStatuses)) {
                $issues[] = "Room $roomNumber has invalid status: {$room['status']}";
                $fixes[] = "Update room status to one of: " . implode(', ', $validStatuses);
            }

            // Check 4: Conflicting bookings
            $conflictSql = "SELECT id, check_in_date, check_out_date, status, guest_id
                           FROM bookings 
                           WHERE room_number = :roomNumber 
                           AND status IN ('confirmed', 'checked_in')
                           ORDER BY check_in_date ASC";
            
            $stmt = $this->conn->prepare($conflictSql);
            $stmt->bindParam(':roomNumber', $roomNumber);
            $stmt->execute();
            $conflictingBookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($conflictingBookings)) {
                $issues[] = "Found " . count($conflictingBookings) . " conflicting bookings";
                
                foreach ($conflictingBookings as $booking) {
                    $issues[] = "  - Booking #{$booking['id']}: {$booking['status']} from {$booking['check_in_date']} to {$booking['check_out_date']}";
                }
            }

            // Check 5: Orphaned bookings
            $orphanedSql = "SELECT COUNT(*) as count FROM bookings b 
                           WHERE b.room_number = :roomNumber 
                           AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.room_number = b.room_number)";
            
            $stmt = $this->conn->prepare($orphanedSql);
            $stmt->bindParam(':roomNumber', $roomNumber);
            $stmt->execute();
            $orphanedCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            if ($orphanedCount > 0) {
                $issues[] = "Found $orphanedCount orphaned bookings for room $roomNumber";
                $fixes[] = "Clean up orphaned bookings or restore the room record";
            }

            // Check 6: Room availability for specific dates
            if (isset($_GET['check_in']) && isset($_GET['check_out'])) {
                $checkIn = $_GET['check_in'];
                $checkOut = $_GET['check_out'];
                
                $availabilitySql = "SELECT COUNT(*) as count FROM bookings b 
                                  WHERE b.room_number = :roomNumber
                                  AND b.status IN ('confirmed', 'checked_in')
                                  AND (
                                      (b.check_in_date < :checkOut AND b.check_out_date > :checkIn)
                                  )";
                
                $stmt = $this->conn->prepare($availabilitySql);
                $stmt->bindParam(':roomNumber', $roomNumber);
                $stmt->bindParam(':checkIn', $checkIn);
                $stmt->bindParam(':checkOut', $checkOut);
                $stmt->execute();
                $conflictCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

                if ($conflictCount > 0) {
                    $issues[] = "Room $roomNumber has $conflictCount conflicting bookings for dates $checkIn to $checkOut";
                } else {
                    $issues[] = "Room $roomNumber is available for dates $checkIn to $checkOut";
                }
            }

            // Generate summary
            $summary = [
                'room_number' => $roomNumber,
                'room_info' => $room,
                'total_issues' => count($issues),
                'issues' => $issues,
                'fixes' => $fixes,
                'conflicting_bookings' => $conflictingBookings,
                'is_available' => empty($issues) || (count($issues) === 1 && strpos($issues[0], 'is available') !== false)
            ];

            if (empty($issues)) {
                return $this->response->success($summary, "Room $roomNumber is healthy and available");
            } else {
                return $this->response->error($summary, "Room $roomNumber has " . count($issues) . " issues that need attention");
            }

        } catch (Exception $e) {
            error_log("Room availability diagnostic error: " . $e->getMessage());
            return $this->response->error("Diagnostic failed: " . $e->getMessage(), 500);
        }
    }

    public function diagnoseAllRooms() {
        try {
            $sql = "SELECT r.room_number, r.status, rt.name as room_type_name,
                           (SELECT COUNT(*) FROM bookings b WHERE b.room_number = r.room_number AND b.status IN ('confirmed', 'checked_in')) as active_bookings
                    FROM rooms r 
                    LEFT JOIN room_types rt ON r.room_type_id = rt.id 
                    ORDER BY r.room_number";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $summary = [
                'total_rooms' => count($rooms),
                'available_rooms' => 0,
                'occupied_rooms' => 0,
                'cleaning_rooms' => 0,
                'maintenance_rooms' => 0,
                'rooms_with_issues' => 0,
                'room_details' => []
            ];

            foreach ($rooms as $room) {
                $roomStatus = $room['status'] ?? 'unknown';
                $summary[$roomStatus . '_rooms']++;
                
                if ($roomStatus === 'available') {
                    $summary['available_rooms']++;
                }

                $room['has_issues'] = false;
                if (!$room['room_type_name']) {
                    $room['has_issues'] = true;
                    $summary['rooms_with_issues']++;
                }

                $summary['room_details'][] = $room;
            }

            return $this->response->success($summary, "Diagnostic completed for all rooms");

        } catch (Exception $e) {
            error_log("All rooms diagnostic error: " . $e->getMessage());
            return $this->response->error("Diagnostic failed: " . $e->getMessage(), 500);
        }
    }
}

// Handle the request
try {
    $database = new Database();
    $db = $database->getConnection();
    
    $diagnostic = new RoomAvailabilityDiagnostic($db);
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (isset($_GET['room_number'])) {
            $result = $diagnostic->diagnoseRoom($_GET['room_number']);
        } else {
            $result = $diagnostic->diagnoseAllRooms();
        }
    } else {
        $result = $diagnostic->response->error('Method not allowed', 405);
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log("Diagnostic script error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Diagnostic failed: ' . $e->getMessage()]);
}
?>
