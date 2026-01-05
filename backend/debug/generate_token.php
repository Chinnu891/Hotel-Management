<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../utils/jwt_helper.php';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $user_id = $input['user_id'] ?? 1;
        $username = $input['username'] ?? 'test_user';
        $role = $input['role'] ?? 'reception';
        
        $token = JWTHelper::generateToken($user_id, $username, $role);
        
        if ($token) {
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user_id' => $user_id,
                'username' => $username,
                'role' => $role
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to generate token'
            ]);
        }
    } else {
        // GET request - generate a default token
        $token = JWTHelper::generateToken(1, 'test_reception', 'reception');
        
        if ($token) {
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user_id' => 1,
                'username' => 'test_reception',
                'role' => 'reception'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to generate token'
            ]);
        }
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
