<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class GuestSearch {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function search($type, $term, $status = 'all') {
        try {
            // Build where clause based on search type
            $where_clause = $this->buildWhereClause($type, $term, $status);
            $params = $this->buildParams($type, $term, $status);

            // Build the main query with remaining amount information
            $query = "
                SELECT DISTINCT
                    b.id as booking_id,
                    b.booking_reference,
                    b.check_in_date,
                    b.check_out_date,
                    b.check_in_time,
                    b.check_out_time,
                    b.status as booking_status,
                    b.adults,
                    b.children,
                    b.total_amount,
                    b.paid_amount,
                    b.remaining_amount,
                    b.payment_status,
                    b.notes,
                    b.created_at,
                    b.owner_reference,
                    g.id as guest_id,
                    g.first_name,
                    g.last_name,
                    g.email,
                    g.phone,
                    g.address,
                    g.id_proof_type,
                    g.id_proof_number,
                    r.id as room_id,
                    r.room_number,
                    r.status as room_status,
                    rt.name as room_type,
                    rt.base_price,
                    rt.capacity,
                    rt.amenities
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE $where_clause
                ORDER BY b.created_at DESC
                LIMIT 50
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get additional services for each booking and calculate correct payment status
            foreach ($results as &$result) {
                $result['extra_services'] = $this->getExtraServices($result['booking_id']);
                $result['payment_history'] = $this->getPaymentHistory($result['booking_id']);
                
                // Calculate correct payment status and remaining amount
                $result = $this->calculatePaymentStatus($result);
            }

            return $this->response->success([
                'guests' => $results,
                'total_count' => count($results),
                'search_type' => $type,
                'search_term' => $term,
                'status_filter' => $status
            ]);

        } catch (Exception $e) {
            error_log("Guest search error: " . $e->getMessage());
            return $this->response->error("Search failed", 500);
        }
    }

    private function buildWhereClause($type, $term, $status) {
        $conditions = [];

        // Add search type conditions
        switch ($type) {
            case 'name':
                $conditions[] = "(g.first_name LIKE :term OR g.last_name LIKE :term OR CONCAT(g.first_name, ' ', g.last_name) LIKE :term)";
                break;
            case 'phone':
                $conditions[] = "g.phone LIKE :term";
                break;
            case 'id_proof':
                $conditions[] = "g.id_proof_number LIKE :term";
                break;
            case 'booking_ref':
                $conditions[] = "b.booking_reference LIKE :term";
                break;
            case 'room_number':
                $conditions[] = "r.room_number LIKE :term";
                break;
            default:
                $conditions[] = "(g.first_name LIKE :term OR g.last_name LIKE :term OR g.phone LIKE :term OR b.booking_reference LIKE :term)";
        }

        // Add status filter
        if ($status !== 'all') {
            $conditions[] = "b.status = :status";
        }

        return implode(' AND ', $conditions);
    }

    private function buildParams($type, $term, $status) {
        $params = [':term' => "%$term%"];
        
        if ($status !== 'all') {
            $params[':status'] = $status;
        }

        return $params;
    }

    private function getExtraServices($booking_id) {
        $query = "SELECT es.name, es.price, bs.quantity, bs.total_price
                  FROM booking_services bs
                  JOIN extra_services es ON bs.service_id = es.id
                  WHERE bs.booking_id = :booking_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':booking_id', $booking_id);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getPaymentHistory($booking_id) {
        $query = "SELECT amount, payment_method, payment_status, payment_date, receipt_number, notes
                  FROM walk_in_payments
                  WHERE booking_id = :booking_id
                  ORDER BY payment_date DESC";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':booking_id', $booking_id);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Calculate correct payment status based on paid_amount and total_amount
     */
    private function calculatePaymentStatus($booking) {
        // First, update the booking payment status in database based on actual payments
        $this->updateBookingPaymentStatus($booking['booking_id']);
        
        // Get the updated booking data
        $stmt = $this->conn->prepare("SELECT total_amount, paid_amount, remaining_amount, payment_status FROM bookings WHERE id = ?");
        $stmt->bindParam(1, $booking['booking_id']);
        $stmt->execute();
        $updated_booking = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($updated_booking) {
            $total_amount = (float)$updated_booking['total_amount'];
            $paid_amount = (float)$updated_booking['paid_amount'];
            $remaining_amount = (float)$updated_booking['remaining_amount'];
            $payment_status = $updated_booking['payment_status'];
        } else {
            // Fallback to original data if update failed
            $total_amount = (float)$booking['total_amount'];
            $paid_amount = (float)$booking['paid_amount'];
            $remaining_amount = (float)$booking['remaining_amount'];
            $payment_status = $booking['payment_status'];
        }
        
        // Check if this is an owner reference booking
        if (isset($booking['owner_reference']) && $booking['owner_reference']) {
            $payment_status = 'referred_by_owner';
            $payment_summary = 'Referred by Owner of the Hotel';
            $remaining_amount = 0.00; // No remaining amount for owner reference
        } else {
            // Determine payment status and summary for regular bookings
            if ($paid_amount >= $total_amount) {
                $payment_status = 'completed';
                $payment_summary = 'Fully Paid';
                $remaining_amount = 0.00;
            } elseif ($paid_amount > 0) {
                $payment_status = 'partial';
                $payment_summary = 'Partial Payment';
            } else {
                $payment_status = 'pending';
                $payment_summary = 'Payment Pending';
            }
        }
        
        // Update the booking data with correct values
        $booking['calculated_payment_status'] = $payment_status;
        $booking['calculated_remaining_amount'] = $remaining_amount;
        $booking['payment_summary'] = $payment_summary;
        $booking['is_fully_paid'] = ($paid_amount >= $total_amount);
        
        // Also update the main fields to ensure consistency
        $booking['paid_amount'] = $paid_amount;
        $booking['remaining_amount'] = $remaining_amount;
        $booking['payment_status'] = $payment_status;
        
        // Log the calculation for debugging
        error_log("Payment calculation for booking {$booking['booking_id']}: Total: ₹{$total_amount}, Paid: ₹{$paid_amount}, Remaining: ₹{$remaining_amount}, Status: {$payment_status}");
        
        return $booking;
    }

    /**
     * Update payment status in bookings table based on actual payments
     */
    public function updateBookingPaymentStatus($booking_id) {
        try {
            // Get total amount from all payments for this booking
            $total_paid = $this->getTotalPaidAmount($booking_id);
            
            // Get booking total amount
            $stmt = $this->conn->prepare("SELECT total_amount FROM bookings WHERE id = ?");
            $stmt->bindParam(1, $booking_id);
            $stmt->execute();
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                error_log("Booking not found for payment status update: {$booking_id}");
                return false;
            }
            
            $total_amount = (float)$booking['total_amount'];
            $remaining_amount = $total_amount - $total_paid;
            
            // Determine payment status
            if ($total_paid >= $total_amount) {
                $payment_status = 'completed';
            } elseif ($total_paid > 0) {
                $payment_status = 'partial';
            } else {
                $payment_status = 'pending';
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
                error_log("Payment status updated for booking {$booking_id}: Paid: ₹{$total_paid}, Remaining: ₹{$remaining_amount}, Status: {$payment_status}");
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
            // First check walk_in_payments table
            $stmt = $this->conn->prepare("
                SELECT SUM(amount) as total_paid 
                FROM walk_in_payments 
                WHERE booking_id = ? AND payment_status = 'completed'
            ");
            $stmt->bindParam(1, $booking_id);
            $stmt->execute();
            $walk_in_payment = $stmt->fetch(PDO::FETCH_ASSOC);
            $walk_in_total = (float)($walk_in_payment['total_paid'] ?? 0);
            
            // Then check regular payments table
            $stmt = $this->conn->prepare("
                SELECT SUM(amount) as total_paid 
                FROM payments 
                WHERE booking_id = ? AND payment_status = 'completed'
            ");
            $stmt->bindParam(1, $booking_id);
            $stmt->execute();
            $regular_payment = $stmt->fetch(PDO::FETCH_ASSOC);
            $regular_total = (float)($regular_payment['total_paid'] ?? 0);
            
            $total_paid = $walk_in_total + $regular_total;
            
            error_log("Total paid amount for booking {$booking_id}: Walk-in: ₹{$walk_in_total}, Regular: ₹{$regular_total}, Total: ₹{$total_paid}");
            
            return $total_paid;
            
        } catch (Exception $e) {
            error_log("Error getting total paid amount for booking {$booking_id}: " . $e->getMessage());
            return 0.00;
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $type = $_GET['type'] ?? 'name';
    $term = $_GET['term'] ?? '';
    $status = $_GET['status'] ?? 'all';

    if (empty($term)) {
        echo json_encode(['success' => false, 'message' => 'Search term is required']);
        exit;
    }

    $database = new Database();
    $db = $database->getConnection();
    $guestSearch = new GuestSearch($db);
    
    echo json_encode($guestSearch->search($type, $term, $status));
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
