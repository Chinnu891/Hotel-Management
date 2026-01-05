<?php
// Suppress notices and warnings to prevent HTML output
error_reporting(E_ERROR | E_PARSE);
ini_set('display_errors', 0);

require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

require_once '../config/database.php';
require_once '../config/razorpay.php';
require_once '../utils/logger.php';
require_once '../vendor/autoload.php';

class RazorpayPaymentAPI {
    private $conn;
    private $logger;
    private $razorpay;
    
    public function __construct($db) {
        $this->conn = $db;
        $this->logger = new Logger($db);
        
        // Initialize Razorpay
        $this->razorpay = new Razorpay\Api\Api(
            RAZORPAY_KEY_ID,
            RAZORPAY_KEY_SECRET
        );
    }
    
    // Create Razorpay order
    public function createOrder($bookingId, $amount, $currency = 'INR') {
        try {
            $orderData = [
                'receipt' => 'booking_' . $bookingId,
                'amount' => $amount * 100, // Razorpay expects amount in paise
                'currency' => $currency,
                'notes' => [
                    'booking_id' => $bookingId
                ]
            ];
            
            $order = $this->razorpay->order->create($orderData);
            
            // Store order ID in variable to avoid overloaded property issues
            $orderId = $order->id;
            
            // Update booking with order ID
            $updateSql = "UPDATE bookings SET razorpay_order_id = :orderId WHERE id = :bookingId";
            $stmt = $this->conn->prepare($updateSql);
            $stmt->bindParam(':orderId', $orderId);
            $stmt->bindParam(':bookingId', $bookingId);
            $stmt->execute();
            
            return [
                'success' => true,
                'data' => [
                    'order_id' => $orderId,
                    'amount' => $amount,
                    'currency' => $currency,
                    'key_id' => RAZORPAY_KEY_ID
                ]
            ];
            
        } catch (Exception $e) {
            $this->logger->log('ERROR', 'createOrder: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error creating payment order'];
        }
    }
    
    // Verify payment signature
    public function verifyPayment($paymentId, $orderId, $signature) {
        try {
            $attributes = [
                'razorpay_payment_id' => $paymentId,
                'razorpay_order_id' => $orderId,
                'razorpay_signature' => $signature
            ];
            
            $this->razorpay->utility->verifyPaymentSignature($attributes);
            
            // Update booking with payment details
            $updateSql = "UPDATE bookings SET 
                         razorpay_payment_id = :paymentId,
                         payment_status = 'completed'
                         WHERE razorpay_order_id = :orderId";
            
            $stmt = $this->conn->prepare($updateSql);
            $stmt->bindParam(':paymentId', $paymentId);
            $stmt->bindParam(':orderId', $orderId);
            $stmt->execute();
            
            return ['success' => true, 'message' => 'Payment verified successfully'];
            
        } catch (Exception $e) {
            $this->logger->log('ERROR', 'verifyPayment: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Payment verification failed'];
        }
    }
    
    // Get payment status
    public function getPaymentStatus($bookingId) {
        try {
            $sql = "SELECT payment_type, payment_status, razorpay_order_id, razorpay_payment_id 
                    FROM bookings WHERE id = :bookingId";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':bookingId', $bookingId);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result) {
                return [
                    'success' => true,
                    'data' => $result
                ];
            } else {
                return ['success' => false, 'message' => 'Booking not found'];
            }
            
        } catch (Exception $e) {
            $this->logger->log('ERROR', 'getPaymentStatus: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error getting payment status'];
        }
    }
}

// Initialize database connection
$database = new Database();
$conn = $database->getConnection();

// Initialize API
$api = new RazorpayPaymentAPI($conn);

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'POST':
            switch ($action) {
                case 'create_order':
                    $input = json_decode(file_get_contents('php://input'), true);
                    $bookingId = $input['booking_id'] ?? null;
                    $amount = $input['amount'] ?? null;
                    
                    if (!$bookingId || !$amount) {
                        $result = ['success' => false, 'message' => 'Missing required fields'];
                    } else {
                        $result = $api->createOrder($bookingId, $amount);
                    }
                    break;
                    
                case 'verify_payment':
                    $input = json_decode(file_get_contents('php://input'), true);
                    $paymentId = $input['payment_id'] ?? null;
                    $orderId = $input['order_id'] ?? null;
                    $signature = $input['signature'] ?? null;
                    
                    if (!$paymentId || !$orderId || !$signature) {
                        $result = ['success' => false, 'message' => 'Missing required fields'];
                    } else {
                        $result = $api->verifyPayment($paymentId, $orderId, $signature);
                    }
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        case 'GET':
            switch ($action) {
                case 'status':
                    $bookingId = $_GET['booking_id'] ?? null;
                    
                    if (!$bookingId) {
                        $result = ['success' => false, 'message' => 'Missing booking ID'];
                    } else {
                        $result = $api->getPaymentStatus($bookingId);
                    }
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Method not allowed'];
    }
    
} catch (Exception $e) {
    $result = ['success' => false, 'message' => 'Server error: ' . $e->getMessage()];
}

echo json_encode($result);
?>
