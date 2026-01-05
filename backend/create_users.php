<?php
require_once 'config/cors.php';
require_once 'config/database.php';

header('Content-Type: application/json');

echo "Creating users...\n\n";

try {
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        echo "Failed to connect to database.\n";
        exit();
    }
    
    // Create users table if it doesn't exist
    $create_users_table = "
    CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'reception') NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE
    )";
    
    $db->exec($create_users_table);
    echo "Users table created/verified.\n\n";
    
    // Delete existing users to avoid conflicts
    $db->exec("DELETE FROM users WHERE username IN ('admin', 'reception')");
    echo "Cleared existing admin and reception users.\n\n";
    
    // Create admin user
    $admin_password = password_hash('password', PASSWORD_DEFAULT);
    $insert_admin = "INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, 'admin', 'Hotel Owner', 'admin@hotel.com')";
    $stmt = $db->prepare($insert_admin);
    $stmt->execute(['admin', $admin_password]);
    echo "✓ Admin user created:\n";
    echo "  Username: admin\n";
    echo "  Password: password\n";
    echo "  Role: admin\n\n";
    
    // Create reception user
    $reception_password = password_hash('reception123', PASSWORD_DEFAULT);
    $insert_reception = "INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, 'reception', 'Reception Staff', 'reception@hotel.com')";
    $stmt = $db->prepare($insert_reception);
    $stmt->execute(['reception', $reception_password]);
    echo "✓ Reception user created:\n";
    echo "  Username: reception\n";
    echo "  Password: reception123\n";
    echo "  Role: reception\n\n";
    
    // Verify users were created
    $stmt = $db->prepare("SELECT username, role FROM users WHERE username IN ('admin', 'reception')");
    $stmt->execute();
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Verification - Users in database:\n";
    foreach ($users as $user) {
        echo "  - " . $user['username'] . " (" . $user['role'] . ")\n";
    }
    
    echo "\n✅ Users created successfully! You can now log in.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
