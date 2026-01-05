<?php
// Current Checked-in Guests API
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response.php';
require_once '../utils/simple_jwt_helper.php';

header('Content-Type: application/json');

$response = new Response();

try {
    // Verify JWT token
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        http_response_code(401);
        echo json_encode($response->unauthorized('Authorization token required'));
        exit;
    }
    
    $decoded = SimpleJWTHelper::validateToken($token);
    
    if (!$decoded || $decoded['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode($response->forbidden('Access denied. Admin role required.'));
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode($response->error('Method not allowed', 405));
        exit;
    }
    
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        http_response_code(500);
        echo json_encode($response->error('Database connection failed', 500));
        exit;
    }
    
    // Get all current checked-in guests
    $sql = "SELECT 
                b.id as booking_id,
                b.booking_reference,
                b.room_number,
                b.check_in_date,
                b.check_in_time,
                b.check_in_ampm,
                b.check_out_date,
                b.check_out_time,
                b.check_out_ampm,
                b.adults,
                b.children,
                b.status,
                b.created_at,
                g.first_name,
                g.last_name,
                g.phone,
                g.email,
                CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                rt.name as room_type_name
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            LEFT JOIN rooms r ON b.room_number = r.room_number
            LEFT JOIN room_types rt ON r.room_type_id = rt.id
            WHERE b.status = 'checked_in'
            ORDER BY b.check_in_date DESC, b.room_number ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Format the data for better display
    $formattedGuests = array_map(function($guest) {
        return [
            'booking_id' => $guest['booking_id'],
            'booking_reference' => $guest['booking_reference'],
            'guest_name' => $guest['guest_name'],
            'room_number' => $guest['room_number'],
            'room_type' => $guest['room_type_name'],
            'adults' => (int)$guest['adults'],
            'children' => (int)$guest['children'],
            'check_in_date' => $guest['check_in_date'],
            'check_in_time' => $guest['check_in_time'] ? $guest['check_in_time'] . ' ' . ($guest['check_in_ampm'] ?? 'AM') : null,
            'check_out_date' => $guest['check_out_date'],
            'check_out_time' => $guest['check_out_time'] ? $guest['check_out_time'] . ' ' . ($guest['check_out_ampm'] ?? 'AM') : null,
            'phone' => $guest['phone'],
            'email' => $guest['email'],
            'status' => $guest['status']
        ];
    }, $guests);
    
    echo json_encode($response->success($formattedGuests, 'Current checked-in guests retrieved successfully'));
        
} catch (Exception $e) {
    http_response_code(500);
    error_log("Current guests API error: " . $e->getMessage());
    echo json_encode($response->error('Server error: ' . $e->getMessage(), 500));
}
?>
