<?php
// Test getStaff endpoint without authentication
// This is for debugging only - remove in production

echo "<h1>Testing getStaff Endpoint</h1>";

// Test database connection first
try {
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    echo "✅ Database connection successful<br>";
    
    // Test the query that getStaff.php uses
    $query = "SELECT id, username, role, full_name, email, phone, created_at, last_login, is_active FROM users ORDER BY created_at DESC";
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "✅ Query executed successfully<br>";
    echo "✅ Found " . count($staff) . " users<br>";
    
    if (count($staff) > 0) {
        echo "<h3>Sample Users:</h3>";
        foreach (array_slice($staff, 0, 3) as $user) {
            echo "- " . $user['username'] . " (" . $user['role'] . ") - " . $user['full_name'] . "<br>";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
