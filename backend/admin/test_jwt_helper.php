<?php
// Test JWT helper functionality
// Remove this file in production

echo "<h1>JWT Helper Test</h1>";

try {
    require_once '../utils/jwt_helper.php';
    echo "✅ JWT helper loaded successfully<br>";
    
    // Test if the class exists
    if (class_exists('JWTHelper')) {
        echo "✅ JWTHelper class exists<br>";
    } else {
        echo "❌ JWTHelper class not found<br>";
    }
    
    // Test if methods exist
    $methods = ['generateToken', 'validateToken', 'getTokenFromHeader', 'requireAuth', 'requireRole'];
    foreach ($methods as $method) {
        if (method_exists('JWTHelper', $method)) {
            echo "✅ Method $method exists<br>";
        } else {
            echo "❌ Method $method missing<br>";
        }
    }
    
} catch (Exception $e) {
    echo "❌ JWT helper test failed: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
