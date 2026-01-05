<?php
// Ultra-simple password change endpoint
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set content type immediately
header('Content-Type: application/json');

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Only POST method allowed']);
    exit();
}

try {
    // Basic database connection without using the Database class
    $host = 'localhost';
    $dbname = 'hotel_management';
    $username = 'root';
    $password = '';
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get Authorization header
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        echo json_encode(['error' => 'No valid token provided']);
        exit();
    }
    
    $token = $matches[1];
    
    // Simple JWT decode (just for testing - not production secure)
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        echo json_encode(['error' => 'Invalid token format']);
        exit();
    }
    
    $payload = json_decode(base64_decode($parts[1]), true);
    if (!$payload || !isset($payload['user_id'])) {
        echo json_encode(['error' => 'Invalid token payload']);
        exit();
    }
    
    $user_id = $payload['user_id'];
    
    // Get input data
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (!$data || !isset($data['new_password'])) {
        echo json_encode(['error' => 'New password is required']);
        exit();
    }
    
    $new_password = trim($data['new_password']);
    
    if (strlen($new_password) < 6) {
        echo json_encode(['error' => 'Password must be at least 6 characters long']);
        exit();
    }
    
    // Hash password
    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Update password
    $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $result = $stmt->execute([$hashed_password, $user_id]);
    
    if ($result) {
        echo json_encode([
            'success' => true,
            'message' => 'Password changed successfully'
        ]);
    } else {
        echo json_encode(['error' => 'Failed to update password']);
    }
    
} catch (PDOException $e) {
    echo json_encode([
        'error' => 'Database error',
        'details' => $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'error' => 'Server error',
        'details' => $e->getMessage()
    ]);
}
?>
