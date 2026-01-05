<?php
/**
 * Reception Maintenance API
 * Provides comprehensive maintenance management for reception staff
 */

require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/logger.php';

// Global helper functions
function sendResponse($status_code, $message, $data = null) {
    http_response_code($status_code);
    echo json_encode([
        'success' => $status_code >= 200 && $status_code < 300,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

function logError($message) {
    error_log($message);
}

// Set content type to JSON
header('Content-Type: application/json');

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    switch ($method) {
        case 'GET':
            handleGetRequest($pdo);
            break;
        case 'POST':
            handlePostRequest($pdo);
            break;
        case 'PUT':
            handlePutRequest($pdo);
            break;
        case 'DELETE':
            handleDeleteRequest($pdo);
            break;
        default:
            sendResponse(405, 'Method not allowed');
            break;
    }
} catch (Exception $e) {
    logError('Reception Maintenance API Error: ' . $e->getMessage());
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}

/**
 * Handle GET requests
 */
function handleGetRequest($pdo) {
    $action = $_GET['action'] ?? 'list';
    
    switch ($action) {
        case 'list':
            getMaintenanceList($pdo);
            break;
        case 'details':
            getMaintenanceDetails($pdo);
            break;
        case 'statistics':
            getMaintenanceStatistics($pdo);
            break;
        case 'reports':
            getMaintenanceReports($pdo);
            break;
        case 'status_summary':
            getStatusSummary($pdo);
            break;
        default:
            sendResponse(400, 'Invalid action');
            break;
    }
}

/**
 * Handle POST requests
 */
function handlePostRequest($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? 'create';
    
    switch ($action) {
        case 'create':
            createMaintenanceRequest($pdo, $input);
            break;
        case 'bulk_update':
            bulkUpdateStatus($pdo, $input);
            break;
        default:
            sendResponse(400, 'Invalid action');
            break;
    }
}

/**
 * Handle PUT requests
 */
function handlePutRequest($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? 'update';
    
    switch ($action) {
        case 'update':
            updateMaintenanceRequest($pdo, $input);
            break;
        case 'update_status':
            updateMaintenanceStatus($pdo, $input);
            break;
        case 'assign':
            assignMaintenance($pdo, $input);
            break;
        default:
            sendResponse(400, 'Invalid action');
            break;
    }
}

/**
 * Handle DELETE requests
 */
function handleDeleteRequest($pdo) {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? 'delete';
    
    switch ($action) {
        case 'delete':
            deleteMaintenanceRequest($pdo, $input);
            break;
        case 'bulk_delete':
            bulkDeleteMaintenance($pdo, $input);
            break;
        default:
            sendResponse(400, 'Invalid action');
            break;
    }
}

/**
 * Get maintenance list with filters
 */
function getMaintenanceList($pdo) {
    $filters = [
        'status' => $_GET['status'] ?? null,
        'priority' => $_GET['priority'] ?? null,
        'issue_type' => $_GET['issue_type'] ?? null,
        'room_number' => $_GET['room_number'] ?? null,
        'assigned_to' => $_GET['assigned_to'] ?? null,
        'date_from' => $_GET['date_from'] ?? null,
        'date_to' => $_GET['date_to'] ?? null
    ];
    
    $sort_by = $_GET['sort_by'] ?? 'created_at';
    $sort_order = $_GET['sort_order'] ?? 'DESC';
    $limit = $_GET['limit'] ?? 50;
    $offset = $_GET['offset'] ?? 0;
    
    $where_conditions = [];
    $params = [];
    
    // Build WHERE clause based on filters
    if ($filters['status']) {
        $where_conditions[] = "m.status = ?";
        $params[] = $filters['status'];
    }
    
    if ($filters['priority']) {
        $where_conditions[] = "m.priority = ?";
        $params[] = $filters['priority'];
    }
    
    if ($filters['issue_type']) {
        $where_conditions[] = "m.issue_type = ?";
        $params[] = $filters['issue_type'];
    }
    
    if ($filters['room_number']) {
        $where_conditions[] = "m.room_number = ?";
        $params[] = $filters['room_number'];
    }
    
    if ($filters['assigned_to']) {
        $where_conditions[] = "m.assigned_to = ?";
        $params[] = $filters['assigned_to'];
    }
    
    if ($filters['date_from']) {
        $where_conditions[] = "DATE(m.created_at) >= ?";
        $params[] = $filters['date_from'];
    }
    
    if ($filters['date_to']) {
        $where_conditions[] = "DATE(m.created_at) <= ?";
        $params[] = $filters['date_to'];
    }
    
    $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';
    
    $sql = "
        SELECT 
            m.*,
            r.room_number,
            rt.name as room_type,
            u.full_name as assigned_to_name,
            u.role as assigned_role
        FROM maintenance m
        LEFT JOIN rooms r ON m.room_number = r.room_number
        LEFT JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN users u ON m.assigned_to = u.id
        {$where_clause}
        ORDER BY m.{$sort_by} {$sort_order}
        LIMIT " . (int)$limit . " OFFSET " . (int)$offset . "
    ";
    
    // No need to add limit and offset to params since they're directly in SQL
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $maintenance_items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get total count for pagination
        $count_sql = "
            SELECT COUNT(*) as total
            FROM maintenance m
            LEFT JOIN rooms r ON m.room_number = r.room_number
            LEFT JOIN room_types rt ON r.room_type_id = rt.id
            LEFT JOIN users u ON m.assigned_to = u.id
            {$where_clause}
        ";
        
        $count_stmt = $pdo->prepare($count_sql);
        $count_stmt->execute($params);
        $total_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        sendResponse(200, 'Maintenance list retrieved successfully', [
            'maintenance_items' => $maintenance_items,
            'pagination' => [
                'total' => (int)$total_count,
                'limit' => (int)$limit,
                'offset' => (int)$offset,
                'has_more' => ($offset + $limit) < $total_count
            ]
        ]);
    } catch (PDOException $e) {
        logError('Database error in getMaintenanceList: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Get maintenance details by ID
 */
function getMaintenanceDetails($pdo) {
    $id = $_GET['id'] ?? null;
    
    if (!$id) {
        sendResponse(400, 'Maintenance ID is required');
    }
    
    try {
        $sql = "
            SELECT 
                m.*,
                r.room_number,
                rt.name as room_type,
                r.floor,
                u.full_name as assigned_to_name,
                u.role as assigned_role,
                u.email as assigned_email
            FROM maintenance m
            LEFT JOIN rooms r ON m.room_id = r.id
            LEFT JOIN room_types rt ON r.room_type_id = rt.id
            LEFT JOIN users u ON m.assigned_to = u.id
            WHERE m.id = ?
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $maintenance = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$maintenance) {
            sendResponse(404, 'Maintenance request not found');
        }
        
        sendResponse(200, 'Maintenance details retrieved successfully', $maintenance);
    } catch (PDOException $e) {
        logError('Database error in getMaintenanceDetails: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Get maintenance statistics
 */
function getMaintenanceStatistics($pdo) {
    try {
        $sql = "
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_count,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count,
                COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_count,
                COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_count,
                COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_count,
                AVG(CASE WHEN status = 'completed' AND start_time IS NOT NULL 
                    THEN TIMESTAMPDIFF(HOUR, created_at, start_time) END) as avg_response_time,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as completion_rate
            FROM maintenance
        ";
        
        $stmt = $pdo->query($sql);
        $statistics = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Get issue type distribution
        $issue_type_sql = "
            SELECT issue_type, COUNT(*) as count
            FROM maintenance
            GROUP BY issue_type
            ORDER BY count DESC
        ";
        
        $issue_stmt = $pdo->query($issue_type_sql);
        $issue_types = $issue_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get monthly trends
        $monthly_sql = "
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m') as month,
                COUNT(*) as count
            FROM maintenance
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m')
            ORDER BY month
        ";
        
        $monthly_stmt = $pdo->query($monthly_sql);
        $monthly_trends = $monthly_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(200, 'Statistics retrieved successfully', [
            'overview' => $statistics,
            'issue_types' => $issue_types,
            'monthly_trends' => $monthly_trends
        ]);
    } catch (PDOException $e) {
        logError('Database error in getMaintenanceStatistics: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Get maintenance reports
 */
function getMaintenanceReports($pdo) {
    $report_type = $_GET['report_type'] ?? 'summary';
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    
    try {
        switch ($report_type) {
            case 'summary':
                $sql = "
                    SELECT 
                        m.id,
                        m.issue_type,
                        m.description,
                        m.priority,
                        m.status,
                        m.created_at,
                        m.estimated_duration,
                        r.room_number,
                        u.full_name as assigned_to_name
                    FROM maintenance m
                    LEFT JOIN rooms r ON m.room_id = r.id
                    LEFT JOIN users u ON m.assigned_to = u.id
                    WHERE 1=1
                ";
                break;
                
            case 'detailed':
                $sql = "
                    SELECT 
                        m.*,
                        r.room_number,
                        r.room_type,
                        r.floor,
                        u.full_name as assigned_to_name,
                        u.role as assigned_role
                    FROM maintenance m
                    LEFT JOIN rooms r ON m.room_id = r.id
                    LEFT JOIN users u ON m.assigned_to = u.id
                    WHERE 1=1
                ";
                break;
                
            default:
                sendResponse(400, 'Invalid report type');
                return;
        }
        
        $params = [];
        
        if ($date_from) {
            $sql .= " AND DATE(m.created_at) >= ?";
            $params[] = $date_from;
        }
        
        if ($date_to) {
            $sql .= " AND DATE(m.created_at) <= ?";
            $params[] = $date_to;
        }
        
        $sql .= " ORDER BY m.created_at DESC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $report_data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        sendResponse(200, 'Report generated successfully', [
            'report_type' => $report_type,
            'date_range' => [
                'from' => $date_from,
                'to' => $date_to
            ],
            'data' => $report_data,
            'total_records' => count($report_data)
        ]);
    } catch (PDOException $e) {
        logError('Database error in getMaintenanceReports: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Get status summary
 */
function getStatusSummary($pdo) {
    try {
        $sql = "
            SELECT 
                status,
                priority,
                COUNT(*) as count
            FROM maintenance
            GROUP BY status, priority
            ORDER BY status, 
                CASE priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    WHEN 'low' THEN 4 
                END
        ";
        
        $stmt = $pdo->query($sql);
        $status_summary = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Group by status
        $grouped_summary = [];
        foreach ($status_summary as $item) {
            if (!isset($grouped_summary[$item['status']])) {
                $grouped_summary[$item['status']] = [];
            }
            $grouped_summary[$item['status']][$item['priority']] = $item['count'];
        }
        
        sendResponse(200, 'Status summary retrieved successfully', $grouped_summary);
    } catch (PDOException $e) {
        logError('Database error in getStatusSummary: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Create maintenance request
 */
function createMaintenanceRequest($pdo, $input) {
    $required_fields = ['room_id', 'issue_type', 'description', 'priority'];
    
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            sendResponse(400, "Field '{$field}' is required");
        }
    }
    
    try {
        $sql = "
            INSERT INTO maintenance (
                room_id, issue_type, description, priority, 
                estimated_duration, assigned_to, notes, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['room_id'],
            $input['issue_type'],
            $input['description'],
            $input['priority'],
            $input['estimated_duration'] ?? null,
            $input['assigned_to'] ?? null,
            $input['notes'] ?? null
        ]);
        
        $maintenance_id = $pdo->lastInsertId();
        
        // Log the action
        logAction('maintenance_created', [
            'maintenance_id' => $maintenance_id,
            'room_id' => $input['room_id'],
            'issue_type' => $input['issue_type'],
            'priority' => $input['priority']
        ]);
        
        sendResponse(201, 'Maintenance request created successfully', [
            'id' => $maintenance_id,
            'message' => 'Maintenance request has been created and is pending assignment'
        ]);
    } catch (PDOException $e) {
        logError('Database error in createMaintenanceRequest: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Update maintenance request
 */
function updateMaintenanceRequest($pdo, $input) {
    if (!isset($input['id'])) {
        sendResponse(400, 'Maintenance ID is required');
    }
    
    try {
        $update_fields = [];
        $params = [];
        
        $allowed_fields = [
            'issue_type', 'description', 'priority', 'estimated_duration', 
            'assigned_to', 'notes', 'status'
        ];
        
        foreach ($allowed_fields as $field) {
            if (isset($input[$field])) {
                $update_fields[] = "{$field} = ?";
                $params[] = $input[$field];
            }
        }
        
        if (empty($update_fields)) {
            sendResponse(400, 'No fields to update');
        }
        
        $update_fields[] = "updated_at = NOW()";
        $params[] = $input['id'];
        
        $sql = "UPDATE maintenance SET " . implode(', ', $update_fields) . " WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(404, 'Maintenance request not found');
        }
        
        // Log the action
        logAction('maintenance_updated', [
            'maintenance_id' => $input['id'],
            'updated_fields' => array_keys(array_filter($input, function($key) use ($allowed_fields) {
                return in_array($key, $allowed_fields);
            }, ARRAY_FILTER_USE_KEY))
        ]);
        
        sendResponse(200, 'Maintenance request updated successfully');
    } catch (PDOException $e) {
        logError('Database error in updateMaintenanceRequest: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Update maintenance status
 */
function updateMaintenanceStatus($pdo, $input) {
    if (!isset($input['id']) || !isset($input['status'])) {
        sendResponse(400, 'Maintenance ID and status are required');
    }
    
    try {
        $sql = "
            UPDATE maintenance 
            SET status = ?, updated_at = NOW()
            WHERE id = ?
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$input['status'], $input['id']]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(404, 'Maintenance request not found');
        }
        
        // Log the action
        logAction('maintenance_status_updated', [
            'maintenance_id' => $input['id'],
            'new_status' => $input['status']
        ]);
        
        sendResponse(200, 'Maintenance status updated successfully');
    } catch (PDOException $e) {
        logError('Database error in updateMaintenanceStatus: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Assign maintenance to staff
 */
function assignMaintenance($pdo, $input) {
    if (!isset($input['id']) || !isset($input['assigned_to'])) {
        sendResponse(400, 'Maintenance ID and assigned_to are required');
    }
    
    try {
        // Check if staff member exists
        $staff_stmt = $pdo->prepare("SELECT id, full_name FROM users WHERE id = ?");
        $staff_stmt->execute([$input['assigned_to']]);
        $staff = $staff_stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$staff) {
            sendResponse(404, 'Staff member not found');
        }
        
        $sql = "
            UPDATE maintenance 
            SET assigned_to = ?, status = 'assigned', updated_at = NOW()
            WHERE id = ?
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$input['assigned_to'], $input['id']]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(404, 'Maintenance request not found');
        }
        
        // Log the action
        logAction('maintenance_assigned', [
            'maintenance_id' => $input['id'],
            'assigned_to' => $input['assigned_to'],
            'staff_name' => $staff['full_name']
        ]);
        
        sendResponse(200, 'Maintenance assigned successfully', [
            'assigned_to' => $staff['full_name']
        ]);
    } catch (PDOException $e) {
        logError('Database error in assignMaintenance: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Delete maintenance request
 */
function deleteMaintenanceRequest($pdo, $input) {
    if (!isset($input['id'])) {
        sendResponse(400, 'Maintenance ID is required');
    }
    
    try {
        $sql = "DELETE FROM maintenance WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$input['id']]);
        
        if ($stmt->rowCount() === 0) {
            sendResponse(404, 'Maintenance request not found');
        }
        
        // Log the action
        logAction('maintenance_deleted', [
            'maintenance_id' => $input['id']
        ]);
        
        sendResponse(200, 'Maintenance request deleted successfully');
    } catch (PDOException $e) {
        logError('Database error in deleteMaintenanceRequest: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Bulk update status
 */
function bulkUpdateStatus($pdo, $input) {
    if (!isset($input['ids']) || !isset($input['status'])) {
        sendResponse(400, 'IDs and status are required');
    }
    
    if (!is_array($input['ids']) || empty($input['ids'])) {
        sendResponse(400, 'IDs must be a non-empty array');
    }
    
    try {
        $placeholders = str_repeat('?,', count($input['ids']) - 1) . '?';
        $sql = "UPDATE maintenance SET status = ?, updated_at = NOW() WHERE id IN ({$placeholders})";
        
        $params = array_merge([$input['status']], $input['ids']);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        // Log the action
        logAction('maintenance_bulk_status_updated', [
            'maintenance_ids' => $input['ids'],
            'new_status' => $input['status'],
            'affected_rows' => $stmt->rowCount()
        ]);
        
        sendResponse(200, 'Bulk status update completed successfully', [
            'affected_rows' => $stmt->rowCount()
        ]);
    } catch (PDOException $e) {
        logError('Database error in bulkUpdateStatus: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Bulk delete maintenance
 */
function bulkDeleteMaintenance($pdo, $input) {
    if (!isset($input['ids']) || !is_array($input['ids']) || empty($input['ids'])) {
        sendResponse(400, 'IDs must be a non-empty array');
    }
    
    try {
        $placeholders = str_repeat('?,', count($input['ids']) - 1) . '?';
        $sql = "DELETE FROM maintenance WHERE id IN ({$placeholders})";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($input['ids']);
        
        // Log the action
        logAction('maintenance_bulk_deleted', [
            'maintenance_ids' => $input['ids'],
            'affected_rows' => $stmt->rowCount()
        ]);
        
        sendResponse(200, 'Bulk delete completed successfully', [
            'affected_rows' => $stmt->rowCount()
        ]);
    } catch (PDOException $e) {
        logError('Database error in bulkDeleteMaintenance: ' . $e->getMessage());
        sendResponse(500, 'Database error occurred');
    }
}

/**
 * Log action for audit trail
 */
function logAction($action, $details = []) {
    try {
        $log_data = [
            'action' => $action,
            'details' => json_encode($details),
            'timestamp' => date('Y-m-d H:i:s'),
            'user_id' => $_SESSION['user_id'] ?? null,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
        ];
        
        // You can implement your own logging mechanism here
        // For now, we'll use the existing logger utility
        logInfo("Reception Maintenance Action: {$action}", $details);
    } catch (Exception $e) {
        // Don't fail the main request if logging fails
        error_log("Failed to log action: " . $e->getMessage());
    }
}
?>
