<?php

class Logger {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function log($level, $message, $context = []) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ");
            
            // Get a valid user ID (default to admin user if none provided)
            $user_id = $context['user_id'] ?? null;
            if ($user_id === null || $user_id === 0) {
                // Get the first admin user as default
                $adminStmt = $this->db->prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
                $adminStmt->execute();
                $adminUser = $adminStmt->fetch(PDO::FETCH_ASSOC);
                $user_id = $adminUser ? $adminUser['id'] : 1; // Fallback to ID 1
            }
            
            $action = $level;
            $table_name = $context['table_name'] ?? null;
            $record_id = $context['record_id'] ?? null;
            $details = $message;
            $ip_address = $this->getClientIP();
            
            $stmt->execute([$user_id, $action, $table_name, $record_id, $details, $ip_address]);
            
            return true;
            
        } catch (Exception $e) {
            // Log to error log if database logging fails
            error_log("Logger error: " . $e->getMessage());
            return false;
        }
    }
    
    public function logError($user_id, $error_message, $context = null) {
        return $this->log('error', $error_message, [
            'user_id' => $user_id,
            'table_name' => $context['table_name'] ?? null,
            'record_id' => $context['record_id'] ?? null
        ]);
    }
    
    public function logLogin($user_id, $success = true) {
        $action = $success ? 'login_success' : 'login_failed';
        return $this->log($action, 'User login attempt', ['user_id' => $user_id]);
    }
    
    public function logLogout($user_id) {
        return $this->log('logout', 'User logged out', ['user_id' => $user_id]);
    }
    
    public function logDataAccess($user_id, $table_name, $record_id, $action = 'view') {
        return $this->log($action, 'Data access', [
            'user_id' => $user_id,
            'table_name' => $table_name,
            'record_id' => $record_id
        ]);
    }
    
    public function logDataModification($user_id, $table_name, $record_id, $action, $details = null) {
        return $this->log($action, $details ?? 'Data modification', [
            'user_id' => $user_id,
            'table_name' => $table_name,
            'record_id' => $record_id
        ]);
    }
    
    public function getActivityLogs($filters = [], $limit = 100, $offset = 0) {
        try {
            $where_conditions = [];
            $params = [];
            
            if (!empty($filters['user_id'])) {
                $where_conditions[] = "al.user_id = ?";
                $params[] = $filters['user_id'];
            }
            
            if (!empty($filters['action'])) {
                $where_conditions[] = "al.action = ?";
                $params[] = $filters['action'];
            }
            
            if (!empty($filters['table_name'])) {
                $where_conditions[] = "al.table_name = ?";
                $params[] = $filters['table_name'];
            }
            
            if (!empty($filters['date_from'])) {
                $where_conditions[] = "al.created_at >= ?";
                $params[] = $filters['date_from'];
            }
            
            if (!empty($filters['date_to'])) {
                $where_conditions[] = "al.created_at <= ?";
                $params[] = $filters['date_to'];
            }
            
            $where_clause = !empty($where_conditions) ? "WHERE " . implode(" AND ", $where_conditions) : "";
            
            $sql = "
                SELECT al.*, u.username, u.full_name
                FROM activity_logs al
                LEFT JOIN users u ON al.user_id = u.id
                {$where_clause}
                ORDER BY al.created_at DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
            
            // Remove limit and offset from params since they're now in the query
            // $params[] = $limit;
            // $params[] = $offset;
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Error fetching activity logs: " . $e->getMessage());
            return [];
        }
    }
    
    private function getClientIP() {
        $ip_keys = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR'];
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
?>
