<?php
// Prevent any output before headers
ob_start();

require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/logger.php';
require_once '../utils/jwt_helper.php';

class ReportsAnalytics {
    private $db;
    private $logger;
    private $responseHandler;

    public function __construct($db) {
        $this->db = $db;
        $this->logger = new Logger($db);
        $this->responseHandler = new ResponseHandler();
    }

    public function getDashboardStats() {
        try {
            $stats = [
                'revenue' => $this->getRevenueStats(),
                'occupancy' => $this->getOccupancyStats(),
                'bookings' => $this->getBookingStats(),
                'guests' => $this->getGuestStats(),
                'rooms' => $this->getRoomStats(),
                'services' => $this->getServiceStats(),
                'payments' => $this->getPaymentStats()
            ];

            // Add summary room stats for dashboard
            $stats['rooms']['available'] = $this->getAvailableRoomsCount();
            $stats['rooms']['total'] = $this->getTotalRoomsCount();

            return $this->responseHandler->success($stats);
        } catch (Exception $e) {
            $this->logger->log('error', 'Failed to fetch dashboard stats: ' . $e->getMessage());
            return $this->responseHandler->serverError('Failed to fetch dashboard statistics');
        }
    }

    private function getRevenueStats() {
        try {
            // Today's revenue
            $stmt = $this->db->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as today_revenue
                FROM bookings 
                WHERE DATE(created_at) = CURDATE() 
                AND status IN ('checked_in', 'checked_out')
            ");
            $stmt->execute();
            $todayRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['today_revenue'];

            // This month's revenue
            $stmt = $this->db->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as month_revenue
                FROM bookings 
                WHERE MONTH(created_at) = MONTH(CURDATE()) 
                AND YEAR(created_at) = YEAR(CURDATE())
                AND status IN ('checked_in', 'checked_out')
            ");
            $stmt->execute();
            $monthRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['month_revenue'];

            // This year's revenue
            $stmt = $this->db->prepare("
                SELECT COALESCE(SUM(total_amount), 0) as year_revenue
                FROM bookings 
                WHERE YEAR(created_at) = YEAR(CURDATE())
                AND status IN ('checked_in', 'checked_out')
            ");
            $stmt->execute();
            $yearRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['year_revenue'];

            // Monthly revenue trend (last 12 months)
            $stmt = $this->db->prepare("
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') as month,
                    COALESCE(SUM(total_amount), 0) as revenue,
                    COUNT(*) as bookings_count
                FROM bookings 
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                AND status IN ('checked_in', 'checked_out')
                GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                ORDER BY month
            ");
            $stmt->execute();
            $monthlyTrend = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Revenue by room type
            $stmt = $this->db->prepare("
                SELECT 
                    rt.name as room_type,
                    COALESCE(SUM(b.total_amount), 0) as revenue,
                    COUNT(*) as bookings_count
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.status IN ('checked_in', 'checked_out')
                AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY rt.id, rt.name
                ORDER BY revenue DESC
            ");
            $stmt->execute();
            $revenueByRoomType = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'today' => (float)$todayRevenue,
                'month' => (float)$monthRevenue,
                'year' => (float)$yearRevenue,
                'monthly_trend' => $monthlyTrend,
                'by_room_type' => $revenueByRoomType
            ];
        } catch (Exception $e) {
            return [
                'today' => 0,
                'month' => 0,
                'year' => 0,
                'monthly_trend' => [],
                'by_room_type' => []
            ];
        }
    }

    private function getOccupancyStats() {
        try {
            // Current occupancy
            $stmt = $this->db->prepare("
                SELECT 
                    COUNT(*) as total_rooms,
                    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available_rooms,
                    SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_rooms,
                    SUM(CASE WHEN status = 'cleaning' THEN 1 ELSE 0 END) as cleaning_rooms
                FROM rooms
            ");
            $stmt->execute();
            $currentStatus = $stmt->fetch(PDO::FETCH_ASSOC);

            // Occupancy rate
            $totalRooms = $currentStatus['total_rooms'];
            $occupiedRooms = $currentStatus['occupied_rooms'];
            $occupancyRate = $totalRooms > 0 ? round(($occupiedRooms / $totalRooms) * 100, 2) : 0;

            // Daily occupancy trend (last 30 days)
            $stmt = $this->db->prepare("
                SELECT 
                    DATE(check_in_date) as date,
                    COUNT(*) as check_ins,
                    (SELECT COUNT(*) FROM bookings b2 
                     WHERE DATE(b2.check_out_date) = DATE(b1.check_in_date) 
                     AND b2.status IN ('checked_out', 'cancelled')) as check_outs
                FROM bookings b1
                WHERE check_in_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND status IN ('checked_in', 'checked_out')
                GROUP BY DATE(check_in_date)
                ORDER BY date
            ");
            $stmt->execute();
            $dailyOccupancy = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Occupancy by floor
            $stmt = $this->db->prepare("
                SELECT 
                    r.floor,
                    COUNT(*) as total_rooms,
                    SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms,
                    ROUND((SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as occupancy_rate
                FROM rooms r
                GROUP BY r.floor
                ORDER BY r.floor
            ");
            $stmt->execute();
            $occupancyByFloor = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'current' => [
                    'total_rooms' => (int)$currentStatus['total_rooms'],
                    'occupied_rooms' => (int)$currentStatus['occupied_rooms'],
                    'available_rooms' => (int)$currentStatus['available_rooms'],
                    'maintenance_rooms' => (int)$currentStatus['maintenance_rooms'],
                    'cleaning_rooms' => (int)$currentStatus['cleaning_rooms'],
                    'occupancy_rate' => $occupancyRate
                ],
                'daily_trend' => $dailyOccupancy,
                'by_floor' => $occupancyByFloor
            ];
        } catch (Exception $e) {
            return [
                'current' => [
                    'total_rooms' => 0,
                    'occupied_rooms' => 0,
                    'available_rooms' => 0,
                    'maintenance_rooms' => 0,
                    'cleaning_rooms' => 0,
                    'occupancy_rate' => 0
                ],
                'daily_trend' => [],
                'by_floor' => []
            ];
        }
    }

    private function getBookingStats() {
        try {
            // Total bookings
            $stmt = $this->db->prepare("
                SELECT 
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in_bookings,
                    SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checked_out_bookings,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings
                FROM bookings
            ");
            $stmt->execute();
            $bookingCounts = $stmt->fetch(PDO::FETCH_ASSOC);

            // Today's bookings
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as today_bookings
                FROM bookings 
                WHERE DATE(created_at) = CURDATE()
            ");
            $stmt->execute();
            $todayBookings = $stmt->fetch(PDO::FETCH_ASSOC)['today_bookings'];

            // This month's bookings
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as month_bookings
                FROM bookings 
                WHERE MONTH(created_at) = MONTH(CURDATE()) 
                AND YEAR(created_at) = YEAR(CURDATE())
            ");
            $stmt->execute();
            $monthBookings = $stmt->fetch(PDO::FETCH_ASSOC)['month_bookings'];

            // Booking source distribution
            $stmt = $this->db->prepare("
                SELECT 
                    COALESCE(booking_source, 'Direct') as booking_source,
                    COUNT(*) as count,
                    ROUND((COUNT(*) / (SELECT COUNT(*) FROM bookings)) * 100, 2) as percentage
                FROM bookings
                GROUP BY COALESCE(booking_source, 'Direct')
                ORDER BY count DESC
            ");
            $stmt->execute();
            $bookingSources = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Average stay duration
            $stmt = $this->db->prepare("
                SELECT 
                    AVG(DATEDIFF(check_out_date, check_in_date)) as avg_stay_days
                FROM bookings
                WHERE status IN ('checked_out', 'cancelled')
                AND check_in_date IS NOT NULL 
                AND check_out_date IS NOT NULL
            ");
            $stmt->execute();
            $avgStay = $stmt->fetch(PDO::FETCH_ASSOC)['avg_stay_days'];

            // Peak booking times
            $stmt = $this->db->prepare("
                SELECT 
                    HOUR(created_at) as hour,
                    COUNT(*) as bookings_count
                FROM bookings
                WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY HOUR(created_at)
                ORDER BY bookings_count DESC
                LIMIT 5
            ");
            $stmt->execute();
            $peakHours = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'counts' => [
                    'total' => (int)$bookingCounts['total_bookings'],
                    'checked_in' => (int)$bookingCounts['checked_in_bookings'],
                    'checked_out' => (int)$bookingCounts['checked_out_bookings'],
                    'cancelled' => (int)$bookingCounts['cancelled_bookings']
                ],
                'today' => (int)$todayBookings,
                'month' => (int)$monthBookings,
                'sources' => $bookingSources,
                'avg_stay_days' => round($avgStay, 1),
                'peak_hours' => $peakHours
            ];
        } catch (Exception $e) {
            return [
                'counts' => [
                    'total' => 0,
                    'checked_in' => 0,
                    'checked_out' => 0,
                    'cancelled' => 0
                ],
                'today' => 0,
                'month' => 0,
                'sources' => [],
                'avg_stay_days' => 0,
                'peak_hours' => []
            ];
        }
    }

    public function getGuestStats() {
        try {
            // Total guests
            $stmt = $this->db->prepare("SELECT COUNT(*) as total_guests FROM guests");
            $stmt->execute();
            $totalGuests = $stmt->fetch(PDO::FETCH_ASSOC)['total_guests'];

            // New guests this month (check if created_at column exists)
            $newGuests = 0;
            try {
                $stmt = $this->db->prepare("
                    SELECT COUNT(*) as new_guests
                    FROM guests 
                    WHERE MONTH(created_at) = MONTH(CURDATE()) 
                    AND YEAR(created_at) = YEAR(CURDATE())
                ");
                $stmt->execute();
                $newGuests = $stmt->fetch(PDO::FETCH_ASSOC)['new_guests'];
            } catch (Exception $e) {
                // created_at column doesn't exist, set to 0
                $newGuests = 0;
            }

            // Repeat guests
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as repeat_guests
                FROM (
                    SELECT guest_id, COUNT(*) as visit_count
                    FROM bookings
                    GROUP BY guest_id
                    HAVING COUNT(*) > 1
                ) repeat_visitors
            ");
            $stmt->execute();
            $repeatGuests = $stmt->fetch(PDO::FETCH_ASSOC)['repeat_guests'];

            // Guest demographics (simplified)
            $guestDemographics = [
                ['country' => 'Total', 'guest_count' => $totalGuests]
            ];

            // Top guests by spending
            $stmt = $this->db->prepare("
                SELECT 
                    g.first_name,
                    g.last_name,
                    COUNT(b.id) as total_bookings,
                    COALESCE(SUM(b.total_amount), 0) as total_spent
                FROM guests g
                LEFT JOIN bookings b ON g.id = b.guest_id
                WHERE b.status IN ('checked_in', 'checked_out')
                GROUP BY g.id, g.first_name, g.last_name
                HAVING total_spent > 0
                ORDER BY total_spent DESC
                LIMIT 10
            ");
            $stmt->execute();
            $topGuests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'total' => (int)$totalGuests,
                'new_this_month' => (int)$newGuests,
                'repeat_guests' => (int)$repeatGuests,
                'demographics' => $guestDemographics,
                'top_spenders' => $topGuests
            ];
        } catch (Exception $e) {
            // Return basic stats if there's an error
            return [
                'total' => 0,
                'new_this_month' => 0,
                'repeat_guests' => 0,
                'demographics' => [],
                'top_spenders' => []
            ];
        }
    }

    private function getRoomStats() {
        try {
            // Room type distribution
            $stmt = $this->db->prepare("
                SELECT 
                    rt.name as room_type,
                    COUNT(r.id) as total_rooms,
                    SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms,
                    SUM(CASE WHEN r.status = 'available' THEN 1 ELSE 0 END) as available_rooms,
                    SUM(CASE WHEN r.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_rooms,
                    SUM(CASE WHEN r.status = 'cleaning' THEN 1 ELSE 0 END) as cleaning_rooms
                FROM room_types rt
                LEFT JOIN rooms r ON rt.id = r.room_type_id
                GROUP BY rt.id, rt.name
                ORDER BY total_rooms DESC
            ");
            $stmt->execute();
            $roomTypeStats = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Room utilization by floor
            $stmt = $this->db->prepare("
                SELECT 
                    floor,
                    COUNT(*) as total_rooms,
                    SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms,
                    ROUND((SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as utilization_rate
                FROM rooms
                GROUP BY floor
                ORDER BY floor
            ");
            $stmt->execute();
            $floorUtilization = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Most popular rooms
            $stmt = $this->db->prepare("
                SELECT 
                    r.room_number,
                    rt.name as room_type,
                    COUNT(b.id) as booking_count,
                    COALESCE(SUM(b.total_amount), 0) as total_revenue
                FROM rooms r
                JOIN room_types rt ON r.room_type_id = rt.id
                LEFT JOIN bookings b ON r.id = b.room_id
                WHERE b.status IN ('checked_in', 'checked_out')
                GROUP BY r.id, r.room_number, rt.name
                ORDER BY booking_count DESC
                LIMIT 10
            ");
            $stmt->execute();
            $popularRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'by_type' => $roomTypeStats,
                'by_floor' => $floorUtilization,
                'popular_rooms' => $popularRooms
            ];
        } catch (Exception $e) {
            return [
                'by_type' => [],
                'by_floor' => [],
                'popular_rooms' => []
            ];
        }
    }

    public function getServiceStats() {
        try {
            // Check if extra_services table exists
            $stmt = $this->db->prepare("SHOW TABLES LIKE 'extra_services'");
            $stmt->execute();
            if ($stmt->rowCount() == 0) {
                // Table doesn't exist, return empty stats
                return [
                    'usage' => [],
                    'trend' => []
                ];
            }

            // Service usage statistics
            $stmt = $this->db->prepare("
                SELECT 
                    es.name as service_name,
                    COUNT(bs.id) as usage_count,
                    COALESCE(SUM(bs.total_price), 0) as total_revenue,
                    COALESCE(AVG(bs.total_price), 0) as avg_price
                FROM extra_services es
                LEFT JOIN booking_services bs ON es.id = bs.service_id
                LEFT JOIN bookings b ON bs.booking_id = b.id
                WHERE b.status IN ('checked_in', 'checked_out')
                GROUP BY es.id, es.name
                ORDER BY usage_count DESC
            ");
            $stmt->execute();
            $serviceUsage = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Service revenue trend
            $stmt = $this->db->prepare("
                SELECT 
                    DATE_FORMAT(b.created_at, '%Y-%m') as month,
                    COALESCE(SUM(bs.total_price), 0) as service_revenue,
                    COUNT(bs.id) as service_count
                FROM bookings b
                LEFT JOIN booking_services bs ON b.id = bs.booking_id
                WHERE b.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
                AND b.status IN ('checked_in', 'checked_out')
                GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
                ORDER BY month
            ");
            $stmt->execute();
            $serviceTrend = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'usage' => $serviceUsage,
                'trend' => $serviceTrend
            ];
        } catch (Exception $e) {
            // Return empty stats if there's an error
            return [
                'usage' => [],
                'trend' => []
            ];
        }
    }

    public function getPaymentStats() {
        try {
            // Payment method distribution
            $stmt = $this->db->prepare("
                SELECT 
                    COALESCE(payment_method, 'Cash') as payment_method,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total_amount,
                    ROUND((COUNT(*) / (SELECT COUNT(*) FROM payments)) * 100, 2) as percentage
                FROM payments
                WHERE payment_status = 'completed'
                GROUP BY COALESCE(payment_method, 'Cash')
                ORDER BY count DESC
            ");
            $stmt->execute();
            $paymentMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Payment status distribution
            $stmt = $this->db->prepare("
                SELECT 
                    COALESCE(payment_status, 'pending') as payment_status,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM payments
                GROUP BY COALESCE(payment_status, 'pending')
                ORDER BY count DESC
            ");
            $stmt->execute();
            $paymentStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Daily payment trend
            $stmt = $this->db->prepare("
                SELECT 
                    DATE(COALESCE(payment_date, created_at)) as date,
                    COUNT(*) as payment_count,
                    COALESCE(SUM(amount), 0) as total_amount
                FROM payments
                WHERE COALESCE(payment_date, created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND payment_status = 'completed'
                GROUP BY DATE(COALESCE(payment_date, created_at))
                ORDER BY date
            ");
            $stmt->execute();
            $dailyPayments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'methods' => $paymentMethods,
                'status' => $paymentStatus,
                'daily_trend' => $dailyPayments
            ];
        } catch (Exception $e) {
            return [
                'methods' => [],
                'status' => [],
                'daily_trend' => []
            ];
        }
    }

    public function getCustomReport($startDate, $endDate, $reportType) {
        try {
            switch ($reportType) {
                case 'revenue':
                    return $this->getRevenueReport($startDate, $endDate);
                case 'occupancy':
                    return $this->getOccupancyReport($startDate, $endDate);
                case 'bookings':
                    return $this->getBookingsReport($startDate, $endDate);
                case 'guests':
                    return $this->getGuestsReport($startDate, $endDate);
                default:
                    return $this->responseHandler->badRequest('Invalid report type');
            }
        } catch (Exception $e) {
            $this->logger->log('error', 'Failed to generate custom report: ' . $e->getMessage());
            return $this->responseHandler->serverError('Failed to generate custom report');
        }
    }

    private function getRevenueReport($startDate, $endDate) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as bookings,
                    COALESCE(SUM(total_amount), 0) as revenue,
                    AVG(total_amount) as avg_booking_value
                FROM bookings
                WHERE created_at BETWEEN ? AND ?
                AND status IN ('checked_in', 'checked_out')
                GROUP BY DATE(created_at)
                ORDER BY date
            ");
            $stmt->execute([$startDate, $endDate]);
            $dailyRevenue = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'report_type' => 'revenue',
                'period' => ['start' => $startDate, 'end' => $endDate],
                'data' => $dailyRevenue
            ]);
        } catch (Exception $e) {
            return $this->responseHandler->serverError('Failed to generate revenue report');
        }
    }

    private function getOccupancyReport($startDate, $endDate) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    DATE(check_in_date) as date,
                    COUNT(*) as check_ins,
                    (SELECT COUNT(*) FROM bookings b2 
                     WHERE DATE(b2.check_out_date) = DATE(b1.check_in_date) 
                     AND b2.status IN ('checked_out', 'cancelled')) as check_outs
                FROM bookings b1
                WHERE check_in_date BETWEEN ? AND ?
                AND status IN ('checked_in', 'checked_out')
                GROUP BY DATE(check_in_date)
                ORDER BY date
            ");
            $stmt->execute([$startDate, $endDate]);
            $dailyOccupancy = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'report_type' => 'occupancy',
                'period' => ['start' => $startDate, 'end' => $endDate],
                'data' => $dailyOccupancy
            ]);
        } catch (Exception $e) {
            return $this->responseHandler->serverError('Failed to generate occupancy report');
        }
    }

    private function getBookingsReport($startDate, $endDate) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
                    SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as checked_out,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                FROM bookings
                WHERE created_at BETWEEN ? AND ?
                GROUP BY DATE(created_at)
                ORDER BY date
            ");
            $stmt->execute([$startDate, $endDate]);
            $dailyBookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'report_type' => 'bookings',
                'period' => ['start' => $startDate, 'end' => $endDate],
                'data' => $dailyBookings
            ]);
        } catch (Exception $e) {
            return $this->responseHandler->serverError('Failed to generate bookings report');
        }
    }

    private function getGuestsReport($startDate, $endDate) {
        try {
            $stmt = $this->db->prepare("
                SELECT 
                    DATE(g.created_at) as date,
                    COUNT(DISTINCT g.id) as new_guests,
                    COUNT(b.id) as total_bookings,
                    COALESCE(SUM(b.total_amount), 0) as revenue
                FROM guests g
                LEFT JOIN bookings b ON g.id = b.guest_id
                WHERE g.created_at BETWEEN ? AND ?
                AND (b.created_at BETWEEN ? AND ? OR b.created_at IS NULL)
                GROUP BY DATE(g.created_at)
                ORDER BY date
            ");
            $stmt->execute([$startDate, $endDate, $startDate, $endDate]);
            $dailyGuests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success([
                'report_type' => 'guests',
                'period' => ['start' => $startDate, 'end' => $endDate],
                'data' => $dailyGuests
            ]);
        } catch (Exception $e) {
            return $this->responseHandler->serverError('Failed to generate guests report');
        }
    }

    private function getAvailableRoomsCount() {
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as available_count
                FROM rooms 
                WHERE status = 'available'
            ");
            $stmt->execute();
            return (int)$stmt->fetch(PDO::FETCH_ASSOC)['available_count'];
        } catch (Exception $e) {
            return 0;
        }
    }

    private function getTotalRoomsCount() {
        try {
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total_count
                FROM rooms
            ");
            $stmt->execute();
            return (int)$stmt->fetch(PDO::FETCH_ASSOC)['total_count'];
        } catch (Exception $e) {
            return 0;
        }
    }
}

// Handle the request
try {
    $database = new Database();
    $db = $database->getConnection();
    
    $reports = new ReportsAnalytics($db);
    
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    
    if ($method === 'GET') {
        if (isset($_GET['action'])) {
            switch ($_GET['action']) {
                case 'dashboard':
                    $result = $reports->getDashboardStats();
                    break;
                case 'custom':
                    if (isset($_GET['start_date']) && isset($_GET['end_date']) && isset($_GET['type'])) {
                        $result = $reports->getCustomReport($_GET['start_date'], $_GET['end_date'], $_GET['type']);
                    } else {
                        $responseHandler = new ResponseHandler();
                        $result = $responseHandler->badRequest('Missing required parameters for custom report');
                    }
                    break;
                default:
                    $responseHandler = new ResponseHandler();
                    $result = $responseHandler->badRequest('Invalid action parameter');
            }
        } else {
            // Default to dashboard stats
            $result = $reports->getDashboardStats();
        }
    } else {
        $responseHandler = new ResponseHandler();
        $result = $responseHandler->error('Only GET method is allowed', 405);
    }
    
    // Set appropriate HTTP status code
    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }
    
    // Clean output buffer and send JSON
    ob_clean();
    echo json_encode($result);
} catch (Exception $e) {
    $responseHandler = new ResponseHandler();
    $errorResponse = $responseHandler->serverError('Internal server error: ' . $e->getMessage());
    http_response_code(500);
    // Clean output buffer and send JSON
    ob_clean();
    echo json_encode($errorResponse);
}
?>
