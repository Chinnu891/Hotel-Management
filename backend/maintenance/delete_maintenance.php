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

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendResponse(405, 'Method not allowed');
}

try {
    // Initialize database connection
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['id'])) {
        sendResponse(400, 'Maintenance ID is required');
    }
    
    $maintenance_id = $input['id'];
    
    // Check if maintenance record exists and get details
    $check_stmt = $pdo->prepare("SELECT id, room_id, issue_type FROM maintenance WHERE id = ?");
    $check_stmt->execute([$maintenance_id]);
    $maintenance = $check_stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$maintenance) {
        sendResponse(404, 'Maintenance record not found');
    }
    
    // Start transaction
    $pdo->beginTransaction();
    
    try {
        // Delete the maintenance record
        $delete_stmt = $pdo->prepare("DELETE FROM maintenance WHERE id = ?");
        $delete_stmt->execute([$maintenance_id]);
        
        // Update room status if it was a repair issue and no other active maintenance exists
        if ($maintenance['issue_type'] === 'repair') {
            $check_active_stmt = $pdo->prepare("
                SELECT COUNT(*) as active_count 
                FROM maintenance 
                WHERE room_id = ? AND status IN ('pending', 'in_progress')
            ");
            $check_active_stmt->execute([$maintenance['room_id']]);
            $active_count = $check_active_stmt->fetch()['active_count'];
            
            if ($active_count == 0) {
                $update_room_stmt = $pdo->prepare("UPDATE rooms SET status = 'available' WHERE id = ?");
                $update_room_stmt->execute([$maintenance['room_id']]);
            }
        }
        
        // Commit transaction
        $pdo->commit();
        
        // Log the activity
        $logger = new Logger($pdo);
        $logger->log('info', "Maintenance deleted: ID $maintenance_id, Room {$maintenance['room_id']}");
        
        sendResponse(200, 'Maintenance record deleted successfully');
        
    } catch (Exception $e) {
        // Rollback transaction on error
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
