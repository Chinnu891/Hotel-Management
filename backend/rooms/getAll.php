<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    // Check if tables exist first
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Check if room_types table exists
    $check_table = $db->query("SHOW TABLES LIKE 'room_types'");
    if ($check_table->rowCount() == 0) {
        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => false,
            "error" => "Room types table does not exist",
            "message" => "Please run check_room_tables.php first to set up the database",
            "setup_required" => true
        ));
        exit();
    }
    
    // Check if rooms table exists
    $check_rooms = $db->query("SHOW TABLES LIKE 'rooms'");
    if ($check_rooms->rowCount() == 0) {
        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => false,
            "error" => "Rooms table does not exist",
            "message" => "Please run check_room_tables.php first to set up the database",
            "setup_required" => true
        ));
        exit();
    }
    
    // Check if there are any room types
    $type_check = $db->query("SELECT COUNT(*) FROM room_types");
    $type_count = $type_check->fetchColumn();
    
    if ($type_count == 0) {
        header('Content-Type: application/json');
        echo json_encode(array(
            "success" => false,
            "error" => "No room types defined",
            "message" => "Please run update_room_categories.php to set up room categories",
            "setup_required" => true
        ));
        exit();
    }
    
    // Get the actual columns in room_types table to avoid errors
    $columns_query = "SHOW COLUMNS FROM room_types";
    $columns_stmt = $db->query($columns_query);
    $available_columns = [];
    while ($col = $columns_stmt->fetch(PDO::FETCH_ASSOC)) {
        $available_columns[] = $col['Field'];
    }
    
    // Build query based on available columns
    $select_fields = ["r.room_number", "r.status", "r.floor", "r.price", "r.created_at", "r.room_type_id", "rt.name as room_type"];
    
    if (in_array('description', $available_columns)) {
        $select_fields[] = "rt.description";
    }
    if (in_array('base_price', $available_columns)) {
        $select_fields[] = "rt.base_price";
    }
    if (in_array('capacity', $available_columns)) {
        $select_fields[] = "rt.capacity";
    }
    if (in_array('amenities', $available_columns)) {
        $select_fields[] = "rt.amenities";
    }
    
    $query = "SELECT " . implode(", ", $select_fields) . "
              FROM rooms r
              JOIN room_types rt ON r.room_type_id = rt.id
              ORDER BY r.room_number";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $rooms = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $room_data = array(
            "id" => $row['room_number'], // Use room_number as id since it's our primary key
            "room_number" => $row['room_number'],
            "status" => $row['status'],
            "floor" => intval($row['floor']),
            "price" => floatval($row['price']), // Include the custom room price
            "room_type_id" => intval($row['room_type_id']), // Include the room type ID
            "room_type" => $row['room_type'],
            "created_at" => $row['created_at']
        );
        
        // Add optional fields if they exist
        if (isset($row['description'])) {
            $room_data['description'] = $row['description'];
        }
        if (isset($row['base_price'])) {
            $room_data['base_price'] = floatval($row['base_price']);
        }
        if (isset($row['capacity'])) {
            $room_data['capacity'] = intval($row['capacity']);
        }
        if (isset($row['amenities'])) {
            $room_data['amenities'] = $row['amenities'];
        }
        
        $rooms[] = $room_data;
    }
    
    header('Content-Type: application/json');
    echo json_encode(array(
        "success" => true,
        "rooms" => $rooms,
        "total" => count($rooms),
        "message" => "Rooms fetched successfully",
        "available_columns" => $available_columns
    ));
    
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(array(
        "success" => false,
        "error" => "Database error: " . $e->getMessage(),
        "message" => "There was an issue with the database query"
    ));
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(array(
        "success" => false,
        "error" => "Server error: " . $e->getMessage(),
        "message" => "An unexpected error occurred"
    ));
}
?>
