<?php
echo "Simple test starting...\n";

// Test 1: Check if we can include the JWT helper
try {
    require_once __DIR__ . '/../utils/jwt_helper.php';
    echo "✓ JWT helper included successfully\n";
} catch (Exception $e) {
    echo "✗ Failed to include JWT helper: " . $e->getMessage() . "\n";
}

// Test 2: Check if JWTHelper class exists
if (class_exists('JWTHelper')) {
    echo "✓ JWTHelper class exists\n";
} else {
    echo "✗ JWTHelper class not found\n";
}

// Test 3: Test token generation
try {
    $token = JWTHelper::generateToken(1, 'test_user', 'reception');
    if ($token) {
        echo "✓ Token generated: " . substr($token, 0, 30) . "...\n";
    } else {
        echo "✗ Token generation failed\n";
    }
} catch (Exception $e) {
    echo "✗ Token generation error: " . $e->getMessage() . "\n";
}

echo "Test completed.\n";
?>
