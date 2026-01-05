<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Set Content-Type header
header('Content-Type: application/json');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

// Require authentication
$current_user = SimpleJWTHelper::requireAuth();

$database = new Database();
$db = $database->getConnection();

try {
    // Get rooms organized by category
    $query = "
        SELECT 
            rt.id as type_id,
            rt.name as category,
            rt.description,
            rt.base_price,
            rt.capacity,
            rt.amenities,
            COUNT(r.id) as total_rooms,
            SUM(CASE WHEN r.status = 'available' THEN 1 ELSE 0 END) as available_rooms,
            SUM(CASE WHEN r.status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms,
            SUM(CASE WHEN r.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_rooms,
            SUM(CASE WHEN r.status = 'cleaning' THEN 1 ELSE 0 END) as cleaning_rooms
        FROM room_types rt
        LEFT JOIN rooms r ON rt.id = r.room_type_id
        GROUP BY rt.id, rt.name, rt.description, rt.base_price, rt.capacity, rt.amenities
        ORDER BY rt.base_price
    ";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $categories = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $categories[] = array(
            "type_id" => $row['type_id'],
            "category" => $row['category'],
            "description" => $row['description'],
            "base_price" => floatval($row['base_price']),
            "capacity" => intval($row['capacity']),
            "amenities" => $row['amenities'],
            "total_rooms" => intval($row['total_rooms']),
            "available_rooms" => intval($row['available_rooms']),
            "occupied_rooms" => intval($row['occupied_rooms']),
            "maintenance_rooms" => intval($row['maintenance_rooms']),
            "cleaning_rooms" => intval($row['cleaning_rooms']),
            "availability_percentage" => $row['total_rooms'] > 0 ? round(($row['available_rooms'] / $row['total_rooms']) * 100, 1) : 0
        );
    }
    
    // Get detailed room list for each category
    $detailed_query = "
        SELECT 
            r.id,
            r.room_number,
            r.floor,
            r.status,
            r.created_at,
            rt.id as type_id,
            rt.name as category,
            rt.base_price
        FROM rooms r
        JOIN room_types rt ON r.room_type_id = rt.id
        ORDER BY rt.base_price, r.room_number
    ";
    
    $stmt = $db->prepare($detailed_query);
    $stmt->execute();
    
    $rooms = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $rooms[] = array(
            "id" => $row['id'],
            "room_number" => $row['room_number'],
            "floor" => intval($row['floor']),
            "status" => $row['status'],
            "category" => $row['category'],
            "base_price" => floatval($row['base_price']),
            "created_at" => $row['created_at']
        );
    }
    
    // Calculate overall statistics
    $total_rooms = array_sum(array_column($categories, 'total_rooms'));
    $total_available = array_sum(array_column($categories, 'available_rooms'));
    $total_occupied = array_sum(array_column($categories, 'occupied_rooms'));
    $overall_availability = $total_rooms > 0 ? round(($total_available / $total_rooms) * 100, 1) : 0;
    
    echo json_encode(array(
        "success" => true,
        "summary" => array(
            "total_rooms" => $total_rooms,
            "total_available" => $total_available,
            "total_occupied" => $total_occupied,
            "overall_availability_percentage" => $overall_availability
        ),
        "categories" => $categories,
        "rooms" => $rooms,
        "timestamp" => date('Y-m-d H:i:s')
    ));
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
