<?php
/**
 * Investigate Room Count Discrepancy
 * This script investigates why database and API room counts don't match
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
    
    echo "🔍 Investigating Room Count Discrepancy\n";
    echo "=====================================\n\n";
    
    // 1. Check database room counts
    echo "1. Database Room Counts:\n";
    $stmt = $db->prepare("
        SELECT 
            status,
            COUNT(*) as count
        FROM rooms
        GROUP BY status
        ORDER BY status
    ");
    $stmt->execute();
    $dbCounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $dbTotal = 0;
    $dbOccupied = 0;
    $dbAvailable = 0;
    $dbMaintenance = 0;
    $dbCleaning = 0;
    
    foreach ($dbCounts as $count) {
        $status = $count['status'];
        $count = $count['count'];
        $dbTotal += $count;
        
        echo "   - {$status}: {$count}\n";
        
        if ($status === 'occupied') $dbOccupied = $count;
        elseif ($status === 'available') $dbAvailable = $count;
        elseif ($status === 'maintenance') $dbMaintenance = $count;
        elseif ($status === 'cleaning') $dbCleaning = $count;
    }
    
    echo "   - Total: {$dbTotal}\n\n";
    
    // 2. Check API room counts
    echo "2. API Room Counts:\n";
    
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
            echo "   - Total Rooms: {$data['data']['total_rooms']}\n";
            echo "   - Available Count: {$data['data']['available_count']}\n";
            echo "   - Occupied Count: {$data['data']['occupied_count']}\n";
            echo "   - Maintenance Count: {$data['data']['maintenance_count']}\n";
            echo "   - Cleaning Count: {$data['data']['cleaning_count']}\n\n";
            
            $apiTotal = $data['data']['total_rooms'];
            $apiAvailable = $data['data']['available_count'];
            $apiOccupied = $data['data']['occupied_count'];
            $apiMaintenance = $data['data']['maintenance_count'];
            $apiCleaning = $data['data']['cleaning_count'];
        } else {
            echo "   ❌ API call failed: " . ($data['message'] ?? 'Unknown error') . "\n";
            exit;
        }
    }
    
    // 3. Compare counts
    echo "3. Count Comparison:\n";
    echo "   Database vs API:\n";
    echo "   - Total: {$dbTotal} vs {$apiTotal}\n";
    echo "   - Available: {$dbAvailable} vs {$apiAvailable}\n";
    echo "   - Occupied: {$dbOccupied} vs {$apiOccupied}\n";
    echo "   - Maintenance: {$dbMaintenance} vs {$apiMaintenance}\n";
    echo "   - Cleaning: {$dbCleaning} vs {$apiCleaning}\n\n";
    
    // 4. Check individual room statuses
    echo "4. Individual Room Status Check:\n";
    $stmt = $db->prepare("
        SELECT 
            r.room_number,
            r.status as room_status,
            b.status as booking_status,
            b.check_out_date,
            CONCAT(g.first_name, ' ', g.last_name) as guest_name
        FROM rooms r
        LEFT JOIN bookings b ON r.room_number = b.room_number AND b.status = 'checked_in'
        LEFT JOIN guests g ON b.guest_id = g.id
        ORDER BY r.room_number
    ");
    $stmt->execute();
    $allRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $discrepancies = [];
    
    foreach ($allRooms as $room) {
        $roomNumber = $room['room_number'];
        $dbStatus = $room['room_status'];
        $bookingStatus = $room['booking_status'];
        $guest = $room['guest_name'] ?: 'None';
        
        echo "   - Room {$roomNumber}: {$dbStatus}";
        
        if ($dbStatus === 'occupied' && $guest !== 'None') {
            echo " (Guest: {$guest})";
        }
        
        // Check if this room should be occupied based on booking
        if ($dbStatus !== 'occupied' && $bookingStatus === 'checked_in') {
            echo " ❌ Should be 'occupied' (guest checked in)";
            $discrepancies[] = "Room {$roomNumber}: Status '{$dbStatus}' but guest is checked in";
        } elseif ($dbStatus === 'occupied' && $bookingStatus !== 'checked_in') {
            echo " ❌ Should not be 'occupied' (no active guest)";
            $discrepancies[] = "Room {$roomNumber}: Status 'occupied' but no active guest";
        }
        
        echo "\n";
    }
    
    if (!empty($discrepancies)) {
        echo "\n   ⚠️  Discrepancies Found:\n";
        foreach ($discrepancies as $discrepancy) {
            echo "      • {$discrepancy}\n";
        }
    } else {
        echo "\n   ✅ No discrepancies found in individual room statuses\n";
    }
    
    // 5. Check API room details
    echo "\n5. API Room Details Check:\n";
    
    if (isset($data) && $data['success']) {
        $apiRooms = $data['data']['all_rooms'];
        
        foreach ($apiRooms as $apiRoom) {
            $roomNumber = $apiRoom['room_number'];
            $apiStatus = $apiRoom['room_status'];
            $availabilityStatus = $apiRoom['availability_status'];
            $isBookable = $apiRoom['is_bookable'] ? 'Yes' : 'No';
            
            echo "   - Room {$roomNumber}: {$apiStatus} (API: {$availabilityStatus}, Bookable: {$isBookable})\n";
        }
    }
    
    // 6. Summary and recommendations
    echo "\n6. Summary and Recommendations:\n";
    
    if ($dbTotal !== $apiTotal) {
        echo "   ❌ Total room count mismatch: Database={$dbTotal}, API={$apiTotal}\n";
    } else {
        echo "   ✅ Total room count matches\n";
    }
    
    if ($dbOccupied !== $apiOccupied) {
        echo "   ❌ Occupied count mismatch: Database={$dbOccupied}, API={$apiOccupied}\n";
    } else {
        echo "   ✅ Occupied count matches\n";
    }
    
    if ($dbAvailable !== $apiAvailable) {
        echo "   ❌ Available count mismatch: Database={$dbAvailable}, API={$apiAvailable}\n";
    } else {
        echo "   ✅ Available count matches\n";
    }
    
    if (!empty($discrepancies)) {
        echo "\n   🔧 Actions Needed:\n";
        echo "   1. Fix room status discrepancies\n";
        echo "   2. Ensure API logic matches database logic\n";
        echo "   3. Verify room availability calculations\n";
    } else {
        echo "\n   ✅ All room statuses are consistent\n";
    }
    
    echo "\n✅ Room count discrepancy investigation completed!\n";
    
} catch (Exception $e) {
    echo "❌ Error during investigation: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>

