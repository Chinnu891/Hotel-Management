<?php
require_once 'utils/cors_headers.php';
require_once 'config/database.php';
require_once 'utils/logger.php';

header('Content-Type: application/json');

try {
    $database = new Database();
    $pdo = $database->getConnection();
    $logger = new Logger($pdo);
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON data']);
            exit();
        }
        
        $channel = $data['channel'] ?? 'general';
        $type = $data['type'] ?? 'notification';
        $notificationData = $data['data'] ?? $data;
        
        // Log the notification to database
        $stmt = $pdo->prepare("
            INSERT INTO notification_logs (channel, type, data, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        $stmt->execute([$channel, $type, json_encode($notificationData)]);
        
        // Try to send to WebSocket server if it's running
        $websocketData = [
            'type' => 'notification',
            'channel' => $channel,
            'data' => $notificationData,
            'timestamp' => time()
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost:8080/notify');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($websocketData));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Accept: application/json'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $logger->log('info', "Notification received and logged for channel: $channel");
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Notification received and logged',
            'websocket_status' => $httpCode === 200 ? 'sent' : 'websocket_unavailable',
            'timestamp' => time()
        ]);
        
    } else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Return status
        $stmt = $pdo->prepare("
            SELECT COUNT(*) as count 
            FROM notification_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        http_response_code(200);
        echo json_encode([
            'status' => 'running',
            'notifications_last_hour' => $result['count'],
            'timestamp' => time()
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
    }
    
} catch (Exception $e) {
    $logger->log('error', "Notification endpoint error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
?>
