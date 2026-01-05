<?php
echo "Adding Company Fields for Corporate Bookings...\n";
echo "=============================================\n\n";

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        echo "❌ Database connection failed\n";
        exit();
    }
    
    echo "✅ Database connected successfully!\n\n";
    
    // Step 1: Check current bookings table structure
    echo "🔍 Step 1: Checking Bookings Table Structure\n";
    echo "============================================\n";
    
    $structure_stmt = $db->prepare("DESCRIBE bookings");
    $structure_stmt->execute();
    $columns = $structure_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $existing_columns = array_column($columns, 'Field');
    echo "📊 Current columns in bookings table:\n";
    foreach ($columns as $column) {
        echo "  • {$column['Field']} - {$column['Type']}\n";
    }
    
    echo "\n";
    
    // Step 2: Add company-related fields if they don't exist
    echo "🔍 Step 2: Adding Company Fields\n";
    echo "================================\n";
    
    $company_fields = [
        'company_name' => 'VARCHAR(255)',
        'gst_number' => 'VARCHAR(20)',
        'contact_person' => 'VARCHAR(100)',
        'contact_phone' => 'VARCHAR(20)',
        'contact_email' => 'VARCHAR(100)',
        'billing_address' => 'TEXT'
    ];
    
    foreach ($company_fields as $field_name => $field_type) {
        if (!in_array($field_name, $existing_columns)) {
            echo "📋 Adding {$field_name} column...\n";
            $add_column_stmt = $db->prepare("
                ALTER TABLE bookings 
                ADD COLUMN {$field_name} {$field_type} 
                AFTER booking_source
            ");
            $add_column_stmt->execute();
            echo "✅ {$field_name} column added successfully\n";
        } else {
            echo "✅ {$field_name} column already exists\n";
        }
    }
    
    echo "\n";
    
    // Step 3: Update existing corporate bookings with sample company data
    echo "🔍 Step 3: Updating Existing Corporate Bookings\n";
    echo "===============================================\n";
    
    $corp_bookings_stmt = $db->prepare("
        SELECT id, booking_reference 
        FROM bookings 
        WHERE booking_source = 'corporate'
    ");
    $corp_bookings_stmt->execute();
    $corp_bookings = $corp_bookings_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!empty($corp_bookings)) {
        echo "📊 Found " . count($corp_bookings) . " corporate booking(s) to update:\n";
        
        foreach ($corp_bookings as $booking) {
            // Generate sample company data
            $company_data = [
                'company_name' => 'Sample Corporate Ltd.',
                'gst_number' => 'GST123456789',
                'contact_person' => 'John Manager',
                'contact_phone' => '9876543210',
                'contact_email' => 'john@samplecorp.com',
                'billing_address' => '123 Business Street, Corporate City, CC 12345'
            ];
            
            // Update the booking with company information
            $update_stmt = $db->prepare("
                UPDATE bookings 
                SET 
                    company_name = ?,
                    gst_number = ?,
                    contact_person = ?,
                    contact_phone = ?,
                    contact_email = ?,
                    billing_address = ?
                WHERE id = ?
            ");
            
            $update_stmt->execute([
                $company_data['company_name'],
                $company_data['gst_number'],
                $company_data['contact_person'],
                $company_data['contact_phone'],
                $company_data['contact_email'],
                $company_data['billing_address'],
                $booking['id']
            ]);
            
            echo "  ✅ Updated {$booking['booking_reference']} with company data\n";
        }
    } else {
        echo "❌ No corporate bookings found to update\n";
    }
    
    echo "\n";
    
    // Step 4: Verify the updated structure
    echo "🔍 Step 4: Verifying Updated Structure\n";
    echo "======================================\n";
    
    $verify_stmt = $db->prepare("
        SELECT 
            b.booking_reference,
            b.booking_source,
            b.company_name,
            b.gst_number,
            b.contact_person,
            b.contact_phone,
            b.contact_email,
            b.billing_address
        FROM bookings b
        WHERE b.booking_source = 'corporate'
        LIMIT 3
    ");
    $verify_stmt->execute();
    $verify_data = $verify_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (!empty($verify_data)) {
        echo "✅ Corporate bookings with company data:\n";
        foreach ($verify_data as $data) {
            echo "  📝 {$data['booking_reference']}:\n";
            echo "     🏢 Company: {$data['company_name']}\n";
            echo "     🏷️ GST: {$data['gst_number']}\n";
            echo "     👤 Contact: {$data['contact_person']}\n";
            echo "     📱 Phone: {$data['contact_phone']}\n";
            echo "     📧 Email: {$data['contact_email']}\n";
            echo "     🏠 Billing: {$data['billing_address']}\n";
            echo "     ---\n";
        }
    }
    
    echo "\n";
    echo "🏁 Company Fields Update Completed!\n";
    echo "==================================\n";
    echo "\n✅ All company fields have been added to the bookings table\n";
    echo "✅ Existing corporate bookings have been updated with sample data\n";
    echo "✅ Ready to display company information in view details\n";
    echo "\n🚀 Next: Update frontend components to show company details\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
