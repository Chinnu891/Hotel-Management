<?php
/**
 * Notification Integration Examples
 * This script shows how to integrate notifications into actual hotel operations
 */

require_once 'config/database.php';
require_once 'utils/notification_service.php';

echo "=== Notification Integration Examples ===\n\n";

try {
    // Initialize services
    $database = new Database();
    $db = $database->getConnection();
    $notificationService = new NotificationService($db);
    
    echo "✓ Services initialized\n\n";
    
    echo "📋 Example 1: Guest Check-in Process\n";
    echo "----------------------------------------\n";
    
    // Simulate guest check-in
    $guest_name = "Sarah Johnson";
    $room_number = "201";
    $check_in_time = date('Y-m-d H:i:s');
    $booking_reference = "BK" . time();
    $duration = "3 nights";
    
    echo "Guest: $guest_name\n";
    echo "Room: $room_number\n";
    echo "Check-in: $check_in_time\n";
    echo "Duration: $duration\n";
    
    // Send check-in notification
    $result = $notificationService->sendGuestCheckIn(
        $guest_name, 
        $room_number, 
        $check_in_time, 
        $booking_reference, 
        $duration
    );
    
    echo $result ? "✅ Check-in notification sent" : "❌ Check-in notification failed";
    echo "\n\n";
    
    echo "📋 Example 2: Payment Processing\n";
    echo "----------------------------------------\n";
    
    // Simulate payment processing
    $payment_id = "PAY" . time();
    $amount = 450.00;
    $guest_name = "Sarah Johnson";
    $room_number = "201";
    $payment_method = "credit_card";
    
    echo "Payment ID: $payment_id\n";
    echo "Amount: $" . number_format($amount, 2) . "\n";
    echo "Guest: $guest_name\n";
    echo "Room: $room_number\n";
    echo "Method: $payment_method\n";
    
    // Send payment confirmation notification
    $result = $notificationService->sendPaymentConfirmation(
        $payment_id,
        $amount,
        $guest_name,
        $room_number,
        $payment_method,
        $booking_reference
    );
    
    echo $result ? "✅ Payment notification sent" : "❌ Payment notification failed";
    echo "\n\n";
    
    echo "📋 Example 3: Check-out Deadline Alert\n";
    echo "----------------------------------------\n";
    
    // Simulate approaching check-out deadline
    $check_out_time = date('Y-m-d 11:00:00');
    $deadline_hours = 2;
    
    echo "Guest: $guest_name\n";
    echo "Room: $room_number\n";
    echo "Check-out: $check_out_time\n";
    echo "Deadline: $deadline_hours hours\n";
    
    // Send deadline alert notification
    $result = $notificationService->sendCheckoutDeadlineAlert(
        $guest_name,
        $room_number,
        $check_out_time,
        $deadline_hours
    );
    
    echo $result ? "✅ Deadline alert sent" : "❌ Deadline alert failed";
    echo "\n\n";
    
    echo "📋 Example 4: Guest Check-out Process\n";
    echo "----------------------------------------\n";
    
    // Simulate guest check-out
    $check_out_time = date('Y-m-d H:i:s');
    $total_amount = 450.00;
    
    echo "Guest: $guest_name\n";
    echo "Room: $room_number\n";
    echo "Check-out: $check_out_time\n";
    echo "Total: $" . number_format($total_amount, 2) . "\n";
    
    // Send check-out notification
    $result = $notificationService->sendGuestCheckOut(
        $guest_name,
        $room_number,
        $check_out_time,
        $booking_reference,
        $total_amount
    );
    
    echo $result ? "✅ Check-out notification sent" : "❌ Check-out notification failed";
    echo "\n\n";
    
    echo "📋 Example 5: Room Available Notification\n";
    echo "----------------------------------------\n";
    
    // Simulate room becoming available
    $cleaning_status = "cleaning_pending";
    
    echo "Room: $room_number\n";
    echo "Last Guest: $guest_name\n";
    echo "Cleaning Status: $cleaning_status\n";
    
    // Send room available notification
    $result = $notificationService->sendRoomAvailable(
        $room_number,
        $guest_name,
        $cleaning_status
    );
    
    echo $result ? "✅ Room available notification sent" : "❌ Room available notification failed";
    echo "\n\n";
    
    echo "📋 Example 6: Housekeeping Task Completion\n";
    echo "----------------------------------------\n";
    
    // Simulate housekeeping task completion
    $task_type = "Deep Cleaning";
    $staff_member = "Maria Garcia";
    $completion_time = date('Y-m-d H:i:s');
    $rating = 5;
    
    echo "Room: $room_number\n";
    echo "Task: $task_type\n";
    echo "Staff: $staff_member\n";
    echo "Completed: $completion_time\n";
    echo "Rating: $rating/5\n";
    
    // Send housekeeping completion notification
    $result = $notificationService->sendHousekeepingCompleted(
        $room_number,
        $task_type,
        $staff_member,
        $completion_time,
        $rating
    );
    
    echo $result ? "✅ Housekeeping notification sent" : "❌ Housekeeping notification failed";
    echo "\n\n";
    
    echo "✅ All integration examples completed!\n";
    echo "These examples show how to integrate notifications into actual hotel operations.\n";
    echo "Check the reception dashboard to see all the notifications.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
?>

