<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/logger.php';

class BillingAPI {
    private $conn;
    private $response;
    private $logger;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new ResponseHandler();
        $this->logger = new Logger($db);
    }

    // Generate invoice for a booking
    public function generateInvoice($data) {
        try {
            $booking_id = $data['booking_id'];
            $user_id = $data['user_id'];

            // Get booking details
            $stmt = $this->conn->prepare("
                SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
                       r.room_number, rt.name as room_type, rt.base_price
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.id = ?
            ");
            $stmt->bind_param("i", $booking_id);
            $stmt->execute();
            $booking = $stmt->get_result()->fetch_assoc();

            if (!$booking) {
                return $this->response->error("Booking not found", 404);
            }

            // Calculate room charges
            $check_in = new DateTime($booking['check_in_date']);
            $check_out = new DateTime($booking['check_out_date']);
            $nights = $check_out->diff($check_in)->days;
            $room_charges = $nights * $booking['base_price'];

            // Get extra services
            $stmt = $this->conn->prepare("
                SELECT bs.*, es.name, es.price
                FROM booking_services bs
                JOIN extra_services es ON bs.service_id = es.id
                WHERE bs.booking_id = ?
            ");
            $stmt->bind_param("i", $booking_id);
            $stmt->execute();
            $services = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            $service_charges = 0;
            foreach ($services as $service) {
                $service_charges += $service['total_price'];
            }

            // Calculate taxes
            $tax_rates = $this->getTaxRates();
            $tax_amount = 0;
            foreach ($tax_rates as $tax) {
                if ($tax['applies_to'] === 'all' || $tax['applies_to'] === 'room_charges') {
                    $tax_amount += ($room_charges * $tax['tax_rate'] / 100);
                }
                if ($tax['applies_to'] === 'all' || $tax['applies_to'] === 'services') {
                    $tax_amount += ($service_charges * $tax['tax_rate'] / 100);
                }
            }

            $subtotal = $room_charges + $service_charges;
            $total_amount = $subtotal + $tax_amount;

            // Generate invoice number
            $invoice_number = 'INV-' . date('Y') . '-' . str_pad($booking_id, 6, '0', STR_PAD_LEFT);

            // Create invoice
            $stmt = $this->conn->prepare("
                INSERT INTO invoices (invoice_number, booking_id, guest_id, room_id, 
                                    subtotal, tax_amount, total_amount, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("siiiddi", $invoice_number, $booking_id, $booking['guest_id'], 
                             $booking['room_id'], $subtotal, $tax_amount, $total_amount, $user_id);
            
            if (!$stmt->execute()) {
                return $this->response->error("Failed to create invoice", 500);
            }

            $invoice_id = $this->conn->insert_id;

            // Add invoice items
            $this->addInvoiceItem($invoice_id, 'room_charge', "Room {$booking['room_number']} - {$booking['room_type']}", $nights, $booking['base_price'], $room_charges);
            
            foreach ($services as $service) {
                $this->addInvoiceItem($invoice_id, 'service', $service['name'], $service['quantity'], $service['price'], $service['total_price']);
            }

            if ($tax_amount > 0) {
                $this->addInvoiceItem($invoice_id, 'tax', 'Taxes', 1, $tax_amount, $tax_amount);
            }

            // Log activity
            $this->logger->log($user_id, 'invoice_generated', 'invoices', $invoice_id, "Generated invoice {$invoice_number} for booking {$booking_id}");

            return $this->response->success([
                'invoice_id' => $invoice_id,
                'invoice_number' => $invoice_number,
                'total_amount' => $total_amount,
                'message' => 'Invoice generated successfully'
            ]);

        } catch (Exception $e) {
            $this->logger->log($user_id ?? 0, 'error', 'invoices', 0, "Error generating invoice: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    // Process payment
    public function processPayment($data) {
        try {
            $invoice_id = $data['invoice_id'];
            $amount = $data['amount'];
            $payment_method = $data['payment_method'];
            $user_id = $data['user_id'];
            $transaction_id = $data['transaction_id'] ?? null;
            $notes = $data['notes'] ?? '';
            $razorpay_payment_id = $data['razorpay_payment_id'] ?? null;
            $razorpay_order_id = $data['razorpay_order_id'] ?? null;
            $razorpay_signature = $data['razorpay_signature'] ?? null;

            // Validate invoice
            $stmt = $this->conn->prepare("
                SELECT i.*, b.id as booking_id, b.booking_reference, g.first_name, g.last_name, g.email
                FROM invoices i
                JOIN bookings b ON i.booking_id = b.id
                JOIN guests g ON i.guest_id = g.id
                WHERE i.id = ?
            ");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $invoice = $stmt->get_result()->fetch_assoc();

            if (!$invoice) {
                return $this->response->error("Invoice not found", 404);
            }

            if ($invoice['status'] === 'paid') {
                return $this->response->error("Invoice is already paid", 400);
            }

            // Validate amount
            if (abs($amount - $invoice['total_amount']) > 0.01) {
                return $this->response->error("Payment amount does not match invoice amount", 400);
            }

            // If this is a Razorpay payment, verify the signature
            if ($payment_method === 'online' && $razorpay_payment_id && $razorpay_order_id && $razorpay_signature) {
                require_once '../config/razorpay.php';
                
                if (!verifyPaymentSignature($razorpay_payment_id, $razorpay_order_id, $razorpay_signature)) {
                    $this->logger->log($user_id, 'payment_verification_failed', 'payments', 0, 
                                      "Razorpay signature verification failed for invoice {$invoice['invoice_number']}");
                    return $this->response->error("Payment verification failed", 400);
                }
                
                // Use Razorpay payment ID as transaction ID
                $transaction_id = $razorpay_payment_id;
            }

            // Generate receipt number
            $receipt_number = 'RCP-' . date('Y') . '-' . str_pad($invoice_id, 6, '0', STR_PAD_LEFT);

            // Process payment based on method
            $payment_data = $this->processPaymentMethod($payment_method, $data);
            if (!$payment_data['success']) {
                return $this->response->error($payment_data['message'], 400);
            }

            // Create payment record
            $stmt = $this->conn->prepare("
                INSERT INTO payments (invoice_id, booking_id, amount, payment_method, 
                                    payment_status, transaction_id, receipt_number, 
                                    notes, processed_by, payment_date)
                VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, NOW())
            ");
            $stmt->bind_param("iidssssi", $invoice_id, $invoice['booking_id'], $amount, 
                             $payment_method, $transaction_id, $receipt_number, $notes, $user_id);
            
            if (!$stmt->execute()) {
                return $this->response->error("Failed to record payment", 500);
            }

            $payment_id = $this->conn->insert_id;

            // Update invoice status
            $stmt = $this->conn->prepare("UPDATE invoices SET status = 'paid', due_date = NULL WHERE id = ?");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();

            // Update booking status if all invoices are paid
            $this->updateBookingPaymentStatus($invoice['booking_id']);
            
            // Validate and sync payment status for corporate bookings
            $stmt = $this->conn->prepare("SELECT booking_source FROM bookings WHERE id = ?");
            $stmt->execute([$invoice['booking_id']]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($booking && $booking['booking_source'] === 'corporate') {
                require_once '../utils/payment_sync_helper.php';
                PaymentSyncHelper::validateCorporateBookingPaymentStatus($invoice['booking_id'], $this->conn);
            }

            // Log activity
            $this->logger->log($user_id, 'payment_processed', 'payments', $payment_id, 
                              "Payment processed for invoice {$invoice['invoice_number']} - Amount: {$amount} - Method: {$payment_method}");

            // Send payment confirmation (you can implement email/SMS here)
            $this->sendPaymentConfirmation($invoice, $receipt_number, $amount);

            return $this->response->success([
                'payment_id' => $payment_id,
                'receipt_number' => $receipt_number,
                'status' => 'completed',
                'message' => 'Payment processed successfully',
                'invoice_number' => $invoice['invoice_number'],
                'guest_name' => $invoice['first_name'] . ' ' . $invoice['last_name'],
                'amount' => $amount,
                'payment_method' => $payment_method
            ]);

        } catch (Exception $e) {
            $this->logger->log($user_id ?? 0, 'error', 'payments', 0, "Error processing payment: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    // Get payment history
    public function getPaymentHistory($filters = []) {
        try {
            $where_conditions = [];
            $params = [];
            $types = '';

            if (!empty($filters['booking_id'])) {
                $where_conditions[] = "booking_id = ?";
                $params[] = $filters['booking_id'];
                $types .= 'i';
            }

            if (!empty($filters['guest_name'])) {
                $where_conditions[] = "guest_name LIKE ?";
                $params[] = "%{$filters['guest_name']}%";
                $types .= 's';
            }

            if (!empty($filters['payment_method'])) {
                $where_conditions[] = "payment_method = ?";
                $params[] = $filters['payment_method'];
                $types .= 's';
            }

            if (!empty($filters['date_from'])) {
                $where_conditions[] = "payment_date >= ?";
                $params[] = $filters['date_from'];
                $types .= 's';
            }

            if (!empty($filters['date_to'])) {
                $where_conditions[] = "payment_date <= ?";
                $params[] = $filters['date_to'];
                $types .= 's';
            }

            $where_clause = !empty($where_conditions) ? "WHERE " . implode(" AND ", $where_conditions) : "";

            // Create a unified query that combines all payment sources
            $sql = "
                SELECT 
                    id,
                    'payments' as source_table,
                    invoice_id,
                    booking_id,
                    amount,
                    payment_method,
                    payment_status,
                    transaction_id,
                    payment_date,
                    receipt_number,
                    notes,
                    processed_by,
                    invoice_number,
                    booking_reference,
                    guest_name,
                    guest_phone,
                    processed_by_name
                FROM (
                    SELECT 
                        p.id,
                        p.invoice_id,
                        p.booking_id,
                        p.amount,
                        p.payment_method,
                        p.payment_status,
                        p.transaction_id,
                        p.payment_date,
                        p.receipt_number,
                        p.notes,
                        p.processed_by,
                        i.invoice_number,
                        b.booking_reference,
                        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                        g.phone as guest_phone,
                        u.full_name as processed_by_name
                    FROM payments p
                    JOIN invoices i ON p.invoice_id = i.id
                    JOIN bookings b ON p.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN users u ON p.processed_by = u.id
                    
                    UNION ALL
                    
                    SELECT 
                        wip.id,
                        NULL as invoice_id,
                        wip.booking_id,
                        wip.amount,
                        wip.payment_method,
                        wip.payment_status,
                        wip.transaction_id,
                        wip.payment_date,
                        wip.receipt_number,
                        wip.notes,
                        wip.processed_by,
                        CONCAT('WIP-', wip.id) as invoice_number,
                        b.booking_reference,
                        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                        g.phone as guest_phone,
                        u.full_name as processed_by_name
                    FROM walk_in_payments wip
                    JOIN bookings b ON wip.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN users u ON wip.processed_by = u.id
                    
                    UNION ALL
                    
                    SELECT 
                        rp.id,
                        NULL as invoice_id,
                        rp.booking_id,
                        rp.payment_amount as amount,
                        rp.payment_method,
                        'completed' as payment_status,
                        rp.transaction_id,
                        rp.payment_date,
                        rp.receipt_number,
                        rp.notes,
                        rp.processed_by,
                        CONCAT('RP-', rp.id) as invoice_number,
                        b.booking_reference,
                        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                        g.phone as guest_phone,
                        u.full_name as processed_by_name
                    FROM remaining_payments rp
                    JOIN bookings b ON rp.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN users u ON rp.processed_by = u.id
                ) as unified_payments
                {$where_clause}
                ORDER BY payment_date DESC
            ";

            $stmt = $this->conn->prepare($sql);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $payments = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            return $this->response->success([
                'payments' => $payments,
                'total_count' => count($payments)
            ]);

        } catch (Exception $e) {
            $this->logger->log(0, 'error', 'payments', 0, "Error fetching payment history: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    // Get invoice details
    public function getInvoiceDetails($invoice_id) {
        try {
            $stmt = $this->conn->prepare("
                SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.email as guest_email, g.phone as guest_phone,
                       r.room_number, rt.name as room_type,
                       u.full_name as created_by_name
                FROM invoices i
                JOIN bookings b ON i.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                JOIN users u ON i.created_by = u.id
                WHERE i.id = ?
            ");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $invoice = $stmt->get_result()->fetch_assoc();

            if (!$invoice) {
                return $this->response->error("Invoice not found", 404);
            }

            // Get invoice items
            $stmt = $this->conn->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            // Get payments
            $stmt = $this->conn->prepare("SELECT * FROM payments WHERE invoice_id = ?");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $payments = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            return $this->response->success([
                'invoice' => $invoice,
                'items' => $items,
                'payments' => $payments
            ]);

        } catch (Exception $e) {
            $this->logger->log(0, 'error', 'invoices', 0, "Error fetching invoice details: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    // Get available payment methods
    public function getPaymentMethods() {
        try {
            $stmt = $this->conn->prepare("SELECT * FROM payment_methods WHERE is_active = 1");
            $stmt->execute();
            $methods = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            return $this->response->success(['payment_methods' => $methods]);
        } catch (Exception $e) {
            return $this->response->error("Internal server error", 500);
        }
    }

    // Private helper methods
    private function addInvoiceItem($invoice_id, $type, $description, $quantity, $unit_price, $total_price) {
        $stmt = $this->conn->prepare("
            INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("issddd", $invoice_id, $type, $description, $quantity, $unit_price, $total_price);
        return $stmt->execute();
    }

    private function getTaxRates() {
        $stmt = $this->conn->prepare("SELECT * FROM tax_rates WHERE is_active = 1");
        $stmt->execute();
        return $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    }

    private function processPaymentMethod($method, $data) {
        switch ($method) {
            case 'cash':
                return ['success' => true, 'message' => 'Cash payment processed'];
            
            case 'credit_card':
            case 'debit_card':
                // Simulate card processing
                if (empty($data['card_last_four']) || empty($data['card_type'])) {
                    return ['success' => false, 'message' => 'Card details required'];
                }
                return ['success' => true, 'message' => 'Card payment processed'];
            
            case 'upi':
                if (empty($data['transaction_id'])) {
                    return ['success' => false, 'message' => 'UPI transaction ID required'];
                }
                return ['success' => true, 'message' => 'UPI payment processed'];
            
            case 'bank_transfer':
                if (empty($data['bank_name'])) {
                    return ['success' => false, 'message' => 'Bank name required'];
                }
                return ['success' => true, 'message' => 'Bank transfer processed'];
            
            case 'cheque':
                if (empty($data['cheque_number'])) {
                    return ['success' => false, 'message' => 'Cheque number required'];
                }
                return ['success' => true, 'message' => 'Cheque payment processed'];
            
            default:
                return ['success' => false, 'message' => 'Invalid payment method'];
        }
    }

    // Helper method to update booking payment status
    private function updateBookingPaymentStatus($booking_id) {
        try {
            // Check if all invoices for this booking are paid
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as total_invoices, 
                       SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices
                FROM invoices 
                WHERE booking_id = ?
            ");
            $stmt->bind_param("i", $booking_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();

            if ($result['total_invoices'] > 0 && $result['total_invoices'] === $result['paid_invoices']) {
                // All invoices are paid, update booking status
                $stmt = $this->conn->prepare("
                    UPDATE bookings 
                    SET payment_status = 'paid', 
                        updated_at = NOW() 
                    WHERE id = ?
                ");
                $stmt->bind_param("i", $booking_id);
                $stmt->execute();
            }
        } catch (Exception $e) {
            $this->logger->log(0, 'error', 'bookings', $booking_id, "Error updating booking payment status: " . $e->getMessage());
        }
    }

    // Helper method to send payment confirmation
    private function sendPaymentConfirmation($invoice, $receipt_number, $amount) {
        try {
            // Here you can implement email/SMS sending logic
            // For now, we'll just log it
            $this->logger->log(0, 'payment_confirmation_sent', 'payments', 0, 
                              "Payment confirmation sent for invoice {$invoice['invoice_number']} to {$invoice['email']}");
            
            // TODO: Implement actual email/SMS sending
            // You can use PHPMailer, SendGrid, or any other email service
            
        } catch (Exception $e) {
            $this->logger->log(0, 'error', 'payments', 0, "Error sending payment confirmation: " . $e->getMessage());
        }
    }

    // Method to create Razorpay order
    public function createRazorpayOrder($data) {
        try {
            require_once '../config/razorpay.php';
            
            $amount = $data['amount'];
            $invoice_id = $data['invoice_id'];
            $guest_name = $data['guest_name'];
            $guest_email = $data['guest_email'];
            $guest_phone = $data['guest_phone'];

            // Validate amount
            $amount_validation = validatePaymentAmount($amount);
            if (!$amount_validation['valid']) {
                return $this->response->error($amount_validation['message'], 400);
            }

            $api = getRazorpayInstance();
            if (!$api) {
                return $this->response->error("Payment gateway not available", 500);
            }

            // Create order
            $orderData = [
                'receipt' => 'INV-' . $invoice_id,
                'amount' => formatAmountForRazorpay($amount),
                'currency' => RAZORPAY_CURRENCY,
                'notes' => [
                    'invoice_id' => $invoice_id,
                    'guest_name' => $guest_name,
                    'guest_email' => $guest_email
                ]
            ];

            $razorpayOrder = $api->order->create($orderData);

            return $this->response->success([
                'order_id' => $razorpayOrder['id'],
                'amount' => $amount,
                'currency' => RAZORPAY_CURRENCY,
                'key_id' => RAZORPAY_KEY_ID,
                'company_name' => COMPANY_NAME,
                'company_email' => COMPANY_EMAIL
            ]);

        } catch (Exception $e) {
            $this->logger->log(0, 'error', 'razorpay', 0, "Error creating Razorpay order: " . $e->getMessage());
            return $this->response->error("Failed to create payment order", 500);
        }
    }

    // Method to get payment statistics
    public function getPaymentStats($filters = []) {
        try {
            $where_conditions = [];
            $params = [];
            $types = '';

            if (!empty($filters['date_from'])) {
                $where_conditions[] = "p.payment_date >= ?";
                $params[] = $filters['date_from'];
                $types .= 's';
            }

            if (!empty($filters['date_to'])) {
                $where_conditions[] = "p.payment_date <= ?";
                $params[] = $filters['date_to'];
                $types .= 's';
            }

            if (!empty($filters['payment_method'])) {
                $where_conditions[] = "p.payment_method = ?";
                $params[] = $filters['payment_method'];
                $types .= 's';
            }

            $where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

            // Get total revenue
            $stmt = $this->conn->prepare("
                SELECT 
                    COUNT(*) as total_payments,
                    SUM(amount) as total_revenue,
                    AVG(amount) as average_payment,
                    COUNT(CASE WHEN payment_method = 'online' THEN 1 END) as online_payments,
                    COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_payments,
                    COUNT(CASE WHEN payment_method = 'credit_card' THEN 1 END) as card_payments
                FROM payments p
                WHERE payment_status = 'completed'
                {$where_clause}
            ");

            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $stats = $stmt->get_result()->fetch_assoc();

            // Get daily revenue for the last 30 days
            $stmt = $this->conn->prepare("
                SELECT 
                    DATE(payment_date) as date,
                    SUM(amount) as daily_revenue,
                    COUNT(*) as daily_payments
                FROM payments 
                WHERE payment_status = 'completed' 
                AND payment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY DATE(payment_date)
                ORDER BY date DESC
            ");
            $stmt->execute();
            $daily_stats = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            return $this->response->success([
                'summary' => $stats,
                'daily_stats' => $daily_stats,
                'currency' => 'INR'
            ]);

        } catch (Exception $e) {
            $this->logger->log(0, 'error', 'payments', 0, "Error getting payment stats: " . $e->getMessage());
            return $this->response->error("Failed to get payment statistics", 500);
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$database = new Database();
$db = $database->getConnection();
$billingAPI = new BillingAPI($db);

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            switch ($action) {
                case 'generate_invoice':
                    echo json_encode($billingAPI->generateInvoice($data));
                    break;
                
                case 'process_payment':
                    echo json_encode($billingAPI->processPayment($data));
                    break;
                
                default:
                    echo json_encode(['error' => 'Invalid action']);
            }
            break;
        
        case 'GET':
            switch ($action) {
                case 'payment_history':
                    $filters = $_GET;
                    unset($filters['action']);
                    echo json_encode($billingAPI->getPaymentHistory($filters));
                    break;
                
                case 'invoice_details':
                    $invoice_id = $_GET['invoice_id'] ?? 0;
                    echo json_encode($billingAPI->getInvoiceDetails($invoice_id));
                    break;
                
                case 'payment_methods':
                    echo json_encode($billingAPI->getPaymentMethods());
                    break;
                
                default:
                    echo json_encode(['error' => 'Invalid action']);
            }
            break;
        
        default:
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
}
?>
