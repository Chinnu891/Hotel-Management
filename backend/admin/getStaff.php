<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/jwt_helper.php';

// Ensure proper headers
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
    // Add debug logging
    error_log("getStaff.php: Starting execution");
    
    // Require admin role
    error_log("getStaff.php: Checking admin role");
    $current_user = JWTHelper::requireRole('admin');
    error_log("getStaff.php: Admin role verified, user_id: " . $current_user['user_id']);
    
    $database = new Database();
    $db = $database->getConnection();
    error_log("getStaff.php: Database connection established");
    
    // Get all staff members (excluding the current admin user)
    $query = "SELECT id, username, role, full_name, email, phone, created_at, last_login, is_active 
              FROM users 
              WHERE id != :current_user_id 
              ORDER BY created_at DESC";
    
    error_log("getStaff.php: Executing query: " . $query);
    $stmt = $db->prepare($query);
    $stmt->bindParam(":current_user_id", $current_user['user_id']);
    $stmt->execute();
    
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log("getStaff.php: Query executed, found " . count($staff) . " staff members");
    
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
    
    error_log("getStaff.php: Data formatted, sending response");
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "staff" => $formatted_staff
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in getStaff.php: " . $e->getMessage());
    error_log("Database error trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    error_log("General error in getStaff.php: " . $e->getMessage());
    error_log("General error trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
