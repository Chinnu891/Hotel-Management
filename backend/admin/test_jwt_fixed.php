<?php
// Test if JWT helper is now working after the path fix
// Remove this file in production

echo "<h1>Testing JWT Helper (Fixed)</h1>";

try {
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
        
        echo "<br>✅ JWT helper is working correctly now!<br>";
        
    } else {
        echo "❌ JWTHelper class not found<br>";
    }
    
} catch (Exception $e) {
    echo "❌ JWT helper test failed: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
