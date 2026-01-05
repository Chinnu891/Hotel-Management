<?php
$url = 'http://localhost/hotel-management/backend/rooms/getRoomAvailability.php?check_in_date=2025-09-01&check_out_date=2025-09-02&guests=1';
$response = file_get_contents($url);
$data = json_decode($response, true);

$output = "";

if ($data && $data['success']) {
    $output .= "API Success!\n";
    $output .= "Total Rooms: " . $data['data']['total_rooms'] . "\n";
    $output .= "Available: " . $data['data']['available_count'] . "\n";
    $output .= "Booked: " . $data['data']['booked_count'] . "\n";
    
    // Find Room 104
    foreach ($data['data']['all_rooms'] as $room) {
        if ($room['room_number'] === '104') {
            $output .= "\nRoom 104:\n";
            $output .= "  Status: " . $room['availability_status'] . "\n";
            $output .= "  Bookable: " . ($room['is_bookable'] ? 'YES' : 'NO') . "\n";
            if ($room['current_booking']) {
                $output .= "  Booking ID: " . $room['current_booking']['id'] . "\n";
            }
            break;
        }
    }
} else {
    $output .= "API Failed\n";
}

file_put_contents('test_results.txt', $output);
echo "Results written to test_results.txt\n";
?>
