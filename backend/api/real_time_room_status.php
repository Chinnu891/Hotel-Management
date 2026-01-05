<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response.php';

class RealTimeRoomStatus {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    // Get real-time room availability for a specific date range
    public function getRealTimeAvailability($check_in_date, $check_out_date, $guests = 1, $room_type_id = null) {
        try {
            // Validate dates
            if (!$this->validateDates($check_in_date, $check_out_date)) {
                return $this->response->error("Invalid dates provided", 400);
            }

            // Get all rooms with their current real-time status
            $rooms = $this->getAllRoomsWithStatus($check_in_date, $check_out_date, $guests, $room_type_id);
            
            // Calculate pricing for each room
            $rooms_with_pricing = $this->calculatePricingForRooms($rooms, $check_in_date, $check_out_date, $guests);

            return $this->response->success([
                'check_in_date' => $check_in_date,
                'check_out_date' => $check_out_date,
                'nights' => $this->calculateNights($check_in_date, $check_out_date),
                'rooms' => $rooms_with_pricing,
                'total_rooms' => count($rooms_with_pricing),
                'last_updated' => date('Y-m-d H:i:s'),
                'cache_key' => $this->generateCacheKey($check_in_date, $check_out_date, $guests, $room_type_id)
            ]);

        } catch (Exception $e) {
            error_log("Real-time room status error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    // Get all rooms with their real-time availability status
    private function getAllRoomsWithStatus($check_in_date, $check_out_date, $guests, $room_type_id) {
        $where_clause = "";
        $params = [];

        if ($room_type_id) {
            $where_clause = "AND rt.id = :room_type_id";
            $params[':room_type_id'] = $room_type_id;
        }

        // Get all rooms with their current status and check if they're available for the given dates
        $query = "SELECT DISTINCT 
                        r.room_number, 
                        r.floor, 
                        r.status as current_status,
                        rt.id as room_type_id, 
                        rt.name as room_type_name, 
                        rt.description, 
                        rt.base_price, 
                        rt.capacity,
                        r.price as custom_price,
                        CASE 
                            WHEN r.status = 'maintenance' THEN 'maintenance'
                            WHEN r.status = 'cleaning' THEN 'cleaning'
                            WHEN r.status = 'occupied' THEN 'occupied'
                            -- For future dates: show pre-booked if room is reserved
                            ELSE
                                CASE 
                                    WHEN EXISTS (
                                        SELECT 1 FROM bookings b 
                                        WHERE b.room_number = r.room_number 
                                        AND b.status IN ('confirmed', 'checked_in')
                                        AND (
                                            -- Check if the requested date falls within any existing booking period
                                            :check_in BETWEEN b.check_in_date AND DATE_SUB(b.check_out_date, INTERVAL 1 DAY) OR
                                            -- Check if the requested date range overlaps with any existing booking
                                            (b.check_in_date < :check_out AND b.check_out_date > :check_in)
                                        )
                                    ) THEN 'prebooked'
                                    ELSE 'available'
                                END
                        END as availability_status,
                        CASE 
                            WHEN r.status = 'maintenance' THEN 'Maintenance'
                            WHEN r.status = 'cleaning' THEN 'Cleaning'
                            WHEN r.status = 'occupied' THEN 'Occupied'
                            WHEN r.status = 'available' AND NOT EXISTS (
                                SELECT 1 FROM bookings b 
                                WHERE b.room_number = r.room_number 
                                AND b.status IN ('confirmed', 'checked_in')
                                AND (
                                    (b.check_in_date <= :check_in AND b.check_out_date > :check_in) OR
                                    (b.check_in_date < :check_out AND b.check_out_date >= :check_out) OR
                                    (b.check_in_date >= :check_in AND b.check_out_date <= :check_out)
                                )
                            ) THEN 'Available'
                            WHEN EXISTS (
                                SELECT 1 FROM bookings b 
                                WHERE b.room_number = r.room_number 
                                AND b.status IN ('confirmed', 'checked_in')
                                AND (
                                    :check_in BETWEEN b.check_in_date AND DATE_SUB(b.check_out_date, INTERVAL 1 DAY) OR
                                    (b.check_in_date < :check_out AND b.check_out_date > :check_in)
                                )
                            ) THEN 'Pre-Booked'
                            ELSE 'Booked'
                        END as availability_text
                  FROM rooms r
                  JOIN room_types rt ON r.room_type_id = rt.id
                  WHERE rt.capacity >= :guests
                  $where_clause
                  ORDER BY r.room_number ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':check_in', $check_in_date);
        $stmt->bindParam(':check_out', $check_out_date);
        $stmt->bindParam(':guests', $guests);
        
        foreach ($params as $key => $value) {
            $stmt->bindParam($key, $value);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Get room status changes (for real-time updates)
    public function getRoomStatusChanges($last_check = null) {
        try {
            $where_clause = "";
            $params = [];

            if ($last_check) {
                $where_clause = "WHERE r.updated_at > :last_check";
                $params[':last_check'] = $last_check;
            }

            $query = "SELECT 
                        r.room_number,
                        r.status,
                        r.updated_at,
                        rt.name as room_type_name
                      FROM rooms r
                      JOIN room_types rt ON r.room_type_id = rt.id
                      $where_clause
                      ORDER BY r.updated_at DESC
                      LIMIT 50";

            $stmt = $this->conn->prepare($query);
            
            if ($last_check) {
                $stmt->bindParam(':last_check', $last_check);
            }

            $stmt->execute();
            $changes = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->response->success([
                'changes' => $changes,
                'last_updated' => date('Y-m-d H:i:s'),
                'total_changes' => count($changes)
            ]);

        } catch (Exception $e) {
            error_log("Get room status changes error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    // Get room occupancy summary
    public function getRoomOccupancySummary() {
        try {
            $query = "SELECT 
                        r.status,
                        COUNT(*) as count,
                        rt.name as room_type_name
                      FROM rooms r
                      JOIN room_types rt ON r.room_type_id = rt.id
                      GROUP BY r.status, rt.name
                      ORDER BY rt.name, r.status";

            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate totals
            $total_rooms = 0;
            $available_rooms = 0;
            $occupied_rooms = 0;
            $maintenance_rooms = 0;
            $cleaning_rooms = 0;

            foreach ($summary as $item) {
                $total_rooms += $item['count'];
                switch ($item['status']) {
                    case 'available':
                        $available_rooms += $item['count'];
                        break;
                    case 'occupied':
                        $occupied_rooms += $item['count'];
                        break;
                    case 'maintenance':
                        $maintenance_rooms += $item['count'];
                        break;
                    case 'cleaning':
                        $cleaning_rooms += $item['count'];
                        break;
                }
            }

            return $this->response->success([
                'summary' => $summary,
                'totals' => [
                    'total_rooms' => $total_rooms,
                    'available_rooms' => $available_rooms,
                    'occupied_rooms' => $occupied_rooms,
                    'maintenance_rooms' => $maintenance_rooms,
                    'cleaning_rooms' => $cleaning_rooms
                ],
                'last_updated' => date('Y-m-d H:i:s')
            ]);

        } catch (Exception $e) {
            error_log("Get room occupancy summary error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    private function validateDates($check_in, $check_out) {
        try {
            $check_in_date = new DateTime($check_in);
            $check_out_date = new DateTime($check_out);
            $today = new DateTime();
            
            // Reset time to start of day for fair comparison
            $today->setTime(0, 0, 0, 0);
            $check_in_date->setTime(0, 0, 0, 0);
            $check_out_date->setTime(0, 0, 0, 0);

            // Check if dates are valid
            if ($check_in_date < $today) {
                return false;
            }

            if ($check_out_date <= $check_in_date) {
                return false;
            }

            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    private function calculatePricingForRooms($rooms, $check_in, $check_out, $guests) {
        $nights = $this->calculateNights($check_in, $check_out);
        
        foreach ($rooms as &$room) {
            // Use custom room price if available, otherwise fallback to base price
            $base_price_per_night = ($room['custom_price'] > 0) ? $room['custom_price'] : $room['base_price'];
            
            // Calculate extra guest charges
            $extra_guest_charge = 0;
            if ($guests > $room['capacity']) {
                $extra_guests = $guests - $room['capacity'];
                $extra_guest_charge = $extra_guests * 25; // ₹25 per extra guest per night
            }

            $total_price = ($base_price_per_night + $extra_guest_charge) * $nights;
            $price_per_night = $base_price_per_night + $extra_guest_charge;

            $room['pricing'] = [
                'price_per_night' => $price_per_night,
                'nights' => $nights,
                'extra_guest_charge' => $extra_guest_charge,
                'total_price' => $total_price,
                'base_price_per_night' => $base_price_per_night,
                'custom_price' => $room['custom_price'] > 0 ? $room['custom_price'] : null
            ];

            // Add real-time status indicators
            $room['is_available'] = $room['availability_status'] === 'available';
            $room['status_color'] = $this->getStatusColor($room['availability_status']);
            $room['status_icon'] = $this->getStatusIcon($room['availability_status']);
        }

        return $rooms;
    }

    private function calculateNights($check_in, $check_out) {
        $check_in_date = new DateTime($check_in);
        $check_out_date = new DateTime($check_out);
        return $check_in_date->diff($check_out_date)->days;
    }

    private function getStatusColor($status) {
        switch ($status) {
            case 'available':
                return 'text-green-600';
            case 'booked':
                return 'text-orange-600';
            case 'prebooked':
                return 'text-purple-600';
            case 'occupied':
                return 'text-red-600';
            case 'cleaning':
                return 'text-blue-600';
            case 'maintenance':
                return 'text-gray-600';
            default:
                return 'text-gray-600';
        }
    }

    private function getStatusIcon($status) {
        switch ($status) {
            case 'available':
                return '✓';
            case 'booked':
                return '📅';
            case 'prebooked':
                return '📋';
            case 'occupied':
                return '👤';
            case 'cleaning':
                return '🧹';
            case 'maintenance':
                return '🔧';
            default:
                return '❓';
        }
    }

    private function generateCacheKey($check_in, $check_out, $guests, $room_type_id) {
        return md5("room_availability_{$check_in}_{$check_out}_{$guests}_{$room_type_id}");
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $database = new Database();
    $db = $database->getConnection();
    
    $realTimeRoomStatus = new RealTimeRoomStatus($db);
    
    // Get query parameters
    $action = $_GET['action'] ?? 'availability';
    
    switch ($action) {
        case 'availability':
            $check_in = $_GET['check_in'] ?? null;
            $check_out = $_GET['check_out'] ?? null;
            $guests = $_GET['guests'] ?? 1;
            $room_type_id = $_GET['room_type_id'] ?? null;
            
            if (!$check_in || !$check_out) {
                $result = $realTimeRoomStatus->response->error("Missing required parameters: check_in and check_out", 400);
            } else {
                $result = $realTimeRoomStatus->getRealTimeAvailability($check_in, $check_out, $guests, $room_type_id);
            }
            break;
            
        case 'status_changes':
            $last_check = $_GET['last_check'] ?? null;
            $result = $realTimeRoomStatus->getRoomStatusChanges($last_check);
            break;
            
        case 'occupancy_summary':
            $result = $realTimeRoomStatus->getRoomOccupancySummary();
            break;
            
        default:
            $result = $realTimeRoomStatus->response->error("Invalid action", 400);
    }
    
    http_response_code($result['status']);
    echo json_encode($result);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
