<?php
/**
 * Force Cache Clear
 * 
 * This script forces the web server to reload the getRoomAvailability.php file
 * by making a small change to it.
 */

echo "=== Force Cache Clear ===\n\n";

// Path to the file
$filePath = 'rooms/getRoomAvailability.php';

if (!file_exists($filePath)) {
    echo "❌ File not found: $filePath\n";
    exit;
}

echo "✅ File found: $filePath\n";

// Read the current content
$content = file_get_contents($filePath);

if ($content === false) {
    echo "❌ Failed to read file\n";
    exit;
}

echo "✅ File read successfully\n";

// Add a cache-busting comment at the top
$cacheBuster = "<?php\n// Cache cleared at: " . date('Y-m-d H:i:s') . "\n";
$newContent = $cacheBuster . substr($content, 5); // Remove the original <?php and add our version

// Write back to file
if (file_put_contents($filePath, $newContent) === false) {
    echo "❌ Failed to write file\n";
    exit;
}

echo "✅ File updated with cache buster\n";
echo "Cache buster added: " . date('Y-m-d H:i:s') . "\n\n";

// Now test the API again
echo "=== Testing API After Cache Clear ===\n";

$apiUrl = "http://localhost/hotel-management/backend/rooms/getRoomAvailability.php?check_in_date=2025-08-30&check_out_date=2025-08-31&guests=1";

echo "Calling API: $apiUrl\n\n";

$response = file_get_contents($apiUrl);

if ($response === false) {
    echo "❌ Failed to fetch API response\n";
    exit;
}

$data = json_decode($response, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo "❌ JSON decode error: " . json_last_error_msg() . "\n";
    exit;
}

if (!$data || !isset($data['success'])) {
    echo "❌ Invalid response structure\n";
    exit;
}

if (!$data['success']) {
    echo "❌ API returned error: " . ($data['message'] ?? 'Unknown error') . "\n";
    exit;
}

echo "✅ API call successful\n\n";

// Find Room 105 in the response
$room105 = null;
if (isset($data['data']['all_rooms'])) {
    foreach ($data['data']['all_rooms'] as $room) {
        if ($room['room_number'] === '105') {
            $room105 = $room;
            break;
        }
    }
}

if ($room105) {
    echo "=== Room 105 After Cache Clear ===\n";
    echo "Room Number: {$room105['room_number']}\n";
    echo "Room Status: {$room105['room_status']}\n";
    echo "Availability Status: {$room105['availability_status']}\n";
    echo "Is Bookable: " . ($room105['is_bookable'] ? 'YES' : 'NO') . "\n";
    
    if ($room105['availability_status'] === 'available') {
        echo "\n✅ SUCCESS: Room 105 now shows as 'available'!\n";
        echo "The cache clear worked!\n";
    } else {
        echo "\n❌ Room 105 still shows as '{$room105['availability_status']}'\n";
        echo "The cache clear might not have worked.\n";
    }
} else {
    echo "❌ Room 105 not found in API response\n";
}

echo "\n=== Next Steps ===\n";
echo "1. Refresh your browser\n";
echo "2. Check the room availability dashboard\n";
echo "3. Room 105 should now show as 'available'\n";
?>
