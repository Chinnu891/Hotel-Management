<?php
require_once '../config/cors.php';
require_once '../config/database.php';
header('Content-Type: application/json');

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Simple query to get all users with admin/reception roles
    $query = "SELECT id, username, role, full_name, email, phone, is_active, created_at, last_login FROM users WHERE role IN ('admin', 'reception') ORDER BY created_at DESC";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'staff' => $staff,
        'count' => count($staff)
    ]);
    
} catch (Exception $e) {
    error_log("Error in get_staff_simple.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'message' => $e->getMessage()
    ]);
}
?>
