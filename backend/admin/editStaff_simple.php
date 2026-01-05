<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../utils/jwt_helper.php';

// Ensure proper headers
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Accept both PUT and POST methods
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array("error" => "Method not allowed. Use PUT or POST"));
    exit();
}

try {
    // Require admin role
    $current_user = JWTHelper::requireRole('admin');
    echo "✅ Admin role verified<br>";
    
    $database = new Database();
    $db = $database->getConnection();
    echo "✅ Database connection successful<br>";
    
    $data = json_decode(file_get_contents("php://input"));
    echo "✅ Data received: " . json_encode($data) . "<br>";
    
    if (!isset($data->staff_id) || !isset($data->full_name)) {
        http_response_code(400);
        echo json_encode(array("error" => "Staff ID and full name are required"));
        exit();
    }
    
    $staff_id = intval($data->staff_id);
    $full_name = trim($data->full_name);
    $email = isset($data->email) ? trim($data->email) : null;
    $phone = isset($data->phone) ? trim($data->phone) : null;
    
    echo "✅ Parsed data - ID: $staff_id, Name: $full_name, Email: $email, Phone: $phone<br>";
    
    if ($staff_id <= 0) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid staff ID"));
        exit();
    }
    
    if (empty($full_name)) {
        http_response_code(400);
        echo json_encode(array("error" => "Full name cannot be empty"));
        exit();
    }
    
    // Validate email if provided
    if ($email && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(array("error" => "Invalid email format"));
        exit();
    }
    
    // Check if staff member exists and is not the current admin
    $check_query = "SELECT id, username, role FROM users WHERE id = :staff_id AND id != :current_user_id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":staff_id", $staff_id);
    $check_stmt->bindParam(":current_user_id", $current_user['user_id']);
    $check_stmt->execute();
    
    echo "✅ Staff check query executed<br>";
    
    if ($check_stmt->rowCount() == 0) {
        http_response_code(404);
        echo json_encode(array("error" => "Staff member not found"));
        exit();
    }
    
    $staff_member = $check_stmt->fetch(PDO::FETCH_ASSOC);
    echo "✅ Staff member found: " . $staff_member['username'] . "<br>";
    
    // Update staff details
    $update_query = "UPDATE users SET full_name = :full_name, email = :email, phone = :phone WHERE id = :staff_id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":full_name", $full_name);
    $update_stmt->bindParam(":email", $email);
    $update_stmt->bindParam(":phone", $phone);
    $update_stmt->bindParam(":staff_id", $staff_id);
    
    echo "✅ Update query prepared<br>";
    
    if ($update_stmt->execute()) {
        echo "✅ Update successful<br>";
        
        // NO ACTIVITY LOGGING - completely removed for now
        
        http_response_code(200);
        echo json_encode([
            "success" => true,
            "message" => "Staff details updated successfully",
            "staff_id" => $staff_id
        ]);
    } else {
        echo "❌ Update failed<br>";
        http_response_code(500);
        echo json_encode(array("error" => "Failed to update staff details"));
    }
    
} catch (PDOException $e) {
    error_log("Database error in editStaff_simple.php: " . $e->getMessage());
    echo "❌ PDO Error: " . $e->getMessage() . "<br>";
    http_response_code(500);
    echo json_encode(array("error" => "Database error: " . $e->getMessage()));
} catch (Exception $e) {
    error_log("General error in editStaff_simple.php: " . $e->getMessage());
    echo "❌ General Error: " . $e->getMessage() . "<br>";
    http_response_code(500);
    echo json_encode(array("error" => "Server error: " . $e->getMessage()));
}
?>
