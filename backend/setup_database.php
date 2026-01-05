<?php
// Database setup script
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "Setting up database...\n";

try {
    // Connect to MySQL without specifying database
    $pdo = new PDO("mysql:host=localhost", "root", "");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create database if it doesn't exist
    $pdo->exec("CREATE DATABASE IF NOT EXISTS hotel_management");
    echo "Database 'hotel_management' created/verified\n";
    
    // Use the database
    $pdo->exec("USE hotel_management");
    
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
    
    $pdo->exec($create_users_table);
    echo "Users table created/verified\n";
    
    // Check if admin user exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = 'admin'");
    $stmt->execute();
    $admin_exists = $stmt->fetchColumn();
    
    if (!$admin_exists) {
        // Create admin user
        $admin_password = password_hash('password', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute(['admin', $admin_password, 'admin', 'Hotel Owner', 'admin@hotel.com', 1]);
        echo "Admin user created\n";
    } else {
        echo "Admin user already exists\n";
    }
    
    // Check if reception user exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = 'reception'");
    $stmt->execute();
    $reception_exists = $stmt->fetchColumn();
    
    if (!$reception_exists) {
        // Create reception user
        $reception_password = password_hash('password', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role, full_name, email, is_active) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute(['reception', $reception_password, 'reception', 'Reception Staff', 'reception@hotel.com', 1]);
        echo "Reception user created\n";
    } else {
        echo "Reception user already exists\n";
    }
    
    // Show current users
    $stmt = $pdo->query("SELECT id, username, role, full_name, email, is_active FROM users");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "\nCurrent users:\n";
    foreach ($users as $user) {
        echo "- ID: {$user['id']}, Username: {$user['username']}, Role: {$user['role']}, Active: " . ($user['is_active'] ? 'Yes' : 'No') . "\n";
    }
    
    echo "\nDatabase setup completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
