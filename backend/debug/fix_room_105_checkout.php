<?php
/**
 * Fix Room 105 Check-out Issue
 * This script fixes the case where guest "vamsi" checked out but the status wasn't updated
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
    
    echo "🔧 Fixing Room 105 Check-out Issue\n";
    echo "==================================\n\n";
    
    // 1. Check current status
    echo "1. Current Status Check:\n";
    $stmt = $db->prepare("
        SELECT 
            b.id,
            b.booking_reference,
            b.status as booking_status,
            b.check_in_date,
            b.check_out_date,
            r.status as room_status,
            CONCAT(g.first_name, ' ', g.last_name) as guest_name
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_number = r.room_number
        WHERE b.booking_reference = 'BK202508224196'
    ");
    $stmt->execute();
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($booking) {
        echo "   ✅ Booking found\n";
        echo "   - Booking ID: {$booking['id']}\n";
        echo "   - Reference: {$booking['booking_reference']}\n";
        echo "   - Guest: {$booking['guest_name']}\n";
        echo "   - Check-in: {$booking['check_in_date']}\n";
        echo "   - Check-out: {$booking['check_out_date']}\n";
        echo "   - Current Booking Status: {$booking['booking_status']}\n";
        echo "   - Current Room Status: {$booking['room_status']}\n";
        
        // Check if check-out date has passed
        $checkoutDate = new DateTime($booking['check_out_date']);
        $today = new DateTime();
        $today->setTime(0, 0, 0);
        
        if ($checkoutDate < $today) {
            echo "   ⚠️  Check-out date has passed! Guest should be checked out.\n";
        } else {
            echo "   ✅ Check-out date is today or in the future\n";
        }
    } else {
        echo "   ❌ Booking not found!\n";
        exit;
    }
    
    // 2. Fix the check-out issue
    echo "\n2. Fixing Check-out Issue:\n";
    
    if ($booking['booking_status'] === 'checked_in' && $checkoutDate < $today) {
        echo "   - Guest has checked out but status not updated\n";
        echo "   - Updating booking status to 'checked_out'...\n";
        
        $db->beginTransaction();
        
        try {
            // Update booking status to checked_out
            $stmt = $db->prepare("
                UPDATE bookings 
                SET status = 'checked_out', 
                    check_out_time = NOW(),
                    notes = CONCAT(IFNULL(notes, ''), '\nAuto-fixed check-out: ', NOW())
                WHERE id = ?
            ");
            $stmt->execute([$booking['id']]);
            
            if ($stmt->rowCount() > 0) {
                echo "   ✅ Booking status updated to 'checked_out'\n";
            } else {
                echo "   ❌ Failed to update booking status\n";
            }
            
            // Update room status to available (skip cleaning status)
            $stmt = $db->prepare("
                UPDATE rooms 
                SET status = 'available', 
                    updated_at = NOW()
                WHERE room_number = '105'
            ");
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                echo "   ✅ Room status updated to 'available'\n";
            } else {
                echo "   ❌ Failed to update room status\n";
            }
            
            // Log the activity
            $stmt = $db->prepare("
                INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
                VALUES (?, 'check_out_fix', 'bookings', ?, ?, ?, NOW())
            ");
            $stmt->execute([
                1, // Default user ID
                $booking['id'],
                "Auto-fixed check-out for guest {$booking['guest_name']} in room 105",
                $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            
            $db->commit();
            echo "   ✅ Check-out issue fixed successfully!\n";
            
        } catch (Exception $e) {
            $db->rollBack();
            echo "   ❌ Failed to fix check-out: " . $e->getMessage() . "\n";
        }
    } else {
        echo "   - No fix needed or check-out date hasn't passed yet\n";
    }
    
    // 3. Verify the fix
    echo "\n3. Verifying the Fix:\n";
    
    $stmt = $db->prepare("
        SELECT 
            b.status as booking_status,
            r.status as room_status
        FROM bookings b
        JOIN rooms r ON b.room_number = r.room_number
        WHERE b.booking_reference = 'BK202508224196'
    ");
    $stmt->execute();
    $updatedStatus = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($updatedStatus) {
        echo "   - Updated Booking Status: {$updatedStatus['booking_status']}\n";
        echo "   - Updated Room Status: {$updatedStatus['room_status']}\n";
        
        if ($updatedStatus['booking_status'] === 'checked_out' && $updatedStatus['room_status'] === 'available') {
            echo "   ✅ Fix successful! Room 105 is now in available status\n";
        } else {
            echo "   ❌ Fix incomplete or failed\n";
        }
    }
    
    // 4. Check room availability API after fix
    echo "\n4. Testing Room Availability API After Fix:\n";
    
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
                
                if ($room105['room_status'] === 'available') {
                    echo "   ✅ Room 105 now shows as 'available' (correct)\n";
                } else {
                    echo "   ❌ Room 105 still shows incorrect status: {$room105['room_status']}\n";
                }
            }
            
            echo "   - Total Rooms: {$data['data']['total_rooms']}\n";
            echo "   - Available: {$data['data']['available_count']}\n";
            echo "   - Occupied: {$data['data']['occupied_count']}\n";
        } else {
            echo "   ❌ API call failed: " . ($data['message'] ?? 'Unknown error') . "\n";
        }
    }
    
    echo "\n✅ Room 105 check-out fix completed!\n";
    
} catch (Exception $e) {
    echo "❌ Error during fix: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
