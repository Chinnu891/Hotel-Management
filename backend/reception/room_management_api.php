<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

require_once '../config/database.php';
require_once '../utils/jwt_helper.php';
require_once '../utils/logger.php';

class RoomManagementAPI {
    private $conn;
    private $logger;
    
    public function __construct($db) {
        $this->conn = $db;
        $this->logger = new Logger($db);
    }
    
    // Get all rooms with their details
    public function getAllRooms($checkInDate = null, $checkOutDate = null) {
        try {
            // Build availability check based on whether dates are provided
            $availabilityCheck = "";
            $availabilityText = "";
            
            if ($checkInDate && $checkOutDate) {
                // Check availability for specific dates - prioritize date conflicts over room status
                // Now includes time-based logic for same-day check-in/checkout
                $availabilityCheck = "
                    CASE 
                        WHEN r.status = 'maintenance' THEN 'maintenance'
                        WHEN r.status = 'cleaning' THEN 'cleaning'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status IN ('confirmed', 'checked_in')
                            AND (
                                -- Standard date overlap (different days)
                                (b.check_in_date < :checkOutDate AND b.check_out_date > :checkInDate AND b.check_out_date != :checkInDate)
                                -- Same day check-in and checkout - check times
                                OR (b.check_out_date = :checkInDate AND (
                                    b.check_out_time IS NULL 
                                    OR b.check_out_time >= '11:00:00'
                                ))
                                -- Check-in on checkout date but different days
                                OR (b.check_in_date = :checkOutDate AND :checkInDate != :checkOutDate)
                                -- Full date range overlap
                                OR (b.check_in_date <= :checkInDate AND b.check_out_date >= :checkOutDate AND :checkInDate != :checkOutDate)
                            )
                        ) THEN 'occupied'
                        WHEN r.status = 'available' THEN 'available'
                        ELSE 'available'
                    END as availability_status";
                    
                $availabilityText = "
                    CASE 
                        WHEN r.status = 'maintenance' THEN 'Maintenance'
                        WHEN r.status = 'cleaning' THEN 'Cleaning'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status IN ('confirmed', 'checked_in')
                            AND (
                                -- Standard date overlap (different days)
                                (b.check_in_date < :checkOutDate AND b.check_out_date > :checkInDate AND b.check_out_date != :checkInDate)
                                -- Same day check-in and checkout - check times
                                OR (b.check_out_date = :checkInDate AND (
                                    b.check_out_time IS NULL 
                                    OR b.check_out_time >= '11:00:00'
                                ))
                                -- Check-in on checkout date but different days
                                OR (b.check_in_date = :checkOutDate AND :checkInDate != :checkOutDate)
                                -- Full date range overlap
                                OR (b.check_in_date <= :checkInDate AND b.check_out_date >= :checkOutDate AND :checkInDate != :checkOutDate)
                            )
                        ) THEN 'Occupied'
                        WHEN r.status = 'available' THEN 'Available'
                        ELSE 'Available'
                    END as availability_text";
            } else {
                // Check availability for current date (default behavior)
                $availabilityCheck = "
                    CASE 
                        WHEN r.status = 'maintenance' THEN 'maintenance'
                        WHEN r.status = 'cleaning' THEN 'cleaning'
                        WHEN r.status = 'occupied' THEN 'occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'checked_in'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'confirmed'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'booked'
                        WHEN r.status = 'available' AND NOT EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status IN ('confirmed', 'checked_in')
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'available'
                        ELSE 'available'
                    END as availability_status";
                    
                $availabilityText = "
                    CASE 
                        WHEN r.status = 'maintenance' THEN 'Maintenance'
                        WHEN r.status = 'cleaning' THEN 'Cleaning'
                        WHEN r.status = 'occupied' THEN 'Occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'checked_in'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'Occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'confirmed'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'Booked'
                        WHEN r.status = 'available' AND NOT EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status IN ('confirmed', 'checked_in')
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'Available'
                        ELSE 'Available'
                    END as availability_text";
            }
            
            // Build the booking info subquery based on whether dates are provided
            $bookingInfoSubquery = "";
            if ($checkInDate && $checkOutDate) {
                $bookingInfoSubquery = "
                    LEFT JOIN (
                        SELECT 
                            b.room_number,
                            b.check_out_date,
                            b.check_out_time,
                            CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                            ROW_NUMBER() OVER (PARTITION BY b.room_number ORDER BY b.check_out_date DESC) as rn
                        FROM bookings b
                        JOIN guests g ON b.guest_id = g.id
                        WHERE b.status IN ('confirmed', 'checked_in')
                        AND (
                            -- Standard date overlap (different days)
                            (b.check_in_date < :checkOutDate AND b.check_out_date > :checkInDate AND b.check_out_date != :checkInDate)
                            -- Same day check-in and checkout - check times
                            OR (b.check_out_date = :checkInDate AND (
                                b.check_out_time IS NULL 
                                OR b.check_out_time >= '11:00:00'
                            ))
                            -- Check-in on checkout date but different days
                            OR (b.check_in_date = :checkOutDate AND :checkInDate != :checkOutDate)
                            -- Full date range overlap
                            OR (b.check_in_date <= :checkInDate AND b.check_out_date >= :checkOutDate AND :checkInDate != :checkOutDate)
                        )
                    ) b ON r.room_number = b.room_number AND b.rn = 1";
            } else {
                $bookingInfoSubquery = "
                    LEFT JOIN (
                        SELECT 
                            b.room_number,
                            b.check_out_date,
                            b.check_out_time,
                            CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                            ROW_NUMBER() OVER (PARTITION BY b.room_number ORDER BY b.check_out_date DESC) as rn
                        FROM bookings b
                        JOIN guests g ON b.guest_id = g.id
                        WHERE b.status IN ('confirmed', 'checked_in')
                        AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                    ) b ON r.room_number = b.room_number AND b.rn = 1";
            }
            
