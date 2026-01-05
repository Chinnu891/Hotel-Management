<?php
require_once 'config/cors.php';
require_once 'config/database.php';
require_once 'utils/logger.php';

class WebSocketNotificationEndpoint {
    private $db;
    private $logger;
    private $websocketServerUrl;
    
    public function __construct($db) {
        $this->db = $db;
        $this->logger = new Logger($db);
        $this->websocketServerUrl = 'http://localhost:8080';
    }
    
    /**
     * Handle incoming notification requests
     */
    public function handleNotification($data) {
        try {
            $type = $data['type'] ?? '';
            $channel = $data['channel'] ?? 'general';
            
            switch ($type) {
                case 'payment_received':
                    return $this->handlePaymentReceived($data, $channel);
                    
                case 'payment_status_changed':
                    return $this->handlePaymentStatusChanged($data, $channel);
                    
                case 'payment_refunded':
                    return $this->handlePaymentRefunded($data, $channel);
                    
                case 'payment_failed':
                    return $this->handlePaymentFailed($data, $channel);
                    
                case 'online_payment_verified':
                    return $this->handleOnlinePaymentVerified($data, $channel);
                    
                case 'payment_update':
                    return $this->handlePaymentUpdate($data, $channel);
                    
                case 'daily_payment_summary':
                    return $this->handleDailyPaymentSummary($data, $channel);
                    
                default:
                    return $this->sendResponse(false, "Unknown notification type: {$type}");
            }
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling notification: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Internal server error");
        }
    }
    
