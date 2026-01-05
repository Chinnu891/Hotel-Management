<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/response_functions.php';
require_once '../utils/logger.php';

if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'])) {
    sendResponse(405, 'Method not allowed');
}

try {
    // Initialize database connection
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        sendResponse(400, 'Invalid JSON input');
    }
    
    // Validate required fields
    if (!isset($input['id']) || empty($input['id'])) {
        sendResponse(400, 'Maintenance ID is required');
    }
    
    $maintenance_id = $input['id'];
    
    // Check if maintenance record exists
    $stmt = $pdo->prepare("SELECT m.*, r.room_number, r.status as room_status FROM maintenance m JOIN rooms r ON m.room_id = r.id WHERE m.id = ?");
    $stmt->execute([$maintenance_id]);
    $maintenance = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$maintenance) {
        sendResponse(404, 'Maintenance record not found');
    }
    
    // Build dynamic update query
    $update_fields = [];
    $update_values = [];
    
    $allowed_fields = [
        'issue_type', 'description', 'priority', 'category_id', 
        'assigned_to', 'estimated_cost', 'scheduled_date', 
        'status', 'completion_notes', 'actual_cost', 'completion_date'
    ];
    
    foreach ($allowed_fields as $field) {
        if (isset($input[$field])) {
            $update_fields[] = "$field = ?";
            $update_values[] = $input[$field];
        }
    }
    
    if (empty($update_fields)) {
        sendResponse(400, 'No valid fields to update');
    }
    
    // Add updated_at timestamp
    $update_fields[] = "updated_at = NOW()";
    
    // Handle status transitions
    $old_status = $maintenance['status'];
    $new_status = $input['status'] ?? $old_status;
    
    if ($new_status === 'completed' && $old_status !== 'completed') {
        $update_fields[] = "completion_date = NOW()";
    }
    
    if ($new_status === 'in_progress' && $old_status === 'pending') {
        $update_fields[] = "start_time = NOW()";
    }
    
    // Update maintenance record
    $update_query = "UPDATE maintenance SET " . implode(', ', $update_fields) . " WHERE id = ?";
    $update_values[] = $maintenance_id;
    
    $stmt = $pdo->prepare($update_query);
    $stmt->execute($update_values);
    
    // Update room status if maintenance is completed and it was a repair issue
    if ($new_status === 'completed' && $maintenance['issue_type'] === 'repair') {
        $stmt = $pdo->prepare("UPDATE rooms SET status = 'available' WHERE id = ?");
        $stmt->execute([$maintenance['room_id']]);
    }
    
    // Log the activity
    $logger = new Logger($pdo);
    $logger->log('info', "Maintenance updated: ID $maintenance_id, Status: $old_status -> $new_status");
    
    // Get updated record
    $stmt = $pdo->prepare("
        SELECT m.*, r.room_number, r.floor, r.status as room_status,
               rt.name as room_type_name, u.full_name as assigned_to_name
        FROM maintenance m
        JOIN rooms r ON m.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN users u ON m.assigned_to = u.id
        WHERE m.id = ?
    ");
    $stmt->execute([$maintenance_id]);
    $updated_maintenance = $stmt->fetch(PDO::FETCH_ASSOC);
    
    sendResponse(200, 'Maintenance updated successfully', $updated_maintenance);
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
