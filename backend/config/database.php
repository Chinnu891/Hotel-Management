<?php
class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;

    public function __construct() {
        // Check if running on localhost or Hostinger
        $server_name = $_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? '';
        $server_addr = $_SERVER['SERVER_ADDR'] ?? '';
        
        // If running from CLI or server name is empty, assume localhost
        $is_localhost = empty($server_name) || 
                       in_array($server_name, ['localhost', '127.0.0.1']) || 
                       strpos($server_name, 'localhost') !== false ||
                       in_array($server_addr, ['127.0.0.1', '::1']) ||
                       strpos($server_addr, '192.168.') === 0 ||  // Local network
                       strpos($server_addr, '10.') === 0 ||       // Local network
                       strpos($server_addr, '172.') === 0 ||      // Local network
                       php_sapi_name() === 'cli';
        
        if ($is_localhost) {
            // Localhost configuration
            $this->host = "localhost";
            $this->db_name = "hotel_management";
            $this->username = "root";
            $this->password = "";
        } else {
            // Hostinger configuration
            $this->host = "localhost";
            $this->db_name = "u748955918_royal_hotel";
            $this->username = "u748955918_svroyal";
            $this->password = "Svroyal@12";
        }
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5, // 5 second timeout
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ];
            
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
            return $this->conn;
        } catch(PDOException $exception) {
            error_log("Database connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed: " . $exception->getMessage());
        }
    }
}
?>