            $sql = "
                SELECT 
                    r.room_number,
                    r.floor,
                    r.status as room_status,
                    r.created_at,
                    r.price as custom_price,
                    rt.name as room_type,
                    rt.base_price,
                    rt.capacity,
                    rt.description,
                    $availabilityCheck,
                    $availabilityText,
                    b.check_out_date as booking_check_out_date,
                    b.check_out_time as booking_check_out_time,
                    b.guest_name as booking_guest_name
                FROM rooms r
                JOIN room_types rt ON r.room_type_id = rt.id
                $bookingInfoSubquery
                ORDER BY r.room_number ASC
            ";
            
            $stmt = $this->conn->prepare($sql);
            
            // Bind date parameters if provided
            if ($checkInDate && $checkOutDate) {
                $stmt->bindParam(':checkInDate', $checkInDate);
                $stmt->bindParam(':checkOutDate', $checkOutDate);
            }
            
            $stmt->execute();
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate actual price for each room
            foreach ($rooms as &$room) {
                // Use custom room price if available, otherwise use room type base price
                $room['actual_price'] = ($room['custom_price'] > 0) ? $room['custom_price'] : $room['base_price'];
                $room['has_custom_price'] = ($room['custom_price'] > 0 && $room['custom_price'] != $room['base_price']);
                
                // Set the effective status for booking purposes
                $room['status'] = $room['availability_status'];
                $room['is_bookable'] = ($room['availability_status'] === 'available');
            }
            
            return [
                'success' => true,
                'data' => $rooms,
                'message' => 'All rooms retrieved successfully'
            ];
            
        } catch (Exception $e) {
            $this->logger->log('ERROR', 'getAllRooms: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error retrieving rooms: ' . $e->getMessage()
            ];
        }
    }
    
    // Get rooms by type
    public function getRoomsByType($roomType) {
        try {
            $sql = "
                SELECT 
                    r.room_number,
                    r.floor,
                    r.status as room_status,
                    r.created_at,
                    rt.name as room_type,
                    rt.base_price,
                    rt.capacity,
                    rt.description,
                    CASE 
                        WHEN r.status = 'maintenance' THEN 'maintenance'
                        WHEN r.status = 'cleaning' THEN 'cleaning'
                        WHEN r.status = 'occupied' THEN 'occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'checked_in'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'confirmed'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'booked'
                        WHEN r.status = 'available' AND NOT EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status IN ('confirmed', 'checked_in')
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'available'
                        ELSE 'available'
                    END as availability_status,
                    CASE 
                        WHEN r.status = 'maintenance' THEN 'Maintenance'
                        WHEN r.status = 'cleaning' THEN 'Cleaning'
                        WHEN r.status = 'occupied' THEN 'Occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'checked_in'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'Occupied'
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'confirmed'
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'Booked'
                        WHEN r.status = 'available' AND NOT EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status IN ('confirmed', 'checked_in')
                            AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ) THEN 'Available'
                        ELSE 'Available'
                    END as availability_text
                FROM rooms r
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE rt.name = :room_type
                ORDER BY r.room_number ASC
            ";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':room_type', $roomType);
            $stmt->execute();
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate actual price for each room
            foreach ($rooms as &$room) {
                // Use custom room price if available, otherwise use room type base price
                $room['actual_price'] = ($room['custom_price'] > 0) ? $room['custom_price'] : $room['base_price'];
                $room['has_custom_price'] = ($room['custom_price'] > 0 && $room['custom_price'] != $room['base_price']);
                
                // Set the effective status for booking purposes
                $room['status'] = $room['availability_status'];
                $room['is_bookable'] = ($room['availability_status'] === 'available');
            }
            
            return [
                'success' => true,
                'data' => $rooms,
                'message' => 'Rooms by type retrieved successfully'
            ];
            
        } catch (Exception $e) {
            $this->logger->log('ERROR', 'getRoomsByType: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error retrieving rooms by type: ' . $e->getMessage()
            ];
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $roomAPI = new RoomManagementAPI($db);
        
        $action = $_GET['action'] ?? 'get_all_rooms';
        
        switch ($action) {
            case 'get_all_rooms':
                $checkInDate = $_GET['check_in_date'] ?? null;
                $checkOutDate = $_GET['check_out_date'] ?? null;
                $result = $roomAPI->getAllRooms($checkInDate, $checkOutDate);
                break;
                
            case 'get_by_type':
                $roomType = $_GET['room_type'] ?? '';
                if (empty($roomType)) {
                    $result = ['success' => false, 'message' => 'Room type parameter is required'];
                } else {
                    $result = $roomAPI->getRoomsByType($roomType);
                }
                break;
                
            default:
                $result = ['success' => false, 'message' => 'Invalid action'];
                break;
        }
        
        http_response_code($result['success'] ? 200 : 400);
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Internal server error: ' . $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
