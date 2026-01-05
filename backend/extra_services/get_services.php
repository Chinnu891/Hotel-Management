<?php
require_once __DIR__ . '/../config/cors.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class ExtraServices {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function getAllServices() {
        try {
            $query = "SELECT id, name, description, price, is_active 
                      FROM extra_services 
                      WHERE is_active = TRUE 
                      ORDER BY name ASC";

            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $this->response->success($services);

        } catch (Exception $e) {
            error_log("Get extra services error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    public function getServiceById($id) {
        try {
            $query = "SELECT id, name, description, price, is_active 
                      FROM extra_services 
                      WHERE id = :id AND is_active = TRUE";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':id', $id);
            $stmt->execute();
            
            $service = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$service) {
                return $this->response->notFound("Service not found");
            }

            return $this->response->success($service);

        } catch (Exception $e) {
            error_log("Get service by ID error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    public function getServicesByCategory($category = null) {
        try {
            $where_clause = "WHERE is_active = TRUE";
            $params = [];

            if ($category) {
                $where_clause .= " AND category = :category";
                $params[':category'] = $category;
            }

            $query = "SELECT id, name, description, price, is_active, category 
                      FROM extra_services 
                      $where_clause 
                      ORDER BY name ASC";

            $stmt = $this->conn->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindParam($key, $value);
            }
            
            $stmt->execute();
            
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return $this->response->success($services);

        } catch (Exception $e) {
            error_log("Get services by category error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $database = new Database();
    $db = $database->getConnection();
    
    $extra_services = new ExtraServices($db);
    
    $service_id = $_GET['id'] ?? null;
    $category = $_GET['category'] ?? null;
    
    if ($service_id) {
        $result = $extra_services->getServiceById($service_id);
    } elseif ($category) {
        $result = $extra_services->getServicesByCategory($category);
    } else {
        $result = $extra_services->getAllServices();
    }
    
    http_response_code($result['status']);
    echo json_encode($result);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
