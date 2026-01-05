<?php
// Include centralized CORS configuration
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
    $issue_type = $_GET['issue_type'] ?? null;
    $room_number = $_GET['room_number'] ?? null;
    $assigned_to = $_GET['assigned_to'] ?? null;
    $date_from = $_GET['date_from'] ?? null;
    $date_to = $_GET['date_to'] ?? null;
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = max(1, min(100, intval($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;
    
    // Build the base query
    $base_query = "
        SELECT m.*, 
               r.floor, r.status as room_status,
               rt.name as room_type_name,
               u.full_name as assigned_to_name
        FROM maintenance m
        JOIN rooms r ON m.room_number = r.room_number
        JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN users u ON m.assigned_to = u.id
        WHERE 1=1
    ";
    
    $params = [];
    
    // Add filters
    if ($status) {
        $base_query .= " AND m.status = ?";
        $params[] = $status;
    }
    
    if ($issue_type) {
        $base_query .= " AND m.issue_type = ?";
        $params[] = $issue_type;
    }
    
    if ($room_number) {
        $base_query .= " AND m.room_number = ?";
        $params[] = $room_number;
    }
    
    if ($assigned_to) {
        $base_query .= " AND m.assigned_to = ?";
        $params[] = $assigned_to;
    }
    
    if ($date_from) {
        $base_query .= " AND DATE(m.created_at) >= ?";
        $params[] = $date_from;
    }
    
    if ($date_to) {
        $base_query .= " AND DATE(m.created_at) <= ?";
        $params[] = $date_to;
    }
    
    // Get total count for pagination
    $count_query = "SELECT COUNT(*) as total FROM (" . $base_query . ") as count_table";
    $stmt = $pdo->prepare($count_query);
    $stmt->execute($params);
    $total_count = $stmt->fetch()['total'];
    
    // Add ordering and pagination
    $base_query .= " ORDER BY m.created_at DESC
        LIMIT {$limit} OFFSET {$offset}";
    
    // Remove limit and offset from params since they're now in the query
    // $params[] = $limit;
    // $params[] = $offset;
    
    // Execute the main query
    $stmt = $pdo->prepare($base_query);
    $stmt->execute($params);
    $maintenance_items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Get summary statistics
    $stats_query = "
        SELECT 
            COUNT(*) as total_maintenance,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
        FROM maintenance
    ";
    
    $stmt = $pdo->prepare($stats_query);
    $stmt->execute();
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Calculate pagination info
    $total_pages = ceil($total_count / $limit);
    $has_next = $page < $total_pages;
    $has_prev = $page > 1;
    
    $response = [
        'maintenance_items' => $maintenance_items,
        'pagination' => [
            'current_page' => $page,
            'total_pages' => $total_pages,
            'total_count' => $total_count,
            'limit' => $limit,
            'has_next' => $has_next,
            'has_prev' => $has_prev
        ],
        'statistics' => $stats
    ];
    
    sendResponse(200, 'Maintenance data retrieved successfully', $response);
    
} catch (PDOException $e) {
    sendResponse(500, 'Database error occurred: ' . $e->getMessage());
} catch (Exception $e) {
    sendResponse(500, 'Internal server error: ' . $e->getMessage());
}
?>
