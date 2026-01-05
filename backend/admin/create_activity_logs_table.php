<?php
// Create activity_logs table if it doesn't exist
// Remove this file in production

echo "<h1>Creating Activity Logs Table</h1>";

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
        echo "✅ activity_logs table already exists<br>";
    } else {
        echo "❌ activity_logs table does not exist. Creating it...<br>";
        
        // Create the table
        $create_table = "CREATE TABLE activity_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            action VARCHAR(100) NOT NULL,
            table_name VARCHAR(50) NOT NULL,
            record_id INT NOT NULL,
            details TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_action (action),
            INDEX idx_table_name (table_name),
            INDEX idx_created_at (created_at)
        )";
        
        $stmt = $db->prepare($create_table);
        if ($stmt->execute()) {
            echo "✅ activity_logs table created successfully<br>";
        } else {
            echo "❌ Failed to create activity_logs table<br>";
        }
    }
    
    // Verify table structure
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
    
    echo "<br>✅ Activity logs table is ready!<br>";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "<br>";
    echo "Error details: " . $e->getTraceAsString() . "<br>";
}
?>
