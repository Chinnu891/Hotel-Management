<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../config/razorpay.php';

class BillingAPIEndpoint {
    private $conn;
    private $razorpay;

    public function __construct($db) {
        $this->conn = $db;
        $this->razorpay = getRazorpayInstance();
    }

    // Get billing statistics
    public function getBillingStats() {
        try {
            // Check if tables exist
            $stmt = $this->conn->query("SHOW TABLES LIKE 'invoices'");
            if ($stmt->rowCount() == 0) {
                return [
                    'totalInvoices' => 0,
                    'pendingPayments' => 0,
                    'totalRevenue' => 0,
                    'todayPayments' => 0
                ];
            }

            // Get total invoices
            $stmt = $this->conn->query("SELECT COUNT(*) as count FROM invoices");
            $totalInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Get pending payments
            $stmt = $this->conn->query("SELECT COUNT(*) as count FROM invoices WHERE status = 'pending'");
            $pendingPayments = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Get total revenue
            $stmt = $this->conn->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'paid'");
            $totalRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get today's payments
            $stmt = $this->conn->query("
                SELECT COALESCE(SUM(p.amount), 0) as total 
                FROM payments p 
                WHERE DATE(p.payment_date) = CURDATE() AND p.payment_status = 'completed'
            ");
            $todayPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            return [
                'totalInvoices' => (int)$totalInvoices,
                'pendingPayments' => (int)$pendingPayments,
                'totalRevenue' => (float)$totalRevenue,
                'todayPayments' => (float)$todayPayments
            ];

        } catch (Exception $e) {
            error_log("Error getting billing stats: " . $e->getMessage());
            return [
                'totalInvoices' => 0,
                'pendingPayments' => 0,
                'totalRevenue' => 0,
                'todayPayments' => 0
            ];
        }
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
            $stmt->execute([$booking_id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                return [
                    'success' => false,
                    'message' => 'Booking not found'
                ];
            }

            // Calculate room charges
            $check_in = new DateTime($booking['check_in_date']);
            $check_out = new DateTime($booking['check_out_date']);
            $nights = $check_out->diff($check_in)->days;
            $room_charges = $nights * $booking['base_price'];

            // Get tax rates
            $stmt = $this->conn->query("SELECT tax_rate FROM tax_rates WHERE is_active = 1 AND applies_to IN ('all', 'room_charges')");
            $tax_rates = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $tax_amount = 0;
            foreach ($tax_rates as $tax) {
                $tax_amount += ($room_charges * $tax['tax_rate'] / 100);
            }

            $subtotal = $room_charges;
            $total_amount = $subtotal + $tax_amount;

            // Generate invoice number
            $invoice_number = 'INV-' . date('Y') . '-' . str_pad($booking_id, 6, '0', STR_PAD_LEFT);

            // Check if invoice already exists
            $stmt = $this->conn->prepare("SELECT id FROM invoices WHERE booking_id = ?");
            $stmt->execute([$booking_id]);
            if ($stmt->rowCount() > 0) {
                return [
                    'success' => false,
                    'message' => 'Invoice already exists for this booking'
                ];
            }

            // Create invoice
            $stmt = $this->conn->prepare("
                INSERT INTO invoices (invoice_number, booking_id, guest_id, room_id, 
                                    subtotal, tax_amount, total_amount, created_by, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([
                $invoice_number, 
                $booking_id, 
                $booking['guest_id'], 
                $booking['room_id'], 
                $subtotal, 
                $tax_amount, 
                $total_amount, 
                $user_id
            ]);

            $invoice_id = $this->conn->lastInsertId();

            // Create invoice items
            $this->addInvoiceItem($invoice_id, 'room_charge', "Room {$booking['room_number']} - {$booking['room_type']} ({$nights} nights)", 1, $booking['base_price'], $room_charges);
            
            if ($tax_amount > 0) {
                $this->addInvoiceItem($invoice_id, 'tax', 'Tax', 1, $tax_amount, $tax_amount);
            }

            return [
                'success' => true,
                'message' => 'Invoice generated successfully',
                'invoice_id' => $invoice_id,
                'invoice_number' => $invoice_number,
                'total_amount' => $total_amount
            ];

        } catch (Exception $e) {
            error_log("Error generating invoice: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to generate invoice',
                'error' => $e->getMessage()
            ];
        }
    }

    // Add invoice item
    private function addInvoiceItem($invoice_id, $item_type, $description, $quantity, $unit_price, $total_price) {
        try {
            $stmt = $this->conn->prepare("
                INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$invoice_id, $item_type, $description, $quantity, $unit_price, $total_price]);
            return true;
        } catch (Exception $e) {
            error_log("Error adding invoice item: " . $e->getMessage());
            return false;
        }
    }

    // Create Razorpay order
    public function createRazorpayOrder($data) {
        try {
            $invoice_id = $data['invoice_id'];
            $amount = $data['amount'];

            // Get invoice details
            $stmt = $this->conn->prepare("
                SELECT i.*, b.booking_reference, CONCAT(g.first_name, ' ', g.last_name) as guest_name
                FROM invoices i
                JOIN bookings b ON i.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                WHERE i.id = ?
            ");
            $stmt->execute([$invoice_id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                return [
                    'success' => false,
                    'message' => 'Invoice not found'
                ];
            }

            // Create Razorpay order
            $orderData = [
                'receipt' => $invoice['invoice_number'],
                'amount' => $amount * 100, // Convert to paise
                'currency' => 'INR',
                'notes' => [
                    'invoice_id' => $invoice_id,
                    'booking_reference' => $invoice['booking_reference'],
                    'guest_name' => $invoice['guest_name']
                ]
            ];

            $order = $this->razorpay->order->create($orderData);

            return [
                'success' => true,
                'order_id' => $order->id,
                'amount' => $amount,
                'currency' => 'INR'
            ];

        } catch (Exception $e) {
            error_log("Error creating Razorpay order: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to create payment order',
                'error' => $e->getMessage()
            ];
        }
    }

    // Process payment
    public function processPayment($data) {
        try {
            $invoice_id = $data['invoice_id'];
            $amount = $data['amount'];
            $payment_method = $data['payment_method'];
            $transaction_id = $data['transaction_id'] ?? null;
            $razorpay_payment_id = $data['razorpay_payment_id'] ?? null;
            $razorpay_order_id = $data['razorpay_order_id'] ?? null;
            $razorpay_signature = $data['razorpay_signature'] ?? null;

            // Get invoice details
            $stmt = $this->conn->prepare("
                SELECT i.*, b.id as booking_id, b.guest_id
                FROM invoices i
                JOIN bookings b ON i.booking_id = b.id
                WHERE i.id = ?
            ");
            $stmt->execute([$invoice_id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                return [
                    'success' => false,
                    'message' => 'Invoice not found'
                ];
            }

            // Validate amount
            if (abs($amount - $invoice['total_amount']) > 0.01) {
                return [
                    'success' => false,
                    'message' => 'Payment amount does not match invoice total'
                ];
            }

            // Verify Razorpay payment if it's an online payment
            if ($payment_method === 'razorpay' && $razorpay_payment_id && $razorpay_order_id && $razorpay_signature) {
                $verification = $this->verifyPaymentSignature($razorpay_payment_id, $razorpay_order_id, $razorpay_signature);
                if (!$verification['success']) {
                    return $verification;
                }
            }

            // Generate receipt number
            $receipt_number = 'RCP-' . date('Y') . '-' . str_pad($invoice_id, 6, '0', STR_PAD_LEFT);

            // Insert payment record
            $stmt = $this->conn->prepare("
                INSERT INTO payments (invoice_id, booking_id, amount, payment_method, payment_status, 
                                    transaction_id, receipt_number, processed_by, razorpay_payment_id, 
                                    razorpay_order_id, razorpay_signature)
                VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $invoice_id, 
                $invoice['booking_id'], 
                $amount, 
                $payment_method, 
                $transaction_id, 
                $receipt_number, 
                1, // processed_by (user ID)
                $razorpay_payment_id,
                $razorpay_order_id,
                $razorpay_signature
            ]);

            // Update invoice status
            $stmt = $this->conn->prepare("
                UPDATE invoices SET status = 'paid', due_date = NULL WHERE id = ?
            ");
            $stmt->execute([$invoice_id]);

            // Update booking payment status
            $this->updateBookingPaymentStatus($invoice['booking_id']);

            // Send payment confirmation
            $this->sendPaymentConfirmation($invoice_id, $amount, $payment_method);

            return [
                'success' => true,
                'message' => 'Payment processed successfully',
                'receipt_number' => $receipt_number,
                'amount' => $amount,
                'payment_method' => $payment_method
            ];

        } catch (Exception $e) {
            error_log("Error processing payment: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to process payment',
                'error' => $e->getMessage()
            ];
        }
    }

    // Verify Razorpay payment signature
    private function verifyPaymentSignature($payment_id, $order_id, $signature) {
        try {
            $attributes = [
                'razorpay_payment_id' => $payment_id,
                'razorpay_order_id' => $order_id,
                'razorpay_signature' => $signature
            ];

            $this->razorpay->utility->verifyPaymentSignature($attributes);
            return ['success' => true];

        } catch (Exception $e) {
            error_log("Payment signature verification failed: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Payment verification failed',
                'error' => $e->getMessage()
            ];
        }
    }

    // Update booking payment status
    private function updateBookingPaymentStatus($booking_id) {
        try {
            // Check if all invoices for this booking are paid
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as total, 
                       SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid
                FROM invoices WHERE booking_id = ?
            ");
            $stmt->execute([$booking_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result['total'] > 0 && $result['total'] == $result['paid']) {
                // All invoices are paid, update booking payment status
                $stmt = $this->conn->prepare("
                    UPDATE bookings SET payment_status = 'paid' WHERE id = ?
                ");
                $stmt->execute([$booking_id]);
            }

            return true;
        } catch (Exception $e) {
            error_log("Error updating booking payment status: " . $e->getMessage());
            return false;
        }
    }

    // Send payment confirmation
    private function sendPaymentConfirmation($invoice_id, $amount, $payment_method) {
        // TODO: Implement email/SMS notification
        // For now, just log the confirmation
        error_log("Payment confirmation sent for invoice {$invoice_id}: ₹{$amount} via {$payment_method}");
        return true;
    }

    // Get payment history
    public function getPaymentHistory() {
        try {
            // Create a unified query that combines all payment sources
            $stmt = $this->conn->prepare("
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
                ORDER BY payment_date DESC
                LIMIT 50
            ");
            $stmt->execute();
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'payments' => $payments,
                'total_count' => count($payments)
            ];

        } catch (Exception $e) {
            error_log("Error getting payment history: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch payment history',
                'error' => $e->getMessage()
            ];
        }
    }

    // Get invoice details
    public function getInvoiceDetails($invoice_id) {
        try {
            $stmt = $this->conn->prepare("
                SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.email as guest_email, g.phone as guest_phone,
                       r.room_number, rt.name as room_type
                FROM invoices i
                JOIN bookings b ON i.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE i.id = ?
            ");
            $stmt->execute([$invoice_id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                return [
                    'success' => false,
                    'message' => 'Invoice not found'
                ];
            }

            // Get invoice items
            $stmt = $this->conn->prepare("
                SELECT * FROM invoice_items WHERE invoice_id = ?
            ");
            $stmt->execute([$invoice_id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $invoice['items'] = $items;

            return [
                'success' => true,
                'invoice' => $invoice
            ];

        } catch (Exception $e) {
            error_log("Error getting invoice details: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch invoice details',
                'error' => $e->getMessage()
            ];
        }
    }

    // Helper methods for responses
    public function success($data, $message = 'Success') {
        return [
            'success' => true,
            'message' => $message,
            'data' => $data
        ];
    }

    public function error($message, $error = null) {
        return [
            'success' => false,
            'message' => $message,
            'error' => $error
        ];
    }
}

// Handle API requests
try {
    $database = new Database();
    $db = $database->getConnection();
    $billingAPI = new BillingAPIEndpoint($db);

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            switch ($action) {
                case 'generate_invoice':
                    $result = $billingAPI->generateInvoice($data);
                    break;
                
                case 'create_razorpay_order':
                    $result = $billingAPI->createRazorpayOrder($data);
                    break;
                
                case 'process_payment':
                    $result = $billingAPI->processPayment($data);
                    break;
                
                default:
                    $result = $billingAPI->error('Invalid action');
            }
            break;
        
        case 'GET':
            switch ($action) {
                case 'billing_stats':
                    $data = $billingAPI->getBillingStats();
                    $result = $billingAPI->success($data, 'Billing statistics retrieved');
                    break;
                
                case 'payment_history':
                    $result = $billingAPI->getPaymentHistory();
                    break;
                
                case 'invoice_details':
                    $invoice_id = $_GET['invoice_id'] ?? 0;
                    $result = $billingAPI->getInvoiceDetails($invoice_id);
                    break;
                
                default:
                    $result = $billingAPI->error('Invalid action');
            }
            break;
        
        default:
            $result = $billingAPI->error('Method not allowed');
    }

    echo json_encode($result);

} catch (Exception $e) {
    $error_response = [
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ];
    echo json_encode($error_response);
}
?>
