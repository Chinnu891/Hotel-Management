<?php
require_once 'vendor/autoload.php';
require_once 'config/database.php';
require_once 'utils/logger.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServerInterface;
use Ratchet\Http\Request;
use Ratchet\Http\Response;

class RealTimeServer implements MessageComponentInterface, HttpServerInterface {
    protected $clients;
    protected $subscriptions;
    protected $pdo;
    protected $logger;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->subscriptions = [];
        
        // Initialize database connection
        $database = new Database();
        $this->pdo = $database->getConnection();
        
        // Initialize logger
        $this->logger = new Logger($this->pdo);
    }

    public function onOpen(ConnectionInterface $conn, $request = null) {
        $this->clients->attach($conn);
        $this->logger->log('info', "New WebSocket connection: {$conn->resourceId}");
        
        echo "New connection! ({$conn->resourceId})\n";
        
        // Send welcome message
        $this->sendToClient($conn, [
            'type' => 'connected',
            'message' => 'Connected to real-time notification server',
            'connection_id' => $conn->resourceId,
            'timestamp' => time()
        ]);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        if (!$data) {
            return;
        }

        switch ($data['type']) {
            case 'subscribe':
                $this->handleSubscribe($from, $data['channel']);
                break;
                
            case 'unsubscribe':
                $this->handleUnsubscribe($from, $data['channel']);
                break;
                
            case 'ping':
                $this->sendToClient($from, ['type' => 'pong', 'timestamp' => time()]);
                break;
                
            default:
                echo "Unknown message type: {$data['type']}\n";
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        $this->logger->log('info', "Connection closed: {$conn->resourceId}");
        
        // Remove from all subscriptions
        foreach ($this->subscriptions as $channel => $clients) {
            if (isset($clients[$conn->resourceId])) {
                unset($this->subscriptions[$channel][$conn->resourceId]);
            }
        }
        
        echo "Connection {$conn->resourceId} has disconnected\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->logger->log('error', "WebSocket error: {$e->getMessage()}");
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }

    protected function handleSubscribe(ConnectionInterface $conn, $channel) {
        if (!isset($this->subscriptions[$channel])) {
            $this->subscriptions[$channel] = [];
        }
        
        $this->subscriptions[$channel][$conn->resourceId] = $conn;
        
        $this->sendToClient($conn, [
            'type' => 'subscribed',
            'channel' => $channel,
            'timestamp' => time()
        ]);
        
        $this->logger->log('info', "Client {$conn->resourceId} subscribed to channel: $channel");
        echo "Client {$conn->resourceId} subscribed to channel: $channel\n";
    }

    protected function handleUnsubscribe(ConnectionInterface $conn, $channel) {
        if (isset($this->subscriptions[$channel][$conn->resourceId])) {
            unset($this->subscriptions[$channel][$conn->resourceId]);
            
            $this->sendToClient($conn, [
                'type' => 'unsubscribed',
                'channel' => $channel,
                'timestamp' => time()
            ]);
            
            $this->logger->log('info', "Client {$conn->resourceId} unsubscribed from channel: $channel");
            echo "Client {$conn->resourceId} unsubscribed from channel: $channel\n";
        }
    }

    public function onRequest(Request $request, Response $response) {
        $path = $request->getUri()->getPath();
        $method = $request->getMethod();
        
        echo "HTTP Request: {$method} {$path}\n";
        
        if ($path === '/notify' && $method === 'POST') {
            $this->handleNotificationRequest($request, $response);
        } else if ($path === '/status') {
            $this->handleStatusRequest($response);
        } else {
            $response->withStatus(404);
            $response->end('Not Found');
        }
    }

    protected function handleNotificationRequest(Request $request, Response $response) {
        try {
            $body = $request->getBody();
            $data = json_decode($body, true);
            
            if (!$data) {
                $response->withStatus(400);
                $response->end(json_encode(['error' => 'Invalid JSON']));
                return;
            }
            
            $channel = $data['channel'] ?? 'general';
            $notificationData = $data['data'] ?? $data;
            
            // Broadcast to subscribed clients
            $this->broadcastToChannel($channel, [
                'type' => 'notification',
                'channel' => $channel,
                'data' => $notificationData,
                'timestamp' => time()
            ]);
            
            // Log the notification
            $this->logNotification($channel, $data['type'] ?? 'notification', $data);
            
            $response->withStatus(200);
            $response->end(json_encode([
                'success' => true,
                'message' => 'Notification sent successfully',
                'timestamp' => time()
            ]));
            
            $this->logger->log('info', "HTTP notification processed for channel: $channel");
            
        } catch (Exception $e) {
            $this->logger->log('error', "Error processing HTTP notification: " . $e->getMessage());
            $response->withStatus(500);
            $response->end(json_encode(['error' => 'Internal server error']));
        }
    }

    protected function handleStatusRequest(Response $response) {
        $status = [
            'status' => 'running',
            'timestamp' => time(),
            'connections' => $this->clients->count(),
            'channels' => array_map(function($clients) {
                return count($clients);
            }, $this->subscriptions),
            'total_subscriptions' => array_sum(array_map('count', $this->subscriptions))
        ];
        
        $response->withStatus(200);
        $response->end(json_encode($status));
    }

    protected function logNotification($channel, $type, $data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO notification_logs (channel, type, data, created_at)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([$channel, $type, json_encode($data)]);
        } catch (Exception $e) {
            $this->logger->log('error', "Failed to log notification: " . $e->getMessage());
        }
    }

    public function broadcastToChannel($channel, $message) {
        if (!isset($this->subscriptions[$channel])) {
            return;
        }
        
        foreach ($this->subscriptions[$channel] as $client) {
            $this->sendToClient($client, $message);
        }
        
        $this->logger->log('info', "Broadcasted message to channel: $channel");
    }

    public function broadcastToAll($message) {
        foreach ($this->clients as $client) {
            $this->sendToClient($client, $message);
        }
        
        $this->logger->log('info', "Broadcasted message to all clients");
    }

    protected function sendToClient($client, $message) {
        try {
            $client->send(json_encode($message));
        } catch (Exception $e) {
            $this->logger->log('error', "Failed to send message to client: {$e->getMessage()}");
        }
    }
}

// Create WebSocket server with HTTP support
$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new RealTimeServer()
        )
    ),
    8080
);

echo "WebSocket server started on port 8080\n";
echo "WebSocket notifications are available\n";
echo "HTTP notification endpoint: http://localhost:8080/notify\n";
echo "Status endpoint: http://localhost:8080/status\n";

$server->run();
?>
