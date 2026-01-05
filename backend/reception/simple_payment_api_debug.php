<?php
// Debug version of Simple Payment API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Debug information
$debug = [
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'get_params' => $_GET,
    'post_data' => $_POST,
    'raw_input' => file_get_contents('php://input'),
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'query_string' => $_SERVER['QUERY_STRING'] ?? 'not set'
];

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    $debug['parsed_input'] = $input;
    $debug['extracted_action'] = $action;
    $debug['action_type'] = gettype($action);
    $debug['action_length'] = strlen($action);
    
    // Check if action is exactly what we expect
    $debug['action_equals_pay_due_amount'] = ($action === 'pay_due_amount');
    $debug['action_trimmed'] = trim($action);
    $debug['action_trimmed_equals'] = (trim($action) === 'pay_due_amount');
    
    if ($action === 'pay_due_amount') {
        $bookingId = $input['booking_id'] ?? null;
        $amount = $input['amount'] ?? null;
        $paymentMethod = $input['payment_method'] ?? 'cash';
        $notes = $input['notes'] ?? '';
        
        $debug['payment_data'] = [
            'booking_id' => $bookingId,
            'amount' => $amount,
            'payment_method' => $paymentMethod,
            'notes' => $notes
        ];
        
        if (!$bookingId || !$amount || $amount <= 0) {
            throw new Exception('Booking ID and valid amount are required');
        }
        
        // For now, just return success without database operations
        echo json_encode([
            'success' => true,
            'message' => 'Payment would be processed successfully',
            'debug' => $debug
        ]);
        
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action: "' . $action . '"',
            'debug' => $debug
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Payment failed: ' . $e->getMessage(),
        'debug' => $debug
    ]);
}
?>
