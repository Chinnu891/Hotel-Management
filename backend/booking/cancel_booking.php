<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/email_service.php';

class CancelBooking {
    private $conn;
    private $response;
    private $emailService;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
        $this->emailService = new EmailService($db);
    }

    public function cancel($data) {
        try {
            // Validate required fields
            $required_fields = ['booking_id', 'cancellation_reason', 'cancelled_by', 'refund_amount'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->response->error("Missing required field: $field", 400);
                }
            }

            $booking_id = $data['booking_id'];
            $cancellation_reason = $data['cancellation_reason'];
            $cancelled_by = $data['cancelled_by'];
            $refund_amount = $data['refund_amount'];

            // Get booking details
            $booking = $this->getBookingDetails($booking_id);
            if (!$booking) {
                return $this->response->error("Booking not found", 404);
            }

            // Check if booking can be cancelled
            $cancellationCheck = $this->canCancelBooking($booking);
            if (!$cancellationCheck['can_cancel']) {
                return $this->response->error("Booking cannot be cancelled", 400, $cancellationCheck['reason']);
            }

            // Calculate refund amount based on cancellation policy
            $calculatedRefund = $this->calculateRefundAmount($booking, $cancellation_reason);
            
            // No refund validation - user has full control
            error_log("CancelBooking: Refund validation bypassed - user has full control over refund amount");

            // Begin transaction
            $this->conn->beginTransaction();

            try {
                // Update booking status to cancelled
                $this->updateBookingStatus($booking_id, 'cancelled', $cancellation_reason);

                // Update room status to available
                $this->updateRoomStatus($booking['room_number'], 'available');

                // Create cancellation record
                $cancellation_id = $this->createCancellationRecord($booking_id, $cancellation_reason, $cancelled_by, $refund_amount);

                // Process refund if amount > 0
                if ($refund_amount > 0) {
                    $refund_id = $this->processRefund($booking_id, $refund_amount, $calculatedRefund['refund_type']);
                    
                    if (!$refund_id) {
                        throw new Exception("Failed to process refund");
                    }
                }

                // Log the activity
                $this->logActivity($cancelled_by, 'cancel_booking', 'bookings', $booking_id, 
                    "Booking cancelled: {$cancellation_reason}. Refund: ₹{$refund_amount}");

                // Send cancellation email to guest
                $this->sendCancellationEmail($booking, $refund_amount, $cancellation_reason);

                $this->conn->commit();

                return $this->response->success([
                    'cancellation_id' => $cancellation_id,
                    'refund_amount' => $refund_amount,
                    'refund_type' => $calculatedRefund['refund_type'],
                    'cancellation_fee' => $calculatedRefund['cancellation_fee'],
                    'message' => 'Booking cancelled successfully'
                ]);

            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            error_log("Cancel booking error: " . $e->getMessage());
            return $this->response->error("Failed to cancel booking: " . $e->getMessage(), 500);
        }
    }

    private function getBookingDetails($booking_id) {
        $query = "SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
                         r.room_number, rt.name as room_type, rt.base_price
                  FROM bookings b
                  JOIN guests g ON b.guest_id = g.id
                  JOIN rooms r ON b.room_number = r.room_number
                  JOIN room_types rt ON r.room_type_id = rt.id
                  WHERE b.id = ?";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([$booking_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function canCancelBooking($booking) {
        // Check if booking is already cancelled
        if ($booking['status'] === 'cancelled') {
            return ['can_cancel' => false, 'reason' => 'Booking is already cancelled'];
        }

        // Check if guest has already checked in
        if ($booking['status'] === 'checked_in') {
            return ['can_cancel' => false, 'reason' => 'Cannot cancel after check-in'];
        }

        // Check if guest has already checked out
        if ($booking['status'] === 'checked_out') {
            return ['can_cancel' => false, 'reason' => 'Cannot cancel after check-out'];
        }

        return ['can_cancel' => true, 'reason' => ''];
    }

    private function calculateRefundAmount($booking, $cancellation_reason) {
        $check_in = new DateTime($booking['check_in_date']);
        $today = new DateTime();
        $days_until_checkin = $today->diff($check_in)->days;
        
        $total_amount = $booking['total_amount'];
        $cancellation_fee = 0;
        $refund_type = 'full';

        // Cancellation Policy:
        // - More than 24 hours: 100% refund
        // - 12-24 hours: 75% refund
        // - 6-12 hours: 50% refund
        // - Less than 6 hours: 25% refund
        // - After check-in: No refund

        if ($days_until_checkin > 1) {
            // More than 24 hours
            $cancellation_fee = 0;
            $refund_type = 'full';
        } elseif ($days_until_checkin == 1) {
            // 12-24 hours
            $cancellation_fee = $total_amount * 0.25;
            $refund_type = 'partial_75';
        } elseif ($days_until_checkin == 0) {
            // Same day (6-24 hours)
            $hours_until_checkin = $check_in->diff($today)->h;
            if ($hours_until_checkin >= 6) {
                $cancellation_fee = $total_amount * 0.50;
                $refund_type = 'partial_50';
            } else {
                $cancellation_fee = $total_amount * 0.75;
                $refund_type = 'partial_25';
            }
        } else {
            // Past check-in date
            $cancellation_fee = $total_amount;
            $refund_type = 'no_refund';
        }

        // Special cases
        if ($cancellation_reason === 'medical_emergency') {
            $cancellation_fee = 0;
            $refund_type = 'full_medical';
        } elseif ($cancellation_reason === 'hotel_fault') {
            $cancellation_fee = 0;
            $refund_type = 'full_hotel_fault';
        }

        $max_refund = $total_amount - $cancellation_fee;

        return [
            'max_refund' => $max_refund,
            'cancellation_fee' => $cancellation_fee,
            'refund_type' => $refund_type,
            'days_until_checkin' => $days_until_checkin
        ];
    }

    private function updateBookingStatus($booking_id, $status, $reason) {
        // Check if updated_at column exists
        $checkColumn = "SHOW COLUMNS FROM bookings LIKE 'updated_at'";
        $stmt = $this->conn->prepare($checkColumn);
        $stmt->execute();
        $hasUpdatedAt = $stmt->rowCount() > 0;
        
        if ($hasUpdatedAt) {
            $query = "UPDATE bookings 
                      SET status = ?, 
                          notes = CONCAT(IFNULL(notes, ''), '\nCancelled: ', ?),
                          updated_at = NOW()
                      WHERE id = ?";
        } else {
            $query = "UPDATE bookings 
                      SET status = ?, 
                          notes = CONCAT(IFNULL(notes, ''), '\nCancelled: ', ?)
                      WHERE id = ?";
        }

        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$status, $reason, $booking_id]);
    }

    private function updateRoomStatus($room_number, $status) {
        $query = "UPDATE rooms SET status = ? WHERE room_number = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$status, $room_number]);
    }

    private function createCancellationRecord($booking_id, $reason, $cancelled_by, $refund_amount) {
        $query = "INSERT INTO booking_cancellations 
                  (booking_id, cancellation_reason, cancelled_by, refund_amount, cancelled_at)
                  VALUES (?, ?, ?, ?, NOW())";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([$booking_id, $reason, $cancelled_by, $refund_amount]);
        return $this->conn->lastInsertId();
    }

    private function processRefund($booking_id, $refund_amount, $refund_type) {
        $query = "INSERT INTO refunds 
                  (booking_id, amount, refund_type, status, processed_at)
                  VALUES (?, ?, ?, 'pending', NOW())";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([$booking_id, $refund_amount, $refund_type]);
        return $this->conn->lastInsertId();
    }

    private function logActivity($user_id, $action, $table_name, $record_id, $details) {
        $query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address)
                  VALUES (?, ?, ?, ?, ?, ?)";

        $stmt = $this->conn->prepare($query);
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $stmt->execute([$user_id, $action, $table_name, $record_id, $details, $ip_address]);
    }

    private function sendCancellationEmail($booking, $refund_amount, $reason) {
        try {
            $subject = "Booking Cancellation - SV Royal Luxury Rooms";
            $message = $this->generateCancellationEmail($booking, $refund_amount, $reason);
            
            $this->emailService->sendEmail(
                $booking['email'],
                $subject,
                $message,
                $booking['first_name'] . ' ' . $booking['last_name']
            );
        } catch (Exception $e) {
            error_log("Failed to send cancellation email: " . $e->getMessage());
        }
    }

    private function generateCancellationEmail($booking, $refund_amount, $reason) {
        $refund_text = $refund_amount > 0 ? "₹{$refund_amount}" : "No refund applicable";
        
        return "
        <h2>Booking Cancellation Confirmation</h2>
        <p>Dear {$booking['first_name']} {$booking['last_name']},</p>
        
        <p>Your booking has been cancelled as requested.</p>
        
        <h3>Booking Details:</h3>
        <ul>
            <li><strong>Room:</strong> {$booking['room_number']} ({$booking['room_type']})</li>
            <li><strong>Check-in:</strong> {$booking['check_in_date']}</li>
            <li><strong>Check-out:</strong> {$booking['check_out_date']}</li>
            <li><strong>Total Amount:</strong> ₹{$booking['total_amount']}</li>
        </ul>
        
        <h3>Cancellation Details:</h3>
        <ul>
            <li><strong>Reason:</strong> {$reason}</li>
            <li><strong>Refund Amount:</strong> {$refund_text}</li>
            <li><strong>Cancellation Date:</strong> " . date('Y-m-d H:i:s') . "</li>
        </ul>
        
        <p>If you have any questions about your refund, please contact our customer service.</p>
        
        <p>Thank you for choosing SV Royal Luxury Rooms.</p>
        <p>Best regards,<br>SV Royal Team</p>
        ";
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $canceller = new CancelBooking($db);
        $data = json_decode(file_get_contents('php://input'), true);
        
        $result = $canceller->cancel($data);
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
