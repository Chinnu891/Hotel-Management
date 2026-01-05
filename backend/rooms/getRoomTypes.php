<?php
// Include CORS headers
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
    // Get all room types
    $query = "SELECT id, name, description, base_price, capacity FROM room_types ORDER BY base_price";
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $room_types = array();
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $room_types[] = array(
            "id" => intval($row['id']),
            "name" => $row['name'],
            "description" => $row['description'],
            "base_price" => floatval($row['base_price']),
            "capacity" => intval($row['capacity'])
        );
    }
    
    echo json_encode(array(
        "success" => true,
        "room_types" => $room_types
    ));
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
