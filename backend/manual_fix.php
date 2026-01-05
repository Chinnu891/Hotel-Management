<?php
include_once __DIR__ . '/config/database.php';

$database = new Database();
$conn = $database->getConnection();

echo "Manual Fix for Booking ID 301\n";
echo "=============================\n\n";

try {
    // Direct SQL update
    $sql = "UPDATE bookings SET remaining_amount = 0.00 WHERE id = 301";
    $result = $conn->exec($sql);
    
    echo "SQL executed: $sql\n";
    echo "Rows affected: $result\n\n";
    
    // Verify the update
    $stmt = $conn->prepare("SELECT remaining_amount FROM bookings WHERE id = 301");
    $stmt->execute();
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "After update - Remaining Amount: ₹" . $booking['remaining_amount'] . "\n";
    
    if ($booking['remaining_amount'] == 0) {
        echo "✅ SUCCESS: Booking ID 301 fixed!\n";
        echo "The warning should no longer appear for guest 'vamsi'.\n";
    } else {
        echo "❌ FAILED: Still has remaining amount.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}

echo "\nScript completed.\n";
?>
