<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/logger.php';

class BillingStats {
    private $db;
    private $logger;

    public function __construct($db) {
        $this->db = $db;
        $this->logger = new Logger($db);
    }

    public function getStats() {
        try {
            // Check if billing tables exist, if not return basic stats
            $tables = $this->getTableList();
            
            if (!in_array('invoices', $tables)) {
                // Billing tables don't exist yet, return basic stats
                $stats = [
                    'totalInvoices' => 0,
                    'pendingPayments' => 0,
                    'totalRevenue' => 0.00,
                    'todayPayments' => 0,
                    'monthlyRevenue' => [],
                    'recentPayments' => [],
                    'message' => 'Billing system not yet configured'
                ];
                
                $responseHandler = new ResponseHandler();
                return $responseHandler->success($stats);
            }

            // Get total invoices
            $stmt = $this->db->prepare("SELECT COUNT(*) as total FROM invoices");
            $stmt->execute();
            $totalInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get pending payments
            $stmt = $this->db->prepare("SELECT COUNT(*) as total FROM invoices WHERE status = 'pending'");
            $stmt->execute();
            $pendingPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get total revenue
            $stmt = $this->db->prepare("SELECT SUM(total_amount) as total FROM invoices WHERE status = 'paid'");
            $stmt->execute();
            $totalRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Get today's payments
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total 
                FROM payments 
                WHERE DATE(payment_date) = CURDATE()
            ");
            $stmt->execute();
            $todayPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get monthly revenue trend (last 6 months)
            $stmt = $this->db->prepare("
                SELECT 
                    DATE_FORMAT(invoice_date, '%Y-%m') as month,
                    SUM(total_amount) as revenue
                FROM invoices 
                WHERE status = 'paid' 
                AND invoice_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(invoice_date, '%Y-%m')
                ORDER BY month
            ");
            $stmt->execute();
            $monthlyRevenue = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Get recent payments (simplified query)
            $stmt = $this->db->prepare("
                SELECT 
                    p.id,
                    p.amount,
                    p.payment_method,
                    p.payment_status,
                    p.payment_date
                FROM payments p
                ORDER BY p.payment_date DESC
                LIMIT 5
            ");
            $stmt->execute();
            $recentPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stats = [
                'totalInvoices' => (int)$totalInvoices,
                'pendingPayments' => (int)$pendingPayments,
                'totalRevenue' => (float)$totalRevenue,
                'todayPayments' => (int)$todayPayments,
                'monthlyRevenue' => $monthlyRevenue,
                'recentPayments' => $recentPayments
            ];

            $responseHandler = new ResponseHandler();
            return $responseHandler->success($stats);

        } catch (Exception $e) {
            $responseHandler = new ResponseHandler();
            return $responseHandler->serverError('Failed to fetch billing statistics: ' . $e->getMessage());
        }
    }

    private function getTableList() {
        try {
            $stmt = $this->db->prepare("SHOW TABLES");
            $stmt->execute();
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            return $tables;
        } catch (Exception $e) {
            return [];
        }
    }
}

// Handle the request
try {
    $database = new Database();
    $db = $database->getConnection();
    
    $billingStats = new BillingStats($db);
    $result = $billingStats->getStats();
    
    // Set appropriate HTTP status code based on success
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    echo json_encode($result);
} catch (Exception $e) {
    $responseHandler = new ResponseHandler();
    $errorResponse = $responseHandler->serverError('Internal server error');
    http_response_code(500);
    echo json_encode($errorResponse);
}
?>
