<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/simple_jwt_helper.php';

class GuestHistoryNotifier {
    private $conn;
    private $response;
    private $jwtHelper;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
        $this->jwtHelper = new SimpleJWTHelper();
    }

    public function handleRequest() {
        // Verify JWT token and admin role
        $authResult = $this->authenticateAdmin();
        if (!$authResult['success']) {
            return $this->response->error(401, 'Unauthorized', $authResult['message']);
        }

        $action = $_GET['action'] ?? $_POST['action'] ?? '';
        
        switch ($action) {
            case 'notify_guest_update':
                return $this->notifyGuestUpdate();
            case 'notify_new_guest':
                return $this->notifyNewGuest();
            case 'notify_guest_checkout':
                return $this->notifyGuestCheckout();
            case 'get_recent_updates':
                return $this->getRecentUpdates();
            default:
                return $this->response->error(400, 'Bad Request', 'Invalid action specified');
        }
    }

    private function authenticateAdmin() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            return ['success' => false, 'message' => 'Authorization header missing or invalid'];
        }

        $token = substr($authHeader, 7);
        $decoded = $this->jwtHelper->validateToken($token);
        
        if (!$decoded) {
            return ['success' => false, 'message' => 'Invalid or expired token'];
        }

        if ($decoded['role'] !== 'admin') {
            return ['success' => false, 'message' => 'Admin access required'];
        }

        return ['success' => true, 'user_id' => $decoded['user_id'], 'role' => $decoded['role']];
    }

    private function notifyGuestUpdate() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['guest_id']) || empty($data['update_type'])) {
                return $this->response->error(400, 'Bad Request', 'Guest ID and update type required');
            }

            $guestId = $data['guest_id'];
            $updateType = $data['update_type'];
            $details = $data['details'] ?? '';
            $userId = $data['user_id'] ?? 1;

            // Create notification record
            $sql = "INSERT INTO notifications (user_id, type, title, message, data, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
            $stmt = $this->conn->prepare($sql);
            
            $title = "Guest Information Updated";
            $message = "Guest information has been updated";
            $notificationData = json_encode([
                'guest_id' => $guestId,
                'update_type' => $updateType,
                'details' => $details,
                'timestamp' => date('Y-m-d H:i:s')
            ]);

            $stmt->execute([$userId, $updateType, $title, $message, $notificationData]);
            
            if ($stmt->rowCount() > 0) {
                // Send WebSocket notification to admin channel
                $this->sendWebSocketNotification('admin', [
                    'type' => 'guest_update',
                    'guest_id' => $guestId,
                    'update_type' => $updateType,
                    'details' => $details,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);

                return $this->response->success(['message' => 'Notification sent successfully']);
            } else {
                return $this->response->error(500, 'Internal Server Error', 'Failed to create notification');
            }
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function notifyNewGuest() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['guest_id'])) {
                return $this->response->error(400, 'Bad Request', 'Guest ID required');
            }

            $guestId = $data['guest_id'];
            $guestName = $data['guest_name'] ?? 'New Guest';
            $userId = $data['user_id'] ?? 1;

            // Create notification record
            $sql = "INSERT INTO notifications (user_id, type, title, message, data, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
            $stmt = $this->conn->prepare($sql);
            
            $type = 'new_guest';
            $title = "New Guest Registration";
            $message = "New guest {$guestName} has been registered";
            $notificationData = json_encode([
                'guest_id' => $guestId,
                'guest_name' => $guestName,
                'timestamp' => date('Y-m-d H:i:s')
            ]);

            $stmt->execute([$userId, $type, $title, $message, $notificationData]);
            
            if ($stmt->rowCount() > 0) {
                // Send WebSocket notification to admin channel
                $this->sendWebSocketNotification('admin', [
                    'type' => 'new_guest',
                    'guest_id' => $guestId,
                    'guest_name' => $guestName,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);

                return $this->response->success(['message' => 'Notification sent successfully']);
            } else {
                return $this->response->error(500, 'Internal Server Error', 'Failed to create notification');
            }
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function notifyGuestCheckout() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['guest_id'])) {
                return $this->response->error(400, 'Bad Request', 'Guest ID required');
            }

            $guestId = $data['guest_id'];
            $guestName = $data['guest_name'] ?? 'Guest';
            $roomNumber = $data['room_number'] ?? '';
            $userId = $data['user_id'] ?? 1;

            // Create notification record
            $sql = "INSERT INTO notifications (user_id, type, title, message, data, created_at) VALUES (?, ?, ?, ?, ?, NOW())";
            $stmt = $this->conn->prepare($sql);
            
            $type = 'guest_checkout';
            $title = "Guest Checked Out";
            $message = "Guest {$guestName} has checked out from room {$roomNumber}";
            $notificationData = json_encode([
                'guest_id' => $guestId,
                'guest_name' => $guestName,
                'room_number' => $roomNumber,
                'timestamp' => date('Y-m-d H:i:s')
            ]);

            $stmt->execute([$userId, $type, $title, $message, $notificationData]);
            
            if ($stmt->rowCount() > 0) {
                // Send WebSocket notification to admin channel
                $this->sendWebSocketNotification('admin', [
                    'type' => 'guest_checkout',
                    'guest_id' => $guestId,
                    'guest_name' => $guestName,
                    'room_number' => $roomNumber,
                    'timestamp' => date('Y-m-d H:i:s')
                ]);

                return $this->response->success(['message' => 'Notification sent successfully']);
            } else {
                return $this->response->error(500, 'Internal Server Error', 'Failed to create notification');
            }
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function getRecentUpdates() {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
            
            $sql = "SELECT * FROM notifications WHERE type IN ('guest_update', 'new_guest', 'guest_checkout') ORDER BY created_at DESC LIMIT ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$limit]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $this->response->success(['notifications' => $result]);
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function sendWebSocketNotification($channel, $data) {
        try {
            // This would typically send a message to the WebSocket server
            // For now, we'll just log it. In a real implementation, you might:
            // 1. Use a message queue (Redis, RabbitMQ)
            // 2. Send HTTP request to WebSocket server
            // 3. Use shared memory or other IPC methods
            
            $notificationData = [
                'channel' => $channel,
                'data' => $data,
                'timestamp' => time()
            ];
            
            // Log the notification for debugging
            error_log("WebSocket notification: " . json_encode($notificationData));
            
            // In a real implementation, you would send this to your WebSocket server
            // For example, using a message queue or direct HTTP call
            
        } catch (Exception $e) {
            error_log("Error sending WebSocket notification: " . $e->getMessage());
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $notifier = new GuestHistoryNotifier($db);
        $result = $notifier->handleRequest();
        
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Internal Server Error',
            'error' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
