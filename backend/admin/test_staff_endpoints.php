<?php
// Test file to verify staff management endpoints
// This file should be removed in production

echo "<h1>Staff Management Endpoints Test</h1>";

// Test database connection
echo "<h2>Testing Database Connection</h2>";
try {
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    echo "✅ Database connection successful<br>";
} catch (Exception $e) {
    echo "❌ Database connection failed: " . $e->getMessage() . "<br>";
    exit();
}

// Test JWT helper
echo "<h2>Testing JWT Helper</h2>";
try {
    require_once '../utils/jwt_helper.php';
    echo "✅ JWT helper loaded successfully<br>";
} catch (Exception $e) {
    echo "❌ JWT helper failed: " . $e->getMessage() . "<br>";
}

// Test required files
echo "<h2>Testing Required Files</h2>";
$required_files = [
    '../config/cors.php',
    '../config/database.php',
    '../utils/jwt_helper.php',
    'getStaff.php',
    'updateStaffStatus.php',
    'editStaff.php',
    'deleteStaff.php',
    'changeStaffPassword.php',
    'getStaffStats.php',
    'createReception.php'
];

foreach ($required_files as $file) {
    if (file_exists($file)) {
        echo "✅ $file exists<br>";
    } else {
        echo "❌ $file missing<br>";
    }
}

// Test database tables
echo "<h2>Testing Database Tables</h2>";
$required_tables = ['users', 'activity_logs', 'bookings', 'maintenance'];

foreach ($required_tables as $table) {
    try {
        $stmt = $db->prepare("SHOW TABLES LIKE :table");
        $stmt->bindParam(':table', $table);
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            echo "✅ Table '$table' exists<br>";
        } else {
            echo "❌ Table '$table' missing<br>";
        }
    } catch (Exception $e) {
        echo "❌ Error checking table '$table': " . $e->getMessage() . "<br>";
    }
}

// Test users table structure
echo "<h2>Testing Users Table Structure</h2>";
try {
    $stmt = $db->prepare("DESCRIBE users");
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $required_columns = ['id', 'username', 'password', 'role', 'full_name', 'email', 'phone', 'created_at', 'last_login', 'is_active'];
    
    foreach ($required_columns as $column) {
        $found = false;
        foreach ($columns as $col) {
            if ($col['Field'] === $column) {
                $found = true;
                break;
            }
        }
        if ($found) {
            echo "✅ Column '$column' exists<br>";
        } else {
            echo "❌ Column '$column' missing<br>";
        }
    }
} catch (Exception $e) {
    echo "❌ Error checking users table structure: " . $e->getMessage() . "<br>";
}

// Test sample data
echo "<h2>Testing Sample Data</h2>";
try {
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM users");
    $stmt->execute();
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Users table has " . $result['count'] . " records<br>";
    
    if ($result['count'] > 0) {
        $stmt = $db->prepare("SELECT username, role FROM users LIMIT 3");
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Sample users:<br>";
        foreach ($users as $user) {
            echo "- " . $user['username'] . " (" . $user['role'] . ")<br>";
        }
    }
} catch (Exception $e) {
    echo "❌ Error checking sample data: " . $e->getMessage() . "<br>";
}

echo "<h2>Test Complete</h2>";
echo "If all tests pass, the staff management system should work correctly.";
?>
