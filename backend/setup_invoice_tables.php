<?php
// Setup script for invoice system tables
require_once 'config/cors.php';
require_once 'config/database.php';

header('Content-Type: application/json');

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit();
    }
    
    $results = [];
    
    // Check and create invoices table if it doesn't exist
    $conn->exec("
        CREATE TABLE IF NOT EXISTS invoices (
            id INT PRIMARY KEY AUTO_INCREMENT,
            invoice_number VARCHAR(50) UNIQUE NOT NULL,
            booking_id INT NOT NULL,
            guest_id INT NOT NULL,
            room_number VARCHAR(20) NOT NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            tax_amount DECIMAL(10,2) NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            status ENUM('pending', 'paid', 'cancelled', 'overdue') DEFAULT 'pending',
            created_by INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_booking_id (booking_id),
            INDEX idx_guest_id (guest_id),
            INDEX idx_room_number (room_number),
            INDEX idx_status (status),
            INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    $results[] = "Invoices table created/verified";
    
    // Check if bookings table has room_number field
    $stmt = $conn->prepare("SHOW COLUMNS FROM bookings LIKE 'room_number'");
    $stmt->execute();
    if ($stmt->rowCount() == 0) {
        // Add room_number field to bookings table
        $conn->exec("ALTER TABLE bookings ADD COLUMN room_number VARCHAR(20) AFTER room_id");
        $results[] = "Added room_number field to bookings table";
        
        // Update existing bookings with room_number if room_id exists
        $conn->exec("
            UPDATE bookings b 
            JOIN rooms r ON b.room_id = r.id 
            SET b.room_number = r.room_number 
            WHERE b.room_number IS NULL AND b.room_id IS NOT NULL
        ");
        $results[] = "Updated existing bookings with room_number";
    } else {
        $results[] = "Bookings table already has room_number field";
    }
    
    // Check if invoices table has required fields
    $stmt = $conn->prepare("SHOW COLUMNS FROM invoices LIKE 'room_number'");
    $stmt->execute();
    if ($stmt->rowCount() == 0) {
        // Add room_number field to invoices table
        $conn->exec("ALTER TABLE invoices ADD COLUMN room_number VARCHAR(20) AFTER guest_id");
        $results[] = "Added room_number field to invoices table";
    } else {
        $results[] = "Invoices table already has room_number field";
    }
    
    // Verify all required tables exist
    $requiredTables = ['invoices', 'bookings', 'guests', 'rooms', 'room_types'];
    $existingTables = [];
    
    foreach ($requiredTables as $table) {
        $stmt = $conn->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        if ($stmt->rowCount() > 0) {
            $existingTables[] = $table;
        }
    }
    
    $missingTables = array_diff($requiredTables, $existingTables);
    
    if (empty($missingTables)) {
        $results[] = "All required tables exist";
    } else {
        $results[] = "Missing tables: " . implode(', ', $missingTables);
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Invoice system setup completed',
        'results' => $results,
        'existing_tables' => $existingTables,
        'missing_tables' => $missingTables
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Setup failed: ' . $e->getMessage()
    ]);
}
?>
