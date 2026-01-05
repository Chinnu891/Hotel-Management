<?php
/**
 * Verify Owner Reference Payment Status Fix
 * 
 * This script verifies that the owner reference payment status fix
 * is working correctly and shows the current status
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

echo "🔍 Verifying Owner Reference Payment Status Fix\n";
echo "==============================================\n\n";

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Step 1: Check the specific booking (ID: 402)
    echo "=== STEP 1: Checking Booking ID 402 ===\n";
    
    $stmt = $db->prepare("
        SELECT 
            id,
            booking_reference,
            room_number,
            total_amount,
            paid_amount,
            remaining_amount,
            payment_status,
            owner_reference,
            created_at
        FROM bookings 
        WHERE id = 402
    ");
    $stmt->execute();
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($booking) {
        echo "✅ Booking ID 402 Found:\n";
        echo "   ID: {$booking['id']}\n";
        echo "   Reference: {$booking['booking_reference']}\n";
        echo "   Room: {$booking['room_number']}\n";
        echo "   Total: ₹{$booking['total_amount']}\n";
        echo "   Paid: ₹{$booking['paid_amount']}\n";
        echo "   Remaining: ₹{$booking['remaining_amount']}\n";
        echo "   Owner Reference: " . ($booking['owner_reference'] ? 'Yes' : 'No') . "\n";
        echo "   Payment Status: '{$booking['payment_status']}'\n";
        echo "   Created: {$booking['created_at']}\n\n";
        
        // Check if the fix is correct
        if ($booking['payment_status'] === 'referred_by_owner') {
            echo "✅ Payment Status is CORRECT: 'referred_by_owner'\n";
        } else {
            echo "❌ Payment Status is INCORRECT: '{$booking['payment_status']}'\n";
        }
        
        if ($booking['paid_amount'] == 0.00) {
            echo "✅ Paid Amount is CORRECT: ₹0.00\n";
        } else {
            echo "❌ Paid Amount is INCORRECT: ₹{$booking['paid_amount']}\n";
        }
        
        if ($booking['remaining_amount'] == 0.00) {
            echo "✅ Remaining Amount is CORRECT: ₹0.00\n";
        } else {
            echo "❌ Remaining Amount is INCORRECT: ₹{$booking['remaining_amount']}\n";
        }
        
        if ($booking['owner_reference'] == 1) {
            echo "✅ Owner Reference is CORRECT: Yes\n";
        } else {
            echo "❌ Owner Reference is INCORRECT: No\n";
        }
        
    } else {
        echo "❌ Booking ID 402 not found!\n\n";
    }
    
    // Step 2: Check all owner reference bookings
    echo "\n=== STEP 2: Checking All Owner Reference Bookings ===\n";
    
    $stmt = $db->prepare("
        SELECT 
            id,
            booking_reference,
            room_number,
            payment_status,
            owner_reference,
            created_at
        FROM bookings 
        WHERE owner_reference = 1
        ORDER BY id DESC
    ");
    $stmt->execute();
    $owner_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($owner_bookings)) {
        echo "ℹ️  No owner reference bookings found\n\n";
    } else {
        echo "Found " . count($owner_bookings) . " owner reference booking(s):\n\n";
        
        $correct_count = 0;
        $incorrect_count = 0;
        
        foreach ($owner_bookings as $booking) {
            $is_correct = ($booking['payment_status'] === 'referred_by_owner');
            $status_icon = $is_correct ? '✅' : '❌';
            
            if ($is_correct) {
                $correct_count++;
            } else {
                $incorrect_count++;
            }
            
            echo "  {$status_icon} Booking ID: {$booking['id']}\n";
            echo "     Reference: {$booking['booking_reference']}\n";
            echo "     Room: {$booking['room_number']}\n";
            echo "     Status: '{$booking['payment_status']}'\n";
            echo "     Created: {$booking['created_at']}\n\n";
        }
        
        echo "📊 Summary:\n";
        echo "   ✅ Correct Status: {$correct_count}\n";
        echo "   ❌ Incorrect Status: {$incorrect_count}\n";
        echo "   📈 Success Rate: " . round(($correct_count / count($owner_bookings)) * 100, 2) . "%\n\n";
    }
    
    // Step 3: Check payment_status ENUM values
    echo "=== STEP 3: Checking Payment Status ENUM Values ===\n";
    
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
        echo "Current payment_status ENUM: {$result['COLUMN_TYPE']}\n";
        
        if (strpos($result['COLUMN_TYPE'], 'referred_by_owner') !== false) {
            echo "✅ 'referred_by_owner' is included in ENUM\n\n";
        } else {
            echo "❌ 'referred_by_owner' is NOT included in ENUM\n\n";
        }
    } else {
        echo "❌ Could not retrieve payment_status ENUM information\n\n";
    }
    
    // Step 4: Test frontend display simulation
    echo "=== STEP 4: Frontend Display Simulation ===\n";
    
    if ($booking) {
        $payment_status = $booking['payment_status'];
        $owner_reference = $booking['owner_reference'];
        
        echo "Simulating frontend display for booking ID 402:\n\n";
        
        if ($owner_reference && $payment_status === 'referred_by_owner') {
            echo "✅ Payment Status Display: 'Referred by Owner of the Hotel'\n";
            echo "✅ Payment Summary: 'No payment required (Owner reference)'\n";
            echo "✅ Remaining Amount: ₹0.00\n";
            echo "✅ Status Color: Green (confirmed)\n";
        } else {
            echo "❌ Payment Status Display: '{$payment_status}'\n";
            echo "❌ Payment Summary: 'Payment required'\n";
            echo "❌ Remaining Amount: ₹{$booking['remaining_amount']}\n";
            echo "❌ Status Color: Red (pending)\n";
        }
        
        echo "\n";
    }
    
    // Step 5: Overall verification summary
    echo "=== STEP 5: Overall Verification Summary ===\n";
    
    $all_correct = true;
    $issues = [];
    
    // Check specific booking
    if ($booking) {
        if ($booking['payment_status'] !== 'referred_by_owner') {
            $all_correct = false;
            $issues[] = "Booking ID 402 payment status is '{$booking['payment_status']}' instead of 'referred_by_owner'";
        }
        if ($booking['paid_amount'] != 0.00) {
            $all_correct = false;
            $issues[] = "Booking ID 402 paid amount is ₹{$booking['paid_amount']} instead of ₹0.00";
        }
        if ($booking['remaining_amount'] != 0.00) {
            $all_correct = false;
            $issues[] = "Booking ID 402 remaining amount is ₹{$booking['remaining_amount']} instead of ₹0.00";
        }
    } else {
        $all_correct = false;
        $issues[] = "Booking ID 402 not found";
    }
    
    // Check ENUM
    if ($result && strpos($result['COLUMN_TYPE'], 'referred_by_owner') === false) {
        $all_correct = false;
        $issues[] = "Payment status ENUM doesn't include 'referred_by_owner'";
    }
    
    // Check all owner reference bookings
    if ($incorrect_count > 0) {
        $all_correct = false;
        $issues[] = "{$incorrect_count} owner reference booking(s) have incorrect payment status";
    }
    
    if ($all_correct) {
        echo "🎉 ALL VERIFICATIONS PASSED!\n";
        echo "✅ Owner reference payment status fix is working correctly\n";
        echo "✅ Database schema is properly updated\n";
        echo "✅ All owner reference bookings have correct status\n";
        echo "✅ Frontend will display correct information\n\n";
    } else {
        echo "⚠️  VERIFICATION ISSUES FOUND:\n";
        foreach ($issues as $issue) {
            echo "   ❌ {$issue}\n";
        }
        echo "\n";
    }
    
    echo "=== VERIFICATION COMPLETE ===\n";
    
} catch (Exception $e) {
    echo "❌ Error occurred: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
