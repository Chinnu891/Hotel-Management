<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/logger.php';
require_once '../utils/jwt_helper.php';

// Debug: Log the request
error_log("Activity logs request received: " . $_SERVER['REQUEST_METHOD'] . " " . $_SERVER['REQUEST_URI']);
error_log("GET parameters: " . print_r($_GET, true));

class ActivityLogs {
    private $db;
    private $logger;
    private $responseHandler;

    public function __construct($db) {
        $this->db = $db;
        $this->logger = new Logger($db);
        $this->responseHandler = new ResponseHandler();
    }

    public function getActivityLogs($filters = []) {
        try {
            $whereConditions = [];
            $params = [];
            
            // Build WHERE clause based on filters
            if (!empty($filters['user_id'])) {
                $whereConditions[] = "al.user_id = ?";
                $params[] = $filters['user_id'];
            }
            
            if (!empty($filters['action'])) {
                $whereConditions[] = "al.action = ?";
                $params[] = $filters['action'];
            }
            
            if (!empty($filters['table_name'])) {
                $whereConditions[] = "al.table_name = ?";
                $params[] = $filters['table_name'];
            }
            
            if (!empty($filters['start_date'])) {
                $whereConditions[] = "DATE(al.created_at) >= ?";
                $params[] = $filters['start_date'];
            }
            
            if (!empty($filters['end_date'])) {
                $whereConditions[] = "DATE(al.created_at) <= ?";
                $params[] = $filters['end_date'];
            }
            
            if (!empty($filters['ip_address'])) {
                $whereConditions[] = "al.ip_address = ?";
                $params[] = $filters['ip_address'];
            }

            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            // Build the main query
            $query = "
                SELECT 
                    al.id,
                    al.user_id,
                    u.username,
                    u.full_name,
                    al.action,
                    al.table_name,
                    al.record_id,
                    al.details,
                    al.ip_address,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                {$whereClause}
                ORDER BY al.created_at DESC
            ";
            
            // Add pagination
            $page = isset($filters['page']) ? (int)$filters['page'] : 1;
            $limit = isset($filters['limit']) ? (int)$filters['limit'] : 50;
            $offset = ($page - 1) * $limit;
            
            $query .= " LIMIT {$limit} OFFSET {$offset}";
            // Remove limit and offset from params since they're now in the query
            // $params[] = $limit;
            // $params[] = $offset;

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get total count for pagination
            $countQuery = "
                SELECT COUNT(*) as total
                FROM activity_logs al
                {$whereClause}
            ";
            
            $countStmt = $this->db->prepare($countQuery);
            $countStmt->execute($params); // Use all params since limit/offset are not in params anymore
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            return $this->responseHandler->success([
                'logs' => $logs,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => (int)$totalCount,
                    'total_pages' => ceil($totalCount / $limit)
                ]
            ]);

        } catch (Exception $e) {
            $this->logger->log('error', 'Failed to fetch activity logs: ' . $e->getMessage());
            return $this->responseHandler->serverError('Failed to fetch activity logs');
        }
    }

    public function getActivityStats() {
        try {
            // Get activity count by action type
            $stmt = $this->db->prepare("
                SELECT 
                    action,
                    COUNT(*) as count
                FROM activity_logs
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY action
                ORDER BY count DESC
            ");
            $stmt->execute();
            $actionStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get activity count by user
            $stmt = $this->db->prepare("
                SELECT 
                    u.username,
                    u.full_name,
                    COUNT(al.id) as activity_count
                FROM users u
                LEFT JOIN activity_logs al ON u.id = al.user_id
                WHERE al.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY u.id, u.username, u.full_name
                ORDER BY activity_count DESC
                LIMIT 10
            ");
            $stmt->execute();
            $userStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get daily activity trend
            $stmt = $this->db->prepare("
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as activity_count
                FROM activity_logs
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY DATE(created_at)
                ORDER BY date
            ");
            $stmt->execute();
            $dailyTrend = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get activity by table
            $stmt = $this->db->prepare("
                SELECT 
                    table_name,
                    COUNT(*) as count
                FROM activity_logs
                WHERE table_name IS NOT NULL
                AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY table_name
                ORDER BY count DESC
            ");
            $stmt->execute();
            $tableStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'action_stats' => $actionStats,
                'user_stats' => $userStats,
                'daily_trend' => $dailyTrend,
                'table_stats' => $tableStats
            ]);

        } catch (Exception $e) {
            // $this->logger->log('error', 'Failed to fetch activity stats: ' . $e->getMessage()); // Temporarily disabled
            return $this->responseHandler->serverError('Failed to fetch activity statistics');
        }
    }

    public function getRecentActivity($limit = 10) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    al.id,
                    al.user_id,
                    u.username,
                    u.full_name,
                    al.action,
                    al.table_name,
                    al.record_id,
                    al.details,
                    al.ip_address,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                ORDER BY al.created_at DESC
                LIMIT {$limit}
            ");
            $stmt->execute(); // No parameters needed
            $recentLogs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'recent_activity' => $recentLogs
            ]);

        } catch (Exception $e) {
            $this->logger->log('error', 'Failed to fetch recent activity: ' . $e->getMessage());
            return $this->responseHandler->serverError('Failed to fetch recent activity');
        }
    }

    public function searchActivityLogs($searchTerm, $filters = []) {
        try {
            $whereConditions = ["(al.action LIKE ? OR al.details LIKE ? OR al.table_name LIKE ?)"];
            $params = ["%{$searchTerm}%", "%{$searchTerm}%", "%{$searchTerm}%"];
            
            // Add additional filters
            if (!empty($filters['user_id'])) {
                $whereConditions[] = "al.user_id = ?";
                $params[] = $filters['user_id'];
            }
            
            if (!empty($filters['start_date'])) {
                $whereConditions[] = "DATE(al.created_at) >= ?";
                $params[] = $filters['start_date'];
            }
            
            if (!empty($filters['end_date'])) {
                $whereConditions[] = "DATE(al.created_at) <= ?";
                $params[] = $filters['end_date'];
            }

            $whereClause = "WHERE " . implode(" AND ", $whereConditions);
            
            $query = "
                SELECT 
                    al.id,
                    al.user_id,
                    u.username,
                    u.full_name,
                    al.action,
                    al.table_name,
                    al.record_id,
                    al.details,
                    al.ip_address,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                {$whereClause}
                ORDER BY al.created_at DESC
                LIMIT 100
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $searchResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'search_results' => $searchResults,
                'search_term' => $searchTerm,
                'total_results' => count($searchResults)
            ]);

        } catch (Exception $e) {
            // $this->logger->log('error', 'Failed to search activity logs: ' . $e->getMessage()); // Temporarily disabled
            return $this->responseHandler->serverError('Failed to search activity logs');
        }
    }

    public function exportActivityLogs($filters = [], $format = 'csv') {
        try {
            $whereConditions = [];
            $params = [];
            
            // Build WHERE clause based on filters
            if (!empty($filters['user_id'])) {
                $whereConditions[] = "al.user_id = ?";
                $params[] = $filters['user_id'];
            }
            
            if (!empty($filters['action'])) {
                $whereConditions[] = "al.action = ?";
                $params[] = $filters['action'];
            }
            
            if (!empty($filters['start_date'])) {
                $whereConditions[] = "DATE(al.created_at) >= ?";
                $params[] = $filters['start_date'];
            }
            
            if (!empty($filters['end_date'])) {
                $whereConditions[] = "DATE(al.created_at) <= ?";
                $params[] = $filters['end_date'];
            }

            $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
            
            $query = "
                SELECT 
                    al.id,
                    u.username,
                    u.full_name,
                    al.action,
                    al.table_name,
                    al.record_id,
                    al.details,
                    al.ip_address,
                    al.created_at
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                {$whereClause}
                ORDER BY al.created_at DESC
            ";

            $stmt = $this->db->prepare($query);
            $stmt->execute($params);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if ($format === 'csv') {
                return $this->generateCSV($logs);
            } else {
                return $this->responseHandler->success([
                    'export_data' => $logs,
                    'format' => $format
                ]);
            }

        } catch (Exception $e) {
            // $this->logger->log('error', 'Failed to export activity logs: ' . $e->getMessage()); // Temporarily disabled
            return $this->responseHandler->serverError('Failed to export activity logs');
        }
    }

    private function generateCSV($data) {
        if (empty($data)) {
            return $this->responseHandler->badRequest('No data to export');
        }

        $filename = 'activity_logs_' . date('Y-m-d_H-i-s') . '.csv';
        
        // Set headers for CSV download
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Pragma: no-cache');
        header('Expires: 0');

        $output = fopen('php://output', 'w');
        
        // Add CSV headers
        fputcsv($output, array_keys($data[0]));
        
        // Add data rows
        foreach ($data as $row) {
            fputcsv($output, $row);
        }
        
        fclose($output);
        exit;
    }

    public function getActivitySummary() {
        try {
            // Total activities today
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as today_count
                FROM activity_logs
                WHERE DATE(created_at) = CURDATE()
            ");
            $stmt->execute();
            $todayCount = $stmt->fetch(PDO::FETCH_ASSOC)['today_count'];

            // Total activities this week
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as week_count
                FROM activity_logs
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
            ");
            $stmt->execute();
            $weekCount = $stmt->fetch(PDO::FETCH_ASSOC)['week_count'];

            // Total activities this month
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as month_count
                FROM activity_logs
                WHERE MONTH(created_at) = MONTH(CURDATE())
                AND YEAR(created_at) = YEAR(CURDATE())
            ");
            $stmt->execute();
            $monthCount = $stmt->fetch(PDO::FETCH_ASSOC)['month_count'];

            // Most active user today
            $stmt = $this->db->prepare("
                SELECT 
                    u.username,
                    u.full_name,
                    COUNT(al.id) as activity_count
                FROM users u
                JOIN activity_logs al ON u.id = al.user_id
                WHERE DATE(al.created_at) = CURDATE()
                GROUP BY u.id, u.username, u.full_name
                ORDER BY activity_count DESC
                LIMIT 1
            ");
            $stmt->execute();
            $mostActiveUser = $stmt->fetch(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'today_count' => (int)$todayCount,
                'week_count' => (int)$weekCount,
                'month_count' => (int)$monthCount,
                'most_active_user' => $mostActiveUser
            ]);

        } catch (Exception $e) {
            // $this->logger->log('error', 'Failed to fetch activity summary: ' . $e->getMessage()); // Temporarily disabled
            return $this->responseHandler->serverError('Failed to fetch activity summary');
        }
    }
}

