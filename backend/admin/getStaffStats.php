<?php
require_once '../config/cors.php';
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
    // Require admin role
    $current_user = JWTHelper::requireRole('admin');
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Get staff statistics
    $stats = [];
    
    // Total staff count (excluding admin)
    $total_query = "SELECT COUNT(*) as count FROM users WHERE role != 'admin'";
    $total_stmt = $db->prepare($total_query);
    $total_stmt->execute();
    $stats['total_staff'] = $total_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Active staff count
    $active_query = "SELECT COUNT(*) as count FROM users WHERE role != 'admin' AND is_active = 1";
    $active_stmt = $db->prepare($active_query);
    $active_stmt->execute();
    $stats['active_staff'] = $active_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Inactive staff count
    $inactive_query = "SELECT COUNT(*) as count FROM users WHERE role != 'admin' AND is_active = 0";
    $inactive_stmt = $db->prepare($inactive_query);
    $inactive_stmt->execute();
    $stats['inactive_staff'] = $inactive_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Staff by role
    $role_query = "SELECT role, COUNT(*) as count FROM users WHERE role != 'admin' GROUP BY role";
    $role_stmt = $db->prepare($role_query);
    $role_stmt->execute();
    $stats['staff_by_role'] = $role_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Recent staff activity (last 7 days)
    $recent_query = "SELECT COUNT(*) as count FROM users WHERE role != 'admin' AND last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
    $recent_stmt = $db->prepare($recent_query);
    $recent_stmt->execute();
    $stats['recent_activity'] = $recent_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Staff created this month
    $monthly_query = "SELECT COUNT(*) as count FROM users WHERE role != 'admin' AND MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())";
    $monthly_stmt = $db->prepare($monthly_query);
    $monthly_stmt->execute();
    $stats['created_this_month'] = $monthly_stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    // Top performing staff (by bookings created)
    $top_staff_query = "SELECT u.username, u.full_name, COUNT(b.id) as booking_count 
                        FROM users u 
                        LEFT JOIN bookings b ON u.id = b.created_by 
                        WHERE u.role != 'admin' 
                        GROUP BY u.id 
                        ORDER BY booking_count DESC 
                        LIMIT 5";
    $top_staff_stmt = $db->prepare($top_staff_query);
    $top_staff_stmt->execute();
    $stats['top_performing_staff'] = $top_staff_stmt->fetchAll(PDO::FETCH_ASSOC);
    
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "stats" => $stats
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in getStaffStats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    error_log("General error in getStaffStats.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
