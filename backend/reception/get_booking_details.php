<?php
/**
 * Get Booking Details API
 * 
 * This API retrieves detailed information about a specific booking by ID.
 * Used by the frontend to display guest details in room availability modal.
 */

// CORS headers are handled by Apache .htaccess

require_once '../config/database.php';

// Set Content-Type header
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
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
    
    // Get booking ID from query parameters
    $booking_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if (!$booking_id) {
        http_response_code(400);
        echo json_encode(array(
            "success" => false,
            "message" => "Booking ID is required"
        ));
        exit();
    }
    
    // Query to get booking details with guest information
    $query = "SELECT 
                b.id,
                b.room_number,
                b.check_in_date,
                b.check_out_date,
                b.adults,
                b.children,
                b.total_amount,
                b.paid_amount,
                b.remaining_amount,
                b.payment_type,
                b.payment_status,
                b.status,
                b.owner_reference,
                b.created_at,
                g.first_name,
                g.last_name,
                g.phone,
                g.email,
                g.address,
                g.id_proof_type,
                g.id_proof_number,
                rt.name as room_type_name,
                rt.base_price
              FROM bookings b
              JOIN guests g ON b.guest_id = g.id
              JOIN rooms r ON b.room_number = r.room_number
              JOIN room_types rt ON r.room_type_id = rt.id
              WHERE b.id = :booking_id";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(':booking_id', $booking_id, PDO::PARAM_INT);
    $stmt->execute();
    
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$booking) {
        http_response_code(404);
        echo json_encode(array(
            "success" => false,
            "message" => "Booking not found"
        ));
        exit();
    }
    
    // Format the response
    $response = array(
        "success" => true,
        "message" => "Booking details retrieved successfully",
        "booking" => $booking // Return as single object to match frontend expectation
    );
    
    echo json_encode($response);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Error: " . $e->getMessage()
    ));
}
?>
