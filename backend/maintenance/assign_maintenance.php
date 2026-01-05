<?php
require_once '../config/cors.php';
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/response_functions.php';
require_once '../utils/logger.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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
    if (!isset($input['maintenance_id']) || empty($input['maintenance_id'])) {
        sendResponse(400, 'Maintenance ID is required');
    }
    
    if (!isset($input['assigned_to']) || empty($input['assigned_to'])) {
        sendResponse(400, 'Staff member ID is required');
    }
    
    $maintenance_id = $input['maintenance_id'];
    $assigned_to = $input['assigned_to'];
    
    // Check if maintenance record exists
    $check_stmt = $pdo->prepare("SELECT id, status FROM maintenance WHERE id = ?");
    $check_stmt->execute([$maintenance_id]);
    $maintenance = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$maintenance) {
        sendResponse(404, 'Maintenance record not found');
    }
    
    if ($maintenance['status'] === 'completed') {
        sendResponse(400, 'Cannot assign completed maintenance');
    }
    
    // Check if staff member exists in users table
    $staff_stmt = $pdo->prepare("SELECT id, full_name FROM users WHERE id = ?");
    $staff_stmt->execute([$assigned_to]);
    $staff = $staff_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$staff) {
        sendResponse(404, 'Staff member not found');
    }
    
    // Update maintenance record
    $update_stmt = $pdo->prepare("
        UPDATE maintenance 
        SET assigned_to = ?, status = 'assigned', updated_at = NOW() 
        WHERE id = ?
    ");
    $update_stmt->execute([$assigned_to, $maintenance_id]);
    
    // Log the activity
    $logger = new Logger($pdo);
    $logger->log('info', "Maintenance assigned: ID $maintenance_id to {$staff['full_name']} (ID: $assigned_to)");
    
    sendResponse(200, 'Maintenance assigned successfully', [
        'maintenance_id' => $maintenance_id,
        'assigned_to' => $assigned_to,
        'staff_name' => $staff['full_name'],
        'message' => 'Maintenance assigned successfully'
    ]);
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
