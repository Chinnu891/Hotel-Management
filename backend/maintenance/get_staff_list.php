<?php
require_once '../config/cors.php';
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    require_once '../config/database.php';
    
    $database = new Database();
    $pdo = $database->getConnection();
    
    // Try to get staff from users table first
    $staff_query = "
        SELECT 
            id,
            full_name as name,
            email,
            role as specialization
        FROM users 
        WHERE role IN ('maintenance', 'staff', 'admin')
        ORDER BY full_name
    ";
    
    $stmt = $pdo->prepare($staff_query);
    $stmt->execute();
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // If no users found, provide default options
    if (empty($staff)) {
        $staff = [
            [
                'id' => 1,
                'name' => 'General Maintenance Staff',
                'email' => 'maintenance@hotel.com',
                'specialization' => 'General Repairs'
            ],
            [
                'id' => 2,
                'name' => 'Housekeeping Staff',
                'email' => 'housekeeping@hotel.com',
                'specialization' => 'Cleaning & Inspection'
            ],
            [
                'id' => 3,
                'name' => 'Electrical Technician',
                'email' => 'electrical@hotel.com',
                'specialization' => 'Electrical Systems'
            ],
            [
                'id' => 4,
                'name' => 'Plumbing Technician',
                'email' => 'plumbing@hotel.com',
                'specialization' => 'Plumbing Systems'
            ]
        ];
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Staff list retrieved successfully',
        'data' => $staff,
        'total' => count($staff)
    ]);
    
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
        'data' => []
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage(),
        'data' => []
    ]);
}
?>