    /**
     * Handle new payment received notification
     */
    private function handlePaymentReceived($data, $channel) {
        try {
            $notificationData = $data['data'] ?? [];
            
            // Validate required fields
            if (empty($notificationData['receipt_number']) || empty($notificationData['amount'])) {
                return $this->sendResponse(false, "Missing required payment data");
            }
            
            // Store notification in database
            $this->storeNotification($channel, 'payment_received', $notificationData);
            
            // Broadcast to WebSocket server
            $this->broadcastToWebSocket($channel, [
                'type' => 'payment_received',
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            // Log the notification
            $this->logger->log(
                0,
                'notification_processed',
                'websocket_notifications',
                0,
                "Payment received notification processed for receipt {$notificationData['receipt_number']}"
            );
            
            return $this->sendResponse(true, "Payment notification sent successfully");
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling payment received: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Failed to process payment notification");
        }
    }
    
    /**
     * Handle payment status change notification
     */
    private function handlePaymentStatusChanged($data, $channel) {
        try {
            $notificationData = $data['data'] ?? [];
            
            // Validate required fields
            if (empty($notificationData['receipt_number']) || empty($notificationData['new_status'])) {
                return $this->sendResponse(false, "Missing required status change data");
            }
            
            // Store notification in database
            $this->storeNotification($channel, 'payment_status_changed', $notificationData);
            
            // Broadcast to WebSocket server
            $this->broadcastToWebSocket($channel, [
                'type' => 'payment_status_changed',
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            return $this->sendResponse(true, "Status change notification sent successfully");
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling status change: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Failed to process status change notification");
        }
    }
    
    /**
     * Handle payment refund notification
     */
    private function handlePaymentRefunded($data, $channel) {
        try {
            $notificationData = $data['data'] ?? [];
            
            // Validate required fields
            if (empty($notificationData['receipt_number']) || empty($notificationData['refund_amount'])) {
                return $this->sendResponse(false, "Missing required refund data");
            }
            
            // Store notification in database
            $this->storeNotification($channel, 'payment_refunded', $notificationData);
            
            // Broadcast to WebSocket server
            $this->broadcastToWebSocket($channel, [
                'type' => 'payment_refunded',
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            return $this->sendResponse(true, "Refund notification sent successfully");
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling refund: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Failed to process refund notification");
        }
    }
    
    /**
     * Handle payment failure notification
     */
    private function handlePaymentFailed($data, $channel) {
        try {
            $notificationData = $data['data'] ?? [];
            
            // Validate required fields
            if (empty($notificationData['receipt_number']) || empty($notificationData['failure_reason'])) {
                return $this->sendResponse(false, "Missing required failure data");
            }
            
            // Store notification in database
            $this->storeNotification($channel, 'payment_failed', $notificationData);
            
            // Broadcast to WebSocket server
            $this->broadcastToWebSocket($channel, [
                'type' => 'payment_failed',
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            return $this->sendResponse(true, "Failure notification sent successfully");
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling failure: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Failed to process failure notification");
        }
    }
    
    /**
     * Handle online payment verification notification
     */
    private function handleOnlinePaymentVerified($data, $channel) {
        try {
            $notificationData = $data['data'] ?? [];
            
            // Validate required fields
            if (empty($notificationData['receipt_number']) || empty($notificationData['verification_status'])) {
                return $this->sendResponse(false, "Missing required verification data");
            }
            
            // Store notification in database
            $this->storeNotification($channel, 'online_payment_verified', $notificationData);
            
            // Broadcast to WebSocket server
            $this->broadcastToWebSocket($channel, [
                'type' => 'online_payment_verified',
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            return $this->sendResponse(true, "Verification notification sent successfully");
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling verification: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Failed to process verification notification");
        }
    }
    
    /**
     * Handle general payment update notification
     */
    private function handlePaymentUpdate($data, $channel) {
        try {
            $notificationData = $data['data'] ?? [];
            
            // Store notification in database
            $this->storeNotification($channel, 'payment_update', $notificationData);
            
            // Broadcast to WebSocket server
            $this->broadcastToWebSocket($channel, [
                'type' => 'payment_update',
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            return $this->sendResponse(true, "Payment update notification sent successfully");
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling payment update: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Failed to process payment update notification");
        }
    }
    
    /**
     * Handle daily payment summary notification
     */
    private function handleDailyPaymentSummary($data, $channel) {
        try {
            $notificationData = $data['data'] ?? [];
            
            // Validate required fields
            if (empty($notificationData['date']) || !isset($notificationData['total_payments'])) {
                return $this->sendResponse(false, "Missing required summary data");
            }
            
            // Store notification in database
            $this->storeNotification($channel, 'daily_payment_summary', $notificationData);
            
            // Broadcast to WebSocket server
            $this->broadcastToWebSocket($channel, [
                'type' => 'daily_payment_summary',
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            return $this->sendResponse(true, "Daily summary notification sent successfully");
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Error handling daily summary: " . $e->getMessage()
            );
            return $this->sendResponse(false, "Failed to process daily summary notification");
        }
    }
    
    /**
     * Store notification in database
     */
    private function storeNotification($channel, $type, $data) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO notification_logs (channel, type, data, created_at)
                VALUES (?, ?, ?, NOW())
            ");
            
            $dataJson = json_encode($data);
            $stmt->bind_param("sss", $channel, $type, $dataJson);
            $stmt->execute();
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'websocket_notifications',
                0,
                "Failed to store notification: " . $e->getMessage()
            );
        }
    }
    
    /**
     * Broadcast notification to WebSocket server
     */
    private function broadcastToWebSocket($channel, $data) {
        try {
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $this->websocketServerUrl . '/broadcast');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'channel' => $channel,
                'data' => $data
            ]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode !== 200) {
                throw new Exception("WebSocket server returned HTTP {$httpCode}");
            }
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'warning',
                'websocket_notifications',
                0,
                "WebSocket server not available: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Send response
     */
    private function sendResponse($success, $message, $data = null) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data' => $data,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            exit;
        }
        
        $database = new Database();
        $db = $database->getConnection();
        
    $endpoint = new WebSocketNotificationEndpoint($db);
    $endpoint->handleNotification($input);
    
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
