<?php
/**
 * Database Update Script: Standard to Executive Room Type
 * This script updates all references from "Standard" room type to "Executive"
 */

require_once 'config/cors.php';
header('Content-Type: application/json');

try {
    require_once 'config/database.php';
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit();
    }
    
    echo "🔄 Starting Standard to Executive Room Type Update...\n";
    echo "==================================================\n\n";
    
    $results = [];
    
    // 1. Check current room types
    echo "📋 Checking current room types...\n";
    $stmt = $conn->prepare("SELECT * FROM room_types ORDER BY id");
    $stmt->execute();
    $current_room_types = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Current room types found:\n";
    foreach ($current_room_types as $rt) {
        echo "  - ID: {$rt['id']}, Name: {$rt['name']}, Price: ₹{$rt['base_price']}\n";
    }
    echo "\n";
    
    // 2. Check if Standard room type exists
    $stmt = $conn->prepare("SELECT * FROM room_types WHERE name = 'Standard'");
    $stmt->execute();
    $standard_room_type = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($standard_room_type) {
        echo "✅ Found Standard room type (ID: {$standard_room_type['id']})\n";
        echo "   - Current name: {$standard_room_type['name']}\n";
        echo "   - Current price: ₹{$standard_room_type['base_price']}\n";
        echo "   - Current description: {$standard_room_type['description']}\n\n";
        
        // 3. Update Standard to Executive
        echo "🔄 Updating Standard to Executive...\n";
        
        $stmt = $conn->prepare("
            UPDATE room_types 
            SET name = 'Executive', 
                description = 'Premium executive room with luxury features',
                base_price = 3500.00
            WHERE name = 'Standard'
        ");
        
        if ($stmt->execute()) {
            $rows_affected = $stmt->rowCount();
            echo "✅ Successfully updated {$rows_affected} room type record(s)\n";
            $results['room_type_updated'] = true;
            $results['rows_affected'] = $rows_affected;
        } else {
            echo "❌ Failed to update room type\n";
            $results['room_type_updated'] = false;
            $results['error'] = 'Failed to update room_types table';
        }
        
    } else {
        echo "ℹ️  No Standard room type found in database\n";
        $results['room_type_updated'] = 'not_found';
    }
    
    // 4. Check if Executive room type already exists
    $stmt = $conn->prepare("SELECT * FROM room_types WHERE name = 'Executive'");
    $stmt->execute();
    $executive_room_type = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($executive_room_type) {
        echo "✅ Executive room type confirmed (ID: {$executive_room_type['id']})\n";
        echo "   - Name: {$executive_room_type['name']}\n";
        echo "   - Price: ₹{$executive_room_type['base_price']}\n";
        echo "   - Description: {$executive_room_type['description']}\n\n";
        $results['executive_exists'] = true;
        $results['executive_id'] = $executive_room_type['id'];
    } else {
        echo "❌ Executive room type not found after update\n";
        $results['executive_exists'] = false;
    }
    
    // 5. Check rooms that reference the updated room type
    echo "🏠 Checking rooms that reference this room type...\n";
    if (isset($results['executive_id'])) {
        $stmt = $conn->prepare("
            SELECT r.*, rt.name as room_type_name 
            FROM rooms r 
            JOIN room_types rt ON r.room_type_id = rt.id 
            WHERE rt.name = 'Executive'
        ");
        $stmt->execute();
        $executive_rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($executive_rooms)) {
            echo "Found " . count($executive_rooms) . " Executive rooms:\n";
            foreach ($executive_rooms as $room) {
                echo "  - Room {$room['room_number']} (Floor {$room['floor']}) - Status: {$room['status']}\n";
            }
            $results['executive_rooms_count'] = count($executive_rooms);
        } else {
            echo "No rooms currently assigned to Executive type\n";
            $results['executive_rooms_count'] = 0;
        }
    }
    
    // 6. Verify final room types
    echo "\n📋 Verifying final room types...\n";
    $stmt = $conn->prepare("SELECT * FROM room_types ORDER BY id");
    $stmt->execute();
    $final_room_types = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Final room types:\n";
    foreach ($final_room_types as $rt) {
        echo "  - ID: {$rt['id']}, Name: {$rt['name']}, Price: ₹{$rt['base_price']}\n";
    }
    
    $results['final_room_types'] = $final_room_types;
    
    // 7. Check for any remaining "Standard" references
    echo "\n🔍 Checking for any remaining 'Standard' references...\n";
    
    // Check in room_types table
    $stmt = $conn->prepare("SELECT COUNT(*) as count FROM room_types WHERE name LIKE '%Standard%'");
    $stmt->execute();
    $standard_count = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($standard_count['count'] > 0) {
        echo "⚠️  Found {$standard_count['count']} remaining 'Standard' references in room_types\n";
        $results['remaining_standard_refs'] = $standard_count['count'];
    } else {
        echo "✅ No remaining 'Standard' references found in room_types\n";
        $results['remaining_standard_refs'] = 0;
    }
    
    // 8. Summary
    echo "\n🎉 Update Summary:\n";
    echo "==================\n";
    
    if (isset($results['room_type_updated']) && $results['room_type_updated'] === true) {
        echo "✅ Room type successfully updated from Standard to Executive\n";
        echo "✅ Executive room type now has premium pricing (₹3,500)\n";
        echo "✅ Description updated to reflect luxury features\n";
    } elseif ($results['room_type_updated'] === 'not_found') {
        echo "ℹ️  No Standard room type found to update\n";
        echo "ℹ️  Executive room type already exists in the system\n";
    } else {
        echo "❌ Update failed - check error details above\n";
    }
    
    echo "\n📊 Final Results:\n";
    echo "================\n";
    echo "Total room types: " . count($final_room_types) . "\n";
    echo "Executive rooms: " . ($results['executive_rooms_count'] ?? 0) . "\n";
    echo "Remaining Standard refs: " . ($results['remaining_standard_refs'] ?? 'unknown') . "\n";
    
    // Return JSON response
    echo "\n📤 Sending JSON response...\n";
    
    $response = [
        'success' => true,
        'message' => 'Standard to Executive room type update completed',
        'results' => $results,
        'timestamp' => date('Y-m-d H:i:s'),
        'next_steps' => [
            '1. Restart your application to clear any cached references',
            '2. Verify the frontend shows Executive instead of Standard',
            '3. Test booking functionality with the new room type',
            '4. Update any hardcoded references in your application code'
        ]
    ];
    
    // Output JSON for API response
    echo json_encode($response, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    $error_response = [
        'success' => false,
        'message' => 'Update failed: ' . $e->getMessage(),
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
    echo "❌ Error occurred: " . $e->getMessage() . "\n";
    echo json_encode($error_response, JSON_PRETTY_PRINT);
}
?>
