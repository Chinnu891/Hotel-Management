<?php
class SimpleJWTHelper {
    private static $secret_key = "your_secret_key_here_change_in_production";
    private static $algorithm = 'HS256';

    public static function generateToken($user_data) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            "iat" => time(),
            "exp" => time() + (60 * 60 * 24 * 7), // 7 days instead of 24 hours
            "user_id" => $user_data['id'],
            "username" => $user_data['username'],
            "role" => $user_data['role']
        ]);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret_key, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function generateRefreshToken($user_data) {
        $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
        $payload = json_encode([
            "iat" => time(),
            "exp" => time() + (60 * 60 * 24 * 30), // 30 days
            "type" => "refresh",
            "user_id" => $user_data['id'],
            "username" => $user_data['username'],
            "role" => $user_data['role']
        ]);

        $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
        $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));

        $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, self::$secret_key, true);
        $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));

        return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
    }

    public static function validateToken($token) {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }

            $header = $parts[0];
            $payload = $parts[1];
            $signature = $parts[2];

            // Verify signature
            $expected_signature = hash_hmac('sha256', $header . "." . $payload, self::$secret_key, true);
            $expected_signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expected_signature));

            if (!hash_equals($signature, $expected_signature)) {
                return false;
            }

            // Decode payload
            $payload = str_replace(['-', '_'], ['+', '/'], $payload);
            $payload = base64_decode($payload);
            $payload_data = json_decode($payload, true);

            // Check expiration
            if (isset($payload_data['exp']) && $payload_data['exp'] < time()) {
                return false;
            }

            return $payload_data;
        } catch (Exception $e) {
            return false;
        }
    }

    public static function getTokenFromHeader() {
        // Handle different server environments
        $headers = null;
        
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
        } elseif (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
        } else {
            // Fallback for servers without getallheaders
            $headers = array();
            foreach ($_SERVER as $name => $value) {
                if (substr($name, 0, 5) == 'HTTP_') {
                    $header_name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))));
                    $headers[$header_name] = $value;
                }
            }
        }
        
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

    public static function isTokenExpiringSoon($token, $threshold_hours = 24) {
        try {
            $decoded = self::validateToken($token);
            if (!$decoded) {
                return true; // Consider expired tokens as "expiring soon"
            }

            $exp = $decoded['exp'];
            $current_time = time();
            $threshold_seconds = $threshold_hours * 60 * 60;

            return ($exp - $current_time) <= $threshold_seconds;
        } catch (Exception $e) {
            return true;
        }
    }
}
?>
