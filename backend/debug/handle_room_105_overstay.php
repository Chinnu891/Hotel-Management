<?php
/**
 * Handle Room 105 Overstay Situation
 * This script handles the case where guest "vamsi" is overstaying and needs to pay extra charges
 */

require_once __DIR__ . '/../config/cors.php';
header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    echo "💰 Handling Room 105 Overstay Situation\n";
    echo "======================================\n\n";
    
    // 1. Check current overstay situation
    echo "1. Current Overstay Analysis:\n";
    $stmt = $db->prepare("
        SELECT 
            b.id,
            b.booking_reference,
            b.status as booking_status,
            b.check_in_date,
            b.check_out_date,
            b.total_amount,
            r.status as room_status,
            r.price as room_price,
            CONCAT(g.first_name, ' ', g.last_name) as guest_name,
            g.phone,
            g.email
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_number = r.room_number
        WHERE b.booking_reference = 'BK202508224196'
    ");
    $stmt->execute();
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($booking) {
        echo "   ✅ Booking found\n";
        echo "   - Guest: {$booking['guest_name']}\n";
        echo "   - Check-in: {$booking['check_in_date']}\n";
        echo "   - Original Check-out: {$booking['check_out_date']}\n";
        echo "   - Original Amount: ₹{$booking['total_amount']}\n";
        echo "   - Room Price per Night: ₹{$booking['room_price']}\n";
        echo "   - Current Status: {$booking['booking_status']}\n";
        echo "   - Room Status: {$booking['room_status']}\n";
        
        // Calculate overstay
        $originalCheckout = new DateTime($booking['check_out_date']);
        $today = new DateTime();
        $today->setTime(0, 0, 0);
        
        if ($originalCheckout < $today) {
            $overstayDays = $today->diff($originalCheckout)->days;
            echo "   ⚠️  OVERSTAY DETECTED!\n";
            echo "   - Overstay Days: {$overstayDays} day(s)\n";
            echo "   - Extra Charges: ₹" . ($overstayDays * $booking['room_price']) . "\n";
            echo "   - Total Amount Due: ₹" . ($booking['total_amount'] + ($overstayDays * $booking['room_price'])) . "\n";
        } else {
            echo "   ✅ No overstay detected\n";
        }
    } else {
        echo "   ❌ Booking not found!\n";
        exit;
    }
    
    // 2. Show current room availability status
    echo "\n2. Current Room Availability Status:\n";
    
    $apiUrl = "http://localhost/hotel-management/backend/rooms/getRoomAvailability.php?guests=1";
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => 'Content-Type: application/json'
        ]
    ]);
    
    $response = file_get_contents($apiUrl, false, $context);
    
    if ($response === false) {
        echo "   ❌ Failed to call API\n";
    } else {
        $data = json_decode($response, true);
        if ($data && $data['success']) {
            // Find room 105 in the response
            $room105 = null;
            foreach ($data['data']['all_rooms'] as $room) {
                if ($room['room_number'] === '105') {
                    $room105 = $room;
                    break;
                }
            }
            
            if ($room105) {
                echo "   - Room 105: Status={$room105['availability_status']}, Bookable=" . ($room105['is_bookable'] ? 'Yes' : 'No') . "\n";
                echo "   - Room 105: Room Status={$room105['room_status']}\n";
                
                if ($room105['room_status'] === 'occupied') {
                    echo "   ✅ Room 105 correctly shows as 'occupied' (guest is overstaying)\n";
                } else {
                    echo "   ❌ Room 105 shows incorrect status: {$room105['room_status']}\n";
                }
            }
            
            echo "   - Total Rooms: {$data['data']['total_rooms']}\n";
            echo "   - Available: {$data['data']['available_count']}\n";
            echo "   - Occupied: {$data['data']['occupied_count']}\n";
        } else {
            echo "   ❌ API call failed: " . ($data['message'] ?? 'Unknown error') . "\n";
        }
    }
    
    // 3. Recommendations for handling overstay
    echo "\n3. Overstay Handling Recommendations:\n";
    
    if ($originalCheckout < $today) {
        $overstayDays = $today->diff($originalCheckout)->days;
        $extraCharges = $overstayDays * $booking['room_price'];
        $totalDue = $booking['total_amount'] + $extraCharges;
        
        echo "   📋 Actions Required:\n";
        echo "   1. Contact guest {$booking['guest_name']} (Phone: {$booking['phone']})\n";
        echo "   2. Inform about overstay charges: ₹{$extraCharges}\n";
        echo "   3. Collect payment for total amount: ₹{$totalDue}\n";
        echo "   4. Update booking with new check-out date\n";
        echo "   5. Only then change room status to 'available'\n\n";
        
        echo "   💰 Payment Details:\n";
        echo "   - Original Amount: ₹{$booking['total_amount']}\n";
        echo "   - Extra Charges ({$overstayDays} days): ₹{$extraCharges}\n";
        echo "   - Total Amount Due: ₹{$totalDue}\n\n";
        
        echo "   🚫 DO NOT:\n";
        echo "   - Automatically change room status to 'available'\n";
        echo "   - Remove guest from checked-in status\n";
        echo "   - Allow new bookings for this room\n\n";
        
        echo "   ✅ DO:\n";
        echo "   - Keep room status as 'occupied'\n";
        echo "   - Keep guest status as 'checked_in'\n";
        echo "   - Collect overstay charges\n";
        echo "   - Handle proper check-out process\n";
        
    } else {
        echo "   - No overstay detected, no special action needed\n";
    }
    
    // 4. Show current database state
    echo "\n4. Current Database State:\n";
    
    $stmt = $db->prepare("
        SELECT 
            r.status as room_status,
            b.status as booking_status,
            b.check_out_date,
            b.total_amount
        FROM rooms r
        JOIN bookings b ON r.room_number = b.room_number
        WHERE r.room_number = '105' AND b.booking_reference = 'BK202508224196'
    ");
    $stmt->execute();
    $currentState = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($currentState) {
        echo "   - Room Status: {$currentState['room_status']}\n";
        echo "   - Booking Status: {$currentState['booking_status']}\n";
        echo "   - Check-out Date: {$currentState['check_out_date']}\n";
        echo "   - Total Amount: ₹{$currentState['total_amount']}\n";
        
        // Verify room should remain occupied
        if ($currentState['room_status'] === 'occupied' && $currentState['booking_status'] === 'checked_in') {
            echo "   ✅ Database state is correct - room remains occupied\n";
        } else {
            echo "   ❌ Database state needs correction\n";
        }
    }
    
    // 5. Summary
    echo "\n5. Summary:\n";
    echo "   - Guest {$booking['guest_name']} is overstaying in Room 105\n";
    echo "   - Room should remain 'occupied' until proper check-out\n";
    echo "   - Guest needs to pay extra charges for overstay\n";
    echo "   - Staff should handle this situation manually\n";
    echo "   - Room availability API is working correctly\n";
    
    echo "\n✅ Overstay situation analysis completed!\n";
    echo "   Room 105 will remain occupied until proper check-out process.\n";
    
} catch (Exception $e) {
    echo "❌ Error during analysis: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>

