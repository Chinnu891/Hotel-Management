<?php
/**
 * Setup Auto Email Triggers
 * This will ensure emails are sent automatically for every booking
 */

require_once 'config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    echo "🚀 Setting up Auto Email Triggers...\n";
    echo "====================================\n\n";
    
    // Create email queue table
    echo "📋 Creating email queue table...\n";
    $createTable = "
        CREATE TABLE IF NOT EXISTS email_queue (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            email_type VARCHAR(50) NOT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            status ENUM('pending', 'processing', 'sent', 'failed') DEFAULT 'pending',
            attempts INT DEFAULT 0,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_at TIMESTAMP NULL,
            INDEX idx_status (status),
            INDEX idx_booking_id (booking_id),
            INDEX idx_created_at (created_at)
        )
    ";
    
    $db->exec($createTable);
    echo "✅ Email queue table created\n\n";
    
    // Create trigger for new bookings
    echo "🔧 Creating trigger for new bookings...\n";
    $db->exec("DROP TRIGGER IF EXISTS auto_send_booking_email");
    
    $trigger1 = "
        CREATE TRIGGER auto_send_booking_email
        AFTER INSERT ON bookings
        FOR EACH ROW
        BEGIN
            IF NEW.status = 'confirmed' THEN
                INSERT INTO email_queue (booking_id, email_type, recipient_email, status, created_at)
                VALUES (NEW.id, 'booking_confirmation', NEW.contact_email, 'pending', NOW());
            END IF;
        END
    ";
    
    $db->exec($trigger1);
    echo "✅ Trigger for new bookings created\n\n";
    
    // Create trigger for status changes
    echo "🔧 Creating trigger for status changes...\n";
    $db->exec("DROP TRIGGER IF EXISTS auto_send_booking_email_status_change");
    
    $trigger2 = "
        CREATE TRIGGER auto_send_booking_email_status_change
        AFTER UPDATE ON bookings
        FOR EACH ROW
        BEGIN
            IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
                IF NOT EXISTS (SELECT 1 FROM email_logs WHERE reference_id = NEW.id AND email_type = 'booking_confirmation') THEN
                    INSERT INTO email_queue (booking_id, email_type, recipient_email, status, created_at)
                    VALUES (NEW.id, 'booking_confirmation', NEW.contact_email, 'pending', NOW());
                END IF;
            END IF;
        END
    ";
    
    $db->exec($trigger2);
    echo "✅ Trigger for status changes created\n\n";
    
    // Populate queue with existing confirmed bookings without emails
    echo "📧 Populating email queue with existing bookings...\n";
    $populateQueue = "
        INSERT IGNORE INTO email_queue (booking_id, email_type, recipient_email, status, created_at)
        SELECT 
            b.id,
            'booking_confirmation',
            b.contact_email,
            'pending',
            NOW()
        FROM bookings b
        LEFT JOIN email_logs el ON b.id = el.reference_id AND el.email_type = 'booking_confirmation'
        WHERE b.status = 'confirmed' 
        AND el.id IS NULL
        AND b.contact_email IS NOT NULL
        AND b.contact_email != ''
    ";
    
    $db->exec($populateQueue);
    
    // Count pending emails
    $stmt = $db->query("SELECT COUNT(*) as count FROM email_queue WHERE status = 'pending'");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Email queue populated with " . $result['count'] . " pending emails\n\n";
    
    echo "🎉 Auto Email Triggers Setup Complete!\n";
    echo "=====================================\n";
    echo "✅ Database triggers created\n";
    echo "✅ Email queue table created\n";
    echo "✅ Existing bookings queued for emails\n";
    echo "✅ Future bookings will automatically queue emails\n\n";
    
    echo "🚀 Next Steps:\n";
    echo "   1. Run the email processor: php backend/process_email_queue.php\n";
    echo "   2. Create a new booking to test\n";
    echo "   3. Email will be sent automatically!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
