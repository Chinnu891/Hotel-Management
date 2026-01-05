<?php
/**
 * Debug Script: Fix Corporate Booking Payment Status
 * This script fixes payment status issues for corporate bookings
 */

require_once '../config/database.php';
require_once '../utils/response.php';

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo "Database connection failed\n";
        exit(1);
    }
    
    echo "=== Corporate Booking Payment Status Fix ===\n\n";
    
    // First, let's check the current status of corporate bookings
    $stmt = $conn->prepare("
        SELECT 
            b.id,
            b.booking_reference,
            b.total_amount,
            b.paid_amount,
            b.remaining_amount,
            b.payment_status,
            b.booking_source,
            cb.company_name
        FROM bookings b
        LEFT JOIN corporate_bookings cb ON b.id = cb.booking_id
        WHERE b.booking_source = 'corporate'
        ORDER BY b.created_at DESC
        LIMIT 10
    ");
    $stmt->execute();
    $corporate_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current Corporate Bookings:\n";
    echo str_repeat("-", 80) . "\n";
    printf("%-5s %-20s %-12s %-12s %-12s %-20s %-15s\n", 
           "ID", "Reference", "Total", "Paid", "Remaining", "Status", "Company");
    echo str_repeat("-", 80) . "\n";
    
    foreach ($corporate_bookings as $booking) {
        printf("%-5s %-20s %-12s %-12s %-12s %-20s %-15s\n",
               $booking['id'],
               $booking['booking_reference'],
               "₹" . $booking['total_amount'],
               "₹" . $booking['paid_amount'],
               "₹" . $booking['remaining_amount'],
               $booking['payment_status'],
               substr($booking['company_name'] ?? 'N/A', 0, 15)
        );
    }
    
    echo "\n" . str_repeat("-", 80) . "\n\n";
    
    // Now let's fix the payment status for each corporate booking
    echo "Fixing payment status for corporate bookings...\n";
    
    $fixed_count = 0;
    $errors = [];
    
    foreach ($corporate_bookings as $booking) {
        $booking_id = $booking['id'];
        
        try {
            // Get total amount from all payments for this booking
            $stmt = $conn->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_paid 
                FROM walk_in_payments 
                WHERE booking_id = ? AND payment_status = 'completed'
            ");
            $stmt->execute([$booking_id]);
            $walk_in_payment = $stmt->fetch(PDO::FETCH_ASSOC);
            $walk_in_total = (float)($walk_in_payment['total_paid'] ?? 0);
            
            $stmt = $conn->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_paid 
                FROM payments 
                WHERE booking_id = ? AND payment_status = 'completed'
            ");
            $stmt->execute([$booking_id]);
            $regular_payment = $stmt->fetch(PDO::FETCH_ASSOC);
            $regular_total = (float)($regular_payment['total_paid'] ?? 0);
            
            $total_paid = $walk_in_total + $regular_total;
            $total_amount = (float)$booking['total_amount'];
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
            $stmt = $conn->prepare("
                UPDATE bookings 
                SET paid_amount = ?, 
                    remaining_amount = ?, 
                    payment_status = ? 
                WHERE id = ?
            ");
            $stmt->execute([$total_paid, $remaining_amount, $payment_status, $booking_id]);
            
            echo "✅ Fixed booking {$booking['booking_reference']}: Paid: ₹{$total_paid}, Remaining: ₹{$remaining_amount}, Status: {$payment_status}\n";
            $fixed_count++;
            
        } catch (Exception $e) {
            echo "❌ Failed to fix booking {$booking['booking_reference']}: " . $e->getMessage() . "\n";
            $errors[] = "Failed to fix booking {$booking['booking_reference']}: " . $e->getMessage();
        }
    }
    
    echo "\n" . str_repeat("-", 80) . "\n";
    echo "Summary: Fixed {$fixed_count} out of " . count($corporate_bookings) . " corporate bookings\n";
    
    if (!empty($errors)) {
        echo "\nErrors encountered:\n";
        foreach ($errors as $error) {
            echo "- {$error}\n";
        }
    }
    
    // Show the updated status
    echo "\nUpdated Corporate Bookings:\n";
    echo str_repeat("-", 80) . "\n";
    
    $stmt->execute();
    $updated_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    printf("%-5s %-20s %-12s %-12s %-12s %-20s %-15s\n", 
           "ID", "Reference", "Total", "Paid", "Remaining", "Status", "Company");
    echo str_repeat("-", 80) . "\n";
    
    foreach ($updated_bookings as $booking) {
        printf("%-5s %-20s %-12s %-12s %-12s %-20s %-15s\n",
               $booking['id'],
               $booking['booking_reference'],
               "₹" . $booking['total_amount'],
               "₹" . $booking['paid_amount'],
               "₹" . $booking['payment_status'],
               $booking['remaining_amount'],
               substr($booking['company_name'] ?? 'N/A', 0, 15)
        );
    }
    
    echo "\n=== Fix Complete ===\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
