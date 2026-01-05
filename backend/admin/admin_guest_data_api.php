<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response.php';
require_once '../utils/simple_jwt_helper.php';

$response = new Response();

try {
    // Verify JWT token
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        echo json_encode($response->unauthorized('Authorization token required'));
        exit;
    }
    
    $decoded = SimpleJWTHelper::validateToken($token);
    
    if (!$decoded || $decoded['role'] !== 'admin') {
        echo json_encode($response->forbidden('Access denied. Admin role required.'));
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        echo json_encode($response->error('Method not allowed', 405));
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Get all guest data in one comprehensive query
    $sql = "SELECT 
                b.id as booking_id,
                b.booking_reference,
                b.room_number,
                b.check_in_date,
                b.check_out_date,
                b.check_in_time,
                b.check_in_ampm,
                b.check_out_time,
                b.check_out_ampm,
                b.total_amount,
                b.paid_amount,
                b.remaining_amount,
                b.payment_status,
                b.payment_type,
                b.status as booking_status,
                b.created_at as booking_created_at,
                b.adults,
                b.children,
                b.booking_source,
                b.owner_reference,
                b.plan_type,
                cb.company_name,
                cb.gst_number,
                cb.contact_person,
                cb.contact_phone,
                cb.contact_email,
                cb.billing_address,
                g.id as guest_id,
                g.first_name,
                g.last_name,
                g.email,
                g.phone,
                g.address,
                g.id_proof_type,
                g.id_proof_number,
                r.status as room_status,
                r.room_type_id,
                rt.name as room_type_name,
                rt.base_price as room_price,
                b.paid_amount as calculated_paid_amount,
                b.remaining_amount as calculated_remaining_amount,
                p.payment_method,
                p.razorpay_payment_id,
                p.transaction_id
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            LEFT JOIN rooms r ON b.room_number = r.room_number
            LEFT JOIN room_types rt ON r.room_type_id = rt.id
            LEFT JOIN corporate_bookings cb ON b.id = cb.booking_id
            LEFT JOIN (
                SELECT 
                    p1.booking_id, 
                    p1.payment_method, 
                    p1.razorpay_payment_id,
                    p1.transaction_id
                FROM payments p1
                INNER JOIN (
                    SELECT booking_id, MAX(id) as max_id
                    FROM payments
                    GROUP BY booking_id
                ) p2 ON p1.booking_id = p2.booking_id AND p1.id = p2.max_id
            ) p ON b.id = p.booking_id
            ORDER BY b.created_at DESC";
    
    $stmt = $db->prepare($sql);
    if (!$stmt) {
        error_log("Admin guest data API: Failed to prepare statement: " . print_r($db->errorInfo(), true));
        throw new Exception("Failed to prepare SQL statement");
    }
    
    $result = $stmt->execute();
    if (!$result) {
        error_log("Admin guest data API: Failed to execute statement: " . print_r($stmt->errorInfo(), true));
        throw new Exception("Failed to execute SQL statement");
    }
    
    $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Debug logging
    error_log("Admin guest data API: Found " . count($guests) . " guests");
    if (count($guests) === 0) {
        error_log("Admin guest data API: No guests found - checking if tables exist");
        // Check if tables have data
        $check_bookings = $db->query("SELECT COUNT(*) FROM bookings");
        $check_guests = $db->query("SELECT COUNT(*) FROM guests");
        $check_rooms = $db->query("SELECT COUNT(*) FROM rooms");
        $check_room_types = $db->query("SELECT COUNT(*) FROM room_types");
        
        error_log("Admin guest data API: Bookings: " . $check_bookings->fetchColumn());
        error_log("Admin guest data API: Guests: " . $check_guests->fetchColumn());
        error_log("Admin guest data API: Rooms: " . $check_rooms->fetchColumn());
        error_log("Admin guest data API: Room Types: " . $check_room_types->fetchColumn());
    }
    
    // Format the results
    $formattedGuests = array_map(function($guest) {
        // Calculate payment status
        $total_amount = (float)$guest['total_amount'];
        $paid_amount = (float)($guest['calculated_paid_amount']);
        $remaining_amount = (float)($guest['calculated_remaining_amount']);
        
        // Determine payment status
        if (isset($guest['owner_reference']) && $guest['owner_reference']) {
            $payment_status = 'referred_by_owner';
            $remaining_amount = 0.00;
        } elseif ($paid_amount >= $total_amount) {
            $payment_status = 'completed';
            $remaining_amount = 0.00;
        } elseif ($paid_amount > 0) {
            $payment_status = 'partial';
        } else {
            $payment_status = 'pending';
        }
        
        // Add computed fields
        $guest['full_name'] = trim($guest['first_name'] . ' ' . $guest['last_name']);
        $guest['calculated_payment_status'] = $payment_status;
        $guest['calculated_remaining_amount'] = $remaining_amount;
        $guest['is_fully_paid'] = ($paid_amount >= $total_amount);
        
        return $guest;
    }, $guests);
    
    // Get statistics
    $stats = [
        'total_guests' => count($formattedGuests),
        'checked_in_guests' => count(array_filter($formattedGuests, fn($g) => $g['booking_status'] === 'checked_in')),
        'checked_out_guests' => count(array_filter($formattedGuests, fn($g) => $g['booking_status'] === 'checked_out')),
        'guests_with_due' => count(array_filter($formattedGuests, fn($g) => $g['calculated_remaining_amount'] > 0)),
        'corporate_bookings' => count(array_filter($formattedGuests, fn($g) => $g['booking_source'] === 'corporate'))
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $formattedGuests,
        'stats' => $stats,
        'count' => count($formattedGuests)
    ]);
    
} catch (Exception $e) {
    error_log("Admin guest data API error: " . $e->getMessage());
    echo json_encode($response->error('Failed to fetch guest data: ' . $e->getMessage()));
}
?>
