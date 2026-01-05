<?php
/**
 * Auto Email Service
 * Runs continuously to process email queue
 */

require_once 'config/database.php';
require_once 'utils/email_service.php';

echo "🚀 Auto Email Service Started\n";
echo "=============================\n";
echo "⏰ Started at: " . date('Y-m-d H:i:s') . "\n";
echo "📧 Monitoring email queue every 30 seconds...\n\n";

$database = new Database();
$db = $database->getConnection();

while (true) {
    try {
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
            LIMIT 5
        ");
        $stmt->execute();
        $pendingEmails = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($pendingEmails)) {
            echo "📧 Processing " . count($pendingEmails) . " pending emails...\n";
            
            $emailService = new EmailService($db);
            $processed = 0;
            
            foreach ($pendingEmails as $email) {
                echo "   📨 Booking ID: " . $email['booking_id'] . " → " . $email['recipient_email'] . "\n";
                
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
                        'room_type' => 'Room',
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
                        
                        echo "      ✅ Sent successfully\n";
                        $processed++;
                    } else {
                        throw new Exception("Email service failed");
                    }
                    
                } catch (Exception $e) {
                    // Mark as failed
                    $updateStmt = $db->prepare("
                        UPDATE email_queue 
                        SET status = 'failed', error_message = ?, processed_at = NOW() 
                        WHERE id = ?
                    ");
                    $updateStmt->execute([$e->getMessage(), $email['id']]);
                    
                    echo "      ❌ Failed: " . $e->getMessage() . "\n";
                }
            }
            
            echo "   📊 Processed: " . $processed . " emails\n\n";
        }
        
        // Wait 30 seconds before next check
        sleep(30);
        
    } catch (Exception $e) {
        echo "❌ Service Error: " . $e->getMessage() . "\n";
        echo "🔄 Restarting in 60 seconds...\n";
        sleep(60);
    }
}
?>
