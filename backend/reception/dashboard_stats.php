<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/logger.php';

class DashboardStats {
    private $db;
    private $logger;

    public function __construct($db) {
        $this->db = $db;
        $this->logger = new Logger($db);
    }

    public function getDashboardStats() {
        try {
            $today = date('Y-m-d');
            $current_time = date('H:i:s');
            
            // Get today's statistics
            $stats = [
                'today_checkins' => $this->getTodayCheckins($today),
                'today_checkouts' => $this->getTodayCheckouts($today),
                'overdue_checkouts' => $this->getOverdueCheckouts($today),
                'current_guests' => $this->getCurrentGuests(),
                'room_status_summary' => $this->getRoomStatusSummary(),
                'maintenance_summary' => $this->getMaintenanceSummary(),
                'housekeeping_summary' => $this->getHousekeepingSummary(),
                'billing_summary' => $this->getBillingSummary($today),
                'recent_activity' => $this->getRecentActivity(),
                'upcoming_checkins' => $this->getUpcomingCheckins($today),
                'timestamp' => date('Y-m-d H:i:s'),
                'server_time' => $current_time
            ];

            $responseHandler = new ResponseHandler();
            return $responseHandler->success($stats, 'Dashboard statistics retrieved successfully');

        } catch (Exception $e) {
            $this->logger->log(0, 'error', 'dashboard', 0, "Dashboard stats error: " . $e->getMessage());
            $responseHandler = new ResponseHandler();
            return $responseHandler->serverError('Failed to fetch dashboard statistics: ' . $e->getMessage());
        }
    }

    private function getTodayCheckins($today) {
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN b.status = 'checked_in' THEN 1 ELSE 0 END) as completed,
                       SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as pending
                FROM bookings b
                WHERE b.check_in_date = ? AND b.status IN ('confirmed', 'checked_in')
            ");
            $stmt->execute([$today]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return ['total' => 0, 'completed' => 0, 'pending' => 0];
        }
    }

    private function getTodayCheckouts($today) {
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN b.status = 'checked_out' THEN 1 ELSE 0 END) as completed,
                       SUM(CASE WHEN b.status = 'checked_in' THEN 1 ELSE 0 END) as pending
                FROM bookings b
                WHERE b.check_out_date = ? AND b.status IN ('checked_in', 'checked_out')
            ");
            $stmt->execute([$today]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return ['total' => 0, 'completed' => 0, 'pending' => 0];
        }
    }

    private function getOverdueCheckouts($today) {
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN b.status = 'checked_in' THEN 1 ELSE 0 END) as overdue
                FROM bookings b
                WHERE b.check_out_date < ? AND b.status = 'checked_in'
            ");
            $stmt->execute([$today]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return ['total' => 0, 'overdue' => 0];
        }
    }

    private function getCurrentGuests() {
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total
                FROM bookings b
                WHERE b.status = 'checked_in'
            ");
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        } catch (Exception $e) {
            return 0;
        }
    }

    private function getRoomStatusSummary() {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    r.status,
                    COUNT(*) as count
                FROM rooms r
                GROUP BY r.status
            ");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $summary = [
                'available' => 0,
                'occupied' => 0,
                'cleaning' => 0,
                'maintenance' => 0,
                'total' => 0
            ];
            
            foreach ($results as $row) {
                $summary[$row['status']] = (int)$row['count'];
                $summary['total'] += (int)$row['count'];
            }
            
            return $summary;
        } catch (Exception $e) {
            return ['available' => 0, 'occupied' => 0, 'cleaning' => 0, 'maintenance' => 0, 'total' => 0];
        }
    }

    private function getMaintenanceSummary() {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
                    SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority,
                    SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority,
                    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM maintenance
                WHERE status != 'cancelled'
            ");
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return ['total' => 0, 'high_priority' => 0, 'medium_priority' => 0, 'low_priority' => 0, 'open' => 0, 'in_progress' => 0, 'completed' => 0];
        }
    }

    private function getHousekeepingSummary() {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
                FROM housekeeping_tasks
                WHERE DATE(created_at) = CURDATE()
            ");
            $stmt->execute();
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return ['total' => 0, 'pending' => 0, 'in_progress' => 0, 'completed' => 0];
        }
    }

    private function getBillingSummary($today) {
        try {
            // Check if billing tables exist
            $tables = $this->getTableList();
            
            if (!in_array('invoices', $tables)) {
                return [
                    'total_revenue' => 0,
                    'today_revenue' => 0,
                    'pending_payments' => 0,
                    'monthly_trend' => []
                ];
            }

            // Get total revenue
            $stmt = $this->db->prepare("
                SELECT SUM(total_amount) as total
                FROM invoices 
                WHERE status = 'paid'
            ");
            $stmt->execute();
            $total_revenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Get today's revenue
            $stmt = $this->db->prepare("
                SELECT SUM(total_amount) as total
                FROM invoices 
                WHERE status = 'paid' AND DATE(invoice_date) = ?
            ");
            $stmt->execute([$today]);
            $today_revenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Get pending payments
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total
                FROM invoices 
                WHERE status = 'pending'
            ");
            $stmt->execute();
            $pending_payments = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Get monthly trend (last 6 months)
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
            $monthly_trend = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'total_revenue' => (float)$total_revenue,
                'today_revenue' => (float)$today_revenue,
                'pending_payments' => (int)$pending_payments,
                'monthly_trend' => $monthly_trend
            ];

        } catch (Exception $e) {
            return [
                'total_revenue' => 0,
                'today_revenue' => 0,
                'pending_payments' => 0,
                'monthly_trend' => []
            ];
        }
    }

    private function getRecentActivity() {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    'check_in' as type,
                    b.booking_reference,
                    CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                    r.room_number,
                    b.check_in_time as time,
                    b.created_at
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                WHERE b.status = 'checked_in' 
                AND DATE(b.check_in_time) = CURDATE()
                
                UNION ALL
                
                SELECT 
                    'check_out' as type,
                    b.booking_reference,
                    CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                    r.room_number,
                    b.check_out_time as time,
                    b.updated_at
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                WHERE b.status = 'checked_out' 
                AND DATE(b.check_out_time) = CURDATE()
                
                ORDER BY created_at DESC
                LIMIT 10
            ");
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
        }
    }

    private function getUpcomingCheckins($today) {
        try {
            $next_week = date('Y-m-d', strtotime('+7 days'));
            $stmt = $this->db->prepare("
                SELECT 
                    b.booking_reference,
                    CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                    r.room_number,
                    rt.name as room_type,
                    b.check_in_date,
                    DATEDIFF(b.check_in_date, ?) as days_until
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.status = 'confirmed' 
                AND b.check_in_date BETWEEN ? AND ?
                ORDER BY b.check_in_date ASC
                LIMIT 5
            ");
            $stmt->execute([$today, $today, $next_week]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            return [];
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
    
    $dashboardStats = new DashboardStats($db);
    $result = $dashboardStats->getDashboardStats();
    
    // Set appropriate HTTP status code based on success
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    // Ensure CORS headers are set before output
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    
    echo json_encode($result);
} catch (Exception $e) {
    $responseHandler = new ResponseHandler();
    $errorResponse = $responseHandler->serverError('Internal server error');
    http_response_code(500);
    
    // Ensure CORS headers are set before output
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    
    echo json_encode($errorResponse);
}
?>
