<?php
// Check if activity_logs table exists and its structure
// Remove this file in production

echo "<h1>Checking Activity Logs Table</h1>";

try {
    require_once '../config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    echo "✅ Database connection successful<br>";
    
    // Check if table exists
    $check_table = "SHOW TABLES LIKE 'activity_logs'";
    $stmt = $db->prepare($check_table);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        echo "✅ activity_logs table exists<br>";
        
        // Check table structure
        $describe = "DESCRIBE activity_logs";
        $stmt = $db->prepare($describe);
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h3>Table Structure:</h3>";
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
        
        foreach ($columns as $col) {
            echo "<tr>";
            echo "<td>" . $col['Field'] . "</td>";
            echo "<td>" . $col['Type'] . "</td>";
            echo "<td>" . $col['Null'] . "</td>";
            echo "<td>" . $col['Key'] . "</td>";
            echo "<td>" . $col['Default'] . "</td>";
            echo "<td>" . $col['Extra'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // Check sample data
        $count = "SELECT COUNT(*) as count FROM activity_logs";
        $stmt = $db->prepare($count);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        echo "<br>✅ Table has " . $result['count'] . " records<br>";
        
    } else {
        echo "❌ activity_logs table does NOT exist<br>";
        echo "This is why the edit is failing!<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
}
?>
