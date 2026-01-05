<?php
require_once '../utils/cors_headers.php';
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit();
}

try {
    error_log("Starting maintenance creation process...");
    
    // Initialize database connection
    error_log("Connecting to database...");
    $database = new Database();
    $pdo = $database->getConnection();
    error_log("Database connection successful");
    
    // Get JSON input
    error_log("Reading JSON input...");
    $raw_input = file_get_contents('php://input');
    error_log("Raw input: " . $raw_input);
    
    $input = json_decode($raw_input, true);
    error_log("Decoded input: " . print_r($input, true));
    
    if (!$input) {
        error_log("JSON decode failed");
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit();
    }
    
    // Validate required fields
    $required_fields = ['room_id', 'issue_type', 'description'];
    foreach ($required_fields as $field) {
        if (!isset($input[$field]) || empty(trim($input[$field]))) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
            exit();
        }
    }
    
    // Check if maintenance table exists
    $table_check = $pdo->query("SHOW TABLES LIKE 'maintenance'");
    if ($table_check->rowCount() == 0) {
        // Create maintenance table if it doesn't exist
        $create_table = "
            CREATE TABLE maintenance (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_id INT NOT NULL,
                issue_type VARCHAR(50) NOT NULL,
                description TEXT NOT NULL,
                priority VARCHAR(20) DEFAULT 'medium',
                status VARCHAR(20) DEFAULT 'pending',
                assigned_to INT NULL,
                estimated_duration DECIMAL(5,2) NULL,
                notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_room_id (room_id),
                INDEX idx_status (status),
                INDEX idx_priority (priority)
            )
        ";
        $pdo->exec($create_table);
    } else {
        // Table exists, check if it has the required columns
        $columns = $pdo->query("SHOW COLUMNS FROM maintenance");
        $existing_columns = $columns->fetchAll(PDO::FETCH_COLUMN);
        
        // Debug: Log current table structure
        error_log("Current maintenance table columns: " . implode(', ', $existing_columns));
        
        // Add missing columns if needed
        if (!in_array('estimated_duration', $existing_columns)) {
            try {
                $pdo->exec("ALTER TABLE maintenance ADD COLUMN estimated_duration DECIMAL(5,2) NULL AFTER assigned_to");
                error_log("Added estimated_duration column");
            } catch (Exception $e) {
                error_log("Could not add estimated_duration column: " . $e->getMessage());
            }
        }
        if (!in_array('notes', $existing_columns)) {
            try {
                $pdo->exec("ALTER TABLE maintenance ADD COLUMN notes TEXT NULL AFTER estimated_duration");
                error_log("Added notes column");
            } catch (Exception $e) {
                error_log("Could not add notes column: " . $e->getMessage());
            }
        }
        if (!in_array('updated_at', $existing_columns)) {
            try {
                $pdo->exec("ALTER TABLE maintenance ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at");
                error_log("Added updated_at column");
            } catch (Exception $e) {
                error_log("Could not add updated_at column: " . $e->getMessage());
            }
        }
        
        // Check and fix foreign key constraints
        try {
            // Drop existing foreign key constraints if they exist
            $pdo->exec("ALTER TABLE maintenance DROP FOREIGN KEY IF EXISTS maintenance_ibfk_3");
            error_log("Dropped existing foreign key constraint on assigned_to");
        } catch (Exception $e) {
            error_log("No existing foreign key constraint to drop: " . $e->getMessage());
        }
        
        // Verify columns after adding
        $columns_after = $pdo->query("SHOW COLUMNS FROM maintenance");
        $final_columns = $columns_after->fetchAll(PDO::FETCH_COLUMN);
        error_log("Final maintenance table columns: " . implode(', ', $final_columns));
    }
    
    // Validate room_id
    $stmt = $pdo->prepare("SELECT id, room_number FROM rooms WHERE id = ?");
    $stmt->execute([$input['room_id']]);
    $room = $stmt->fetch();
    
    if (!$room) {
        error_log("Room not found with ID: " . $input['room_id']);
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Room not found']);
        exit();
    }
    
    // Set default values
    $priority = $input['priority'] ?? 'medium';
    $assigned_to = null; // Don't assign to anyone by default to avoid foreign key issues
    $estimated_duration = $input['estimated_duration'] ?? null;
    $notes = $input['notes'] ?? null;
    
    // Only set assigned_to if it's a valid staff ID and we want to handle staff assignments
    if (!empty($input['assigned_to'])) {
        // For now, we'll store the staff name in notes instead of trying to link to users table
        $staff_name = "Assigned to staff ID: " . $input['assigned_to'];
        $notes = $notes ? $notes . "\n" . $staff_name : $staff_name;
        error_log("Staff assignment stored in notes: " . $staff_name);
    }
    
    // Check final table structure before insert
    $final_columns = $pdo->query("SHOW COLUMNS FROM maintenance");
    $available_columns = $final_columns->fetchAll(PDO::FETCH_COLUMN);
    
    // Debug: Log available columns
    error_log("Available columns for insert: " . implode(', ', $available_columns));
    
    // Build dynamic insert query based on available columns
    $insert_fields = ['room_id', 'issue_type', 'description', 'priority', 'status', 'created_at'];
    $insert_values = [$input['room_id'], $input['issue_type'], $input['description'], $priority, 'pending', 'NOW()'];
    $placeholders = ['?', '?', '?', '?', '?', 'NOW()'];
    
    if (in_array('assigned_to', $available_columns) && $assigned_to !== null) {
        $insert_fields[] = 'assigned_to';
        $insert_values[] = $assigned_to;
        $placeholders[] = '?';
    }
    
    if (in_array('estimated_duration', $available_columns)) {
        $insert_fields[] = 'estimated_duration';
        $insert_values[] = $estimated_duration;
        $placeholders[] = '?';
    }
    
    if (in_array('notes', $available_columns)) {
        $insert_fields[] = 'notes';
        $insert_values[] = $notes;
        $placeholders[] = '?';
    }
    
    // Insert maintenance record
    $insert_query = "
        INSERT INTO maintenance (
            " . implode(', ', $insert_fields) . "
        ) VALUES (" . implode(', ', $placeholders) . ")
    ";
    
    // Debug: Log insert query
    error_log("Insert query: " . $insert_query);
    error_log("Insert values: " . implode(', ', $insert_values));
    
    $stmt = $pdo->prepare($insert_query);
    
    // Filter out NOW() from values since it's not a parameter
    $execute_values = array_filter($insert_values, function($value) {
        return $value !== 'NOW()';
    });
    
    error_log("Execute values: " . implode(', ', $execute_values));
    
    $stmt->execute(array_values($execute_values));
    
    $maintenance_id = $pdo->lastInsertId();
    
    // Update room status if it's a repair issue
    if ($input['issue_type'] === 'repair') {
        $stmt = $pdo->prepare("UPDATE rooms SET status = 'maintenance' WHERE id = ?");
        $stmt->execute([$input['room_id']]);
    }
    
    // Return success response
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Maintenance request created successfully',
        'data' => [
            'id' => $maintenance_id,
            'room_id' => $input['room_id'],
            'issue_type' => $input['issue_type'],
            'description' => $input['description'],
            'priority' => $priority,
            'status' => 'pending'
        ]
    ]);
    
} catch (PDOException $e) {
    error_log("Database error in create_maintenance.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Database error occurred: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    error_log("General error in create_maintenance.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Internal server error: ' . $e->getMessage()
    ]);
}
?>
