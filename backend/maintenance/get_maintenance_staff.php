<?php
require_once '../config/cors.php';
header('Content-Type: application/json');

require_once '../config/database.php';

try {
    $database = new Database();
    $pdo = $database->getConnection();
    
    // First check if staff table exists
    $tableCheck = $pdo->query("SHOW TABLES LIKE 'staff'");
    if ($tableCheck->rowCount() == 0) {
        // Staff table doesn't exist, provide default options
        $staff = [
            [
                'id' => 1,
                'name' => 'General Maintenance Staff',
                'specialization' => 'General Repairs',
                'email' => 'maintenance@hotel.com',
                'phone' => 'N/A'
            ],
            [
                'id' => 2,
                'name' => 'Housekeeping Staff',
                'specialization' => 'Cleaning & Inspection',
                'email' => 'housekeeping@hotel.com',
                'phone' => 'N/A'
            ],
            [
                'id' => 3,
                'name' => 'Technical Support',
                'specialization' => 'Electrical & Plumbing',
                'email' => 'technical@hotel.com',
                'phone' => 'N/A'
            ]
        ];
        
        echo json_encode([
            'success' => true,
            'data' => $staff,
            'message' => 'Using default maintenance staff (staff table not found)'
        ]);
        exit();
    }
    
    // Check if staff table has the required columns
    $columnCheck = $pdo->query("SHOW COLUMNS FROM staff");
    $columns = $columnCheck->fetchAll(PDO::FETCH_COLUMN);
    
    // Build query based on available columns
    $selectFields = ['id'];
    if (in_array('full_name', $columns)) {
        $selectFields[] = 'full_name as name';
    } elseif (in_array('name', $columns)) {
        $selectFields[] = 'name';
    } else {
        $selectFields[] = 'id as name';
    }
    
    if (in_array('specialization', $columns)) {
        $selectFields[] = 'specialization';
    } else {
        $selectFields[] = "'General Maintenance' as specialization";
    }
    
    if (in_array('email', $columns)) {
        $selectFields[] = 'email';
    } else {
        $selectFields[] = "'N/A' as email";
    }
    
    if (in_array('phone', $columns)) {
        $selectFields[] = 'phone';
    } else {
        $selectFields[] = "'N/A' as phone";
    }
    
    $query = "SELECT " . implode(', ', $selectFields) . " FROM staff";
    
    // Try to filter by role or specialization if those columns exist
    if (in_array('role', $columns)) {
        $query .= " WHERE role = 'maintenance' OR role = 'staff'";
    } elseif (in_array('specialization', $columns)) {
        $query .= " WHERE specialization LIKE '%maintenance%' OR specialization LIKE '%repair%'";
    }
    
    $query .= " ORDER BY name LIMIT 10";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute();
    $staff = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // If no staff found, provide default options
    if (empty($staff)) {
        $staff = [
            [
                'id' => 1,
                'name' => 'General Maintenance Staff',
                'specialization' => 'General Repairs',
                'email' => 'maintenance@hotel.com',
                'phone' => 'N/A'
            ],
            [
                'id' => 2,
                'name' => 'Housekeeping Staff',
                'specialization' => 'Cleaning & Inspection',
                'email' => 'housekeeping@hotel.com',
                'phone' => 'N/A'
            ],
            [
                'id' => 3,
                'name' => 'Technical Support',
                'specialization' => 'Electrical & Plumbing',
                'email' => 'technical@hotel.com',
                'phone' => 'N/A'
            ]
        ];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $staff,
        'message' => 'Maintenance staff retrieved successfully'
    ]);
    
} catch (PDOException $e) {
    // Database error - provide default staff
    $staff = [
        [
            'id' => 1,
            'name' => 'General Maintenance Staff',
            'specialization' => 'General Repairs',
            'email' => 'maintenance@hotel.com',
            'phone' => 'N/A'
        ],
        [
            'id' => 2,
            'name' => 'Housekeeping Staff',
            'specialization' => 'Cleaning & Inspection',
            'email' => 'housekeeping@hotel.com',
            'phone' => 'N/A'
        ],
        [
            'id' => 3,
            'name' => 'Technical Support',
            'specialization' => 'Electrical & Plumbing',
            'email' => 'technical@hotel.com',
            'phone' => 'N/A'
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $staff,
        'message' => 'Using default maintenance staff (database error: ' . $e->getMessage() . ')'
    ]);
    
} catch (Exception $e) {
    // Any other error - provide default staff
    $staff = [
        [
            'id' => 1,
            'name' => 'General Maintenance Staff',
            'specialization' => 'General Repairs',
            'email' => 'maintenance@hotel.com',
            'phone' => 'N/A'
        ],
        [
            'id' => 2,
            'name' => 'Housekeeping Staff',
            'specialization' => 'Cleaning & Inspection',
            'email' => 'housekeeping@hotel.com',
            'phone' => 'N/A'
        ],
        [
            'id' => 3,
            'name' => 'Technical Support',
            'specialization' => 'Electrical & Plumbing',
            'email' => 'technical@hotel.com',
            'phone' => 'N/A'
        ]
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $staff,
        'message' => 'Using default maintenance staff (server error: ' . $e->getMessage() . ')'
    ]);
}
?>
