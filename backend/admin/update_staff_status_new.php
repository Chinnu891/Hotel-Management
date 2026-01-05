<?php
require_once '../config/cors.php';
// Simple staff status update endpoint - completely rewritten
header('Content-Type: application/json');
// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get the JSON data from the request
    $input = file_get_contents('php://input');
    $data = json_decode($input);
    
    // Validate required fields
    if (!$data || !isset($data->staff_id) || !isset($data->is_active)) {
        http_response_code(400);
        echo json_encode(['error' => 'Staff ID and status are required']);
        exit();
    }
    
    // Database connection
    $host = 'localhost';
    $dbname = 'hotel_management';
    $username = 'root';
    $password = '';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check if staff member exists
    $stmt = $pdo->prepare("SELECT id, username, role FROM users WHERE id = ?");
    $stmt->execute([$data->staff_id]);
    
    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'Staff member not found']);
        exit();
    }
    
    $staff_member = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Prevent deactivating admin users
    if ($staff_member['role'] === 'admin' && $data->is_active == 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Cannot deactivate admin users']);
        exit();
    }
    
    // Update staff member status
    $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ?");
    $result = $stmt->execute([$data->is_active ? 1 : 0, $data->staff_id]);
    
    if ($result) {
        $status_text = $data->is_active ? 'activated' : 'deactivated';
        echo json_encode([
            'success' => true,
            'message' => "Staff member {$status_text} successfully"
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update staff status']);
    }
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
