<?php
include_once __DIR__ . '/config/database.php';

$database = new Database();
$conn = $database->getConnection();

$stmt = $conn->prepare("SELECT remaining_amount FROM bookings WHERE id = 301");
$stmt->execute();
$result = $stmt->fetch(PDO::FETCH_ASSOC);

echo "Booking ID 301 - Remaining Amount: ₹" . $result['remaining_amount'] . "\n";

if ($result['remaining_amount'] == 0) {
    echo "✅ FIXED: No more warning should appear!\n";
} else {
    echo "❌ Still has remaining amount: ₹" . $result['remaining_amount'] . "\n";
}
?>
