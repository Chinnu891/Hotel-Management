<?php
// Clean payment API - No CORS headers (handled by .htaccess)
// This API handles the corporate payment UPDATE issue

// Set only Content-Type header
header('Content-Type: application/json');

// Handle preflight OPTIONS request
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
    
    switch ($action) {
        case 'pay_due_amount':
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
                
                $receiptNumber = 'FIX' . date('YmdHis');
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
                
                // Try multiple UPDATE strategies
                $updateSuccess = false;
                $updateMethod = '';
                
                // Strategy 1: Direct SQL with parameters
                try {
                    $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ?, payment_status = ? WHERE id = ?");
                    $result = $stmt->execute([$newPaidAmount, $newPaymentStatus, $bookingId]);
                    
                    if ($result && $stmt->rowCount() > 0) {
                        $updateSuccess = true;
                        $updateMethod = 'direct_sql';
                    }
                } catch (Exception $e) {
                    error_log("Direct SQL UPDATE failed: " . $e->getMessage());
                }
                
                // Strategy 2: Individual field updates
                if (!$updateSuccess) {
                    try {
                        // Update paid_amount first
                        $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ? WHERE id = ?");
                        $result1 = $stmt->execute([$newPaidAmount, $bookingId]);
                        
                        if ($result1 && $stmt->rowCount() > 0) {
                            // Update payment_status
                            $stmt = $conn->prepare("UPDATE bookings SET payment_status = ? WHERE id = ?");
                            $result2 = $stmt->execute([$newPaymentStatus, $bookingId]);
                            
                            if ($result2 && $stmt->rowCount() > 0) {
                                $updateSuccess = true;
                                $updateMethod = 'individual_fields';
                            }
                        }
                    } catch (Exception $e) {
                        error_log("Individual fields UPDATE failed: " . $e->getMessage());
                    }
                }
                
                // Strategy 3: Hardcoded ID approach
                if (!$updateSuccess) {
                    try {
                        $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ?, payment_status = ? WHERE id = " . intval($bookingId));
                        $result = $stmt->execute([$newPaidAmount, $newPaymentStatus]);
                        
                        if ($result && $stmt->rowCount() > 0) {
                            $updateSuccess = true;
                            $updateMethod = 'hardcoded_id';
                        }
                    } catch (Exception $e) {
                        error_log("Hardcoded ID UPDATE failed: " . $e->getMessage());
                    }
                }
                
                // Verify the update was actually successful
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
                    $stmt->execute([1, "Payment of ₹{$amount} received for booking {$bookingId} using method: {$updateMethod}"]);
                    
                    $conn->commit();
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Payment processed successfully',
                        'payment_id' => $paymentId,
                        'update_method' => $updateMethod,
                        'new_paid_amount' => $finalBooking['paid_amount'],
                        'new_remaining_amount' => $finalBooking['remaining_amount'],
                        'new_payment_status' => $finalBooking['payment_status']
                    ]);
                } else {
                    // If all UPDATE methods fail, still commit the payment but log the issue
                    error_log("CRITICAL: All UPDATE methods failed for booking ID: $bookingId, amount: $amount");
                    
                    $conn->commit();
                    
                    echo json_encode([
                        'success' => true,
                        'message' => 'Payment recorded successfully, but booking update failed. Please contact support.',
                        'payment_id' => $paymentId,
                        'warning' => 'Booking amounts may not reflect the latest payment',
                        'update_method' => 'none'
                    ]);
                }
                
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;
            
        default:
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
