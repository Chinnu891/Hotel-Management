<?php
// Payment Sync Helper
// This utility helps payment APIs sync payments with the bookings table

class PaymentSyncHelper {
    
    /**
     * Comprehensive payment status validation for corporate bookings
     * This ensures payment status is always correct after any payment operation
     */
    public static function validateCorporateBookingPaymentStatus($booking_id, $db) {
        try {
            // Get the total amount for this booking
            $stmt = $db->prepare("SELECT total_amount, booking_source FROM bookings WHERE id = ?");
            $stmt->execute([$booking_id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                error_log("PaymentSyncHelper: Corporate booking ID {$booking_id} not found");
                return false;
            }
            
            // Only process corporate bookings
            if ($booking['booking_source'] !== 'corporate') {
                return true; // Not a corporate booking, skip
            }
            
            $total_amount = (float)$booking['total_amount'];
            
            // Calculate total paid from both payment tables
            $stmt = $db->prepare("
                SELECT 
                    COALESCE(SUM(p.amount), 0) as payments_total,
                    COALESCE(SUM(wp.amount), 0) as walk_in_payments_total
                FROM bookings b
                LEFT JOIN payments p ON b.id = p.booking_id AND p.payment_status = 'completed'
                LEFT JOIN walk_in_payments wp ON b.id = wp.booking_id AND wp.payment_status = 'completed'
                WHERE b.id = ?
                GROUP BY b.id
            ");
            $stmt->execute([$booking_id]);
            $payment_totals = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $total_paid = ($payment_totals['payments_total'] ?? 0) + ($payment_totals['walk_in_payments_total'] ?? 0);
            $remaining_amount = max(0, $total_amount - $total_paid);
            
            // Determine payment status
            if ($total_paid >= $total_amount) {
                $payment_status = 'completed';
            } elseif ($total_paid > 0) {
                $payment_status = 'partial';
            } else {
                $payment_status = 'pending';
            }
            
            // Update the booking table
            $stmt = $db->prepare("
                UPDATE bookings 
                SET paid_amount = ?, 
                    remaining_amount = ?, 
                    payment_status = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $result = $stmt->execute([$total_paid, $remaining_amount, $payment_status, $booking_id]);
            
            if ($result) {
                error_log("PaymentSyncHelper: Corporate booking {$booking_id} payment status validated - Paid: ₹{$total_paid}, Remaining: ₹{$remaining_amount}, Status: {$payment_status}");
            } else {
                error_log("PaymentSyncHelper: Failed to validate corporate booking {$booking_id} payment status");
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("PaymentSyncHelper: Error validating corporate booking payment status for ID {$booking_id}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Sync payment amounts with booking table
     * This function should be called after recording any payment
     */
    public static function syncPaymentWithBooking($booking_id, $db) {
        try {
            // Get the total amount for this booking
            $stmt = $db->prepare("SELECT total_amount FROM bookings WHERE id = ?");
            $stmt->execute([$booking_id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                error_log("PaymentSyncHelper: Booking ID {$booking_id} not found");
                return false;
            }
            
            $total_amount = $booking['total_amount'];
            
            // Calculate total paid from both payment tables
            $stmt = $db->prepare("
                SELECT 
                    COALESCE(SUM(p.amount), 0) as payments_total,
                    COALESCE(SUM(wp.amount), 0) as walk_in_payments_total
                FROM bookings b
                LEFT JOIN payments p ON b.id = p.booking_id
                LEFT JOIN walk_in_payments wp ON b.id = wp.booking_id
                WHERE b.id = ?
                GROUP BY b.id
            ");
            $stmt->execute([$booking_id]);
            $payment_totals = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $total_paid = ($payment_totals['payments_total'] ?? 0) + ($payment_totals['walk_in_payments_total'] ?? 0);
            $remaining_amount = $total_amount - $total_paid;
            
            // Determine payment status
            if ($total_paid >= $total_amount) {
                $payment_status = 'completed';
            } elseif ($total_paid > 0) {
                $payment_status = 'partial';
            } else {
                $payment_status = 'pending';
            }
            
            // Update the bookings table
            $update_stmt = $db->prepare("
                UPDATE bookings 
                SET paid_amount = ?,
                    remaining_amount = ?,
                    payment_status = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            
            $result = $update_stmt->execute([
                $total_paid,
                $remaining_amount,
                $payment_status,
                $booking_id
            ]);
            
            if ($result) {
                error_log("PaymentSyncHelper: Successfully synced booking ID {$booking_id} - Paid: ₹{$total_paid}, Remaining: ₹{$remaining_amount}, Status: {$payment_status}");
                
                // Log the sync operation
                self::logPaymentSync($booking_id, $total_paid, $remaining_amount, $payment_status, $db);
                
                return true;
            } else {
                error_log("PaymentSyncHelper: Failed to update booking ID {$booking_id}");
                return false;
            }
            
        } catch (Exception $e) {
            error_log("PaymentSyncHelper Error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Log payment sync operations
     */
    private static function logPaymentSync($booking_id, $total_paid, $remaining_amount, $payment_status, $db) {
        try {
            // Check if payment_sync_log table exists
            $stmt = $db->prepare("SHOW TABLES LIKE 'payment_sync_log'");
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                $log_stmt = $db->prepare("
                    INSERT INTO payment_sync_log (booking_id, payment_id, action, old_paid, new_paid, old_remaining, new_remaining, old_status, new_status, created_at)
                    VALUES (?, 0, 'MANUAL_SYNC', 0, ?, 0, ?, 'pending', ?, NOW())
                ");
                $log_stmt->execute([$booking_id, $total_paid, $remaining_amount, $payment_status]);
            }
        } catch (Exception $e) {
            // Log table might not exist, ignore this error
            error_log("PaymentSyncHelper: Could not log to payment_sync_log table: " . $e->getMessage());
        }
    }
    
    /**
     * Get payment summary for a booking
     */
    public static function getPaymentSummary($booking_id, $db) {
        try {
            $stmt = $db->prepare("
                SELECT 
                    b.total_amount,
                    b.paid_amount,
                    b.remaining_amount,
                    b.payment_status,
                    COALESCE(SUM(p.amount), 0) as payments_total,
                    COALESCE(SUM(wp.amount), 0) as walk_in_payments_total
                FROM bookings b
                LEFT JOIN payments p ON b.id = p.booking_id
                LEFT JOIN walk_in_payments wp ON b.id = wp.booking_id
                WHERE b.id = ?
                GROUP BY b.id
            ");
            $stmt->execute([$booking_id]);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($summary) {
                $actual_paid = $summary['payments_total'] + $summary['walk_in_payments_total'];
                $is_synced = ($actual_paid == $summary['paid_amount']);
                
                return [
                    'total_amount' => $summary['total_amount'],
                    'bookings_paid_amount' => $summary['paid_amount'],
                    'actual_payments_total' => $actual_paid,
                    'remaining_amount' => $summary['remaining_amount'],
                    'payment_status' => $summary['payment_status'],
                    'is_synced' => $is_synced,
                    'sync_difference' => $actual_paid - $summary['paid_amount']
                ];
            }
            
            return null;
            
        } catch (Exception $e) {
            error_log("PaymentSyncHelper Error getting summary: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Force sync all bookings (for maintenance)
     */
    public static function syncAllBookings($db) {
        try {
            // Get all bookings
            $stmt = $db->prepare("SELECT id FROM bookings");
            $stmt->execute();
            $bookings = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            $synced_count = 0;
            $error_count = 0;
            
            foreach ($bookings as $booking_id) {
                if (self::syncPaymentWithBooking($booking_id, $db)) {
                    $synced_count++;
                } else {
                    $error_count++;
                }
            }
            
            return [
                'total_bookings' => count($bookings),
                'synced_count' => $synced_count,
                'error_count' => $error_count
            ];
            
        } catch (Exception $e) {
            error_log("PaymentSyncHelper Error syncing all bookings: " . $e->getMessage());
            return false;
        }
    }
}

// Usage example:
// After recording a payment in any API:
// PaymentSyncHelper::syncPaymentWithBooking($booking_id, $db);
?>
