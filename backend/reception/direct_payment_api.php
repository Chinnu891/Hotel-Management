<?php
// Direct payment API - bypasses routing issues
// This API handles the corporate payment UPDATE issue

// Set only essential headers
header('Content-Type: application/json');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../config/database.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        throw new Exception('Database connection failed');
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    if ($action === 'pay_due_amount') {
        $bookingId = $input['booking_id'] ?? null;
        $amount = $input['amount'] ?? null;
        $paymentMethod = $input['payment_method'] ?? 'cash';
        $notes = $input['notes'] ?? '';
        
        if (!$bookingId || !$amount || $amount <= 0) {
            throw new Exception('Booking ID and valid amount are required');
        }
        
        try {
            $conn->beginTransaction();
            
            // Get current booking data
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            $stmt->execute([$bookingId]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                throw new Exception('Booking not found');
            }
            
            // Insert payment
            $stmt = $conn->prepare("
                INSERT INTO walk_in_payments (
                    booking_id, amount, payment_method, payment_status,
                    receipt_number, notes, processed_by, payment_type
                ) VALUES (?, ?, ?, 'completed', ?, ?, ?, 'partial')
            ");
            
            $receiptNumber = 'DIRECT' . date('YmdHis');
            $result = $stmt->execute([
                $bookingId,
                $amount,
                $paymentMethod,
                $receiptNumber,
                $notes,
                1
            ]);
            
            if (!$result) {
                throw new Exception('Failed to insert payment');
            }
            
            $paymentId = $conn->lastInsertId();
            
            // Calculate new amounts
            $newPaidAmount = $booking['paid_amount'] + $amount;
            $newPaymentStatus = ($newPaidAmount >= $booking['total_amount']) ? 'completed' : 'partial';
            
            // Try to update booking - use the most reliable method
            $updateSuccess = false;
            
            // Method 1: Direct UPDATE
            try {
                $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ?, payment_status = ? WHERE id = ?");
                $result = $stmt->execute([$newPaidAmount, $newPaymentStatus, $bookingId]);
                
                if ($result && $stmt->rowCount() > 0) {
                    $updateSuccess = true;
                }
            } catch (Exception $e) {
                error_log("Direct UPDATE failed: " . $e->getMessage());
            }
            
            // Method 2: Individual field updates
            if (!$updateSuccess) {
                try {
                    $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ? WHERE id = ?");
                    $result1 = $stmt->execute([$newPaidAmount, $bookingId]);
                    
                    if ($result1 && $stmt->rowCount() > 0) {
                        $stmt = $conn->prepare("UPDATE bookings SET payment_status = ? WHERE id = ?");
                        $result2 = $stmt->execute([$newPaymentStatus, $bookingId]);
                        
                        if ($result2 && $stmt->rowCount() > 0) {
                            $updateSuccess = true;
                        }
                    }
                } catch (Exception $e) {
                    error_log("Individual UPDATE failed: " . $e->getMessage());
                }
            }
            
            // Verify the update
            $stmt = $conn->prepare("SELECT paid_amount, remaining_amount, payment_status FROM bookings WHERE id = ?");
            $stmt->execute([$bookingId]);
            $finalBooking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $actualUpdateSuccess = false;
            if ($finalBooking) {
                $expectedPaid = $booking['paid_amount'] + $amount;
                if (abs($finalBooking['paid_amount'] - $expectedPaid) < 0.01) {
                    $actualUpdateSuccess = true;
                }
            }
            
            if ($actualUpdateSuccess) {
                // Log activity
                $stmt = $conn->prepare("
                    INSERT INTO activity_logs (user_id, action, details, created_at)
                    VALUES (?, 'payment_received', ?, NOW())
                ");
                $stmt->execute([1, "Payment of ₹{$amount} received for booking {$bookingId}"]);
                
                $conn->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Payment processed successfully',
                    'payment_id' => $paymentId,
                    'new_paid_amount' => $finalBooking['paid_amount'],
                    'new_remaining_amount' => $finalBooking['remaining_amount'],
                    'new_payment_status' => $finalBooking['payment_status']
                ]);
            } else {
                // Still commit the payment
                $conn->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Payment recorded successfully, but booking update failed. Please contact support.',
                    'payment_id' => $paymentId,
                    'warning' => 'Booking amounts may not reflect the latest payment'
                ]);
            }
            
        } catch (Exception $e) {
            $conn->rollBack();
            throw $e;
        }
    } else {
        throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Payment failed: ' . $e->getMessage()
    ]);
}
?>

