<?php
// Include CORS headers
require_once __DIR__ . '/../utils/cors_headers.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

class AllRoomsWithStatus {
    private $conn;
    
    public function __construct($database) {
        $this->conn = $database->getConnection();
    }
    
    public function getAllRoomsWithStatus($check_in_date = null, $check_out_date = null, $room_type_id = null) {
        try {
            // Get all rooms with their current status and any future bookings
            $query = "
                SELECT 
                    r.room_number,
                    r.floor,
                    r.status as current_status,
                    rt.name as room_type_name,
                    rt.capacity,
                    rt.base_price,
                    COALESCE(r.price, rt.base_price) as actual_price,
                    rt.description,
                    -- Check if room has any bookings for the specified dates
                    CASE 
                        WHEN :check_in_date IS NOT NULL AND :check_out_date IS NOT NULL THEN
                            (SELECT COUNT(*) FROM bookings b 
                             WHERE b.room_number = r.room_number 
                             AND b.status IN ('confirmed', 'checked_in', 'checked_out')
                             AND (
                                  -- Check if the requested date range overlaps with any existing booking
                                  (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) OR
                                  -- Check if the requested check-in date falls within an existing booking period
                                  (:check_in_date BETWEEN b.check_in_date AND b.check_out_date) OR
                                  -- Check if the requested check-out date falls within an existing booking period
                                  (:check_out_date BETWEEN b.check_in_date AND b.check_out_date)
                              ))
                        ELSE 0
                    END as has_conflicts,
                    -- Get the relevant booking for this room (for current search dates or next booking)
                    (SELECT CONCAT(
                        b.check_in_date, ' to ', b.check_out_date, 
                        ' (', g.first_name, ' ', g.last_name, ')'
                    ) FROM bookings b 
                     JOIN guests g ON b.guest_id = g.id
                     WHERE b.room_number = r.room_number 
                     AND b.status IN ('confirmed', 'checked_in')
                     AND (
                        -- If searching for specific dates, get the booking that overlaps with search dates
                        (:check_in_date IS NOT NULL AND :check_out_date IS NOT NULL AND
                         (
                            (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) OR
                            (:check_in_date BETWEEN b.check_in_date AND b.check_out_date) OR
                            (:check_out_date BETWEEN b.check_in_date AND b.check_out_date)
                         )) OR
                        -- If no specific dates, get the next booking
                        (:check_in_date IS NULL AND b.check_in_date >= CURDATE())
                     )
                     ORDER BY 
                        CASE 
                            WHEN :check_in_date IS NOT NULL AND :check_out_date IS NOT NULL THEN
                                -- For specific dates, prioritize bookings that overlap with search dates
                                CASE 
                                    WHEN (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) THEN 0
                                    ELSE 1
                                END
                            ELSE 0
                        END,
                        b.check_in_date ASC
                     LIMIT 1) as next_booking,
                    -- Get the relevant booking date
                    (SELECT b.check_in_date FROM bookings b 
                     WHERE b.room_number = r.room_number 
                     AND b.status IN ('confirmed', 'checked_in')
                     AND (
                        -- If searching for specific dates, get the booking that overlaps with search dates
                        (:check_in_date IS NOT NULL AND :check_out_date IS NOT NULL AND
                         (
                            (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) OR
                            (:check_in_date BETWEEN b.check_in_date AND b.check_out_date) OR
                            (:check_out_date BETWEEN b.check_in_date AND b.check_out_date)
                         )) OR
                        -- If no specific dates, get the next booking
                        (:check_in_date IS NULL AND b.check_in_date >= CURDATE())
                     )
                     ORDER BY 
                        CASE 
                            WHEN :check_in_date IS NOT NULL AND :check_out_date IS NOT NULL THEN
                                -- For specific dates, prioritize bookings that overlap with search dates
                                CASE 
                                    WHEN (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) THEN 0
                                    ELSE 1
                                END
                            ELSE 0
                        END,
                        b.check_in_date ASC
                     LIMIT 1) as next_booking_date,
                    -- Get current booking information for booked/occupied rooms
                    (SELECT b.id FROM bookings b 
                     WHERE b.room_number = r.room_number 
                     AND b.status IN ('confirmed', 'checked_in')
                     AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                     ORDER BY b.created_at DESC
                     LIMIT 1) as current_booking_id,
                    -- Get current guest name for booked/occupied rooms
                    (SELECT CONCAT(g.first_name, ' ', g.last_name) FROM bookings b 
                     JOIN guests g ON b.guest_id = g.id
                     WHERE b.room_number = r.room_number 
                     AND b.status IN ('confirmed', 'checked_in')
                     AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                     ORDER BY b.created_at DESC
                     LIMIT 1) as current_guest_name,
                    -- Get checkout time information for current booking
                    (SELECT CONCAT(
                        'Checkout on ', 
                        DATE_FORMAT(b.check_out_date, '%d-%b'), 
                        ' at ',
                        COALESCE(b.check_out_time, '12:00'),
                        ' ',
                        COALESCE(b.check_out_ampm, 'PM')
                    ) FROM bookings b 
                     WHERE b.room_number = r.room_number 
                     AND b.status IN ('confirmed', 'checked_in')
                     AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                     ORDER BY b.created_at DESC
                     LIMIT 1) as checkout_time_info,
                    -- Determine availability status (SIMPLIFIED LOGIC)
                    CASE 
                        -- PRIORITY 1: Room maintenance/cleaning status
                        WHEN r.status = 'maintenance' THEN 'maintenance'
                        WHEN r.status = 'cleaning' THEN 'cleaning'
                        
                        -- PRIORITY 2: Currently checked-in guests (OCCUPIED)
                        -- Show as occupied for the entire booking period including checkout day until checkout time
                        WHEN EXISTS (
                            SELECT 1 FROM bookings b 
                            WHERE b.room_number = r.room_number 
                            AND b.status = 'checked_in'
                            AND (
                                -- If no specific dates, check current date (include checkout day)
                                (:check_in_date IS NULL AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date) OR
                                -- If specific dates, check if search dates overlap with booking (include checkout day)
                                (:check_in_date IS NOT NULL AND :check_out_date IS NOT NULL AND
                                 (
                                    (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) OR
                                    (:check_in_date BETWEEN b.check_in_date AND b.check_out_date) OR
                                    (:check_out_date BETWEEN b.check_in_date AND b.check_out_date)
                                 ))
                            )
                        ) THEN 'occupied'
                        
                        -- PRIORITY 3: Confirmed bookings for current date (BOOKED)
                        -- Only show as booked if we're checking current dates or no specific dates
                        WHEN (:check_in_date IS NULL OR :check_in_date <= CURDATE()) AND
                             EXISTS (
                                SELECT 1 FROM bookings b 
                                WHERE b.room_number = r.room_number 
                                AND b.status = 'confirmed'
                                AND (
                                    -- If no specific dates, check current date (include checkout day)
                                    (:check_in_date IS NULL AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date) OR
                                    -- If specific dates, check if search dates overlap with booking (include checkout day)
                                    (:check_in_date IS NOT NULL AND :check_out_date IS NOT NULL AND
                                     (
                                        (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) OR
                                        (:check_in_date BETWEEN b.check_in_date AND b.check_out_date) OR
                                        (:check_out_date BETWEEN b.check_in_date AND b.check_out_date)
                                     ))
                                )
                             ) THEN 'booked'
                        
                        -- PRIORITY 4: Future bookings (PREBOOKED) - only if search dates overlap with booking dates
                        WHEN :check_in_date IS NOT NULL AND :check_out_date IS NOT NULL AND
                             EXISTS (
                                SELECT 1 FROM bookings b 
                                WHERE b.room_number = r.room_number 
                                AND b.status IN ('confirmed', 'checked_in')
                                AND b.check_in_date > CURDATE() -- Only future bookings
                                AND (
                                    -- Check if search dates overlap with booking dates (include checkout day)
                                    (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) OR
                                    (:check_in_date BETWEEN b.check_in_date AND b.check_out_date) OR
                                    (:check_out_date BETWEEN b.check_in_date AND b.check_out_date)
                                )
                             ) THEN 'prebooked'
                        
                        -- PRIORITY 5: Date range conflicts (when searching for specific dates)
                        WHEN :check_in_date IS NOT NULL AND :check_out_date IS NOT NULL AND
                             EXISTS (
                                SELECT 1 FROM bookings b 
                                WHERE b.room_number = r.room_number 
                                AND b.status IN ('confirmed', 'checked_in')
                                AND (
                                    (b.check_in_date < :check_out_date AND b.check_out_date > :check_in_date) OR
                                    (:check_in_date BETWEEN b.check_in_date AND b.check_out_date) OR
                                    (:check_out_date BETWEEN b.check_in_date AND b.check_out_date)
                                )
                             ) THEN 'booked'
                        
                        -- PRIORITY 6: Available (no conflicts)
                        ELSE 'available'
                    END as availability_status
                FROM rooms r
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE (:room_type_id IS NULL OR r.room_type_id = :room_type_id)
                ORDER BY r.room_number ASC
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':check_in_date', $check_in_date);
            $stmt->bindParam(':check_out_date', $check_out_date);
            $stmt->bindParam(':room_type_id', $room_type_id);
            $stmt->execute();
            
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Process rooms to add additional information
            foreach ($rooms as &$room) {
                // Check if there's a confirmed booking for today that hasn't been checked in
                $has_confirmed_booking_today = false;
                if ($room['current_booking_id']) {
                    // Get the current booking details
                    $booking_query = "SELECT status, check_in_date, check_out_date FROM bookings WHERE id = ?";
                    $booking_stmt = $this->conn->prepare($booking_query);
                    $booking_stmt->bindParam(1, $room['current_booking_id']);
                    $booking_stmt->execute();
                    $booking = $booking_stmt->fetch(PDO::FETCH_ASSOC);
                    
                    if ($booking && $booking['status'] === 'confirmed' && 
                        date('Y-m-d') >= $booking['check_in_date'] && 
                        date('Y-m-d') < $booking['check_out_date']) {
                        $has_confirmed_booking_today = true;
                    }
                }
                
                // Override availability_status for occupied rooms (highest priority)
                // BUT only if we're not querying for future dates
                // AND only if the guest is actually checked in (not just confirmed for today)
                if ($room['current_status'] === 'occupied' && 
                    ($check_in_date === null || $check_in_date >= date('Y-m-d')) &&
                    !$has_confirmed_booking_today) {
                    
                    // For future date queries, don't override - let SQL determine status
                    if ($check_in_date && $check_in_date > date('Y-m-d')) {
                        // Future dates: don't override, keep the SQL-determined status
                        // This allows 'prebooked' or 'available' to be preserved
                    } else {
                        // Current/past dates: always override occupied status
                        $room['availability_status'] = 'occupied';
                    }
                }
                
                // For pure past dates, ensure the historical status is preserved
                if ($check_in_date && $check_in_date < date('Y-m-d') && $check_out_date < date('Y-m-d')) {
                    // Don't override the historical status for pure past dates
                    // The SQL query has already determined the correct historical status
                }
                
                $room['is_available'] = $room['availability_status'] === 'available';
                $room['is_prebooked'] = $room['availability_status'] === 'prebooked';
                $room['is_booked'] = $room['availability_status'] === 'booked';
                $room['has_conflicts'] = (int)$room['has_conflicts'] > 0;
                
                // Format next booking info
                if ($room['next_booking']) {
                    $room['next_booking_formatted'] = $room['next_booking'];
                } else {
                    $room['next_booking_formatted'] = 'No upcoming bookings';
                }
                
                // Add status description
                switch ($room['availability_status']) {
                    case 'available':
                        $room['status_description'] = 'Available for booking';
                        break;
                    case 'prebooked':
                        $room['status_description'] = 'Pre-booked for future date';
                        break;
                    case 'booked':
                        $room['status_description'] = 'Booked for current dates - Guest not checked in';
                        break;
                    case 'occupied':
                        $room['status_description'] = 'Currently occupied - Guest checked in';
                        break;
                    case 'maintenance':
                        $room['status_description'] = 'Under maintenance';
                        break;
                    case 'cleaning':
                        $room['status_description'] = 'Under cleaning';
                        break;
                    case 'unknown':
                        $room['status_description'] = 'Status unknown';
                        break;
                    default:
                        $room['status_description'] = 'Status: ' . $room['availability_status'];
                }
            }
            
            return [
                'success' => true,
                'data' => [
                    'rooms' => $rooms,
                    'total_rooms' => count($rooms),
                    'available_rooms' => count(array_filter($rooms, fn($r) => $r['is_available'])),
                    'prebooked_rooms' => count(array_filter($rooms, fn($r) => $r['is_prebooked'])),
                    'booked_rooms' => count(array_filter($rooms, fn($r) => $r['availability_status'] === 'booked')),
                    'occupied_rooms' => count(array_filter($rooms, fn($r) => $r['availability_status'] === 'occupied')),
                    'maintenance_rooms' => count(array_filter($rooms, fn($r) => $r['availability_status'] === 'maintenance')),
                    'cleaning_rooms' => count(array_filter($rooms, fn($r) => $r['availability_status'] === 'cleaning')),
                    'check_in_date' => $check_in_date,
                    'check_out_date' => $check_out_date
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Error getting all rooms with status: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error retrieving room information',
                'error' => $e->getMessage()
            ];
        }
    }
}

// Handle the request
try {
    $database = new Database();
    $api = new AllRoomsWithStatus($database);
    
    $check_in_date = $_GET['check_in_date'] ?? null;
    $check_out_date = $_GET['check_out_date'] ?? null;
    $room_type_id = $_GET['room_type_id'] ?? null;
    
    // Convert empty string to null for room_type_id
    if ($room_type_id === '') {
        $room_type_id = null;
    }
    
    // Validate dates if provided
    if ($check_in_date && $check_out_date) {
        if (!strtotime($check_in_date) || !strtotime($check_out_date)) {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid date format'
            ]);
            exit;
        }
        
        if ($check_out_date <= $check_in_date) {
            echo json_encode([
                'success' => false,
                'message' => 'Check-out date must be after check-in date'
            ]);
            exit;
        }
    }
    
    $result = $api->getAllRoomsWithStatus($check_in_date, $check_out_date, $room_type_id);
    echo json_encode($result);
    
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error',
        'error' => $e->getMessage()
    ]);
}
?>
