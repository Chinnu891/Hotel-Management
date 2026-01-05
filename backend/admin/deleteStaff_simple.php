<?php
require_once '../config/cors.php';
require_once '../config/database.php';

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
    // Get the staff ID from URL parameter
    $staff_id = $_GET['id'] ?? null;
    
    // Debug: Log the received data
    error_log("Delete staff simple input - ID: " . $staff_id);
    
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
    error_log("Database error in deleteStaff_simple.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
} catch (Exception $e) {
    error_log("General error in deleteStaff_simple.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred: ' . $e->getMessage()]);
}
?>
