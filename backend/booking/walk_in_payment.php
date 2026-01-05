<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class WalkInPayment {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function processPayment($data) {
        try {
            // Validate required fields
            if (!isset($data['booking_id']) || !isset($data['amount']) || !isset($data['payment_method'])) {
                return $this->response->error('Missing required fields: booking_id, amount, payment_method');
            }

            $booking_id = $data['booking_id'];
            $amount = floatval($data['amount']);
            $payment_method = $data['payment_method'];
            $payment_type = $data['payment_type'] ?? 'partial';
            $processed_by = $data['processed_by'] ?? 1;
            $notes = $data['notes'] ?? '';
            $transaction_id = $data['transaction_id'] ?? null;

            // Validate amount
            if ($amount <= 0) {
                return $this->response->error('Payment amount must be greater than 0');
            }

            // Get current booking details
            $booking = $this->getBookingDetails($booking_id);
            if (!$booking) {
                return $this->response->error('Booking not found');
            }

            // Check if payment amount exceeds remaining amount
            if ($amount > $booking['remaining_amount']) {
                return $this->response->error('Payment amount cannot exceed remaining amount');
            }

            // Start transaction
            $this->conn->begin_transaction();

            try {
                // Insert payment record
                $payment_id = $this->insertPaymentRecord($booking_id, $amount, $payment_method, $payment_type, $processed_by, $notes, $transaction_id);
                
                if (!$payment_id) {
                    throw new Exception('Failed to insert payment record');
                }

                // Update booking payment status
                $this->updateBookingPaymentStatus($booking_id, $amount);

                // Get updated booking details
                $updated_booking = $this->getBookingDetails($booking_id);

                // Send real-time notification
                $this->sendPaymentNotification($payment_id, $amount, $payment_method, $booking, $processed_by);

                // Commit transaction
                $this->conn->commit();

                return $this->response->success('Payment processed successfully', [
                    'payment_id' => $payment_id,
                    'booking' => $updated_booking
                ]);

            } catch (Exception $e) {
                $this->conn->rollback();
                throw $e;
            }

        } catch (Exception $e) {
            error_log("WalkInPayment Error: " . $e->getMessage());
            return $this->response->error('Payment processing failed: ' . $e->getMessage());
        }
    }

    private function getBookingDetails($booking_id) {
        $query = "
            SELECT 
                b.id as booking_id,
                b.booking_reference,
                b.total_amount,
                b.paid_amount,
                b.remaining_amount,
                b.payment_status,
                b.status as booking_status,
                g.first_name,
                g.last_name,
                g.phone,
                r.room_number,
                rt.name as room_type_name
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE b.id = ?
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('i', $booking_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            return null;
        }

        return $result->fetch_assoc();
    }

    private function insertPaymentRecord($booking_id, $amount, $payment_method, $payment_type, $processed_by, $notes, $transaction_id) {
        // Generate unique receipt number
        $receipt_number = 'RCP' . date('Ymd') . str_pad($booking_id, 6, '0', STR_PAD_LEFT) . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);

        $query = "
            INSERT INTO walk_in_payments (
                booking_id, amount, payment_method, payment_status, 
                transaction_id, receipt_number, notes, processed_by, payment_type
            ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?)
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('idsssss', $booking_id, $amount, $payment_method, $transaction_id, $receipt_number, $notes, $processed_by, $payment_type);
        
        if ($stmt->execute()) {
            return $this->conn->insert_id;
        }
        
        return false;
    }

    private function updateBookingPaymentStatus($booking_id, $payment_amount) {
        // Get current booking payment details
        $query = "SELECT paid_amount, remaining_amount, total_amount FROM bookings WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('i', $booking_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $booking = $result->fetch_assoc();

        // Calculate new values
        $new_paid_amount = $booking['paid_amount'] + $payment_amount;
        $new_remaining_amount = max(0, $booking['total_amount'] - $new_paid_amount);

        // Determine new payment status
        $new_payment_status = 'partial';
        if ($new_remaining_amount == 0) {
            $new_payment_status = 'completed';
        } elseif ($new_paid_amount == 0) {
            $new_payment_status = 'pending';
        }

        // Update booking
        $update_query = "
            UPDATE bookings 
            SET paid_amount = ?, 
                remaining_amount = ?, 
                payment_status = ?
            WHERE id = ?
        ";
        $update_stmt = $this->conn->prepare($update_query);
        $update_stmt->bind_param('ddsi', $new_paid_amount, $new_remaining_amount, $new_payment_status, $booking_id);
        $update_stmt->execute();
    }

    /**
     * Send real-time payment notification
     */
    private function sendPaymentNotification($payment_id, $amount, $payment_method, $booking, $processed_by) {
        try {
            require_once '../utils/payment_notification_service.php';
            $notificationService = new PaymentNotificationService($this->conn);
            
            $paymentData = [
                'id' => $payment_id,
                'receipt_number' => 'WIP-' . $payment_id, // Walk-in payment receipt
                'amount' => $amount,
                'payment_method' => $payment_method,
                'guest_name' => $booking['first_name'] . ' ' . $booking['last_name'],
                'room_number' => $booking['room_number'],
                'processed_by' => $processed_by,
                'transaction_id' => null,
                'booking_reference' => $booking['booking_reference']
            ];
            
            $notificationService->notifyNewPayment($paymentData);
            
        } catch (Exception $e) {
            error_log("Failed to send walk-in payment notification: " . $e->getMessage());
        }
    }

    public function getPaymentHistory($booking_id) {
        try {
            $query = "
                SELECT 
                    wip.id,
                    wip.amount,
                    wip.payment_method,
                    wip.payment_status,
                    wip.transaction_id,
                    wip.receipt_number,
                    wip.payment_date,
                    wip.notes,
                    wip.payment_type,
                    u.username as processed_by_name
                FROM walk_in_payments wip
                LEFT JOIN users u ON wip.processed_by = u.id
                WHERE wip.booking_id = ?
                ORDER BY wip.payment_date DESC
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->bind_param('i', $booking_id);
            $stmt->execute();
            $result = $stmt->get_result();

            $payments = [];
            while ($row = $result->fetch_assoc()) {
                $payments[] = $row;
            }

            return $this->response->success('Payment history retrieved successfully', [
                'payments' => $payments
            ]);

        } catch (Exception $e) {
            error_log("GetPaymentHistory Error: " . $e->getMessage());
            return $this->response->error('Failed to retrieve payment history: ' . $e->getMessage());
        }
    }

    public function getPaymentSummary($booking_id) {
        try {
            $query = "
                SELECT 
                    b.total_amount,
                    b.paid_amount,
                    b.remaining_amount,
                    b.payment_status,
                    b.booking_reference,
                    g.first_name,
                    g.last_name,
                    g.phone,
                    r.room_number,
                    rt.name as room_type_name
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.id = ?
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->bind_param('i', $booking_id);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($result->num_rows === 0) {
                return $this->response->error('Booking not found');
            }

            $booking = $result->fetch_assoc();

            // Get payment history
            $payment_history = $this->getPaymentHistory($booking_id);

            return $this->response->success('Payment summary retrieved successfully', [
                'booking' => $booking,
                'payment_history' => $payment_history['data']['payments'] ?? []
            ]);

        } catch (Exception $e) {
            error_log("GetPaymentSummary Error: " . $e->getMessage());
            return $this->response->error('Failed to retrieve payment summary: ' . $e->getMessage());
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $database = new Database();
    $db = $database->getConnection();
    
    $walkInPayment = new WalkInPayment($db);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit;
    }

    $result = $walkInPayment->processPayment($input);
    echo json_encode($result);

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $database = new Database();
    $db = $database->getConnection();
    
    $walkInPayment = new WalkInPayment($db);
    
    $action = $_GET['action'] ?? '';
    $booking_id = $_GET['booking_id'] ?? null;

    if (!$booking_id) {
        echo json_encode(['success' => false, 'message' => 'Booking ID is required']);
        exit;
    }

    switch ($action) {
        case 'history':
            $result = $walkInPayment->getPaymentHistory($booking_id);
            break;
        case 'summary':
            $result = $walkInPayment->getPaymentSummary($booking_id);
            break;
        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }

    echo json_encode($result);

} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
