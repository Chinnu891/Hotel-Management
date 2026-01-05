<?php
require_once 'config/cors.php';

// Set Content-Type header only if not already set
if (!defined('CONTENT_TYPE_HEADER_SENT')) {
    define('CONTENT_TYPE_HEADER_SENT', true);
    header('Content-Type: application/json');
}

$debug_info = array();

// Check PHP version and extensions
$debug_info['php_version'] = PHP_VERSION;
$debug_info['extensions'] = array(
    'pdo' => extension_loaded('pdo'),
    'pdo_mysql' => extension_loaded('pdo_mysql'),
    'json' => extension_loaded('json'),
    'openssl' => extension_loaded('openssl')
);

// Check if we can connect to database
try {
    require_once 'config/database.php';
    $database = new Database();
    $db = $database->getConnection();
    
    if ($db) {
        $debug_info['database'] = 'Connected successfully';
        
        // Test a simple query
        $stmt = $db->query("SELECT COUNT(*) as user_count FROM users");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $debug_info['user_count'] = $result['user_count'];
        
    } else {
        $debug_info['database'] = 'Connection failed';
    }
} catch (Exception $e) {
    $debug_info['database'] = 'Error: ' . $e->getMessage();
}

// Check file permissions
$debug_info['file_permissions'] = array(
    'config_readable' => is_readable('config/database.php'),
    'utils_readable' => is_readable('utils/simple_jwt_helper.php'),
    'auth_readable' => is_readable('auth/login.php')
);

// Check server info
$debug_info['server'] = array(
    'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'php_sapi' => php_sapi_name(),
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown'
);

echo json_encode($debug_info, JSON_PRETTY_PRINT);
?>
