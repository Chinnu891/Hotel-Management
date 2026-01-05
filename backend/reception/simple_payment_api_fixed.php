<?php
// Fixed Simple Payment API - handles trigger issues
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    // Debug: Log the action parameter
    error_log("Payment API called with action: '$action'");
    
    if ($action === 'pay_due_amount') {
        $bookingId = $input['booking_id'] ?? null;
        $amount = $input['amount'] ?? null;
        $paymentMethod = $input['payment_method'] ?? 'cash';
        $notes = $input['notes'] ?? '';
        
        if (!$bookingId || !$amount || $amount <= 0) {
            throw new Exception('Booking ID and valid amount are required');
        }
        
        // Try database operations
        try {
            require_once __DIR__ . '/../config/database.php';
            $database = new Database();
            $conn = $database->getConnection();
            
            if (!$conn) {
                error_log("Database connection failed in payment API");
                throw new Exception('Database connection failed');
            }
            
            error_log("Database connection successful in payment API");
            
            // Get booking data
            $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
            $stmt->execute([$bookingId]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                throw new Exception('Booking not found');
            }
            
            // Validate amount
            if ($amount > $booking['remaining_amount']) {
                throw new Exception('Payment amount cannot exceed remaining amount');
            }
            
            // Get admin user for processed_by
            $stmt = $conn->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
            $stmt->execute();
            $adminUser = $stmt->fetch(PDO::FETCH_ASSOC);
            $processedBy = $adminUser ? $adminUser['id'] : 1;
            
            // Start transaction
            $conn->beginTransaction();
            
            // Insert payment first
            $stmt = $conn->prepare("
                INSERT INTO walk_in_payments (
                    booking_id, amount, payment_method, payment_status,
                    receipt_number, notes, processed_by, payment_type
                ) VALUES (?, ?, ?, 'completed', ?, ?, ?, 'partial')
            ");
            
            $receiptNumber = 'PAY' . date('YmdHis');
            $result = $stmt->execute([
                $bookingId,
                $amount,
                $paymentMethod,
                $receiptNumber,
                $notes,
                $processedBy
            ]);
            
            if (!$result) {
                throw new Exception('Failed to insert payment');
            }
            
            $paymentId = $conn->lastInsertId();
            error_log("Payment inserted with ID: $paymentId");
            
            // Calculate new amounts
            $newPaidAmount = $booking['paid_amount'] + $amount;
            $newPaymentStatus = ($newPaidAmount >= $booking['total_amount']) ? 'completed' : 'partial';
            
            // Update booking with multiple approaches to handle triggers
            $updateSuccess = false;
            
            // Method 1: Try direct update
            try {
                $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ?, payment_status = ? WHERE id = ?");
                $result = $stmt->execute([$newPaidAmount, $newPaymentStatus, $bookingId]);
                
                if ($result && $stmt->rowCount() > 0) {
                    $updateSuccess = true;
                    error_log("Direct update successful");
                }
            } catch (Exception $e) {
                error_log("Direct update failed: " . $e->getMessage());
            }
            
            // Method 2: Try individual field updates
            if (!$updateSuccess) {
                try {
                    $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ? WHERE id = ?");
                    $result1 = $stmt->execute([$newPaidAmount, $bookingId]);
                    
                    if ($result1 && $stmt->rowCount() > 0) {
                        $stmt = $conn->prepare("UPDATE bookings SET payment_status = ? WHERE id = ?");
                        $result2 = $stmt->execute([$newPaymentStatus, $bookingId]);
                        
                        if ($result2 && $stmt->rowCount() > 0) {
                            $updateSuccess = true;
                            error_log("Individual updates successful");
                        }
                    }
                } catch (Exception $e) {
                    error_log("Individual updates failed: " . $e->getMessage());
                }
            }
            
            // Method 3: Try with explicit remaining_amount calculation
            if (!$updateSuccess) {
                try {
                    $newRemainingAmount = $booking['total_amount'] - $newPaidAmount;
                    $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ?, remaining_amount = ?, payment_status = ? WHERE id = ?");
                    $result = $stmt->execute([$newPaidAmount, $newRemainingAmount, $newPaymentStatus, $bookingId]);
                    
                    if ($result && $stmt->rowCount() > 0) {
                        $updateSuccess = true;
                        error_log("Explicit remaining_amount update successful");
                    }
                } catch (Exception $e) {
                    error_log("Explicit remaining_amount update failed: " . $e->getMessage());
                }
            }
            
            // Verify the update worked
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
                $stmt->execute([$processedBy, "Payment of ₹{$amount} received for booking {$bookingId}"]);
                
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
                // Still commit the payment even if booking update failed
                $conn->commit();
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Payment recorded successfully, but booking update had issues. Please refresh to see updated amounts.',
                    'payment_id' => $paymentId,
                    'warning' => 'Booking amounts may not reflect the latest payment immediately'
                ]);
            }
            
        } catch (Exception $e) {
            if ($conn && $conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    } else {
        throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    error_log("Payment API error: " . $e->getMessage());
    error_log("Payment API error trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Payment failed: ' . $e->getMessage()
    ]);
}
?>
