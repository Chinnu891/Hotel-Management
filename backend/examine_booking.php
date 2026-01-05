<?php
require_once 'config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    echo "🔍 Examining Recent Booking Details...\n";
    echo "=====================================\n\n";
    
    // Get detailed booking information
    $stmt = $conn->prepare("
        SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
               r.room_number, rt.name as room_type_name,
               p.payment_method, p.amount as payment_amount, p.payment_status
        FROM bookings b
        JOIN guests g ON b.guest_id = g.id
        JOIN rooms r ON b.room_id = r.id
        JOIN room_types rt ON r.room_type_id = rt.id
        LEFT JOIN payments p ON b.id = p.booking_id
        WHERE b.id IN (199, 198)
        ORDER BY b.created_at DESC
    ");
    $stmt->execute();
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($bookings)) {
        echo "❌ No detailed booking information found\n";
    } else {
        foreach($bookings as $booking) {
            echo "📋 Booking ID: " . $booking['id'] . "\n";
            echo "   Reference: " . $booking['booking_reference'] . "\n";
            echo "   Status: " . $booking['status'] . "\n";
            echo "   Guest: " . $booking['first_name'] . " " . $booking['last_name'] . "\n";
            echo "   Email: " . $booking['email'] . "\n";
            echo "   Phone: " . $booking['phone'] . "\n";
            echo "   Room: " . $booking['room_number'] . " (" . $booking['room_type_name'] . ")\n";
            echo "   Check-in: " . $booking['check_in_date'] . "\n";
            echo "   Check-out: " . $booking['check_out_date'] . "\n";
            echo "   Adults: " . $booking['adults'] . "\n";
            echo "   Children: " . $booking['children'] . "\n";
            echo "   Total Amount: ₹" . $booking['total_amount'] . "\n";
            echo "   Created At: " . $booking['created_at'] . "\n";
            echo "   Updated At: " . $booking['updated_at'] . "\n";
            
            if ($booking['payment_method']) {
                echo "   Payment Method: " . $booking['payment_method'] . "\n";
                echo "   Payment Amount: ₹" . $booking['payment_amount'] . "\n";
                echo "   Payment Status: " . $booking['payment_status'] . "\n";
            } else {
                echo "   Payment: No payment record found\n";
            }
            
            echo "   " . str_repeat("=", 60) . "\n\n";
        }
    }
    
    // Check if there are any invoices for these bookings
    echo "🧾 Checking Invoices...\n";
    echo "=======================\n";
    
    $stmt = $conn->prepare("
        SELECT * FROM invoices 
        WHERE booking_id IN (199, 198)
        ORDER BY created_at DESC
    ");
    $stmt->execute();
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($invoices)) {
        echo "❌ No invoices found for these bookings\n";
    } else {
        foreach($invoices as $invoice) {
            echo "✅ Invoice ID: " . $invoice['id'] . "\n";
            echo "   Invoice Number: " . $invoice['invoice_number'] . "\n";
            echo "   Status: " . $invoice['status'] . "\n";
            echo "   Created: " . $invoice['created_at'] . "\n";
            echo "   " . str_repeat("-", 40) . "\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
