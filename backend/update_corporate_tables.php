<?php
echo "Updating Database Tables for Corporate Information...\n";
echo "===================================================\n\n";

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        echo "❌ Database connection failed\n";
        exit();
    }
    
    echo "✅ Database connected successfully!\n\n";
    
    // Step 1: Check and update bookings table
    echo "🔍 Step 1: Checking Bookings Table\n";
    echo "==================================\n";
    
    // Check if booking_source column exists
    $check_column_stmt = $db->prepare("
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'bookings' 
        AND COLUMN_NAME = 'booking_source'
    ");
    $check_column_stmt->execute();
    $column_exists = $check_column_stmt->fetch();
    
    if (!$column_exists) {
        echo "📋 Adding booking_source column to bookings table...\n";
        $add_column_stmt = $db->prepare("
            ALTER TABLE bookings 
            ADD COLUMN booking_source VARCHAR(50) DEFAULT 'walk_in' 
            AFTER created_by
        ");
        $add_column_stmt->execute();
        echo "✅ booking_source column added successfully\n";
    } else {
        echo "✅ booking_source column already exists\n";
    }
    
    // Step 2: Check and update booking_summary table
    echo "\n🔍 Step 2: Checking Booking Summary Table\n";
    echo "==========================================\n";
    
    // Check if booking_summary table exists
    $check_table_stmt = $db->prepare("SHOW TABLES LIKE 'booking_summary'");
    $check_table_stmt->execute();
    $table_exists = $check_table_stmt->fetch();
    
    if (!$table_exists) {
        echo "📋 Creating booking_summary table...\n";
        $create_table_stmt = $db->prepare("
            CREATE TABLE booking_summary (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_reference VARCHAR(20) NOT NULL,
                guest_name VARCHAR(101) NOT NULL,
                phone VARCHAR(20) NOT NULL,
                email VARCHAR(100),
                address TEXT,
                room_number VARCHAR(20) NOT NULL,
                room_type VARCHAR(50) NOT NULL,
                check_in_date DATE NOT NULL,
                check_out_date DATE NOT NULL,
                number_of_days INT NOT NULL,
                tariff DECIMAL(10,2) NOT NULL,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'pending',
                booking_source VARCHAR(50) DEFAULT 'walk_in',
                plan_type ENUM('EP', 'CP') DEFAULT 'EP',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                company_name VARCHAR(255),
                gst_number VARCHAR(20),
                INDEX idx_booking_reference (booking_reference),
                INDEX idx_booking_source (booking_source),
                INDEX idx_status (status)
            )
        ");
        $create_table_stmt->execute();
        echo "✅ booking_summary table created successfully\n";
    } else {
        echo "✅ booking_summary table already exists\n";
        
        // Check if booking_source column exists in booking_summary
        $check_source_stmt = $db->prepare("
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'booking_summary' 
            AND COLUMN_NAME = 'booking_source'
        ");
        $check_source_stmt->execute();
        $source_column_exists = $check_source_stmt->fetch();
        
        if (!$source_column_exists) {
            echo "📋 Adding booking_source column to booking_summary table...\n";
            $add_source_stmt = $db->prepare("
                ALTER TABLE booking_summary 
                ADD COLUMN booking_source VARCHAR(50) DEFAULT 'walk_in' 
                AFTER status
            ");
            $add_source_stmt->execute();
            echo "✅ booking_source column added to booking_summary\n";
        } else {
            echo "✅ booking_source column already exists in booking_summary\n";
        }
    }
    
    // Step 3: Create corporate_bookings table for additional corporate details
    echo "\n🔍 Step 3: Creating Corporate Bookings Table\n";
    echo "============================================\n";
    
    $check_corp_table_stmt = $db->prepare("SHOW TABLES LIKE 'corporate_bookings'");
    $check_corp_table_stmt->execute();
    $corp_table_exists = $check_corp_table_stmt->fetch();
    
    if (!$corp_table_exists) {
        echo "📋 Creating corporate_bookings table...\n";
        $create_corp_table_stmt = $db->prepare("
            CREATE TABLE corporate_bookings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                booking_id INT NOT NULL,
                company_name VARCHAR(255),
                company_address TEXT,
                contact_person VARCHAR(100),
                contact_phone VARCHAR(20),
                contact_email VARCHAR(100),
                corporate_account_number VARCHAR(50),
                billing_address TEXT,
                tax_exemption_status ENUM('exempt', 'non_exempt') DEFAULT 'non_exempt',
                corporate_discount_percentage DECIMAL(5,2) DEFAULT 0.00,
                special_requirements TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
                INDEX idx_booking_id (booking_id),
                INDEX idx_company_name (company_name)
            )
        ");
        $create_corp_table_stmt->execute();
        echo "✅ corporate_bookings table created successfully\n";
    } else {
        echo "✅ corporate_bookings table already exists\n";
    }
    
    // Step 4: Update existing corporate bookings to ensure they have proper data
    echo "\n🔍 Step 4: Updating Existing Corporate Bookings\n";
    echo "================================================\n";
    
    // Check current corporate bookings
    $check_corp_stmt = $db->prepare("
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE booking_source = 'corporate'
    ");
    $check_corp_stmt->execute();
    $corp_count = $check_corp_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "📊 Found {$corp_count} existing corporate bookings\n";
    
    if ($corp_count > 0) {
        // Update booking_summary table for existing corporate bookings
        $update_summary_stmt = $db->prepare("
            UPDATE booking_summary bs
            JOIN bookings b ON bs.booking_reference = b.booking_reference
            SET bs.booking_source = b.booking_source
            WHERE b.booking_source = 'corporate'
        ");
        $update_summary_stmt->execute();
        echo "✅ Updated booking_summary for existing corporate bookings\n";
        
        // Show sample corporate booking details
        $sample_corp_stmt = $db->prepare("
            SELECT 
                b.booking_reference, b.booking_source, b.room_number,
                g.first_name, g.last_name, g.email
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            WHERE b.booking_source = 'corporate'
            LIMIT 3
        ");
        $sample_corp_stmt->execute();
        $sample_corp = $sample_corp_stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($sample_corp)) {
            echo "📝 Sample corporate bookings:\n";
            foreach ($sample_corp as $booking) {
                echo "  • {$booking['booking_reference']} - {$booking['first_name']} {$booking['last_name']}\n";
                echo "    Room: {$booking['room_number']} | Source: {$booking['booking_source']}\n";
            }
        }
    }
    
    // Step 5: Verify the structure
    echo "\n🔍 Step 5: Verifying Database Structure\n";
    echo "======================================\n";
    
    // Check bookings table structure
    $bookings_structure_stmt = $db->prepare("DESCRIBE bookings");
    $bookings_structure_stmt->execute();
    $bookings_columns = $bookings_structure_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📊 Bookings table structure:\n";
    foreach ($bookings_columns as $column) {
        if (in_array($column['Field'], ['id', 'booking_reference', 'booking_source', 'status', 'created_at'])) {
            echo "  • {$column['Field']} - {$column['Type']} - {$column['Null']} - {$column['Key']}\n";
        }
    }
    
    // Check booking_summary table structure
    $summary_structure_stmt = $db->prepare("DESCRIBE booking_summary");
    $summary_structure_stmt->execute();
    $summary_columns = $summary_structure_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\n📊 Booking Summary table structure:\n";
    foreach ($summary_columns as $column) {
        if (in_array($column['Field'], ['id', 'booking_reference', 'booking_source', 'status', 'created_at'])) {
            echo "  • {$column['Field']} - {$column['Type']} - {$column['Null']} - {$column['Key']}\n";
        }
    }
    
    echo "\n🏁 Database update completed successfully!\n";
    echo "========================================\n";
    echo "\n✅ All tables are now properly configured for corporate bookings\n";
    echo "✅ Corporate information will be displayed in:\n";
    echo "  • Guest Search view details\n";
    echo "  • Guest History view details\n";
    echo "  • New Booking summary\n";
    echo "  • Booking confirmation\n";
    echo "\n🚀 Ready to test corporate booking functionality!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
