<?php
// Test version of Simple Payment API - no database required
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    if ($action === 'pay_due_amount') {
        $bookingId = $input['booking_id'] ?? null;
        $amount = $input['amount'] ?? null;
        $paymentMethod = $input['payment_method'] ?? 'cash';
        $notes = $input['notes'] ?? '';
        
        if (!$bookingId || !$amount || $amount <= 0) {
            throw new Exception('Booking ID and valid amount are required');
        }
        
        // Simulate successful payment without database
        echo json_encode([
            'success' => true,
            'message' => 'Payment processed successfully (test mode)',
            'payment_id' => 999,
            'new_paid_amount' => $amount,
            'new_remaining_amount' => 0,
            'new_payment_status' => 'completed',
            'test_data' => [
                'booking_id' => $bookingId,
                'amount' => $amount,
                'payment_method' => $paymentMethod,
                'notes' => $notes
            ]
        ]);
        
    } else {
        throw new Exception('Invalid action: "' . $action . '"');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Payment failed: ' . $e->getMessage()
    ]);
}
?>
