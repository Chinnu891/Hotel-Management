<?php
require_once 'config/cors.php';
require_once 'config/database.php';

header('Content-Type: application/json');

echo "🔧 Setting up email configuration...\n\n";

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        echo "❌ Failed to connect to database.\n";
        echo "Make sure XAMPP MySQL is running.\n";
        exit();
    }
    
    echo "✅ Database connected successfully\n\n";
    
    // Create email_config table
    $create_email_config_table = "
    CREATE TABLE IF NOT EXISTS email_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        config_key VARCHAR(50) UNIQUE NOT NULL,
        config_value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )";
    
    $db->exec($create_email_config_table);
    echo "✅ Email configuration table created/verified\n\n";
    
    // Create email_logs table
    $create_email_logs_table = "
    CREATE TABLE IF NOT EXISTS email_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        reference_id INT NOT NULL,
        email_type ENUM('invoice', 'booking_confirmation', 'payment_receipt', 'general', 'test') NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        status ENUM('success', 'failed') NOT NULL,
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_reference (reference_id),
        INDEX idx_email_type (email_type),
        INDEX idx_status (status),
        INDEX idx_sent_at (sent_at)
    )";
    
    $db->exec($create_email_logs_table);
    echo "✅ Email logs table created/verified\n\n";
    
    // Clear existing email configuration
    $db->exec("DELETE FROM email_config");
    echo "🧹 Cleared existing email configuration\n\n";
    
    // Insert default Gmail SMTP configuration
    $insert_config = "INSERT INTO email_config (config_key, config_value, description) VALUES (?, ?, ?)";
    $stmt = $db->prepare($insert_config);
    
    $config_values = [
        ['host', 'smtp.gmail.com', 'SMTP server hostname'],
        ['username', 'your-email@gmail.com', 'Gmail email address'],
        ['password', 'your-app-password', 'Gmail app password (not regular password)'],
        ['port', '587', 'SMTP port for TLS'],
        ['encryption', 'tls', 'Encryption method'],
        ['from_email', 'info@svroyalluxury.com', 'Default sender email'],
        ['from_name', 'SV ROYAL LUXURY ROOMS', 'Default sender name'],
        ['hotel_name', 'SV ROYAL LUXURY ROOMS', 'Hotel name for emails'],
        ['hotel_email', 'info@svroyalluxury.com', 'Hotel contact email'],
        ['hotel_phone', '+1-234-567-8900', 'Hotel contact phone'],
        ['hotel_address', '123 Luxury Street, City, State 12345', 'Hotel address'],
        ['hotel_website', 'https://svroyalluxury.com', 'Hotel website URL']
    ];
    
    foreach ($config_values as $config) {
        $stmt->execute($config);
    }
    
    echo "✅ Default email configuration inserted\n\n";
    
    echo "📧 Email Configuration Setup Complete!\n\n";
    echo "🔑 NEXT STEPS TO ENABLE EMAILS:\n\n";
    echo "1. Update Gmail credentials in the database:\n";
    echo "   - Go to phpMyAdmin: http://localhost/phpmyadmin\n";
    echo "   - Navigate to hotel_management > email_config table\n";
    echo "   - Update 'username' with your Gmail address\n";
    echo "   - Update 'password' with your Gmail App Password\n\n";
    
    echo "2. To generate Gmail App Password:\n";
    echo "   - Go to your Google Account settings\n";
    echo "   - Enable 2-Factor Authentication\n";
    echo "   - Go to Security > App passwords\n";
    echo "   - Generate a new app password for 'Mail'\n\n";
    
    echo "3. Test the email configuration:\n";
    echo "   - Use the test email endpoint: POST /backend/utils/test_email.php\n";
    echo "   - Send: {\"action\": \"test\", \"test_email\": \"your-email@example.com\"}\n\n";
    
    echo "4. After successful test, emails will be sent automatically when:\n";
    echo "   - Creating new bookings\n";
    echo "   - Confirming bookings\n";
    echo "   - Generating invoices\n\n";
    
    echo "⚠️  IMPORTANT: Do not use your regular Gmail password!\n";
    echo "   Use only the App Password generated specifically for this application.\n\n";
    
} catch (Exception $e) {
    echo "❌ Error setting up email configuration: " . $e->getMessage() . "\n";
}
?>
