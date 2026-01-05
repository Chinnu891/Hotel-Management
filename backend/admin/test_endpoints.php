<?php
// Test script to check staff management endpoints
// Remove this file in production

echo "<h1>Testing Staff Management Endpoints</h1>";

try {
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    echo "✅ Database connection successful<br><br>";
    
    // Test 1: Check if users table exists and has data
    echo "<h3>1. Checking Users Table</h3>";
    $check_users = "SHOW TABLES LIKE 'users'";
    $stmt = $db->prepare($check_users);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        echo "✅ users table exists<br>";
        
        // Count users
        $count_users = "SELECT COUNT(*) as count FROM users";
        $stmt = $db->prepare($count_users);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "✅ users table has " . $result['count'] . " records<br>";
        
        // Show sample users
        $sample_users = "SELECT id, username, role, full_name, email, phone FROM users LIMIT 3";
        $stmt = $db->prepare($sample_users);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h4>Sample Users:</h4>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Username</th><th>Role</th><th>Full Name</th><th>Email</th><th>Phone</th></tr>";
        
        foreach ($users as $user) {
            echo "<tr>";
            echo "<td>" . $user['id'] . "</td>";
            echo "<td>" . $user['username'] . "</td>";
            echo "<td>" . $user['role'] . "</td>";
            echo "<td>" . $user['full_name'] . "</td>";
            echo "<td>" . $user['email'] . "</td>";
            echo "<td>" . $user['phone'] . "</td>";
            echo "</tr>";
        }
        echo "</table><br>";
        
    } else {
        echo "❌ users table does NOT exist<br>";
    }
    
    // Test 2: Check if activity_logs table exists
    echo "<h3>2. Checking Activity Logs Table</h3>";
    $check_logs = "SHOW TABLES LIKE 'activity_logs'";
    $stmt = $db->prepare($check_logs);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        echo "✅ activity_logs table exists<br>";
        
        // Count logs
        $count_logs = "SELECT COUNT(*) as count FROM activity_logs";
        $stmt = $db->prepare($count_logs);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "✅ activity_logs table has " . $result['count'] . " records<br>";
        
    } else {
        echo "❌ activity_logs table does NOT exist<br>";
    }
    
    // Test 3: Check if JWT helper can be loaded
    echo "<h3>3. Checking JWT Helper</h3>";
    try {
        require_once '../utils/jwt_helper.php';
        echo "✅ JWT helper loaded successfully<br>";
        
        // Check if class exists
        if (class_exists('JWTHelper')) {
            echo "✅ JWTHelper class exists<br>";
        } else {
            echo "❌ JWTHelper class does NOT exist<br>";
        }
        
    } catch (Exception $e) {
        echo "❌ Failed to load JWT helper: " . $e->getMessage() . "<br>";
    }
    
    // Test 4: Check if CORS config can be loaded
    echo "<h3>4. Checking CORS Config</h3>";
    try {
        require_once '../config/cors.php';
        echo "✅ CORS config loaded successfully<br>";
    } catch (Exception $e) {
        echo "❌ Failed to load CORS config: " . $e->getMessage() . "<br>";
    }
    
    echo "<br><h3>Summary:</h3>";
    echo "If all tests show ✅, the endpoints should work.<br>";
    echo "If any show ❌, that's the problem.<br>";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
