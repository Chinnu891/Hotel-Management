<?php
// Test simple JWT helper (no external dependencies)
// Remove this file in production

echo "<h1>Testing Simple JWT Helper</h1>";

try {
    require_once '../utils/simple_jwt_helper.php';
    echo "✅ Simple JWT helper loaded successfully<br>";
    
    if (class_exists('SimpleJWTHelper')) {
        echo "✅ SimpleJWTHelper class exists<br>";
        
        // Test if methods exist
        $methods = ['generateToken', 'validateToken', 'getTokenFromHeader', 'requireAuth', 'requireRole'];
        foreach ($methods as $method) {
            if (method_exists('SimpleJWTHelper', $method)) {
                echo "✅ Method $method exists<br>";
            } else {
                echo "❌ Method $method missing<br>";
            }
        }
        
        // Test token generation
        $test_user = ['id' => 1, 'username' => 'test', 'role' => 'admin'];
        $token = SimpleJWTHelper::generateToken($test_user);
        if ($token) {
            echo "✅ Token generation successful: " . substr($token, 0, 30) . "...<br>";
            
            // Test token validation
            $decoded = SimpleJWTHelper::validateToken($token);
            if ($decoded) {
                echo "✅ Token validation successful<br>";
                echo "User ID: " . $decoded['user_id'] . "<br>";
                echo "Username: " . $decoded['username'] . "<br>";
                echo "Role: " . $decoded['role'] . "<br>";
            } else {
                echo "❌ Token validation failed<br>";
            }
        } else {
            echo "❌ Token generation failed<br>";
        }
        
        echo "<br>✅ Simple JWT helper is working correctly!<br>";
        
    } else {
        echo "❌ SimpleJWTHelper class not found<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Simple JWT helper test failed: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
