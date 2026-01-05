<?php
// Include CORS headers at the very top
require_once __DIR__ . '/../utils/cors_headers.php';

header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class CheckAvailability {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function check($check_in_date, $check_out_date, $guests = 1, $room_type_id = null, $exclude_prebooked = false) {
        try {
            // Validate dates
            if (!$this->validateDates($check_in_date, $check_out_date)) {
                return $this->response->error("Invalid dates provided", 400);
            }

            // Get available rooms
            $available_rooms = $this->getAvailableRooms($check_in_date, $check_out_date, $guests, $room_type_id, $exclude_prebooked);
            
            // Calculate pricing for each room
            $rooms_with_pricing = $this->calculatePricingForRooms($available_rooms, $check_in_date, $check_out_date, $guests);

            return $this->response->success([
                'check_in_date' => $check_in_date,
                'check_out_date' => $check_out_date,
                'nights' => $this->calculateNights($check_in_date, $check_out_date),
                'available_rooms' => $rooms_with_pricing,
                'total_rooms' => count($rooms_with_pricing)
            ]);

        } catch (Exception $e) {
            error_log("Check availability error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    private function validateDates($check_in, $check_out) {
        try {
            $check_in_date = new DateTime($check_in);
            $check_out_date = new DateTime($check_out);
            
            // Reset time to start of day for fair comparison
            $check_in_date->setTime(0, 0, 0);
            $check_out_date->setTime(0, 0, 0);

            // Check if dates are valid
            if ($check_out_date <= $check_in_date) {
                return false;
            }

            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    private function getAvailableRooms($check_in, $check_out, $guests = 1, $room_type_id = null, $exclude_prebooked = false) {
        $where_clause = "";
        $params = [];
        $prebooked_condition = "";

        if ($room_type_id) {
            $where_clause = "AND rt.id = :room_type_id";
            $params[':room_type_id'] = $room_type_id;
        }

        if ($exclude_prebooked) {
            $prebooked_condition = "AND r.room_number NOT IN (
                SELECT DISTINCT room_number FROM bookings 
                WHERE status = 'confirmed' 
                AND check_in_date > CURDATE()
            )";
        }

        $query = "SELECT 
                    r.id, r.room_number, r.floor, r.price, r.status as room_status,
                    rt.id as room_type_id, rt.name as room_type_name, 
                    rt.description, rt.base_price, rt.custom_price, rt.capacity,
                    'available' as availability_status
                  FROM rooms r
                  JOIN room_types rt ON r.room_type_id = rt.id
                  WHERE r.status = 'available'
                  AND rt.capacity >= :guests
                  $where_clause
                  $prebooked_condition
                  AND r.room_number NOT IN (
                      SELECT DISTINCT room_number FROM bookings 
                      WHERE status IN ('confirmed', 'checked_in', 'checked_out')
                      AND (
                            (check_in_date <= :check_in AND check_out_date > :check_in) OR
                            (check_in_date < :check_out AND check_out_date >= :check_out) OR
                            (check_in_date >= :check_in AND check_out_date <= :check_out AND :check_in != :check_out) -- Overlapping dates but not same-day
                        )
                  )
                  ORDER BY r.price ASC, rt.base_price ASC, r.room_number ASC";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':guests', $guests);
        $stmt->bindParam(':check_in', $check_in);
        $stmt->bindParam(':check_out', $check_out);
        
        foreach ($params as $key => $value) {
            $stmt->bindParam($key, $value);
        }

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function calculatePricingForRooms($rooms, $check_in, $check_out, $guests) {
        $nights = $this->calculateNights($check_in, $check_out);
        
        foreach ($rooms as &$room) {
            // Priority: 1. Room type custom price, 2. Room custom price, 3. Room type base price
            $base_price_per_night = $room['base_price']; // Default to base price
            
            if ($room['custom_price'] > 0) {
                // Use room type custom price if set
                $base_price_per_night = $room['custom_price'];
                error_log("Room {$room['room_number']}: Using room type custom price = {$room['custom_price']}");
            } elseif ($room['price'] > 0) {
                // Use room custom price if room type custom price not set
                $base_price_per_night = $room['price'];
                error_log("Room {$room['room_number']}: Using room custom price = {$room['price']}");
            } else {
                // Use base price if no custom prices set
                $base_price_per_night = $room['base_price'];
                error_log("Room {$room['room_number']}: Using base price = {$room['base_price']}");
            }
            
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
                'room_type_custom_price' => $room['custom_price'] > 0 ? $room['custom_price'] : null,
                'room_custom_price' => $room['price'] > 0 ? $room['price'] : null,
                'price_source' => $room['custom_price'] > 0 ? 'room_type_custom' : ($room['price'] > 0 ? 'room_custom' : 'base')
            ];

            // Format amenities for display
            $room['amenities_list'] = [];
        }

        return $rooms;
    }

    private function calculateNights($check_in, $check_out) {
        $check_in_date = new DateTime($check_in);
        $check_out_date = new DateTime($check_out);
        return $check_in_date->diff($check_out_date)->days;
    }

    public function getRoomTypes() {
        try {
            $query = "SELECT rt.id, rt.name, rt.description, rt.base_price, rt.capacity,
                             MIN(COALESCE(NULLIF(r.price, 0), rt.base_price)) as min_price,
                             MAX(COALESCE(NULLIF(r.price, 0), rt.base_price)) as max_price,
                             COUNT(r.room_number) as room_count
                      FROM room_types rt
                      LEFT JOIN rooms r ON rt.id = r.room_type_id
                      GROUP BY rt.id, rt.name, rt.description, rt.base_price, rt.capacity
                      ORDER BY rt.base_price ASC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            $room_types = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($room_types as &$type) {
                $type['amenities_list'] = [];
                // Show price range if there are custom prices, otherwise just base price
                if ($type['min_price'] != $type['max_price']) {
                    $type['price_display'] = "₹{$type['min_price']} - ₹{$type['max_price']}/night";
                } else {
                    $type['price_display'] = "₹{$type['base_price']}/night";
                }
            }

            return $this->response->success($room_types);

        } catch (Exception $e) {
            error_log("Get room types error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $database = new Database();
    $db = $database->getConnection();
    
    $check_availability = new CheckAvailability($db);
    
    // Get query parameters
    $check_in = $_GET['check_in'] ?? null;
    $check_out = $_GET['check_out'] ?? null;
    $guests = $_GET['guests'] ?? 1;
    $room_type_id = $_GET['room_type_id'] ?? null;
    $exclude_prebooked = isset($_GET['exclude_prebooked']) ? filter_var($_GET['exclude_prebooked'], FILTER_VALIDATE_BOOLEAN) : false;
    $action = $_GET['action'] ?? 'check';

    if ($action === 'room_types') {
        $result = $check_availability->getRoomTypes();
    } elseif ($check_in && $check_out) {
        $result = $check_availability->check($check_in, $check_out, $guests, $room_type_id, $exclude_prebooked);
    } else {
        $result = $check_availability->response->error("Missing required parameters: check_in and check_out", 400);
    }
    
    http_response_code($result['status']);
    echo json_encode($result);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>

