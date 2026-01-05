<?php
// Simple staff listing endpoint - completely rewritten
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Use the database configuration
    $database = new Database();
    $pdo = $database->getConnection();
    
    // First, check if the users table exists
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($tableCheck->rowCount() == 0) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Users table does not exist',
            'message' => 'Please import the database schema first'
        ]);
        exit();
    }
    
    // Check table structure
    $columns = $pdo->query("DESCRIBE users");
    $columnNames = [];
    while ($row = $columns->fetch(PDO::FETCH_ASSOC)) {
        $columnNames[] = $row['Field'];
    }
    
    // Build query based on available columns
    $selectColumns = [];
    $requiredColumns = ['id', 'username', 'role', 'full_name', 'email', 'phone', 'is_active', 'created_at', 'last_login'];
    
    foreach ($requiredColumns as $column) {
        if (in_array($column, $columnNames)) {
            $selectColumns[] = $column;
        }
    }
    
    if (empty($selectColumns)) {
        http_response_code(500);
        echo json_encode([
            'error' => 'No required columns found in users table',
            'available_columns' => $columnNames
        ]);
        exit();
    }
    
    // Get all staff members with available columns
    $query = "SELECT " . implode(', ', $selectColumns) . " FROM users WHERE role IN ('reception', 'admin') ORDER BY created_at DESC";
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        'success' => true,
        'staff' => $staff,
        'columns_used' => $selectColumns,
        'total_staff' => count($staff)
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in get_staff_new.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (Exception $e) {
    error_log("General error in get_staff_new.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}
?>
