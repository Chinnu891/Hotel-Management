<?php
// Payment workaround API to handle the UPDATE issue
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

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
                
                $receiptNumber = 'WRK' . date('YmdHis');
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
                
                // Strategy 1: Direct SQL with hardcoded values
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
                
                // Strategy 2: Use REPLACE INTO (if table structure allows)
                if (!$updateSuccess) {
                    try {
                        // Get all current booking data
                        $stmt = $conn->prepare("SELECT * FROM bookings WHERE id = ?");
                        $stmt->execute([$bookingId]);
                        $currentBooking = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if ($currentBooking) {
                            // Update the specific fields
                            $currentBooking['paid_amount'] = $newPaidAmount;
                            $currentBooking['payment_status'] = $newPaymentStatus;
                            $currentBooking['remaining_amount'] = $currentBooking['total_amount'] - $newPaidAmount;
                            
                            // Build REPLACE query
                            $columns = array_keys($currentBooking);
                            $placeholders = str_repeat('?,', count($columns) - 1) . '?';
                            $values = array_values($currentBooking);
                            
                            $stmt = $conn->prepare("REPLACE INTO bookings (" . implode(',', $columns) . ") VALUES ($placeholders)");
                            $result = $stmt->execute($values);
                            
                            if ($result) {
                                $updateSuccess = true;
                                $updateMethod = 'replace_into';
                            }
                        }
                    } catch (Exception $e) {
                        error_log("REPLACE INTO UPDATE failed: " . $e->getMessage());
                    }
                }
                
                // Strategy 3: Use a stored procedure approach
                if (!$updateSuccess) {
                    try {
                        // Create a temporary procedure
                        $conn->exec("
                            CREATE TEMPORARY PROCEDURE UpdateBookingPayment(
                                IN booking_id INT,
                                IN new_paid_amount DECIMAL(10,2),
                                IN new_payment_status VARCHAR(50)
                            )
                            BEGIN
                                UPDATE bookings 
                                SET paid_amount = new_paid_amount, 
                                    payment_status = new_payment_status,
                                    remaining_amount = total_amount - new_paid_amount
                                WHERE id = booking_id;
                            END
                        ");
                        
                        $stmt = $conn->prepare("CALL UpdateBookingPayment(?, ?, ?)");
                        $result = $stmt->execute([$bookingId, $newPaidAmount, $newPaymentStatus]);
                        
                        if ($result) {
                            $updateSuccess = true;
                            $updateMethod = 'stored_procedure';
                        }
                        
                        $conn->exec("DROP TEMPORARY PROCEDURE UpdateBookingPayment");
                    } catch (Exception $e) {
                        error_log("Stored procedure UPDATE failed: " . $e->getMessage());
                    }
                }
                
                // Strategy 4: Manual calculation and direct field update
                if (!$updateSuccess) {
                    try {
                        // Update each field individually with retry logic
                        $fields = [
                            'paid_amount' => $newPaidAmount,
                            'payment_status' => $newPaymentStatus
                        ];
                        
                        $allFieldsUpdated = true;
                        foreach ($fields as $field => $value) {
                            $retryCount = 0;
                            $fieldUpdated = false;
                            
                            while ($retryCount < 3 && !$fieldUpdated) {
                                $retryCount++;
                                
                                $stmt = $conn->prepare("UPDATE bookings SET $field = ? WHERE id = ?");
                                $result = $stmt->execute([$value, $bookingId]);
                                
                                if ($result && $stmt->rowCount() > 0) {
                                    $fieldUpdated = true;
                                } else {
                                    if ($retryCount < 3) {
                                        sleep(0.1); // Small delay before retry
                                    }
                                }
                            }
                            
                            if (!$fieldUpdated) {
                                $allFieldsUpdated = false;
                                break;
                            }
                        }
                        
                        if ($allFieldsUpdated) {
                            $updateSuccess = true;
                            $updateMethod = 'individual_fields_with_retry';
                        }
                    } catch (Exception $e) {
                        error_log("Individual fields UPDATE failed: " . $e->getMessage());
                    }
                }
                
                // Verify the update was actually successful by checking the database
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
