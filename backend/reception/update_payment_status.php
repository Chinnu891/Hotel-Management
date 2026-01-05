<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/jwt_helper.php';

class PaymentStatusUpdater {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    /**
     * Update payment status for all bookings
     */
    public function updateAllBookings() {
        try {
            // Get all bookings
            $stmt = $this->conn->prepare("SELECT id, total_amount FROM bookings");
            $stmt->execute();
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $updated_count = 0;
            $errors = [];
            
            foreach ($bookings as $booking) {
                $result = $this->updateSingleBooking($booking['id']);
                if ($result) {
                    $updated_count++;
                } else {
                    $errors[] = "Failed to update booking {$booking['id']}";
                }
            }
            
            return $this->response->success([
                'total_bookings' => count($bookings),
                'updated_count' => $updated_count,
                'errors' => $errors,
                'message' => "Payment status updated for {$updated_count} out of " . count($bookings) . " bookings"
            ]);
            
        } catch (Exception $e) {
            error_log("Error updating all booking payment statuses: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    /**
     * Fix payment status for corporate bookings specifically
     */
    public function fixCorporateBookings() {
        try {
            // Get all corporate bookings
            $stmt = $this->conn->prepare("
                SELECT b.id, b.total_amount, b.paid_amount, b.remaining_amount, b.payment_status
                FROM bookings b
                WHERE b.booking_source = 'corporate'
                ORDER BY b.created_at DESC
            ");
            $stmt->execute();
            $corporate_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $fixed_count = 0;
            $errors = [];
            
            foreach ($corporate_bookings as $booking) {
                $result = $this->updateSingleBooking($booking['id']);
                if ($result) {
                    $fixed_count++;
                } else {
                    $errors[] = "Failed to fix corporate booking {$booking['id']}";
                }
            }
            
            return $this->response->success([
                'total_corporate_bookings' => count($corporate_bookings),
                'fixed_count' => $fixed_count,
                'errors' => $errors,
                'message' => "Payment status fixed for {$fixed_count} out of " . count($corporate_bookings) . " corporate bookings"
            ]);
            
        } catch (Exception $e) {
            error_log("Error fixing corporate booking payment statuses: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    /**
     * Update payment status for a specific booking
     */
    public function updateSingleBooking($booking_id) {
        try {
            // Get total amount from all payments for this booking
            $total_paid = $this->getTotalPaidAmount($booking_id);
            
            // Get booking total amount and details
            $stmt = $this->conn->prepare("SELECT total_amount, booking_source, owner_reference FROM bookings WHERE id = ?");
            $stmt->bindParam(1, $booking_id);
            $stmt->execute();
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                error_log("Booking not found for payment status update: {$booking_id}");
                return false;
            }
            
            $total_amount = (float)$booking['total_amount'];
            $booking_source = $booking['booking_source'] ?? 'walk_in';
            $owner_reference = (bool)($booking['owner_reference'] ?? false);
            
            // Calculate remaining amount and determine payment status
            if ($owner_reference) {
                // Owner reference booking - no payment required
                $payment_status = 'referred_by_owner';
                $remaining_amount = 0.00;
            } else {
                $remaining_amount = max(0, $total_amount - $total_paid);
                
                // Determine payment status based on actual amounts
                if ($total_paid >= $total_amount) {
                    $payment_status = 'completed';
                } elseif ($total_paid > 0) {
                    $payment_status = 'partial';
                } else {
                    $payment_status = 'pending';
                }
            }
            
            // Update the booking table
            $stmt = $this->conn->prepare("
                UPDATE bookings 
                SET paid_amount = ?, 
                    remaining_amount = ?, 
                    payment_status = ? 
                WHERE id = ?
            ");
            $stmt->bindParam(1, $total_paid);
            $stmt->bindParam(2, $remaining_amount);
            $stmt->bindParam(3, $payment_status);
            $stmt->bindParam(4, $booking_id);
            
            $result = $stmt->execute();
            
            if ($result) {
                error_log("Payment status updated for booking {$booking_id} ({$booking_source}): Paid: ₹{$total_paid}, Remaining: ₹{$remaining_amount}, Status: {$payment_status}");
            } else {
                error_log("Failed to update payment status for booking {$booking_id}");
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("Error updating payment status for booking {$booking_id}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get total paid amount from all payments for a booking
     */
    private function getTotalPaidAmount($booking_id) {
        try {
            $total_paid = 0.00;
            
            // Check if walk_in_payments table exists and has data
            try {
                $stmt = $this->conn->prepare("
                    SELECT SUM(amount) as total_paid 
                    FROM walk_in_payments 
                    WHERE booking_id = ? AND payment_status = 'completed'
                ");
                $stmt->bindParam(1, $booking_id);
                $stmt->execute();
                $walk_in_payment = $stmt->fetch(PDO::FETCH_ASSOC);
                $walk_in_total = (float)($walk_in_payment['total_paid'] ?? 0);
                $total_paid += $walk_in_total;
            } catch (Exception $e) {
                // Table might not exist, continue with regular payments
                error_log("Walk-in payments table not accessible: " . $e->getMessage());
            }
            
            // Check regular payments table
            try {
                $stmt = $this->conn->prepare("
                    SELECT SUM(amount) as total_paid 
                    FROM payments 
                    WHERE booking_id = ? AND payment_status = 'completed'
                ");
                $stmt->bindParam(1, $booking_id);
                $stmt->execute();
                $regular_payment = $stmt->fetch(PDO::FETCH_ASSOC);
                $regular_total = (float)($regular_payment['total_paid'] ?? 0);
                $total_paid += $regular_total;
            } catch (Exception $e) {
                error_log("Regular payments table not accessible: " . $e->getMessage());
            }
            
            error_log("Total paid amount for booking {$booking_id}: Total: ₹{$total_paid}");
            
            return $total_paid;
            
        } catch (Exception $e) {
            error_log("Error getting total paid amount for booking {$booking_id}: " . $e->getMessage());
            return 0.00;
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Verify JWT token
        $headers = getallheaders();
        $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
        
        if (!$token) {
            http_response_code(401);
            echo json_encode(['error' => 'Authorization token required']);
            exit;
        }
        
        $jwt = new JWT();
        $decoded = $jwt->decode($token);
        
        if (!$decoded || !in_array($decoded->role, ['admin', 'reception'])) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied. Admin or Reception role required.']);
            exit;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? 'update_all';
        $booking_id = $input['booking_id'] ?? null;
        
        $database = new Database();
        $db = $database->getConnection();
        
        $updater = new PaymentStatusUpdater($db);
        
        if ($action === 'update_single' && $booking_id) {
            $result = $updater->updateSingleBooking($booking_id);
            if ($result) {
                echo json_encode(['success' => true, 'message' => 'Payment status updated successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to update payment status']);
            }
        } elseif ($action === 'fix_corporate') {
            // Fix corporate booking payment statuses
            $result = $updater->fixCorporateBookings();
            echo json_encode($result);
        } else {
            // Update all bookings
            $result = $updater->updateAllBookings();
            echo json_encode($result);
        }
        
    } catch (Exception $e) {
        error_log("Payment status update error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Internal server error']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
