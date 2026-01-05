<?php
require_once '../config/database.php';
header('Content-Type: application/json');

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Allow both GET and DELETE methods for testing
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use GET or DELETE']);
    exit();
}

$staff_id = $_GET['id'] ?? null;

if (!$staff_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Staff ID is required']);
    exit();
}

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
    $stmt->execute([$staff_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Check for foreign key constraints
    $constraint_checks = [];
    
    // Check activity_logs table
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ?");
    $stmt->execute([$staff_id]);
    $activity_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    if ($activity_count > 0) {
        $constraint_checks[] = "activity_logs: {$activity_count} records";
    }
    
    // Check bookings table (if exists)
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM bookings WHERE created_by = ?");
        $stmt->execute([$staff_id]);
        $bookings_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        if ($bookings_count > 0) {
            $constraint_checks[] = "bookings: {$bookings_count} records";
        }
    } catch (Exception $e) {
        // bookings table might not exist, ignore
    }
    
    // Check maintenance table (if exists)
    try {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM maintenance WHERE assigned_to = ?");
        $stmt->execute([$staff_id]);
        $maintenance_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
        if ($maintenance_count > 0) {
            $constraint_checks[] = "maintenance: {$maintenance_count} records";
        }
    } catch (Exception $e) {
        // maintenance table might not exist, ignore
    }
    
    // If there are constraints, delete related records first
    if (!empty($constraint_checks)) {
        // Delete from activity_logs first
        try {
            $stmt = $pdo->prepare("DELETE FROM activity_logs WHERE user_id = ?");
            $stmt->execute([$staff_id]);
        } catch (Exception $e) {
            // Ignore if table doesn't exist
        }
        
        // Delete from bookings
        try {
            $stmt = $pdo->prepare("DELETE FROM bookings WHERE created_by = ?");
            $stmt->execute([$staff_id]);
        } catch (Exception $e) {
            // Ignore if table doesn't exist
        }
        
        // Delete from maintenance
        try {
            $stmt = $pdo->prepare("DELETE FROM maintenance WHERE assigned_to = ?");
            $stmt->execute([$staff_id]);
        } catch (Exception $e) {
            // Ignore if table doesn't exist
        }
    }
    
    // Now delete the user
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $result = $stmt->execute([$staff_id]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Staff member deleted successfully',
            'deleted_user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role']
            ],
            'method_used' => $_SERVER['REQUEST_METHOD'],
            'constraints_handled' => $constraint_checks
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete staff member']);
    }
    
} catch (Exception $e) {
    error_log("Error in deleteStaff_safe.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
