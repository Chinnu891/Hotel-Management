<?php
require_once __DIR__ . '/../vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTHelper {
    private static $secret_key = "your_secret_key_here_change_in_production";
    private static $algorithm = 'HS256';

    public static function generateToken($user_id, $username, $role) {
        $issued_at = time();
        $expiration_time = $issued_at + (60 * 60 * 24); // 24 hours

        $payload = array(
            "iat" => $issued_at,
            "exp" => $expiration_time,
            "user_id" => $user_id,
            "username" => $username,
            "role" => $role
        );

        return JWT::encode($payload, self::$secret_key, self::$algorithm);
    }

    public static function validateToken($token) {
        try {
            $decoded = JWT::decode($token, new Key(self::$secret_key, self::$algorithm));
            return (array) $decoded;
        } catch (Exception $e) {
            return false;
        }
    }

    public static function getTokenFromHeader() {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $auth_header = $headers['Authorization'];
            if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
                return $matches[1];
            }
        }
        return null;
    }

    public static function requireAuth() {
        $token = self::getTokenFromHeader();
        if (!$token) {
            http_response_code(401);
            echo json_encode(array("error" => "No token provided"));
            exit();
        }

        $decoded = self::validateToken($token);
        if (!$decoded) {
            http_response_code(401);
            echo json_encode(array("error" => "Invalid token"));
            exit();
        }

        return $decoded;
    }

    public static function requireRole($required_role) {
        $user = self::requireAuth();
        if ($user['role'] !== $required_role && $user['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(array("error" => "Insufficient permissions"));
            exit();
        }
        return $user;
    }
}
?>
