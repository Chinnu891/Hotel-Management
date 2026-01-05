<?php
/**
 * Demo script for the Reception Notification System
 * This script demonstrates how to send various types of notifications
 */

require_once 'config/database.php';
require_once 'utils/notification_service.php';
require_once 'utils/logger.php';

echo "=== Reception Notification System Demo ===\n\n";

try {
    // Initialize database connection
    $database = new Database();
    $db = $database->getConnection();
    
    echo "✓ Database connection established\n";
    
    // Initialize notification service
    $notificationService = new NotificationService($db);
    echo "✓ Notification service initialized\n\n";
    
    echo "🚀 Sending demo notifications...\n\n";
    
    // Demo 1: Guest Check-in
    echo "1. 📝 Guest Check-in Notification\n";
    $result = $notificationService->sendRealTimeNotification('reception', [
        'type' => 'check_in',
        'title' => 'Guest Check-in',
        'message' => 'John Smith has checked into Room 201',
        'priority' => 'medium',
        'details' => [
            'guest_name' => 'John Smith',
            'room_number' => '201',
            'check_in_time' => '14:30',
            'booking_reference' => 'BK2024001'
        ]
    ]);
    echo $result ? "   ✅ Sent successfully" : "   ❌ Failed to send";
    echo "\n\n";
    
    // Demo 2: Maintenance Request
    echo "2. 🔧 Maintenance Request Notification\n";
    $result = $notificationService->sendMaintenanceUpdate(1, 'created', [
        'room_number' => '105',
        'issue_type' => 'AC not working',
        'priority' => 'high',
        'description' => 'Guest reported AC is not cooling properly'
    ]);
    echo $result ? "   ✅ Sent successfully" : "   ❌ Failed to send";
    echo "\n\n";
    
    // Demo 3: Housekeeping Task
    echo "3. 🧹 Housekeeping Task Notification\n";
    $result = $notificationService->sendHousekeepingUpdate(1, 'completed', [
        'room_number' => '301',
        'rating' => 5,
        'staff_member' => 'Maria Garcia',
        'completion_time' => '10:45'
    ]);
    echo $result ? "   ✅ Sent successfully" : "   ❌ Failed to send";
    echo "\n\n";
    
    // Demo 4: Room Status Update
    echo "4. 🚪 Room Status Update Notification\n";
    $result = $notificationService->sendRoomStatusUpdate(205, 'occupied', 'cleaning', 'Guest checked out');
    echo $result ? "   ✅ Sent successfully" : "   ❌ Failed to send";
    echo "\n\n";
    
    // Demo 5: Billing Update
    echo "5. 💳 Billing Update Notification\n";
    $result = $notificationService->sendBillingUpdate(1, 'paid', [
        'amount' => 150.00,
        'payment_method' => 'credit_card',
        'guest_name' => 'Sarah Johnson',
        'room_number' => '102'
    ]);
    echo $result ? "   ✅ Sent successfully" : "   ❌ Failed to send";
    echo "\n\n";
    
    // Demo 6: System Alert
    echo "6. ⚠️ System Alert Notification\n";
    $result = $notificationService->sendSystemAlert('maintenance_required', 'Scheduled maintenance in 1 hour', 'warning', ['admin', 'reception']);
    echo $result ? "   ✅ Sent successfully" : "   ❌ Failed to send";
    echo "\n\n";
    
    // Demo 7: Custom Notification
    echo "7. 🔔 Custom Notification\n";
    $result = $notificationService->sendRealTimeNotification('reception', [
        'type' => 'custom',
        'title' => 'Staff Meeting Reminder',
        'message' => 'Daily staff meeting in 15 minutes',
        'priority' => 'medium',
        'details' => [
            'meeting_time' => '15:00',
            'location' => 'Conference Room A',
            'agenda' => 'Daily operations review'
        ]
    ]);
    echo $result ? "   ✅ Sent successfully" : "   ❌ Failed to send";
    echo "\n\n";
    
    // Check notification logs
    echo "📊 Checking notification logs...\n";
    try {
        $stmt = $db->prepare("
            SELECT COUNT(*) as total FROM notification_logs 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ");
        $stmt->execute();
        $count = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
        echo "   📈 Found {$count} notifications in the last hour\n";
        
        // Show recent notifications
        $stmt = $db->prepare("
            SELECT channel, type, created_at 
            FROM notification_logs 
            ORDER BY created_at DESC 
            LIMIT 5
        ");
        $stmt->execute();
        $recent = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "   📋 Recent notifications:\n";
        foreach ($recent as $notification) {
            echo "      • {$notification['channel']}: {$notification['type']} at {$notification['created_at']}\n";
        }
        
    } catch (Exception $e) {
        echo "   ❌ Failed to check notification logs: " . $e->getMessage() . "\n";
    }
    
    echo "\n=== Demo Summary ===\n";
    echo "✅ All demo notifications have been sent!\n";
    echo "📱 To see them in action:\n";
    echo "   1. Make sure the WebSocket server is running (php websocket_server.php)\n";
    echo "   2. Open the reception dashboard in your browser\n";
    echo "   3. Navigate to the Notifications tab\n";
    echo "   4. You should see all the demo notifications\n";
    echo "\n🔧 To test real-time functionality:\n";
    echo "   1. Open multiple browser tabs\n";
    echo "   2. Send new notifications using this script\n";
    echo "   3. Verify they appear in real-time across all tabs\n";
    
} catch (Exception $e) {
    echo "❌ Demo failed with error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>
