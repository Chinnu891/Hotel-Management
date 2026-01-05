<?php
/**
 * Room Types Management API for Admin
 * 
 * This API allows admins to:
 * - View all room types
 * - Add new room types
 * - Edit existing room types including custom prices
 * - Delete room types
 */

require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Set Content-Type header
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Require admin role
    $current_user = SimpleJWTHelper::requireRole('admin');
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            handleGetRoomTypes($db);
            break;
        case 'POST':
            handleCreateRoomType($db);
            break;
        case 'PUT':
            handleUpdateRoomType($db);
            break;
        case 'DELETE':
            handleDeleteRoomType($db);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
            break;
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}

/**
 * Get all room types
 */
function handleGetRoomTypes($db) {
    try {
        $query = "SELECT 
                    id, 
                    name, 
                    description, 
                    base_price, 
                    custom_price,
                    capacity, 
                    amenities,
                    created_at
                  FROM room_types 
                  ORDER BY name ASC";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $room_types = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Process each room type to add calculated fields
        foreach ($room_types as &$room_type) {
            $room_type['final_price'] = $room_type['custom_price'] ?: $room_type['base_price'];
            $room_type['has_custom_price'] = !is_null($room_type['custom_price']);
            $room_type['price_difference'] = $room_type['custom_price'] ? $room_type['custom_price'] - $room_type['base_price'] : 0;
        }
        
        echo json_encode([
            'success' => true,
            'data' => $room_types,
            'message' => 'Room types retrieved successfully'
        ]);
        
    } catch (Exception $e) {
        throw new Exception("Failed to retrieve room types: " . $e->getMessage());
    }
}

/**
 * Create a new room type
 */
function handleCreateRoomType($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        if (!isset($data['name']) || !isset($data['final_price']) || !isset($data['capacity'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name, final price, and capacity are required']);
            return;
        }
        
        $name = trim($data['name']);
        $description = isset($data['description']) ? trim($data['description']) : '';
        $final_price = floatval($data['final_price']);
        $base_price = $final_price; // Set base price equal to final price
        $custom_price = $final_price; // Set custom price equal to final price
        $capacity = intval($data['capacity']);
        $amenities = isset($data['amenities']) ? trim($data['amenities']) : '';
        
        // Validate data
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Room type name cannot be empty']);
            return;
        }
        
        if ($final_price <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Final price must be greater than 0']);
            return;
        }
        
        if ($capacity <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Capacity must be greater than 0']);
            return;
        }
        
        // Check if room type name already exists
        $check_query = "SELECT id FROM room_types WHERE name = :name";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(':name', $name);
        $check_stmt->execute();
        
        if ($check_stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Room type with this name already exists']);
            return;
        }
        
        // Insert new room type
        $query = "INSERT INTO room_types (name, description, base_price, custom_price, capacity, amenities) 
                  VALUES (:name, :description, :base_price, :custom_price, :capacity, :amenities)";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':base_price', $base_price);
        $stmt->bindParam(':custom_price', $custom_price);
        $stmt->bindParam(':capacity', $capacity);
        $stmt->bindParam(':amenities', $amenities);
        
        if ($stmt->execute()) {
            $room_type_id = $db->lastInsertId();
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => $room_type_id,
                    'name' => $name,
                    'description' => $description,
                    'base_price' => $base_price,
                    'custom_price' => $custom_price,
                    'capacity' => $capacity,
                    'amenities' => $amenities,
                    'final_price' => $final_price
                ],
                'message' => 'Room type created successfully'
            ]);
        } else {
            throw new Exception("Failed to create room type");
        }
        
    } catch (Exception $e) {
        throw new Exception("Failed to create room type: " . $e->getMessage());
    }
}

/**
 * Update an existing room type
 */
function handleUpdateRoomType($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Validate required fields
        if (!isset($data['id']) || !isset($data['name']) || !isset($data['final_price']) || !isset($data['capacity'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID, name, final price, and capacity are required']);
            return;
        }
        
        $id = intval($data['id']);
        $name = trim($data['name']);
        $description = isset($data['description']) ? trim($data['description']) : '';
        $final_price = floatval($data['final_price']);
        $base_price = $final_price; // Set base price equal to final price
        $custom_price = $final_price; // Set custom price equal to final price
        $capacity = intval($data['capacity']);
        $amenities = isset($data['amenities']) ? trim($data['amenities']) : '';
        
        // Validate data
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid room type ID']);
            return;
        }
        
        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Room type name cannot be empty']);
            return;
        }
        
        if ($final_price <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Final price must be greater than 0']);
            return;
        }
        
        if ($capacity <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Capacity must be greater than 0']);
            return;
        }
        
        // Check if room type exists
        $check_query = "SELECT id FROM room_types WHERE id = :id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(':id', $id);
        $check_stmt->execute();
        
        if (!$check_stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Room type not found']);
            return;
        }
        
        // Check if room type name already exists for different ID
        $check_query = "SELECT id FROM room_types WHERE name = :name AND id != :id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(':name', $name);
        $check_stmt->bindParam(':id', $id);
        $check_stmt->execute();
        
        if ($check_stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Room type with this name already exists']);
            return;
        }
        
        // Update room type
        $query = "UPDATE room_types 
                  SET name = :name, description = :description, base_price = :base_price, 
                      custom_price = :custom_price, capacity = :capacity, amenities = :amenities
                  WHERE id = :id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $id);
        $stmt->bindParam(':name', $name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':base_price', $base_price);
        $stmt->bindParam(':custom_price', $custom_price);
        $stmt->bindParam(':capacity', $capacity);
        $stmt->bindParam(':amenities', $amenities);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'data' => [
                    'id' => $id,
                    'name' => $name,
                    'description' => $description,
                    'base_price' => $base_price,
                    'custom_price' => $custom_price,
                    'capacity' => $capacity,
                    'amenities' => $amenities,
                    'final_price' => $final_price
                ],
                'message' => 'Room type updated successfully'
            ]);
        } else {
            throw new Exception("Failed to update room type");
        }
        
    } catch (Exception $e) {
        throw new Exception("Failed to update room type: " . $e->getMessage());
    }
}

/**
 * Delete a room type
 */
function handleDeleteRoomType($db) {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Room type ID is required']);
            return;
        }
        
        $id = intval($data['id']);
        
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid room type ID']);
            return;
        }
        
        // Check if room type exists
        $check_query = "SELECT id FROM room_types WHERE id = :id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(':id', $id);
        $check_stmt->execute();
        
        if (!$check_stmt->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Room type not found']);
            return;
        }
        
        // Check if any rooms are using this room type
        $check_rooms_query = "SELECT COUNT(*) as count FROM rooms WHERE room_type_id = :id";
        $check_rooms_stmt = $db->prepare($check_rooms_query);
        $check_rooms_stmt->bindParam(':id', $id);
        $check_rooms_stmt->execute();
        $room_count = $check_rooms_stmt->fetch(PDO::FETCH_ASSOC)['count'];
        
        if ($room_count > 0) {
            http_response_code(400);
            echo json_encode([
                'success' => false, 
                'message' => "Cannot delete room type. It is being used by {$room_count} room(s). Please remove or reassign the rooms first."
            ]);
            return;
        }
        
        // Delete room type
        $query = "DELETE FROM room_types WHERE id = :id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(':id', $id);
        
        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Room type deleted successfully'
            ]);
        } else {
            throw new Exception("Failed to delete room type");
        }
        
    } catch (Exception $e) {
        throw new Exception("Failed to delete room type: " . $e->getMessage());
    }
}
?>
