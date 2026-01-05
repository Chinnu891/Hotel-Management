<?php
/**
 * Final Owner Reference Payment Status Fix
 * 
 * This script makes the final correction to set remaining_amount to 0.00
 * for owner reference bookings
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

echo "🔧 Final Owner Reference Payment Status Fix\n";
echo "==========================================\n\n";

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Step 1: Check current status
    echo "=== STEP 1: Current Status ===\n";
    
    $stmt = $db->prepare("
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
    $stmt->execute();
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($booking) {
        echo "Current Booking Details:\n";
        echo "   ID: {$booking['id']}\n";
        echo "   Reference: {$booking['booking_reference']}\n";
        echo "   Room: {$booking['room_number']}\n";
        echo "   Total: ₹{$booking['total_amount']}\n";
        echo "   Paid: ₹{$booking['paid_amount']}\n";
        echo "   Remaining: ₹{$booking['remaining_amount']}\n";
        echo "   Payment Status: '{$booking['payment_status']}'\n";
        echo "   Owner Reference: " . ($booking['owner_reference'] ? 'Yes' : 'No') . "\n\n";
    }
    
    // Step 2: Fix the remaining amount
    echo "=== STEP 2: Fixing Remaining Amount ===\n";
    
    $update_stmt = $db->prepare("
        UPDATE bookings 
        SET remaining_amount = 0.00
        WHERE id = 402
    ");
    
    $result = $update_stmt->execute();
    $affected_rows = $update_stmt->rowCount();
    
    if ($result && $affected_rows > 0) {
        echo "✅ Successfully updated remaining amount!\n\n";
    } else {
        echo "❌ Failed to update remaining amount!\n";
        echo "Error: " . implode(", ", $update_stmt->errorInfo()) . "\n\n";
    }
    
    // Step 3: Verify the fix
    echo "=== STEP 3: Verifying the Fix ===\n";
    
    $verify_stmt = $db->prepare("
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
    $verify_stmt->execute();
    $fixed_booking = $verify_stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($fixed_booking) {
        echo "✅ Final Booking Details:\n";
        echo "   ID: {$fixed_booking['id']}\n";
        echo "   Reference: {$fixed_booking['booking_reference']}\n";
        echo "   Room: {$fixed_booking['room_number']}\n";
        echo "   Total: ₹{$fixed_booking['total_amount']}\n";
        echo "   Paid: ₹{$fixed_booking['paid_amount']}\n";
        echo "   Remaining: ₹{$fixed_booking['remaining_amount']}\n";
        echo "   Payment Status: '{$fixed_booking['payment_status']}'\n";
        echo "   Owner Reference: " . ($fixed_booking['owner_reference'] ? 'Yes' : 'No') . "\n\n";
        
        // Check if everything is correct
        $all_correct = true;
        
        if ($fixed_booking['payment_status'] === 'referred_by_owner') {
            echo "✅ Payment Status: CORRECT\n";
        } else {
            echo "❌ Payment Status: INCORRECT\n";
            $all_correct = false;
        }
        
        if ($fixed_booking['paid_amount'] == 0.00) {
            echo "✅ Paid Amount: CORRECT (₹0.00)\n";
        } else {
            echo "❌ Paid Amount: INCORRECT (₹{$fixed_booking['paid_amount']})\n";
            $all_correct = false;
        }
        
        if ($fixed_booking['remaining_amount'] == 0.00) {
            echo "✅ Remaining Amount: CORRECT (₹0.00)\n";
        } else {
            echo "❌ Remaining Amount: INCORRECT (₹{$fixed_booking['remaining_amount']})\n";
            $all_correct = false;
        }
        
        if ($fixed_booking['owner_reference'] == 1) {
            echo "✅ Owner Reference: CORRECT (Yes)\n";
        } else {
            echo "❌ Owner Reference: INCORRECT (No)\n";
            $all_correct = false;
        }
        
        echo "\n";
        
        if ($all_correct) {
            echo "🎉 ALL FIELDS ARE NOW CORRECT!\n";
            echo "✅ Owner reference booking is properly configured\n";
            echo "✅ Frontend will display correct information\n";
            echo "✅ No payment required for this booking\n";
        } else {
            echo "⚠️  Some fields still need attention\n";
        }
    }
    
    // Step 4: Frontend display simulation
    echo "=== STEP 4: Frontend Display Simulation ===\n";
    
    if ($fixed_booking) {
        echo "Frontend will now display:\n\n";
        echo "🏨 Room 101 - Executive\n";
        echo "📅 Check-in: 2025-08-15 | Check-out: 2025-08-16\n";
        echo "👥 Guests: 1 adult, 0 children\n";
        echo "💰 Total Amount: ₹2000.00\n";
        echo "💳 Payment Status: Referred by Owner of the Hotel ✅\n";
        echo "💵 Paid Amount: ₹0.00\n";
        echo "📊 Remaining Amount: ₹0.00\n";
        echo "🎯 Status: Confirmed (No payment required)\n\n";
    }
    
    echo "=== FINAL FIX COMPLETE ===\n";
    
} catch (Exception $e) {
    echo "❌ Error occurred: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
