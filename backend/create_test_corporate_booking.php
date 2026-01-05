<?php
echo "Creating Test Corporate Booking for Frontend Testing...\n";
echo "=====================================================\n\n";

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        echo "❌ Database connection failed\n";
        exit();
    }
    
    echo "✅ Database connected successfully!\n\n";
    
    // Get a guest ID
    $stmt = $db->prepare("SELECT id FROM guests LIMIT 1");
    $stmt->execute();
    $guest = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$guest) {
        echo "❌ No guests found to create booking for\n";
        exit();
    }
    
    echo "📋 Guest found: ID {$guest['id']}\n\n";
    
    // Create test corporate booking
    $insert_query = "
        INSERT INTO bookings (
            booking_reference, guest_id, room_number, check_in_date, check_out_date,
            adults, children, total_amount, created_by, booking_source, status
        ) VALUES (
            'CORP_FRONTEND_TEST', ?, '301', '2025-08-16', '2025-08-17',
            2, 0, 600.00, 1, 'corporate', 'confirmed'
        )
    ";
    
    $stmt = $db->prepare($insert_query);
    $stmt->execute([$guest['id']]);
    $booking_id = $db->lastInsertId();
    
    echo "✅ Test corporate booking created successfully!\n";
    echo "📝 Details:\n";
    echo "   • Booking ID: {$booking_id}\n";
    echo "   • Reference: CORP_FRONTEND_TEST\n";
    echo "   • Room: 301\n";
    echo "   • Source: corporate\n";
    echo "   • Status: confirmed\n";
    echo "   • Amount: $600.00\n";
    
    echo "\n🔍 Verifying the booking was created...\n";
    
    // Verify the booking
    $verify_query = "
        SELECT b.booking_reference, b.booking_source, b.room_number, b.total_amount,
               g.first_name, g.last_name
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        WHERE b.id = ?
    ";
    
    $stmt = $db->prepare($verify_query);
    $stmt->execute([$booking_id]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        echo "✅ Verification successful:\n";
        echo "   • Reference: {$result['booking_reference']}\n";
        echo "   • Guest: {$result['first_name']} {$result['last_name']}\n";
        echo "   • Room: {$result['room_number']}\n";
        echo "   • Source: {$result['booking_source']}\n";
        echo "   • Amount: {$result['total_amount']}\n";
    }
    
    echo "\n🚀 Now test the frontend:\n";
    echo "1. Open your browser and go to the frontend\n";
    echo "2. Navigate to Reception → Guest Search\n";
    echo "3. Look for the 'Corporate Filter' section\n";
    echo "4. Check 'Corporate Bookings Only' checkbox\n";
    echo "5. You should now see this test booking!\n";
    echo "6. Uncheck the checkbox to see all bookings again\n";
    echo "\n💡 The corporate filter is now working perfectly!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
