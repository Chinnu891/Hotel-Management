<?php
/**
 * Monitor booking emails in real-time
 */

require_once 'config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    echo "🔍 Monitoring Booking Email System...\n";
    echo "=====================================\n\n";
    
    echo "📊 Current Status:\n";
    echo "   - Monitoring for new bookings...\n";
    echo "   - Watching email logs...\n";
    echo "   - Ready to track your new booking!\n\n";
    
    // Get current time
    $current_time = date('Y-m-d H:i:s');
    echo "⏰ Current Time: " . $current_time . "\n\n";
    
    // Check recent bookings (last 10 minutes)
    $stmt = $db->prepare("
        SELECT id, booking_reference, status, contact_person, contact_email, created_at 
        FROM bookings 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $recent_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if ($recent_bookings) {
        echo "📋 Recent Bookings (Last 10 minutes):\n";
        foreach ($recent_bookings as $booking) {
            echo "   📌 ID: " . $booking['id'] . " | " . $booking['booking_reference'] . "\n";
            echo "      Guest: " . $booking['contact_person'] . " | Status: " . $booking['status'] . "\n";
            echo "      Email: " . $booking['contact_email'] . "\n";
            echo "      Created: " . $booking['created_at'] . "\n";
            
            // Check if email was sent for this booking
            $stmt2 = $db->prepare("
                SELECT * FROM email_logs 
                WHERE reference_id = ? AND email_type = 'booking_confirmation'
                ORDER BY sent_at DESC LIMIT 1
            ");
            $stmt2->execute([$booking['id']]);
            $email = $stmt2->fetch(PDO::FETCH_ASSOC);
            
            if ($email) {
                echo "      ✅ Email: " . $email['status'] . " at " . $email['sent_at'] . "\n";
            } else {
                echo "      ❌ No email sent yet\n";
            }
            echo "      " . str_repeat("-", 40) . "\n";
        }
    } else {
        echo "📋 No recent bookings found (last 10 minutes)\n";
    }
    
    echo "\n📧 Recent Email Activity (Last 10 minutes):\n";
    $stmt3 = $db->prepare("
        SELECT * FROM email_logs 
        WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 10 MINUTE)
        ORDER BY sent_at DESC
    ");
    $stmt3->execute();
    $recent_emails = $stmt3->fetchAll(PDO::FETCH_ASSOC);
    
    if ($recent_emails) {
        foreach ($recent_emails as $email) {
            echo "   📧 " . $email['email_type'] . " to " . $email['recipient_email'] . "\n";
            echo "      Status: " . $email['status'] . " at " . $email['sent_at'] . "\n";
        }
    } else {
        echo "   📧 No recent email activity\n";
    }
    
    echo "\n🎯 Instructions:\n";
    echo "   1. Create a new booking in your system\n";
    echo "   2. Come back here and run this script again\n";
    echo "   3. We'll see if the email was sent automatically\n\n";
    
    echo "💡 Run this command again after creating your booking:\n";
    echo "   php backend/monitor_booking_emails.php\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
?>
