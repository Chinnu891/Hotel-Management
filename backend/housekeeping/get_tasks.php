<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/response_functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(405, 'Method not allowed');
}

try {
    // Initialize database connection
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Get query parameters
    $status = $_GET['status'] ?? null;
    $task_type = $_GET['task_type'] ?? null;
    $room_id = $_GET['room_id'] ?? null;
    $assigned_to = $_GET['assigned_to'] ?? null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = max(1, min(100, intval($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    // Build the base query
    $base_query = "
        SELECT ht.*, 
               r.room_number, r.floor, r.status as room_status,
               rt.name as room_type_name,
               u.full_name as assigned_to_name
        FROM housekeeping_tasks ht
        JOIN rooms r ON ht.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN users u ON ht.assigned_to = u.id
        WHERE 1=1
    ";
    
    $params = [];
    
    // Add filters
    if ($status) {
        $base_query .= " AND ht.status = ?";
        $params[] = $status;
    }
    
    if ($task_type) {
        $base_query .= " AND ht.task_type = ?";
        $params[] = $task_type;
    }
    
    if ($room_id) {
        $base_query .= " AND ht.room_id = ?";
        $params[] = $room_id;
    }
    
    if ($assigned_to) {
        $base_query .= " AND ht.assigned_to = ?";
        $params[] = $assigned_to;
    }
    
    if ($date_from) {
        $base_query .= " AND DATE(ht.scheduled_date) >= ?";
        $params[] = $date_from;
    }
    
    if ($date_to) {
        $base_query .= " AND DATE(ht.scheduled_date) <= ?";
        $params[] = $date_to;
    }
    
    // Get total count for pagination
    $count_query = "SELECT COUNT(*) as total FROM (" . $base_query . ") as count_table";
    $stmt = $pdo->prepare($count_query);
    $stmt->execute($params);
    $total_count = $stmt->fetch()['total'];
    
    // Add ordering and pagination
    $base_query .= " ORDER BY 
        CASE ht.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
        END,
        ht.scheduled_date ASC
        LIMIT {$limit} OFFSET {$offset}";
    
    // Remove limit and offset from params since they're now in the query
    // $params[] = $limit;
    // $params[] = $offset;
    
    // Execute the main query
    $stmt = $pdo->prepare($base_query);
    $stmt->execute($params);
    $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get checklist items for each task
    foreach ($tasks as &$task) {
        $checklist_query = "
            SELECT hci.*, tcc.completed_at
            FROM housekeeping_checklist_items hci
            LEFT JOIN task_checklist_completion tcc ON hci.id = tcc.checklist_item_id AND tcc.task_id = ?
            WHERE hci.task_type = ?
            ORDER BY hci.display_order
        ";
        $checklist_stmt = $pdo->prepare($checklist_query);
        $checklist_stmt->execute([$task['id'], $task['task_type']]);
        $checklist_items = $checklist_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate completion percentage
        $total_items = count($checklist_items);
        $completed_items = count(array_filter($checklist_items, function($item) {
            return !is_null($item['completed_at']);
        }));
        
        $task['checklist_items'] = $checklist_items;
        $task['completion_percentage'] = $total_items > 0 ? round(($completed_items / $total_items) * 100, 2) : 0;
    }
    
    // Get summary statistics
    $stats_query = "
        SELECT 
            COUNT(*) as total_tasks,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
            SUM(CASE WHEN DATE(scheduled_date) = CURDATE() THEN 1 ELSE 0 END) as today_count
        FROM housekeeping_tasks
    ";
    
    $stmt = $pdo->prepare($stats_query);
    $stmt->execute();
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Get task type distribution
    $type_distribution_query = "
        SELECT 
            task_type,
            COUNT(*) as count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
        FROM housekeeping_tasks
        GROUP BY task_type
    ";
    
    $stmt = $pdo->prepare($type_distribution_query);
    $stmt->execute();
    $type_distribution = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate pagination info
    $total_pages = ceil($total_count / $limit);
    $has_next = $page < $total_pages;
    $has_prev = $page > 1;
    
    $response = [
        'tasks' => $tasks,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_count' => $total_count,
            'limit' => $limit,
            'has_next' => $has_next,
            'has_prev' => $has_prev
        ],
        'statistics' => $stats,
        'type_distribution' => $type_distribution
    ];
    
    sendResponse(200, 'Housekeeping tasks retrieved successfully', $response);
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
