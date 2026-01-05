<?php
require_once '../config/cors.php';
// Test getStaff functionality without JWT authentication (FOR TESTING ONLY)
// REMOVE THIS FILE IN PRODUCTION

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed"));
    exit();
}

try {
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    
    echo "✅ Database connection successful<br>";
    
    // Get all staff members (excluding admin users for testing)
    $query = "SELECT id, username, role, full_name, email, phone, created_at, last_login, is_active 
              FROM users 
              WHERE role != 'admin'
              ORDER BY created_at DESC";
    
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "✅ Query executed, found " . count($staff) . " staff members<br>";
    
    // Format the data for frontend
    $formatted_staff = array_map(function($member) {
        return [
            'id' => $member['id'],
            'username' => $member['username'],
            'role' => $member['role'],
            'full_name' => $member['full_name'],
            'email' => $member['email'],
            'phone' => $member['phone'],
            'created_at' => $member['created_at'],
            'last_login' => $member['last_login'],
            'is_active' => (bool)$member['is_active']
        ];
    }, $staff);
    
    echo "✅ Data formatted successfully<br>";
    
    // Return JSON response
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "staff" => $formatted_staff,
        "count" => count($formatted_staff)
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in test_getStaff_no_auth.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    error_log("General error in test_getStaff_no_auth.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
