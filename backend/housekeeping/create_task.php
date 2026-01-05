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
    $required_fields = ['room_id', 'task_type', 'scheduled_date'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            sendResponse(400, "Missing required field: $field");
        }
    }
    
    $room_id = $input['room_id'];
    $task_type = $input['task_type'];
    $scheduled_date = $input['scheduled_date'];
    
    // Validate room exists and is available
    $stmt = $pdo->prepare("SELECT id, room_number, status FROM rooms WHERE id = ?");
    $stmt->execute([$room_id]);
    $room = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$room) {
        sendResponse(404, 'Room not found');
    }
    
    if ($room['status'] === 'maintenance') {
        sendResponse(400, 'Cannot create housekeeping task for room under maintenance');
    }
    
    // Validate task type
    $valid_task_types = ['daily_cleaning', 'deep_cleaning', 'turnover_cleaning', 'inspection'];
    if (!in_array($task_type, $valid_task_types)) {
        sendResponse(400, 'Invalid task type');
    }
    
    // Check for conflicting tasks on the same date
    $conflict_stmt = $pdo->prepare("
        SELECT id FROM housekeeping_tasks 
        WHERE room_id = ? AND DATE(scheduled_date) = DATE(?) AND status IN ('pending', 'in_progress')
    ");
    $conflict_stmt->execute([$room_id, $scheduled_date]);
    
    if ($conflict_stmt->fetch()) {
        sendResponse(400, 'Conflicting housekeeping task already exists for this room and date');
    }
    
    // Set default values
    $priority = $input['priority'] ?? 'medium';
    $assigned_to = $input['assigned_to'] ?? null;
    $notes = $input['notes'] ?? '';
    $estimated_duration = $input['estimated_duration'] ?? 60; // Default 60 minutes
    
    // Insert housekeeping task
    $insert_query = "
        INSERT INTO housekeeping_tasks (
            room_id, task_type, scheduled_date, priority, assigned_to, 
            notes, estimated_duration, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    ";
    
    $stmt = $pdo->prepare($insert_query);
    $stmt->execute([
        $room_id, $task_type, $scheduled_date, $priority, 
        $assigned_to, $notes, $estimated_duration
    ]);
    
    $task_id = $pdo->lastInsertId();
    
    // Automatically generate checklist items based on task type
    $checklist_query = "
        SELECT id, item_name, description, is_required, display_order
        FROM housekeeping_checklist_items 
        WHERE task_type = ? 
        ORDER BY display_order
    ";
    
    $stmt = $pdo->prepare($checklist_query);
    $stmt->execute([$task_type]);
    $checklist_items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Log the activity
    $logger = new Logger($pdo);
    $logger->log('info', "Housekeeping task created: ID $task_id, Room $room_id, Type: $task_type");
    
    $response = [
        'task_id' => $task_id,
        'room_number' => $room['room_number'],
        'task_type' => $task_type,
        'scheduled_date' => $scheduled_date,
        'checklist_items' => $checklist_items,
        'message' => 'Housekeeping task created successfully'
    ];
    
    sendResponse(201, 'Housekeeping task created successfully', $response);
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
