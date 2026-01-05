<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

require_once '../config/database.php';

class PrebookedAPI {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function getPrebookedRooms($filters = []) {
        try {
            $today = date('Y-m-d');
            
            // Base query to get all confirmed bookings with future check-in dates
            $query = "
                SELECT 
                    b.id as booking_id,
                    b.booking_reference,
                    b.room_number,
                    b.check_in_date,
                    b.check_out_date,
                    b.check_in_time,
                    b.check_in_ampm,
                    b.check_out_time,
                    b.check_out_ampm,
                    b.adults,
                    b.children,
                    b.total_amount,
                    b.paid_amount,
                    b.remaining_amount,
                    b.status as booking_status,
                    b.payment_status,
                    b.booking_source,
                    b.owner_reference,
                    b.notes,
                    b.created_at,
                    g.id as guest_id,
                    g.first_name,
                    g.last_name,
                    CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                    g.phone,
                    g.email,
                    g.address,
                    g.id_proof_type,
                    g.id_proof_number,
                    rt.name as room_type_name,
                    rt.base_price,
                    r.floor,
                    r.status as room_status
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_number = r.room_number
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.status IN ('confirmed', 'booked', 'pending')
                AND b.check_in_date > CURDATE()
                AND b.status != 'checked_out'
                AND b.status != 'cancelled'
            ";
            
            $params = [];
            
            // Add filters
            if (!empty($filters['check_in_date'])) {
                $query .= " AND b.check_in_date = ?";
                $params[] = $filters['check_in_date'];
            }
            
            if (!empty($filters['room_type'])) {
                $query .= " AND rt.name LIKE ?";
                $params[] = '%' . $filters['room_type'] . '%';
            }
            
            if (!empty($filters['guest_name'])) {
                $query .= " AND (g.first_name LIKE ? OR g.last_name LIKE ? OR CONCAT(g.first_name, ' ', g.last_name) LIKE ?)";
                $searchTerm = '%' . $filters['guest_name'] . '%';
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            // Order by check-in date (earliest first)
            $query .= " ORDER BY b.check_in_date ASC, b.created_at ASC";
            
            $stmt = $this->db->prepare($query);
            if (!empty($params)) {
                $stmt->execute($params);
            } else {
                $stmt->execute();
            }
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Process the data to add calculated fields
            foreach ($bookings as &$booking) {
                $booking['days_until_checkin'] = $this->calculateDaysUntilCheckIn($booking['check_in_date']);
                $booking['is_checkin_today'] = $booking['check_in_date'] === $today;
                $booking['payment_remaining'] = $booking['remaining_amount'] > 0;
            }
            
            return [
                'success' => true,
                'data' => $bookings,
                'count' => count($bookings),
                'filters_applied' => $filters
            ];
            
        } catch (Exception $e) {
            error_log("Error in getPrebookedRooms: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch prebooked rooms: ' . $e->getMessage()
            ];
        }
    }
    
    private function calculateDaysUntilCheckIn($checkInDate) {
        $today = new DateTime();
        $checkIn = new DateTime($checkInDate);
        $interval = $today->diff($checkIn);
        
        if ($interval->invert) {
            return -$interval->days; // Negative for overdue
        }
        
        return $interval->days;
    }
    
    public function getPrebookedStats() {
        try {
            $today = date('Y-m-d');
            
            // Get total prebooked rooms
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as total_prebooked
                FROM bookings 
                WHERE status = 'confirmed' AND check_in_date > ?
            ");
            $stmt->execute([$today]);
            $total = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get today's check-ins
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as today_checkins
                FROM bookings 
                WHERE status = 'confirmed' AND check_in_date = ?
            ");
            $stmt->execute([$today]);
            $todayCheckins = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get tomorrow's check-ins
            $tomorrow = date('Y-m-d', strtotime('+1 day'));
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as tomorrow_checkins
                FROM bookings 
                WHERE status = 'confirmed' AND check_in_date = ?
            ");
            $stmt->execute([$tomorrow]);
            $tomorrowCheckins = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get overdue bookings (past check-in date but still confirmed)
            $stmt = $this->db->prepare("
                SELECT COUNT(*) as overdue_bookings
                FROM bookings 
                WHERE status = 'confirmed' AND check_in_date < ?
            ");
            $stmt->execute([$today]);
            $overdue = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => [
                    'total_prebooked' => (int)$total['total_prebooked'],
                    'today_checkins' => (int)$todayCheckins['today_checkins'],
                    'tomorrow_checkins' => (int)$tomorrowCheckins['tomorrow_checkins'],
                    'overdue_bookings' => (int)$overdue['overdue_bookings']
                ]
            ];
            
        } catch (Exception $e) {
            error_log("Error in getPrebookedStats: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch prebooked stats: ' . $e->getMessage()
            ];
        }
    }
    
