<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Ensure no output before CORS headers
if (ob_get_level()) {
    ob_end_clean();
}

// Include CORS headers
require_once __DIR__ . '/../utils/cors_headers.php';

// Set proper content type for JSON responses (after CORS headers)
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';
require_once __DIR__ . '/../utils/jwt_helper.php';
require_once __DIR__ . '/../utils/notification_service.php';

$response = new Response();

try {
    // Handle OPTIONS request first (CORS preflight)
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit(0);
    }
    
    // Verify JWT token for all other requests
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        echo json_encode($response->unauthorized('Authorization token required'));
        exit;
    }
    
    $decoded = JWTHelper::validateToken($token);
    
    if (!$decoded || $decoded['role'] !== 'reception') {
        echo json_encode($response->forbidden('Access denied. Reception role required.'));
        exit;
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Failed to establish database connection");
    }
    
    $notificationService = new NotificationService($db);
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            handleGetNotifications($db, $decoded, $response);
            break;
        case 'POST':
            handleCreateNotification($db, $decoded, $response, $notificationService);
            break;
        case 'PUT':
            handleUpdateNotification($db, $decoded, $response);
            break;
        case 'DELETE':
            handleDeleteNotification($db, $decoded, $response);
            break;
        default:
            echo json_encode($response->error('Method not allowed', 405));
            break;
    }
    
} catch (Exception $e) {
    error_log("Notification API Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    echo json_encode($response->error('Server error: ' . $e->getMessage(), 500));
}

function handleGetNotifications($db, $decoded, $response) {
    $channel = $_GET['channel'] ?? 'reception';
    $type = $_GET['type'] ?? null;
    $limit = $_GET['limit'] ?? 50;
    $offset = $_GET['offset'] ?? 0;
    $unread_only = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';
    
    try {
        $where_conditions = ['channel = ?'];
        $params = [$channel];
        
        if ($type) {
            $where_conditions[] = 'type = ?';
            $params[] = $type;
        }
        
        if ($unread_only) {
            $where_conditions[] = 'read_at IS NULL';
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        $stmt = $db->prepare("
            SELECT * FROM notification_logs 
            WHERE $where_clause
            ORDER BY created_at DESC 
            LIMIT " . (int)$limit . " OFFSET " . (int)$offset
        );
        
        $stmt->execute($params);
        
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get total count for pagination
        $count_stmt = $db->prepare("
            SELECT COUNT(*) as total FROM notification_logs 
            WHERE $where_clause
        ");
        $count_stmt->execute($params);
        $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];
        
        echo json_encode($response->success([
            'notifications' => $notifications,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'has_more' => ($offset + $limit) < $total
        ], 'Notifications retrieved successfully'));
        
    } catch (Exception $e) {
        echo json_encode($response->error('Failed to retrieve notifications: ' . $e->getMessage()));
    }
}

function handleCreateNotification($db, $decoded, $response, $notificationService) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode($response->error('Invalid JSON data'));
        exit;
    }
    
    // Validate required fields
    $required_fields = ['type', 'channel', 'data'];
    $errors = [];
    
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty($input[$field])) {
            $errors[] = "$field is required";
        }
    }
    
    if (!empty($errors)) {
        echo json_encode($response->validationError($errors));
        exit;
    }
    
    try {
        // Create notification data
        $notification_data = [
            'type' => $input['type'],
            'channel' => $input['channel'],
            'data' => $input['data'],
            'created_by' => $decoded['user_id'],
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        // Send real-time notification
        $result = $notificationService->sendRealTimeNotification(
            $input['channel'], 
            $notification_data
        );
        
        if ($result) {
            echo json_encode($response->success('Notification created and sent successfully', [
                'notification' => $notification_data
            ]));
        } else {
            echo json_encode($response->error('Failed to send notification'));
        }
        
    } catch (Exception $e) {
        echo json_encode($response->error('Failed to create notification: ' . $e->getMessage()));
    }
}

function handleUpdateNotification($db, $decoded, $response) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['notification_id'])) {
        echo json_encode($response->error('Notification ID is required'));
        exit;
    }
    
    $notification_id = $input['notification_id'];
    $action = $input['action'] ?? 'mark_read';
    
    try {
        switch ($action) {
            case 'mark_read':
                $stmt = $db->prepare("
                    UPDATE notification_logs 
                    SET read_at = NOW(), read_by = ? 
                    WHERE id = ? AND channel = 'reception'
                ");
                $stmt->execute([$decoded['user_id'], $notification_id]);
                
                if ($stmt->rowCount() > 0) {
                    echo json_encode($response->success('Notification marked as read'));
                } else {
                    echo json_encode($response->error('Notification not found or already read'));
                }
                break;
                
            case 'mark_all_read':
                $channel = $input['channel'] ?? 'reception';
                $stmt = $db->prepare("
                    UPDATE notification_logs 
                    SET read_at = NOW(), read_by = ? 
                    WHERE channel = ? AND read_at IS NULL
                ");
                $stmt->execute([$decoded['user_id'], $channel]);
                
                echo json_encode($response->success('All notifications marked as read'));
                break;
                
            default:
                echo json_encode($response->error('Invalid action'));
                break;
        }
        
    } catch (Exception $e) {
        echo json_encode($response->error('Failed to update notification: ' . $e->getMessage()));
    }
}

function handleDeleteNotification($db, $decoded, $response) {
    $notification_id = $_GET['id'] ?? null;
    
    if (!$notification_id) {
        echo json_encode($response->error('Notification ID is required'));
        exit;
    }
    
    try {
        $stmt = $db->prepare("
            DELETE FROM notification_logs 
            WHERE id = ? AND channel = 'reception'
        ");
        $stmt->execute([$notification_id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode($response->success('Notification deleted successfully'));
        } else {
            echo json_encode($response->error('Notification not found'));
        }
        
    } catch (Exception $e) {
        echo json_encode($response->error('Failed to delete notification: ' . $e->getMessage()));
    }
}
?>