// Handle the request
try {
    $database = new Database();
    $db = $database->getConnection();
    
    $activityLogs = new ActivityLogs($db);
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        if (isset($_GET['action'])) {
            switch ($_GET['action']) {
                case 'logs':
                    $filters = [
                        'user_id' => $_GET['user_id'] ?? null,
                        'action' => $_GET['action_type'] ?? null,
                        'table_name' => $_GET['table_name'] ?? null,
                        'start_date' => $_GET['start_date'] ?? null,
                        'end_date' => $_GET['end_date'] ?? null,
                        'ip_address' => $_GET['ip_address'] ?? null,
                        'page' => $_GET['page'] ?? 1,
                        'limit' => $_GET['limit'] ?? 50
                    ];
                    $result = $activityLogs->getActivityLogs($filters);
                    break;
                    
                case 'stats':
                    $result = $activityLogs->getActivityStats();
                    break;
                    
                case 'recent':
                    $limit = $_GET['limit'] ?? 10;
                    $result = $activityLogs->getRecentActivity($limit);
                    break;
                    
                case 'search':
                    $searchTerm = $_GET['q'] ?? '';
                    $filters = [
                        'user_id' => $_GET['user_id'] ?? null,
                        'start_date' => $_GET['start_date'] ?? null,
                        'end_date' => $_GET['end_date'] ?? null
                    ];
                    $result = $activityLogs->searchActivityLogs($searchTerm, $filters);
                    break;
                    
                case 'export':
                    $filters = [
                        'user_id' => $_GET['user_id'] ?? null,
                        'action' => $_GET['action_type'] ?? null,
                        'start_date' => $_GET['start_date'] ?? null,
                        'end_date' => $_GET['end_date'] ?? null
                    ];
                    $format = $_GET['format'] ?? 'csv';
                    $result = $activityLogs->exportActivityLogs($filters, $format);
                    break;
                    
                case 'summary':
                    $result = $activityLogs->getActivitySummary();
                    break;
                    
                default:
                    $result = $activityLogs->responseHandler->badRequest('Invalid action parameter');
            }
        } else {
            // Default to recent activity
            $result = $activityLogs->getRecentActivity();
        }
    } else {
        $result = $activityLogs->responseHandler->methodNotAllowed('Only GET method is allowed');
    }
    
    // Set appropriate HTTP status code
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    $responseHandler = new ResponseHandler();
    $errorResponse = $responseHandler->serverError('Internal server error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode($errorResponse);
}
?>
