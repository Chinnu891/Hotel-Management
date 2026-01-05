<?php
// Find where sai's payment is recorded
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config/database.php';

echo "Finding Sai's Payment Source\n";
echo "============================\n\n";

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Get sai's booking ID
    $stmt = $db->prepare("
        SELECT id, booking_reference, total_amount, paid_amount, remaining_amount, payment_status
        FROM bookings 
        WHERE booking_reference = 'BK202508177090'
    ");
    $stmt->execute();
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$booking) {
        echo "Booking not found!\n";
        return;
    }
    
    $booking_id = $booking['id'];
    echo "Sai's Booking ID: {$booking_id}\n";
    echo "Total Amount: ₹{$booking['total_amount']}\n";
    echo "Paid Amount (DB): ₹{$booking['paid_amount']}\n\n";
    
    // Search in ALL tables for any reference to this booking or amount
    echo "=== SEARCHING ALL TABLES ===\n\n";
    
    // 1. Check all tables
    $stmt = $db->prepare("SHOW TABLES");
    $stmt->execute();
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($tables as $table) {
        echo "Checking table: {$table}\n";
        
        try {
            // Check if table has booking_id column
            $stmt = $db->prepare("DESCRIBE {$table}");
            $stmt->execute();
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $has_booking_id = false;
            $has_amount = false;
            
            foreach ($columns as $column) {
                if ($column['Field'] === 'booking_id') $has_booking_id = true;
                if (strpos(strtolower($column['Field']), 'amount') !== false) $has_amount = true;
            }
            
            if ($has_booking_id) {
                // Search by booking_id
                $stmt = $db->prepare("
                    SELECT * FROM {$table} 
                    WHERE booking_id = ?
                ");
                $stmt->execute([$booking_id]);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if ($records) {
                    echo "  ✅ Found " . count($records) . " records with booking_id {$booking_id}:\n";
                    foreach ($records as $record) {
                        echo "    - " . json_encode($record) . "\n";
                    }
                } else {
                    echo "  ❌ No records found with booking_id {$booking_id}\n";
                }
            } elseif ($has_amount) {
                // Search by amount (₹1000)
                $stmt = $db->prepare("
                    SELECT * FROM {$table} 
                    WHERE amount = 1000 OR amount = 1000.00
                ");
                $stmt->execute();
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if ($records) {
                    echo "  ✅ Found " . count($records) . " records with amount ₹1000:\n";
                    foreach ($records as $record) {
                        echo "    - " . json_encode($record) . "\n";
                    }
                }
            }
            
        } catch (Exception $e) {
            echo "  Error: " . $e->getMessage() . "\n";
        }
        
        echo "\n";
    }
    
    // 2. Check if there are any views that might aggregate payment data
    echo "=== CHECKING VIEWS ===\n";
    try {
        $stmt = $db->prepare("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
        $stmt->execute();
        $views = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($views as $view) {
            echo "Checking view: {$view}\n";
            try {
                $stmt = $db->prepare("SELECT * FROM {$view} WHERE booking_id = ?");
                $stmt->execute([$booking_id]);
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                if ($records) {
                    echo "  ✅ Found " . count($records) . " records in view:\n";
                    foreach ($records as $record) {
                        echo "    - " . json_encode($record) . "\n";
                    }
                }
            } catch (Exception $e) {
                echo "  Error: " . $e->getMessage() . "\n";
            }
        }
    } catch (Exception $e) {
        echo "Error checking views: " . $e->getMessage() . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
