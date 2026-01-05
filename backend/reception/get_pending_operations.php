<?php
require_once '../config/cors.php';

require_once '../config/database.php';
require_once '../utils/response.php';
require_once '../utils/jwt_helper.php';

$response = new Response();

try {
    // Verify JWT token
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        echo json_encode($response->unauthorized('Authorization token required'));
        exit;
    }
    
    $jwt = new JWT();
    $decoded = $jwt->decode($token);
    
    if (!$decoded || $decoded->role !== 'reception') {
        echo json_encode($response->forbidden('Access denied. Reception role required.'));
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        echo json_encode($response->error('Method not allowed', 405));
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $today = date('Y-m-d');
    
    // Get pending check-ins (confirmed bookings for today)
    $stmt = $db->prepare("
        SELECT b.id, b.booking_reference, b.check_in_date, b.check_out_date,
               b.adults, b.children, b.total_amount, b.notes,
               g.first_name, g.last_name, g.phone, g.id_proof_number,
               r.room_number, rt.name as room_type, rt.base_price
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_number = r.room_number
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE b.status = 'confirmed' 
        AND b.check_in_date = ?
        ORDER BY b.check_in_date ASC
    ");
    $stmt->execute([$today]);
    $pending_checkins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get pending check-outs (checked-in bookings for today)
    $stmt = $db->prepare("
        SELECT b.id, b.booking_reference, b.check_in_date, b.check_out_date,
               b.check_in_time, b.adults, b.children, b.total_amount, b.notes,
               g.first_name, g.last_name, g.phone, g.id_proof_number,
               r.room_number, rt.name as room_type, rt.base_price
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_number = r.room_number
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE b.status = 'checked_in' 
        AND b.check_out_date = ?
        ORDER BY b.check_out_date ASC
    ");
    $stmt->execute([$today]);
    $pending_checkouts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get overdue check-outs (checked-in bookings past check-out date)
    $stmt = $db->prepare("
        SELECT b.id, b.booking_reference, b.check_in_date, b.check_out_date,
               b.check_in_time, b.adults, b.children, b.total_amount, b.notes,
               g.first_name, g.last_name, g.phone, g.id_proof_number,
               r.room_number, rt.name as room_type, rt.base_price,
               DATEDIFF(?, b.check_out_date) as days_overdue
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_number = r.room_number
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE b.status = 'checked_in' 
        AND b.check_out_date < ?
        ORDER BY b.check_out_date ASC
    ");
    $stmt->execute([$today, $today]);
    $overdue_checkouts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get upcoming check-ins (confirmed bookings for next few days)
    $next_week = date('Y-m-d', strtotime('+7 days'));
    $stmt = $db->prepare("
        SELECT b.id, b.booking_reference, b.check_in_date, b.check_out_date,
               b.adults, b.children, b.total_amount, b.notes,
               g.first_name, g.last_name, g.phone, g.id_proof_number,
               r.room_number, rt.name as room_type, rt.base_price,
               DATEDIFF(b.check_in_date, ?) as days_until_checkin
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_number = r.room_number
        JOIN room_types rt ON r.room_type_id = rt.id
        WHERE b.status = 'confirmed' 
        AND b.check_in_date BETWEEN ? AND ?
        ORDER BY b.check_in_date ASC
    ");
    $stmt->execute([$today, $today, $next_week]);
    $upcoming_checkins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $data = [
        'pending_checkins' => $pending_checkins,
        'pending_checkouts' => $pending_checkouts,
        'overdue_checkouts' => $overdue_checkouts,
        'upcoming_checkins' => $upcoming_checkins,
        'summary' => [
            'today_checkins' => count($pending_checkins),
            'today_checkouts' => count($pending_checkouts),
            'overdue_checkouts' => count($overdue_checkouts),
            'upcoming_checkins' => count($upcoming_checkins)
        ]
    ];
    
    echo json_encode($response->success($data, 'Pending operations retrieved successfully'));
    
} catch (Exception $e) {
    error_log("Get pending operations error: " . $e->getMessage());
    echo json_encode($response->error('Failed to retrieve pending operations: ' . $e->getMessage()));
}
?>
