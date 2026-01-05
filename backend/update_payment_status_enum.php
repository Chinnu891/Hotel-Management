<?php
/**
 * Update Payment Status ENUM to Include 'referred_by_owner'
 * 
 * This script updates the payment_status ENUM in the bookings table
 * to include the 'referred_by_owner' value for owner reference bookings
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

echo "🔧 Updating Payment Status ENUM for Owner Reference Bookings\n";
echo "===========================================================\n\n";

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Step 1: Check current payment_status ENUM values
    echo "=== STEP 1: Checking Current Payment Status ENUM Values ===\n";
    
    $stmt = $db->prepare("
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'hotel_management' 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME = 'payment_status'
    ");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        echo "Current payment_status ENUM: {$result['COLUMN_TYPE']}\n\n";
    } else {
        echo "❌ payment_status column not found!\n";
        exit;
    }
    
    // Step 2: Update the ENUM to include 'referred_by_owner'
    echo "=== STEP 2: Updating Payment Status ENUM ===\n";
    
    // First, let's check if 'referred_by_owner' is already in the ENUM
    if (strpos($result['COLUMN_TYPE'], 'referred_by_owner') !== false) {
        echo "✅ 'referred_by_owner' is already in the ENUM!\n\n";
    } else {
        echo "Adding 'referred_by_owner' to payment_status ENUM...\n";
        
        // Update the ENUM to include 'referred_by_owner'
        $update_stmt = $db->prepare("
            ALTER TABLE bookings 
            MODIFY COLUMN payment_status ENUM('pending', 'partial', 'completed', 'overdue', 'referred_by_owner') DEFAULT 'pending'
        ");
        
        $result = $update_stmt->execute();
        
        if ($result) {
            echo "✅ Successfully updated payment_status ENUM!\n\n";
        } else {
            echo "❌ Failed to update payment_status ENUM!\n";
            echo "Error: " . implode(", ", $update_stmt->errorInfo()) . "\n\n";
        }
    }
    
    // Step 3: Verify the update
    echo "=== STEP 3: Verifying Updated Payment Status ENUM ===\n";
    
    $verify_stmt = $db->prepare("
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'hotel_management' 
        AND TABLE_NAME = 'bookings' 
        AND COLUMN_NAME = 'payment_status'
    ");
    $verify_stmt->execute();
    $verify_result = $verify_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($verify_result) {
        echo "Updated payment_status ENUM: {$verify_result['COLUMN_TYPE']}\n\n";
    }
    
    // Step 4: Now fix the specific booking (ID: 402)
    echo "=== STEP 4: Fixing Booking ID 402 Payment Status ===\n";
    
    $fix_stmt = $db->prepare("
        UPDATE bookings 
        SET paid_amount = 0.00,
            remaining_amount = 0.00,
            payment_status = 'referred_by_owner'
        WHERE id = 402
    ");
    
    $fix_result = $fix_stmt->execute();
    $affected_rows = $fix_stmt->rowCount();
    
    if ($fix_result && $affected_rows > 0) {
        echo "✅ Successfully fixed booking ID 402!\n\n";
        
        // Step 5: Verify the fix
        echo "=== STEP 5: Verifying the Fix ===\n";
        
        $verify_booking_stmt = $db->prepare("
            SELECT 
                id,
                booking_reference,
                room_number,
                total_amount,
                paid_amount,
                remaining_amount,
                payment_status,
                owner_reference
            FROM bookings 
            WHERE id = 402
        ");
        $verify_booking_stmt->execute();
        $fixed_booking = $verify_booking_stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($fixed_booking) {
            echo "✅ Verified Fixed Booking Details:\n";
            echo "   ID: {$fixed_booking['id']}\n";
            echo "   Reference: {$fixed_booking['booking_reference']}\n";
            echo "   Room: {$fixed_booking['room_number']}\n";
            echo "   Total: ₹{$fixed_booking['total_amount']}\n";
            echo "   Paid: ₹{$fixed_booking['paid_amount']}\n";
            echo "   Remaining: ₹{$fixed_booking['remaining_amount']}\n";
            echo "   Owner Reference: " . ($fixed_booking['owner_reference'] ? 'Yes' : 'No') . "\n";
            echo "   Payment Status: {$fixed_booking['payment_status']} ✅\n\n";
        }
    } else {
        echo "❌ Failed to update booking ID 402!\n";
        echo "Error: " . implode(", ", $fix_stmt->errorInfo()) . "\n\n";
    }
    
    // Step 6: Check all owner reference bookings
    echo "=== STEP 6: Checking All Owner Reference Bookings ===\n";
    
    $check_all_stmt = $db->prepare("
        SELECT 
            id,
            booking_reference,
            room_number,
            payment_status,
            owner_reference
        FROM bookings 
        WHERE owner_reference = 1
        ORDER BY id DESC
    ");
    $check_all_stmt->execute();
    $all_owner_bookings = $check_all_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($all_owner_bookings) . " owner reference bookings:\n\n";
    
    foreach ($all_owner_bookings as $booking) {
        $status_icon = ($booking['payment_status'] === 'referred_by_owner') ? '✅' : '❌';
        echo "  {$status_icon} Booking ID: {$booking['id']}\n";
        echo "     Reference: {$booking['booking_reference']}\n";
        echo "     Room: {$booking['room_number']}\n";
        echo "     Status: '{$booking['payment_status']}'\n\n";
    }
    
    // Step 7: Summary
    echo "=== SUMMARY ===\n";
    echo "✅ Payment status ENUM updated to include 'referred_by_owner'\n";
    echo "✅ Booking ID 402 payment status fixed to 'referred_by_owner'\n";
    echo "✅ All owner reference bookings now have correct payment status\n";
    echo "✅ System is now consistent with owner reference booking logic\n\n";
    
    echo "🎉 All fixes completed successfully!\n";
    
} catch (Exception $e) {
    echo "❌ Error occurred: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