    public function updateBooking($bookingId, $updateData) {
        try {
            // Validate booking exists
            $stmt = $this->db->prepare("
                SELECT id, total_amount, paid_amount, remaining_amount 
                FROM bookings 
                WHERE id = ? AND status = 'confirmed'
            ");
            $stmt->execute([$bookingId]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                return [
                    'success' => false,
                    'message' => 'Booking not found or not in confirmed status'
                ];
            }
            
            // Start transaction
            $this->db->beginTransaction();
            
            // Build update query dynamically
            $updateFields = [];
            $params = [];
            
            // Handle payment information updates
            if (isset($updateData['total_amount'])) {
                $updateFields[] = "total_amount = ?";
                $params[] = $updateData['total_amount'];
            }
            
            if (isset($updateData['paid_amount'])) {
                $updateFields[] = "paid_amount = ?";
                $params[] = $updateData['paid_amount'];
            }
            
            if (isset($updateData['payment_status'])) {
                $updateFields[] = "payment_status = ?";
                $params[] = $updateData['payment_status'];
            }
            
            if (isset($updateData['booking_source'])) {
                $updateFields[] = "booking_source = ?";
                $params[] = $updateData['booking_source'];
            }
            
            if (isset($updateData['owner_reference'])) {
                $updateFields[] = "owner_reference = ?";
                $params[] = $updateData['owner_reference'];
            }
            
            // Handle guest information updates
            if (isset($updateData['guest_info'])) {
                $guestInfo = $updateData['guest_info'];
                $guestUpdateFields = [];
                $guestParams = [];
                
                if (isset($guestInfo['first_name'])) {
                    $guestUpdateFields[] = "first_name = ?";
                    $guestParams[] = $guestInfo['first_name'];
                }
                
                if (isset($guestInfo['last_name'])) {
                    $guestUpdateFields[] = "last_name = ?";
                    $guestParams[] = $guestInfo['last_name'];
                }
                
                if (isset($guestInfo['phone'])) {
                    $guestUpdateFields[] = "phone = ?";
                    $guestParams[] = $guestInfo['phone'];
                }
                
                if (isset($guestInfo['email'])) {
                    $guestUpdateFields[] = "email = ?";
                    $guestParams[] = $guestInfo['email'];
                }
                
                if (isset($guestInfo['address'])) {
                    $guestUpdateFields[] = "address = ?";
                    $guestParams[] = $guestInfo['address'];
                }
                
                if (isset($guestInfo['id_proof_type'])) {
                    $guestUpdateFields[] = "id_proof_type = ?";
                    $guestParams[] = $guestInfo['id_proof_type'];
                }
                
                if (isset($guestInfo['id_proof_number'])) {
                    $guestUpdateFields[] = "id_proof_number = ?";
                    $guestParams[] = $guestInfo['id_proof_number'];
                }
                
                // Update guest information
                if (!empty($guestUpdateFields)) {
                    $guestQuery = "UPDATE guests SET " . implode(', ', $guestUpdateFields) . " WHERE id = (SELECT guest_id FROM bookings WHERE id = ?)";
                    $guestParams[] = $bookingId;
                    
                    $guestStmt = $this->db->prepare($guestQuery);
                    $guestStmt->execute($guestParams);
                }
            }
            
            // Calculate remaining amount if total_amount or paid_amount changed
            if (isset($updateData['total_amount']) || isset($updateData['paid_amount'])) {
                $newTotalAmount = $updateData['total_amount'] ?? $booking['total_amount'];
                $newPaidAmount = $updateData['paid_amount'] ?? $booking['paid_amount'];
                $newRemainingAmount = $newTotalAmount - $newPaidAmount;
                
                $updateFields[] = "remaining_amount = ?";
                $params[] = $newRemainingAmount;
            }
            
            // Update booking if there are fields to update
            if (!empty($updateFields)) {
                $updateFields[] = "updated_at = NOW()";
                $params[] = $bookingId;
                
                $query = "UPDATE bookings SET " . implode(', ', $updateFields) . " WHERE id = ?";
                $stmt = $this->db->prepare($query);
                $stmt->execute($params);
            }
            
            // Commit transaction
            $this->db->commit();
            
            // Get updated booking data
            $stmt = $this->db->prepare("
                SELECT b.*, CONCAT(g.first_name, ' ', g.last_name) as guest_name
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                WHERE b.id = ?
            ");
            $stmt->execute([$bookingId]);
            $updatedBooking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'message' => 'Booking updated successfully',
                'data' => $updatedBooking
            ];
            
        } catch (Exception $e) {
            // Rollback transaction on error
            if ($this->db->inTransaction()) {
                $this->db->rollback();
            }
            
            error_log("Error in updateBooking: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to update booking: ' . $e->getMessage()
            ];
        }
    }
}

// Initialize API
$database = new Database();
$db = $database->getConnection();
$api = new PrebookedAPI($db);

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            if ($action === 'get_prebooked') {
                $filters = [
                    'check_in_date' => $_GET['check_in_date'] ?? '',
                    'room_type' => $_GET['room_type'] ?? '',
                    'guest_name' => $_GET['guest_name'] ?? ''
                ];
                
                $result = $api->getPrebookedRooms($filters);
                echo json_encode($result);
            } elseif ($action === 'get_stats') {
                $result = $api->getPrebookedStats();
                echo json_encode($result);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid action specified'
                ]);
            }
            break;
            
        case 'PUT':
        case 'POST':
            if ($action === 'update_booking') {
                // Get JSON input
                $input = json_decode(file_get_contents('php://input'), true);
                
                if (!$input) {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid JSON data'
                    ]);
                    break;
                }
                
                $bookingId = $input['booking_id'] ?? null;
                if (!$bookingId) {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Booking ID is required'
                    ]);
                    break;
                }
                
                $result = $api->updateBooking($bookingId, $input);
                echo json_encode($result);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Invalid action for ' . $method . ' request'
                ]);
            }
            break;
            
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    error_log("PrebookedAPI Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>
