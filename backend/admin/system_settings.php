<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/jwt_helper.php';

// Ensure proper headers
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    // Require admin role
    $current_user = JWTHelper::requireRole('admin');
    
    $database = new Database();
    $db = $database->getConnection();
    
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Check if system_settings table exists
            $check_table = $db->query("SHOW TABLES LIKE 'system_settings'");
            if ($check_table->rowCount() == 0) {
                echo json_encode([
                    'success' => true,
                    'data' => [],
                    'message' => 'No system settings configured yet'
                ]);
                break;
            }
            
            // Get system settings
            $stmt = $db->prepare("
                SELECT setting_key, setting_value, description, category, is_editable 
                FROM system_settings 
                ORDER BY category, setting_key
            ");
            $stmt->execute();
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Group settings by category
            $grouped_settings = [];
            foreach ($settings as $setting) {
                $category = $setting['category'];
                if (!isset($grouped_settings[$category])) {
                    $grouped_settings[$category] = [];
                }
                $grouped_settings[$category][] = $setting;
            }
            
            echo json_encode([
                'success' => true,
                'data' => $grouped_settings
            ]);
            break;
            
        case 'POST':
            // Update system settings
            $data = json_decode(file_get_contents("php://input"));
            
            if (!isset($data->settings) || !is_array($data->settings)) {
                http_response_code(400);
                echo json_encode(['error' => 'Settings data is required']);
                exit();
            }
            
            $updated_count = 0;
            foreach ($data->settings as $setting) {
                if (!isset($setting->key) || !isset($setting->value)) {
                    continue;
                }
                
                // Check if setting is editable
                $check_stmt = $db->prepare("SELECT is_editable FROM system_settings WHERE setting_key = ?");
                $check_stmt->execute([$setting->key]);
                $setting_info = $check_stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($setting_info && $setting_info['is_editable']) {
                    $update_stmt = $db->prepare("
                        UPDATE system_settings 
                        SET setting_value = ?, updated_at = NOW() 
                        WHERE setting_key = ?
                    ");
                    $update_stmt->execute([$setting->value, $setting->key]);
                    $updated_count++;
                }
            }
            
            // Log the action (only if activity_logs table exists)
            try {
                $check_logs_table = $db->query("SHOW TABLES LIKE 'activity_logs'");
                if ($check_logs_table->rowCount() > 0) {
                    $log_stmt = $db->prepare("
                        INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                        VALUES (?, 'update_system_settings', 'system_settings', ?, ?, ?)
                    ");
                    $log_stmt->execute([
                        $current_user['user_id'],
                        0,
                        "Updated {$updated_count} system settings",
                        $_SERVER['REMOTE_ADDR']
                    ]);
                }
            } catch (Exception $e) {
                // Activity logging is optional, continue without it
                error_log("Activity logging failed: " . $e->getMessage());
            }
            
            echo json_encode([
                'success' => true,
                'message' => "Successfully updated {$updated_count} settings"
            ]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
    
} catch (PDOException $e) {
    error_log("Database error in system_settings.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("General error in system_settings.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error occurred']);
}
?>
