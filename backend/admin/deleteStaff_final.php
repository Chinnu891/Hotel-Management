<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/simple_jwt_helper.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow DELETE requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Require authentication
    $current_user = SimpleJWTHelper::requireAuth();
    
    // Get the staff ID from URL parameter
    $staff_id = $_GET['id'] ?? null;
    
    // Debug: Log the received data
    error_log("Delete staff input - ID: " . $staff_id);
    
    // Validate required fields
    if (!$staff_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Staff ID is required']);
        exit();
    }
    
    // Database connection using Hostinger credentials
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Check if user exists and get their details
    $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
    $stmt->execute([$staff_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Prevent deleting own account
    if ($staff_id == $current_user['user_id']) {
        http_response_code(400);
        echo json_encode(['error' => 'Cannot delete your own account']);
        exit();
    }
    
    // Check for foreign key constraints and handle them
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
    
    // Delete the user
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
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete staff member']);
    }
    
} catch (PDOException $e) {
    error_log("Database error in deleteStaff.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error in deleteStaff.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
