<?php
require_once 'config/database.php';
$db = (new Database())->getConnection();

// Find all bookings with their statuses
$stmt = $db->query("SELECT id, booking_reference, status FROM bookings ORDER BY id DESC LIMIT 20");
$bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Recent bookings:\n";
foreach ($bookings as $booking) {
    echo "ID {$booking['id']}: {$booking['booking_reference']} - Status: '{$booking['status']}'\n";
}

// Check for confirmed status specifically
$stmt = $db->query("SELECT COUNT(*) as count FROM bookings WHERE status = 'confirmed'");
$confirmed_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
echo "\nConfirmed bookings count: {$confirmed_count}\n";

if ($confirmed_count > 0) {
    $stmt = $db->query("SELECT id, booking_reference FROM bookings WHERE status = 'confirmed' LIMIT 5");
    $confirmed = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Confirmed bookings:\n";
    foreach ($confirmed as $booking) {
        echo "- ID {$booking['id']}: {$booking['booking_reference']}\n";
    }
}
?>
