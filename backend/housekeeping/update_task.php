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
        sendResponse(400, 'Task ID is required');
    }
    
    $task_id = $input['id'];
    
    // Check if task exists
    $stmt = $pdo->prepare("SELECT id, status, room_id FROM housekeeping_tasks WHERE id = ?");
    $stmt->execute([$task_id]);
    $task = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$task) {
        sendResponse(404, 'Housekeeping task not found');
    }
    
    // Build dynamic update query
    $update_fields = [];
    $update_values = [];
    
    $allowed_fields = [
        'status', 'priority', 'assigned_to', 'notes', 'estimated_duration',
        'start_time', 'completion_time', 'completion_notes'
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
    $old_status = $task['status'];
    $new_status = $input['status'] ?? $old_status;
    
    if ($new_status === 'completed' && $old_status !== 'completed') {
        $update_fields[] = "completion_time = NOW()";
    }
    
    if ($new_status === 'in_progress' && $old_status === 'pending') {
        $update_fields[] = "start_time = NOW()";
    }
    
    // Update task record
    $update_query = "UPDATE housekeeping_tasks SET " . implode(', ', $update_fields) . " WHERE id = ?";
    $update_values[] = $task_id;
    
    $stmt = $pdo->prepare($update_query);
    $stmt->execute($update_values);
    
    // Log the activity
    $logger = new Logger($pdo);
    $logger->log('info', "Housekeeping task updated: ID $task_id, Status: $old_status -> $new_status");
    
    // Get updated record
    $stmt = $pdo->prepare("
        SELECT ht.*, r.room_number, r.floor, r.status as room_status,
               rt.name as room_type_name, u.full_name as assigned_to_name
        FROM housekeeping_tasks ht
        JOIN rooms r ON ht.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN users u ON ht.assigned_to = u.id
        WHERE ht.id = ?
    ");
    $stmt->execute([$task_id]);
    $updated_task = $stmt->fetch(PDO::FETCH_ASSOC);
    
    sendResponse(200, 'Housekeeping task updated successfully', $updated_task);
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
