<?php
require_once 'config/database.php';
$db = (new Database())->getConnection();

$stmt = $db->query("SELECT id, booking_reference, status FROM bookings WHERE status = 'confirmed'");
$booking = $stmt->fetch(PDO::FETCH_ASSOC);

if ($booking) {
    echo "Confirmed booking found: ID {$booking['id']}, Ref: {$booking['booking_reference']}\n";
} else {
    echo "No confirmed bookings found\n";
    
    // Show all statuses
    $stmt = $db->query("SELECT status, COUNT(*) as count FROM bookings GROUP BY status");
    $statuses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($statuses as $status) {
        echo "Status '{$status['status']}': {$status['count']} bookings\n";
    }
}
?>
