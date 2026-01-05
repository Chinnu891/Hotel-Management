<?php
/**
 * Process Email Queue
 * Automatically sends emails from the queue
 */

require_once 'config/database.php';
require_once 'utils/email_service.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    echo "📧 Processing Email Queue...\n";
    echo "============================\n\n";
    
    // Get pending emails (only with valid email addresses)
    $stmt = $db->prepare("
        SELECT eq.*, b.* 
        FROM email_queue eq
        JOIN bookings b ON eq.booking_id = b.id
        WHERE eq.status = 'pending'
        AND eq.recipient_email IS NOT NULL 
        AND eq.recipient_email != ''
        AND b.contact_email IS NOT NULL 
        AND b.contact_email != ''
        ORDER BY eq.created_at ASC
        LIMIT 10
    ");
    $stmt->execute();
    $pendingEmails = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($pendingEmails)) {
        echo "✅ No pending emails in queue\n";
        echo "📋 Queue is empty - all emails processed\n";
        exit;
    }
    
    echo "📋 Found " . count($pendingEmails) . " pending emails\n\n";
    
    $emailService = new EmailService($db);
    $processed = 0;
    $failed = 0;
    
    foreach ($pendingEmails as $email) {
        echo "📧 Processing email for booking ID: " . $email['booking_id'] . "\n";
        echo "   Recipient: " . $email['recipient_email'] . "\n";
        echo "   Type: " . $email['email_type'] . "\n";
        
        try {
            // Mark as processing
            $updateStmt = $db->prepare("
                UPDATE email_queue 
                SET status = 'processing', attempts = attempts + 1 
                WHERE id = ?
            ");
            $updateStmt->execute([$email['id']]);
            
            // Prepare email data
            $emailData = [
                'email' => $email['recipient_email'],
                'guest_name' => $email['contact_person'] ?: 'Guest',
                'booking_reference' => $email['booking_reference'],
                'invoice_number' => 'INV-' . date('Y') . '-' . str_pad($email['booking_id'], 6, '0', STR_PAD_LEFT),
                'check_in_date' => $email['check_in_date'],
                'check_out_date' => $email['check_out_date'],
                'nights' => $email['number_of_days'],
                'room_number' => $email['room_number'],
                'room_type' => 'Room', // You can enhance this
                'total_amount' => $email['total_amount'],
                'adults' => $email['adults'],
                'children' => $email['children'],
                'booking_id' => $email['booking_id']
            ];
            
            // Send email
            $result = $emailService->sendBookingConfirmationEmail($emailData);
            
            if ($result) {
                // Mark as sent
                $updateStmt = $db->prepare("
                    UPDATE email_queue 
                    SET status = 'sent', processed_at = NOW() 
                    WHERE id = ?
                ");
                $updateStmt->execute([$email['id']]);
                
                echo "   ✅ Email sent successfully\n";
                $processed++;
            } else {
                throw new Exception("Email service returned false");
            }
            
        } catch (Exception $e) {
            // Mark as failed
            $updateStmt = $db->prepare("
                UPDATE email_queue 
                SET status = 'failed', error_message = ?, processed_at = NOW() 
                WHERE id = ?
            ");
            $updateStmt->execute([$e->getMessage(), $email['id']]);
            
            echo "   ❌ Failed: " . $e->getMessage() . "\n";
            $failed++;
        }
        
        echo "   " . str_repeat("-", 40) . "\n";
    }
    
    echo "\n📊 Processing Complete!\n";
    echo "========================\n";
    echo "✅ Successfully processed: " . $processed . "\n";
    echo "❌ Failed: " . $failed . "\n";
    echo "📧 Total processed: " . ($processed + $failed) . "\n";
    
    if ($processed > 0) {
        echo "\n🎉 Emails sent automatically!\n";
        echo "📱 Check recipient inboxes\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
