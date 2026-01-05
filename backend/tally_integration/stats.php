<?php
require_once __DIR__ . '/../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/simple_jwt_helper.php';

class TallyStats {
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

        return $this->getFinancialStats();
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

    private function getFinancialStats() {
        try {
            $stats = [];
            
            // Get total transactions count
            $sql = "SELECT COUNT(*) as total_transactions FROM payments WHERE payment_status = 'completed'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['totalTransactions'] = (int)$result['total_transactions'];
            
            // Get total revenue
            $sql = "SELECT SUM(amount) as total_revenue FROM payments WHERE payment_status = 'completed'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['totalRevenue'] = (float)($result['total_revenue'] ?? 0);
            
            // Get cash payments
            $sql = "SELECT SUM(amount) as cash_payments FROM payments WHERE payment_status = 'completed' AND payment_method = 'cash'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['cashPayments'] = (float)($result['cash_payments'] ?? 0);
            
            // Get card payments (credit + debit)
            $sql = "SELECT SUM(amount) as card_payments FROM payments WHERE payment_status = 'completed' AND payment_method IN ('credit_card', 'debit_card')";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['cardPayments'] = (float)($result['card_payments'] ?? 0);
            
            // Get UPI payments
            $sql = "SELECT SUM(amount) as upi_payments FROM payments WHERE payment_status = 'completed' AND payment_method = 'upi'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['upiPayments'] = (float)($result['upi_payments'] ?? 0);
            
            // Get bank transfer payments
            $sql = "SELECT SUM(amount) as bank_transfers FROM payments WHERE payment_status = 'completed' AND payment_method = 'bank_transfer'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['bankTransfers'] = (float)($result['bank_transfers'] ?? 0);
            
            // Get cheque payments
            $sql = "SELECT SUM(amount) as cheque_payments FROM payments WHERE payment_status = 'completed' AND payment_method = 'cheque'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['chequePayments'] = (float)($result['cheque_payments'] ?? 0);
            
            // Get online wallet payments
            $sql = "SELECT SUM(amount) as wallet_payments FROM payments WHERE payment_status = 'completed' AND payment_method = 'online_wallet'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['walletPayments'] = (float)($result['wallet_payments'] ?? 0);
            
            // Get today's transactions
            $sql = "SELECT COUNT(*) as today_transactions, SUM(amount) as today_revenue FROM payments WHERE payment_status = 'completed' AND DATE(payment_date) = CURDATE()";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['todayTransactions'] = (int)$result['today_transactions'];
            $stats['todayRevenue'] = (float)($result['today_revenue'] ?? 0);
            
            // Get this month's transactions
            $sql = "SELECT COUNT(*) as month_transactions, SUM(amount) as month_revenue FROM payments WHERE payment_status = 'completed' AND YEAR(payment_date) = YEAR(CURDATE()) AND MONTH(payment_date) = MONTH(CURDATE())";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['monthTransactions'] = (int)$result['month_transactions'];
            $stats['monthRevenue'] = (float)($result['month_revenue'] ?? 0);
            
            // Get this year's transactions
            $sql = "SELECT COUNT(*) as year_transactions, SUM(amount) as year_revenue FROM payments WHERE payment_status = 'completed' AND YEAR(payment_date) = YEAR(CURDATE())";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['yearTransactions'] = (int)$result['year_transactions'];
            $stats['yearRevenue'] = (float)($result['year_revenue'] ?? 0);
            
            // Get pending payments
            $sql = "SELECT COUNT(*) as pending_count, SUM(amount) as pending_amount FROM payments WHERE payment_status = 'pending'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['pendingPayments'] = (int)$result['pending_count'];
            $stats['pendingAmount'] = (float)($result['pending_amount'] ?? 0);
            
            // Get failed payments
            $sql = "SELECT COUNT(*) as failed_count, SUM(amount) as failed_amount FROM payments WHERE payment_status = 'failed'";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $stats['failedPayments'] = (int)$result['failed_count'];
            $stats['failedAmount'] = (float)($result['failed_amount'] ?? 0);
            
            return $this->response->success(['data' => $stats]);
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $stats = new TallyStats($db);
        $result = $stats->handleRequest();
        
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
