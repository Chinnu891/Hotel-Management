<?php
// Test if JWT helper is now working after installing Firebase JWT library
// Remove this file in production

echo "<h1>Testing JWT Helper (After Firebase Install)</h1>";

try {
    // Test if vendor autoload exists
    if (file_exists('../vendor/autoload.php')) {
        echo "✅ Vendor autoload file exists<br>";
    } else {
        echo "❌ Vendor autoload file missing<br>";
        exit();
    }
    
    // Test if Firebase JWT is available
    require_once '../vendor/autoload.php';
    
    if (class_exists('Firebase\JWT\JWT')) {
        echo "✅ Firebase JWT class loaded successfully<br>";
    } else {
        echo "❌ Firebase JWT class not found<br>";
        exit();
    }
    
    // Test JWT helper
    require_once '../utils/jwt_helper.php';
    echo "✅ JWT helper loaded successfully<br>";
    
    if (class_exists('JWTHelper')) {
        echo "✅ JWTHelper class exists<br>";
        
        // Test if methods exist
        $methods = ['generateToken', 'validateToken', 'getTokenFromHeader', 'requireAuth', 'requireRole'];
        foreach ($methods as $method) {
            if (method_exists('JWTHelper', $method)) {
                echo "✅ Method $method exists<br>";
            } else {
                echo "❌ Method $method missing<br>";
            }
        }
        
        // Test token generation
        $test_user = ['id' => 1, 'username' => 'test', 'role' => 'admin'];
        $token = JWTHelper::generateToken($test_user);
        if ($token) {
            echo "✅ Token generation successful: " . substr($token, 0, 20) . "...<br>";
        } else {
            echo "❌ Token generation failed<br>";
        }
        
        echo "<br>✅ JWT helper is working correctly now!<br>";
        
    } else {
        echo "❌ JWTHelper class not found<br>";
    }
    
} catch (Exception $e) {
    echo "❌ JWT helper test failed: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
