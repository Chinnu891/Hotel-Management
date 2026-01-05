<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';

class BookingsAPI {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get bookings by status
    public function getBookingsByStatus($status = null) {
        try {
            $sql = "
                SELECT DISTINCT
                    b.id,
                    b.booking_reference,
                    b.check_in_date,
                    b.check_out_date,
                    b.status,
                    b.payment_status,
                    CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                    g.email as guest_email,
                    g.phone as guest_phone,
                    r.room_number,
                    rt.name as room_type,
                    rt.base_price
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
            ";

            $params = [];
            if ($status) {
                $sql .= " WHERE b.status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY b.id DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'bookings' => $bookings,
                'total_count' => count($bookings)
            ];

        } catch (Exception $e) {
            error_log("Error fetching bookings: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch bookings',
                'error' => $e->getMessage()
            ];
        }
    }

    // Get all bookings
    public function getAllBookings() {
        return $this->getBookingsByStatus();
    }

    // Get checked-in bookings
    public function getCheckedInBookings() {
        return $this->getBookingsByStatus('checked_in');
    }

    // Get pending bookings
    public function getPendingBookings() {
        return $this->getBookingsByStatus('pending');
    }
}

// Handle API requests
try {
    $database = new Database();
    $db = $database->getConnection();
    $bookingsAPI = new BookingsAPI($db);

    $method = $_SERVER['REQUEST_METHOD'];
    $status = $_GET['status'] ?? null;

    switch ($method) {
        case 'GET':
            if ($status === 'checked_in') {
                $result = $bookingsAPI->getCheckedInBookings();
            } elseif ($status === 'pending') {
                $result = $bookingsAPI->getPendingBookings();
            } else {
                $result = $bookingsAPI->getAllBookings();
            }
            break;
        
        default:
            $result = [
                'success' => false,
                'message' => 'Method not allowed'
            ];
    }

    echo json_encode($result);

} catch (Exception $e) {
    $error_response = [
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ];
    echo json_encode($error_response);
}
?>
