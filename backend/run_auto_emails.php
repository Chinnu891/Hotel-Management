<?php
/**
 * Background Email Service Runner
 * This script can be run periodically to automatically send confirmation emails
 * for confirmed bookings that haven't received emails yet.
 */

// Set time limit to 0 for long-running scripts
set_time_limit(0);

// Include required files
require_once __DIR__ . '/utils/auto_email_trigger.php';
require_once __DIR__ . '/config/database.php';

echo "🚀 Starting Automatic Email Service...\n";
echo "======================================\n";
echo "Current time: " . date('Y-m-d H:i:s') . "\n\n";

try {
    // Connect to database
    $database = new Database();
    $db = $database->getConnection();
    
    // Create auto email trigger instance
    $autoTrigger = new AutoEmailTrigger($db);
    
    // Process all unsent emails
    echo "📧 Processing unsent confirmation emails...\n";
    $result = $autoTrigger->processUnsentEmails();
    
    if ($result) {
        echo "\n✅ Email processing completed successfully!\n";
    } else {
        echo "\n❌ Email processing failed!\n";
    }
    
    echo "Finished at: " . date('Y-m-d H:i:s') . "\n";
    
} catch (Exception $e) {
    echo "❌ Error in email service: " . $e->getMessage() . "\n";
    error_log("Auto email service error: " . $e->getMessage());
}

echo "\n" . str_repeat("=", 50) . "\n";
?>
