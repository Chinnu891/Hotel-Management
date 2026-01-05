<?php
require_once __DIR__ . '/../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/simple_jwt_helper.php';

class ExportHistory {
    private $conn;
    private $response;
    private $jwtHelper;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
        $this->jwtHelper = new SimpleJWTHelper();
    }

    public function handleRequest() {
        // Verify JWT token and admin role
        $authResult = $this->authenticateAdmin();
        if (!$authResult['success']) {
            return $this->response->error(401, 'Unauthorized', $authResult['message']);
        }

        $action = $_GET['action'] ?? $_POST['action'] ?? 'get_history';
        
        switch ($action) {
            case 'get_history':
                return $this->getExportHistory();
            case 'add_export':
                return $this->addExportRecord();
            case 'update_status':
                return $this->updateExportStatus();
            case 'delete_export':
                return $this->deleteExportRecord();
            default:
                return $this->response->error(400, 'Bad Request', 'Invalid action specified');
        }
    }

    private function authenticateAdmin() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            return ['success' => false, 'message' => 'Authorization header missing or invalid'];
        }

        $token = substr($authHeader, 7);
        $decoded = $this->jwtHelper->validateToken($token);
        
        if (!$decoded) {
            return ['success' => false, 'message' => 'Invalid or expired token'];
        }

        if ($decoded['role'] !== 'admin') {
            return ['success' => false, 'message' => 'Admin access required'];
        }

        return ['success' => true, 'user_id' => $decoded['user_id'], 'role' => $decoded['role']];
    }

    private function getExportHistory() {
        try {
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
            $exportType = $_GET['export_type'] ?? '';
            $dateFrom = $_GET['date_from'] ?? '';
            $dateTo = $_GET['date_to'] ?? '';
            $status = $_GET['status'] ?? '';
            
            $sql = "SELECT 
                        eh.id,
                        eh.export_type,
                        eh.export_date,
                        eh.file_name,
                        eh.file_size,
                        eh.status,
                        eh.parameters,
                        eh.user_id,
                        eh.created_at,
                        u.username as exported_by
                    FROM export_history eh
                    LEFT JOIN users u ON eh.user_id = u.id
                    WHERE 1=1";
            
            $params = [];
            $paramCount = 0;
            
            if ($exportType) {
                $sql .= " AND eh.export_type = ?";
                $params[] = $exportType;
                $paramCount++;
            }
            
            if ($dateFrom) {
                $sql .= " AND DATE(eh.export_date) >= ?";
                $params[] = $dateFrom;
                $paramCount++;
            }
            
            if ($dateTo) {
                $sql .= " AND DATE(eh.export_date) <= ?";
                $params[] = $dateTo;
                $paramCount++;
            }
            
            if ($status) {
                $sql .= " AND eh.status = ?";
                $params[] = $status;
                $paramCount++;
            }
            
            $sql .= " ORDER BY eh.export_date DESC LIMIT ?, ?";
            
            $stmt = $this->conn->prepare($sql);
            
            // Bind parameters with correct types
            $paramIndex = 1;
            if ($exportType) {
                $stmt->bindValue($paramIndex++, $exportType, PDO::PARAM_STR);
            }
            if ($dateFrom) {
                $stmt->bindValue($paramIndex++, $dateFrom, PDO::PARAM_STR);
            }
            if ($dateTo) {
                $stmt->bindValue($paramIndex++, $dateTo, PDO::PARAM_STR);
            }
            if ($status) {
                $stmt->bindValue($paramIndex++, $status, PDO::PARAM_STR);
            }
            
            $stmt->bindValue($paramIndex++, (int)$offset, PDO::PARAM_INT);
            $stmt->bindValue($paramIndex++, (int)$limit, PDO::PARAM_INT);
            
            $stmt->execute();
            $exports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get total count for pagination
            $countSql = "SELECT COUNT(*) as total FROM export_history eh WHERE 1=1";
            $countParams = [];
            
            if ($exportType) {
                $countSql .= " AND eh.export_type = ?";
                $countParams[] = $exportType;
            }
            
            if ($dateFrom) {
                $countSql .= " AND DATE(eh.export_date) >= ?";
                $countParams[] = $dateFrom;
            }
            
            if ($dateTo) {
                $countSql .= " AND DATE(eh.export_date) <= ?";
                $countParams[] = $dateTo;
            }
            
            if ($status) {
                $countSql .= " AND eh.status = ?";
                $countParams[] = $status;
            }
            
            $countStmt = $this->conn->prepare($countSql);
            $countStmt->execute($countParams);
            $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
            $totalCount = (int)$countResult['total'];
            
            return $this->response->success([
                'data' => $exports,
                'pagination' => [
                    'total' => $totalCount,
                    'limit' => $limit,
                    'offset' => $offset,
                    'has_more' => ($offset + $limit) < $totalCount
                ]
            ]);
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function addExportRecord() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['export_type'])) {
                return $this->response->error(400, 'Bad Request', 'Export type is required');
            }
            
            $exportType = $data['export_type'];
            $fileName = $data['file_name'] ?? '';
            $fileSize = $data['file_size'] ?? '';
            $parameters = $data['parameters'] ?? '';
            $userId = $data['user_id'] ?? 1;
            
            // Create export history record
            $sql = "INSERT INTO export_history (export_type, export_date, file_name, file_size, status, parameters, user_id, created_at) VALUES (?, NOW(), ?, ?, 'completed', ?, ?, NOW())";
            $stmt = $this->conn->prepare($sql);
            
            $stmt->execute([$exportType, $fileName, $fileSize, $parameters, $userId]);
            
            if ($stmt->rowCount() > 0) {
                $exportId = $this->conn->lastInsertId();
                
                return $this->response->success([
                    'message' => 'Export record added successfully',
                    'export_id' => $exportId
                ]);
            } else {
                return $this->response->error(500, 'Internal Server Error', 'Failed to add export record');
            }
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function updateExportStatus() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['export_id']) || empty($data['status'])) {
                return $this->response->error(400, 'Bad Request', 'Export ID and status are required');
            }
            
            $exportId = $data['export_id'];
            $status = $data['status'];
            $notes = $data['notes'] ?? '';
            
            // Update export status
            $sql = "UPDATE export_history SET status = ?, notes = ?, updated_at = NOW() WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            
            $stmt->execute([$status, $notes, $exportId]);
            
            if ($stmt->rowCount() > 0) {
                return $this->response->success(['message' => 'Export status updated successfully']);
            } else {
                return $this->response->error(404, 'Not Found', 'Export record not found');
            }
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function deleteExportRecord() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (empty($data['export_id'])) {
                return $this->response->error(400, 'Bad Request', 'Export ID is required');
            }
            
            $exportId = $data['export_id'];
            
            // Delete export record
            $sql = "DELETE FROM export_history WHERE id = ?";
            $stmt = $this->conn->prepare($sql);
            
            $stmt->execute([$exportId]);
            
            if ($stmt->rowCount() > 0) {
                return $this->response->success(['message' => 'Export record deleted successfully']);
            } else {
                return $this->response->error(404, 'Not Found', 'Export record not found');
            }
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    // Static method to add export record (called from tally_export.php)
    public static function logExport($db, $exportType, $fileName = '', $fileSize = '', $parameters = '', $userId = 1) {
        try {
            $sql = "INSERT INTO export_history (export_type, export_date, file_name, file_size, status, parameters, user_id, created_at) VALUES (?, NOW(), ?, ?, 'completed', ?, ?, NOW())";
            $stmt = $db->prepare($sql);
            
            $stmt->execute([$exportType, $fileName, $fileSize, $parameters, $userId]);
            
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            error_log("Error logging export: " . $e->getMessage());
            return false;
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $history = new ExportHistory($db);
        $result = $history->handleRequest();
        
        echo json_encode($result);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Internal Server Error',
            'error' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
