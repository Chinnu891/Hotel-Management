<?php
require_once '../config/cors.php';
require_once '../config/database.php';
header('Content-Type: application/json');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Get all tables
    $tables = $pdo->query("SHOW TABLES");
    $tableList = [];
    while ($row = $tables->fetch(PDO::FETCH_NUM)) {
        $tableList[] = $row[0];
    }
    
    // Check specific tables
    $tableDetails = [];
    foreach ($tableList as $table) {
        $columns = $pdo->query("DESCRIBE `$table`");
        $columnList = [];
        while ($col = $columns->fetch(PDO::FETCH_ASSOC)) {
            $columnList[] = [
                'field' => $col['Field'],
                'type' => $col['Type'],
                'null' => $col['Null'],
                'key' => $col['Key'],
                'default' => $col['Default']
            ];
        }
        $tableDetails[$table] = $columnList;
    }
    
    // Check if users table exists and has required columns
    $usersTableStatus = 'missing';
    $requiredColumns = ['id', 'username', 'role', 'full_name', 'email', 'phone', 'is_active', 'created_at', 'last_login'];
    $missingColumns = [];
    
    if (in_array('users', $tableList)) {
        $usersTableStatus = 'exists';
        $usersColumns = array_column($tableDetails['users'], 'field');
        foreach ($requiredColumns as $col) {
            if (!in_array($col, $usersColumns)) {
                $missingColumns[] = $col;
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'database' => 'u748955918_royal_hotel',
        'total_tables' => count($tableList),
        'tables' => $tableList,
        'users_table_status' => $usersTableStatus,
        'missing_columns' => $missingColumns,
        'table_details' => $tableDetails
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in check_database_schema.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Database error',
        'message' => $e->getMessage(),
        'code' => $e->getCode()
    ]);
} catch (Exception $e) {
    error_log("General error in check_database_schema.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Server error',
        'message' => $e->getMessage()
    ]);
}
?>
