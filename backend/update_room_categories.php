<?php
require_once 'config/cors.php';

// Set Content-Type header only if not already set
if (!defined('CONTENT_TYPE_HEADER_SENT')) {
    define('CONTENT_TYPE_HEADER_SENT', true);
    header('Content-Type: application/json');
}

try {
    require_once 'config/database.php';
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    echo "Updating room categories to Deluxe, Executive, and Suite...\n";
    
    // Clear existing room types
    $db->exec("DELETE FROM room_types");
    echo "Cleared existing room types\n";
    
    // Insert new room categories
    $insert_types = "
    INSERT INTO room_types (name, description, base_price, capacity, amenities) VALUES 
    ('Deluxe', 'Spacious deluxe room with premium amenities and city view', 200.00, 2, 'WiFi, TV, AC, Private Bathroom, Mini Fridge, City View, Room Service'),
    ('Executive', 'Executive room with business amenities and work desk', 250.00, 2, 'WiFi, TV, AC, Private Bathroom, Mini Fridge, Work Desk, Coffee Maker, Business Lounge Access'),
    ('Suite', 'Luxury suite with separate living area and premium amenities', 400.00, 4, 'WiFi, TV, AC, Private Bathroom, Mini Fridge, Living Room, Balcony, Room Service, Butler Service')
    ";
    
    $db->exec($insert_types);
    echo "New room categories inserted successfully\n";
    
    // Show updated room types
    $stmt = $db->query("SELECT id, name, description, base_price, capacity, amenities FROM room_types ORDER BY base_price");
    $room_types = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nUpdated room categories:\n";
    foreach ($room_types as $type) {
        echo "- ID: {$type['id']}, Name: {$type['name']}, Price: \${$type['base_price']}, Capacity: {$type['capacity']}\n";
        echo "  Description: {$type['description']}\n";
        echo "  Amenities: {$type['amenities']}\n\n";
    }
    
    // Clear existing rooms to avoid conflicts
    $db->exec("DELETE FROM rooms");
    echo "Cleared existing rooms\n";
    
    // Add sample rooms for each category
    $sample_rooms = [
        ['room_number' => '101', 'room_type_id' => 1, 'floor' => 1], // Deluxe
        ['room_number' => '102', 'room_type_id' => 1, 'floor' => 1], // Deluxe
        ['room_number' => '201', 'room_type_id' => 2, 'floor' => 2], // Executive
        ['room_number' => '202', 'room_type_id' => 2, 'floor' => 2], // Executive
        ['room_number' => '301', 'room_type_id' => 3, 'floor' => 3], // Suite
        ['room_number' => '302', 'room_type_id' => 3, 'floor' => 3], // Suite
    ];
    
    foreach ($sample_rooms as $room) {
        $query = "INSERT INTO rooms (room_number, room_type_id, floor, status) VALUES (:room_number, :room_type_id, :floor, 'available')";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":room_number", $room['room_number']);
        $stmt->bindParam(":room_type_id", $room['room_type_id']);
        $stmt->bindParam(":floor", $room['floor']);
        $stmt->execute();
    }
    
    echo "Sample rooms added for each category\n";
    
    // Show current room status
    $stmt = $db->query("
        SELECT r.room_number, r.floor, r.status, rt.name as category, rt.base_price
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        ORDER BY r.room_number
    ");
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nCurrent rooms:\n";
    foreach ($rooms as $room) {
        echo "- Room {$room['room_number']} (Floor {$room['floor']}): {$room['category']} - \${$room['base_price']} - {$room['status']}\n";
    }
    
    echo "\nRoom categories updated successfully!\n";
    echo "You can now manage rooms in these categories:\n";
    echo "1. Deluxe - Starting at \$200\n";
    echo "2. Executive - Starting at \$250\n";
    echo "3. Suite - Starting at \$400\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
