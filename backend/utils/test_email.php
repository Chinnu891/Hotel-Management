<?php
require_once __DIR__ . '/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/email_service.php';

class TestEmail {
    private $conn;
    private $emailService;

    public function __construct($db) {
        $this->conn = $db;
        $this->emailService = new EmailService($db);
    }

    public function testEmailConfiguration($test_email) {
        try {
            // First, check if email_config table exists
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'email_config'");
            $stmt->execute();
            
            if ($stmt->rowCount() == 0) {
                return [
                    'success' => false,
                    'message' => 'Email configuration table does not exist. Please run the email_config.sql script first.',
                    'setup_required' => true
                ];
            }

            // Get current email configuration
            $config = $this->emailService->getEmailConfig();
            
            if (empty($config)) {
                return [
                    'success' => false,
                    'message' => 'No email configuration found. Please configure SMTP settings.',
                    'setup_required' => true
                ];
            }

            // Check if critical SMTP settings are configured
            $required_keys = ['host', 'username', 'password', 'port'];
            $missing_keys = [];
            
            foreach ($required_keys as $key) {
                if (!isset($config[$key]) || empty($config[$key]) || $config[$key] === 'your-email@gmail.com' || $config[$key] === 'your-app-password') {
                    $missing_keys[] = $key;
                }
            }

            if (!empty($missing_keys)) {
                return [
                    'success' => false,
                    'message' => 'Email configuration incomplete. Missing or default values for: ' . implode(', ', $missing_keys),
                    'setup_required' => true,
                    'current_config' => $config
                ];
            }

            // Test email configuration
            $test_result = $this->emailService->testEmailConfiguration($test_email);
            
            if ($test_result['success']) {
                return [
                    'success' => true,
                    'message' => 'Test email sent successfully! Check your inbox.',
                    'config_status' => 'configured',
                    'test_result' => $test_result
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Test email failed: ' . $test_result['message'],
                    'config_status' => 'configured',
                    'test_result' => $test_result
                ];
            }

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error testing email configuration: ' . $e->getMessage(),
                'setup_required' => false
            ];
        }
    }

    public function getEmailConfiguration() {
        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'email_config'");
            $stmt->execute();
            
            if ($stmt->rowCount() == 0) {
                return [
                    'success' => false,
                    'message' => 'Email configuration table does not exist',
                    'setup_required' => true
                ];
            }

            $config = $this->emailService->getEmailConfig();
            $stats = $this->emailService->getEmailStats();
            $recent_logs = $this->emailService->getRecentEmailLogs(5);

            return [
                'success' => true,
                'config' => $config,
                'stats' => $stats,
                'recent_logs' => $recent_logs
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error getting email configuration: ' . $e->getMessage()
            ];
        }
    }

    public function updateEmailConfiguration($config_data) {
        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'email_config'");
            $stmt->execute();
            
            if ($stmt->rowCount() == 0) {
                return [
                    'success' => false,
                    'message' => 'Email configuration table does not exist. Please run the email_config.sql script first.'
                ];
            }

            $updated = 0;
            foreach ($config_data as $key => $value) {
                $stmt = $this->conn->prepare("UPDATE email_config SET config_value = ? WHERE config_key = ?");
                if ($stmt->execute([$value, $key])) {
                    $updated++;
                }
            }

            return [
                'success' => true,
                'message' => "Updated $updated configuration values successfully",
                'updated_count' => $updated
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Error updating email configuration: ' . $e->getMessage()
            ];
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $database = new Database();
    $db = $database->getConnection();
    
    $testEmail = new TestEmail($db);
    
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (isset($input['action'])) {
        switch ($input['action']) {
            case 'test':
                if (!isset($input['test_email'])) {
                    echo json_encode(['success' => false, 'message' => 'Test email address required']);
                    exit;
                }
                $result = $testEmail->testEmailConfiguration($input['test_email']);
                break;
                
            case 'get_config':
                $result = $testEmail->getEmailConfiguration();
                break;
                
            case 'update_config':
                if (!isset($input['config'])) {
                    echo json_encode(['success' => false, 'message' => 'Configuration data required']);
                    exit;
                }
                $result = $testEmail->updateEmailConfiguration($input['config']);
                break;
                
            default:
                $result = ['success' => false, 'message' => 'Invalid action'];
        }
    } else {
        $result = ['success' => false, 'message' => 'Action required'];
    }
    
    echo json_encode($result);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $database = new Database();
    $db = $database->getConnection();
    
    $testEmail = new TestEmail($db);
    $result = $testEmail->getEmailConfiguration();
    
    echo json_encode($result);
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
