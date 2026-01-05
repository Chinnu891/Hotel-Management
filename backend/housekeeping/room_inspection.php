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

try {
    // Initialize database connection
    $database = new Database();
    $pdo = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get inspection data for a specific room
        if (!isset($_GET['room_id'])) {
            sendResponse(400, 'Room ID is required');
        }
        
        $room_id = $_GET['room_id'];
        
        // Get room information
        $room_stmt = $pdo->prepare("
            SELECT r.*, rt.name as room_type_name
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE r.id = ?
        ");
        $room_stmt->execute([$room_id]);
        $room = $room_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$room) {
            sendResponse(404, 'Room not found');
        }
        
        // Get existing inspection if any
        $inspection_stmt = $pdo->prepare("
            SELECT ri.*, u.full_name as inspector_name
            FROM room_inspections ri
            LEFT JOIN users u ON ri.inspector_id = u.id
            WHERE ri.room_id = ?
            ORDER BY ri.inspection_date DESC
            LIMIT 1
        ");
        $inspection_stmt->execute([$room_id]);
        $inspection = $inspection_stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get checklist items for room type
        $checklist_stmt = $pdo->prepare("
            SELECT hci.*
            FROM housekeeping_checklist_items hci
            WHERE hci.task_type = 'inspection'
            ORDER BY hci.display_order
        ");
        $checklist_stmt->execute();
        $checklist_items = $checklist_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get available inspectors
        $inspectors_stmt = $pdo->prepare("
            SELECT id, full_name, role
            FROM users
            WHERE role IN ('housekeeping', 'supervisor', 'manager')
            ORDER BY full_name
        ");
        $inspectors_stmt->execute();
        $inspectors = $inspectors_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $response = [
            'room' => $room,
            'inspection' => $inspection,
            'checklist_items' => $checklist_items,
            'inspectors' => $inspectors
        ];
        
        sendResponse(200, 'Inspection data retrieved successfully', $response);
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Create or update room inspection
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            sendResponse(400, 'Invalid JSON input');
        }
        
        // Validate required fields
        $required_fields = ['room_id', 'inspector_id', 'overall_rating'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || empty(trim($input[$field]))) {
                sendResponse(400, "Missing required field: $field");
            }
        }
        
        $room_id = $input['room_id'];
        $inspector_id = $input['inspector_id'];
        $overall_rating = $input['overall_rating'];
        $notes = $input['notes'] ?? '';
        $checklist_results = $input['checklist_results'] ?? [];
        
        // Validate room exists
        $room_stmt = $pdo->prepare("SELECT id, room_number FROM rooms WHERE id = ?");
        $room_stmt->execute([$room_id]);
        $room = $room_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$room) {
            sendResponse(404, 'Room not found');
        }
        
        // Validate inspector exists
        $inspector_stmt = $pdo->prepare("SELECT id, full_name FROM users WHERE id = ?");
        $inspector_stmt->execute([$inspector_id]);
        $inspector = $inspector_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$inspector) {
            sendResponse(404, 'Inspector not found');
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        try {
            // Check if inspection already exists for today
            $existing_stmt = $pdo->prepare("
                SELECT id FROM room_inspections 
                WHERE room_id = ? AND DATE(inspection_date) = CURDATE()
            ");
            $existing_stmt->execute([$room_id]);
            $existing_inspection = $existing_stmt->fetch();
            
            if ($existing_inspection) {
                // Update existing inspection
                $update_stmt = $pdo->prepare("
                    UPDATE room_inspections 
                    SET overall_rating = ?, notes = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $update_stmt->execute([$overall_rating, $notes, $existing_inspection['id']]);
                $inspection_id = $existing_inspection['id'];
            } else {
                // Create new inspection
                $insert_stmt = $pdo->prepare("
                    INSERT INTO room_inspections (
                        room_id, inspector_id, overall_rating, notes, inspection_date, created_at
                    ) VALUES (?, ?, ?, ?, NOW(), NOW())
                ");
                $insert_stmt->execute([$room_id, $inspector_id, $overall_rating, $notes]);
                $inspection_id = $pdo->lastInsertId();
            }
            
            // Update checklist completion records
            if (!empty($checklist_results)) {
                // Delete existing completion records for this inspection
                $delete_stmt = $pdo->prepare("
                    DELETE FROM task_checklist_completion 
                    WHERE task_id = ? AND checklist_item_id IN (
                        SELECT id FROM housekeeping_checklist_items WHERE task_type = 'inspection'
                    )
                ");
                $delete_stmt->execute([$inspection_id]);
                
                // Insert new completion records
                foreach ($checklist_results as $item_id => $status) {
                    if ($status === 'completed') {
                        $completion_stmt = $pdo->prepare("
                            INSERT INTO task_checklist_completion (
                                task_id, checklist_item_id, completed_at, completed_by
                            ) VALUES (?, ?, NOW(), ?)
                        ");
                        $completion_stmt->execute([$inspection_id, $item_id, $inspector_id]);
                    }
                }
            }
            
            // Commit transaction
            $pdo->commit();
            
            // Log the activity
            $logger = new Logger($pdo);
            $logger->log('info', "Room inspection completed: Room $room_id, Inspector $inspector_id, Rating: $overall_rating");
            
            // Send real-time notification
            require_once '../utils/notification_service.php';
            $notificationService = new NotificationService($pdo);
            
            $notificationService->sendHousekeepingUpdate($inspection_id, 'inspected', [
                'room_id' => $room_id,
                'room_number' => $room['room_number'],
                'inspector_id' => $inspector_id,
                'overall_rating' => $overall_rating,
                'notes' => $notes
            ]);
            
            sendResponse(200, 'Room inspection saved successfully', [
                'inspection_id' => $inspection_id,
                'message' => 'Room inspection saved successfully'
            ]);
            
        } catch (Exception $e) {
            // Rollback transaction on error
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
        
    } else {
        sendResponse(405, 'Method not allowed');
    }
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
