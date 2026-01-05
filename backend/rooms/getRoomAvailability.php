<?php
// Room Availability API - Simple Production Version
header("Content-Type: application/json");
header("Cache-Control: no-cache, no-store, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("ETag: " . md5(time()));

// Handle OPTIONS request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit(0);
}

try {
    require_once __DIR__ . "/../config/database.php";
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception("Database connection failed");
    }
    
// Get parameters
$check_in_date = $_GET["check_in_date"] ?? null;
$check_out_date = $_GET["check_out_date"] ?? null;
$guests = intval($_GET["guests"] ?? 1);
$room_type = $_GET["room_type"] ?? null;

// Debug logging
error_log("API called with parameters: check_in_date=$check_in_date, check_out_date=$check_out_date, guests=$guests, room_type=$room_type");
    
    // Add cache-busting timestamp to prevent browser caching
    $timestamp = time();
    
    // Simple query that definitely includes floor
    $query = "
        SELECT 
            r.id as room_id,
            r.room_number,
            r.floor,
            r.price,
            r.status as room_status,
            rt.id as room_type_id,
            rt.name as room_type_name,
            rt.description,
            rt.base_price,
            rt.custom_price,
            rt.capacity,
                    CASE 
                        WHEN b.id IS NOT NULL AND b.status = \"checked_in\" AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date THEN \"occupied\"
                        WHEN b.id IS NOT NULL AND b.status = \"confirmed\" AND b.check_in_date > CURDATE() THEN \"prebooked\"
                        WHEN b.id IS NOT NULL AND b.status = \"confirmed\" AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date THEN \"booked\"
                        WHEN b.id IS NOT NULL AND b.status = \"pending\" AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date THEN \"booked\"
                        WHEN b.id IS NOT NULL AND b.status IN (\"confirmed\", \"pending\") AND b.check_in_date <= CURDATE() AND b.check_out_date > CURDATE() THEN \"booked\"
                        " . ($check_in_date && $check_out_date ? "WHEN b.id IS NOT NULL AND b.status IN (\"confirmed\", \"checked_in\") AND (
                            (b.check_in_date < :check_out_date AND b.check_out_date >= :check_in_date)
                            OR (b.check_in_date = :check_in_date)
                            OR (b.check_out_date = :check_out_date)
                        ) THEN \"occupied\"" : "") . "
                        WHEN b.id IS NOT NULL THEN \"booked\"
                        ELSE \"available\"
                    END as availability_status,
            b.id as booking_id,
            b.check_in_date,
            b.check_out_date,
            b.check_in_time,
            b.check_out_time,
            b.status as booking_status
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN (
            SELECT 
                room_number,
                id,
                check_in_date,
                check_out_date,
                check_in_time,
                check_out_time,
                status
            FROM bookings 
            WHERE status IN (\"pending\", \"confirmed\", \"checked_in\")
            " . ($check_in_date && $check_out_date ? "AND (
                (check_in_date < :check_out_date AND check_out_date >= :check_in_date)
                OR (check_in_date = :check_in_date)
                OR (check_out_date = :check_out_date)
            )" : "") . "
            " . (!$check_in_date || !$check_out_date ? "AND (
                (check_in_date <= CURDATE() AND check_out_date > CURDATE())
                OR (status = \"checked_in\" AND check_out_date > CURDATE())
                OR (check_in_date > CURDATE() AND status IN (\"confirmed\", \"pending\"))
            )" : "") . "
        ) b ON r.room_number = b.room_number
        WHERE rt.capacity >= :guests
        " . ($room_type ? "AND rt.id = :room_type" : "") . "
        ORDER BY r.room_number ASC";
    
    $stmt = $conn->prepare($query);
    $stmt->bindParam(":guests", $guests, PDO::PARAM_INT);
    
    if ($check_in_date && $check_out_date) {
        $stmt->bindParam(":check_in_date", $check_in_date);
        $stmt->bindParam(":check_out_date", $check_out_date);
    }
    
    if ($room_type) {
        $stmt->bindParam(":room_type", $room_type, PDO::PARAM_INT);
    }
    
    $stmt->execute();
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Debug logging
    error_log("Room Availability API - Query executed with check_in_date: $check_in_date, check_out_date: $check_out_date, guests: $guests, room_type: $room_type");
    error_log("Room Availability API - Found " . count($rooms) . " rooms");
    
    $room_data = [];
    foreach ($rooms as $room) {
        // Calculate pricing
        $actual_price_per_night = $room["price"] > 0 ? $room["price"] : $room["base_price"];
        $extra_guest_charge = 0;
        if ($guests > $room["capacity"]) {
            $extra_guest_charge = ($guests - $room["capacity"]) * 500; // ₹500 per extra guest
        }
        $total_price = $actual_price_per_night + $extra_guest_charge;
        
        // Determine availability
        $enhanced_availability = $room["availability_status"];
        $is_bookable = ($enhanced_availability === "available");
        
        // Additional check: if there's a checkout time conflict with the requested check-in date
        if ($room["booking_id"] && $check_in_date && $check_out_date) {
            $checkout_date = $room["check_out_date"];
            $checkout_time = $room["check_out_time"] ?: "12:00:00";
            
            error_log("Room {$room['room_number']} checkout check - Checkout date: $checkout_date, Check-in date: $check_in_date, Checkout time: $checkout_time");
            
            // If the new check-in date is the same as the checkout date, check the time
            if ($check_in_date === $checkout_date) {
                // If checkout time is after 12:00 PM (noon), room is not available for same-day check-in
                if (strtotime($checkout_time) > strtotime("12:00:00")) {
                    $is_bookable = false;
                    $enhanced_availability = "occupied";
                    error_log("Room {$room['room_number']} not available - checkout time {$checkout_time} conflicts with same-day check-in");
                }
            }
            
            // Also check if the new booking dates overlap with existing booking dates
            // If new check-in is before or equal to existing checkout, room is not available
            if ($check_in_date <= $checkout_date) {
                $is_bookable = false;
                $enhanced_availability = "occupied";
                error_log("Room {$room['room_number']} not available - new check-in date $check_in_date is before or equal to existing checkout date $checkout_date");
            }
        }
        
        // Create room data structure - FLOOR IS EXPLICITLY INCLUDED
        $room_data[] = [
            "room_id" => intval($room["room_id"]),
            "room_number" => $room["room_number"],
            "floor" => intval($room["floor"]), // EXPLICITLY CONVERT TO INTEGER
            "price" => floatval($total_price),
            "room_status" => $room["room_status"],
            "room_type_id" => intval($room["room_type_id"]),
            "room_type_name" => $room["room_type_name"],
            "description" => $room["description"],
            "base_price" => floatval($room["base_price"]),
            "custom_price" => floatval($room["custom_price"]),
            "capacity" => intval($room["capacity"]),
            "amenities" => [],
            "availability_status" => $enhanced_availability,
            "is_bookable" => $is_bookable,
            "current_booking" => $room["booking_id"] ? [
                "booking_id" => $room["booking_id"],
                "check_in_date" => $room["check_in_date"],
                "check_out_date" => $room["check_out_date"],
                "check_in_time" => $room["check_in_time"],
                "check_out_time" => $room["check_out_time"],
                "status" => $room["booking_status"]
            ] : null,
            "pricing_info" => [
                "base_price" => floatval($room["base_price"]),
                "custom_price" => floatval($room["custom_price"]),
                "room_price" => floatval($room["price"]),
                "actual_price_per_night" => floatval($actual_price_per_night),
                "extra_guest_charge" => floatval($extra_guest_charge),
                "total_price" => floatval($total_price),
                "guests" => $guests,
                "capacity" => intval($room["capacity"])
            ]
        ];
        
        // Debug logging for each room
        error_log("Room {$room['room_number']} availability: Status={$room['room_status']}, Availability={$enhanced_availability}, Bookable=" . ($is_bookable ? 'Yes' : 'No') . ", Booking ID=" . ($room['booking_id'] ?? 'None') . ", Check-in=" . ($room['check_in_date'] ?? 'None') . ", Check-out=" . ($room['check_out_date'] ?? 'None') . ", Check-out time=" . ($room['check_out_time'] ?? 'None'));
        
        // Special logging for Room 101
        if ($room['room_number'] == '101') {
            error_log("ROOM 101 DETAILED STATUS: availability_status={$enhanced_availability}, is_bookable=" . ($is_bookable ? 'true' : 'false') . ", current_booking=" . ($room['booking_id'] ? 'exists' : 'null'));
        }
    }
    
    // Separate available and all rooms for frontend compatibility
    $available_rooms = array_filter($room_data, function($room) {
        return $room['is_bookable'] === true;
    });
    
    echo json_encode([
        "success" => true,
    "data" => [
        "all_rooms" => $room_data,
        "available_rooms" => array_values($available_rooms),
        "total_rooms" => count($room_data),
        "available_count" => count($available_rooms),
        "timestamp" => time(),
        "cache_bust" => md5(time())
    ],
        "count" => count($room_data),
        "filters" => [
            "check_in_date" => $check_in_date,
            "check_out_date" => $check_out_date,
            "guests" => $guests,
            "room_type" => $room_type
        ]
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ], JSON_PRETTY_PRINT);
}