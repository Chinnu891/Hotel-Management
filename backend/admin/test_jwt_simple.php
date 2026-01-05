<?php
// Simple JWT test
// Remove this file in production

echo "<h1>Testing JWT Helper</h1>";

try {
    // Test 1: Load JWT helper
    echo "<h3>1. Loading JWT Helper</h3>";
            require_once '../utils/jwt_helper.php';
    echo "✅ JWT helper loaded successfully<br>";
    
    // Test 2: Check if class exists
    echo "<h3>2. Checking JWTHelper Class</h3>";
    if (class_exists('JWTHelper')) {
        echo "✅ JWTHelper class exists<br>";
    } else {
        echo "❌ JWTHelper class does NOT exist<br>";
        exit();
    }
    
    // Test 3: Check if methods exist
    echo "<h3>3. Checking JWTHelper Methods</h3>";
    $methods = ['generateToken', 'validateToken', 'getTokenFromHeader', 'requireAuth', 'requireRole'];
    
    foreach ($methods as $method) {
        if (method_exists('JWTHelper', $method)) {
            echo "✅ Method '$method' exists<br>";
        } else {
            echo "❌ Method '$method' does NOT exist<br>";
        }
    }
    
    // Test 4: Try to generate a token
    echo "<h3>4. Testing Token Generation</h3>";
    try {
        $test_data = [
            'user_id' => 1,
            'username' => 'testuser',
            'role' => 'admin'
        ];
        
        $token = JWTHelper::generateToken($test_data);
        echo "✅ Token generated successfully<br>";
        echo "✅ Token: " . substr($token, 0, 50) . "...<br>";
        
        // Test 5: Try to validate the token
        echo "<h3>5. Testing Token Validation</h3>";
        try {
            $decoded = JWTHelper::validateToken($token);
            echo "✅ Token validated successfully<br>";
            echo "✅ Decoded data: " . json_encode($decoded) . "<br>";
            
        } catch (Exception $e) {
            echo "❌ Token validation failed: " . $e->getMessage() . "<br>";
        }
        
    } catch (Exception $e) {
        echo "❌ Token generation failed: " . $e->getMessage() . "<br>";
    }
    
    echo "<br><h3>Summary:</h3>";
    echo "If all tests show ✅, JWT helper is working correctly.<br>";
    echo "If any show ❌, that's the JWT problem.<br>";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
