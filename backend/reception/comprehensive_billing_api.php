<?php
require_once '../config/cors.php';
require_once '../config/database.php';
require_once '../config/razorpay.php';
require_once 'enhanced_invoice_generator.php';
require_once '../utils/payment_notification_service.php';

class ComprehensiveBillingAPI {
    private $conn;
    private $razorpay;
    private $invoiceGenerator;
    private $paymentNotificationService;

    public function __construct($db) {
        $this->conn = $db;
        $this->razorpay = getRazorpayInstance();
        $this->invoiceGenerator = new EnhancedInvoiceGenerator($db);
        $this->paymentNotificationService = new PaymentNotificationService($db);
    }

    // Create new invoice for a booking
    public function createInvoice($data) {
        try {
            $booking_id = $data['booking_id'];
            $user_id = $data['user_id'];
            $due_date = $data['due_date'] ?? date('Y-m-d', strtotime('+7 days'));
            $notes = $data['notes'] ?? '';

            // Validate booking exists and is active
            $stmt = $this->conn->prepare("
                SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
                       r.room_number, rt.name as room_type, rt.base_price,
                       DATEDIFF(b.check_out_date, b.check_in_date) as nights
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.id = ? AND b.status = 'confirmed'
            ");
            $stmt->bind_param("i", $booking_id);
            $stmt->execute();
            $booking = $stmt->get_result()->fetch_assoc();

            if (!$booking) {
                return [
                    'success' => false,
                    'message' => 'Booking not found or not confirmed'
                ];
            }

            // Check if invoice already exists
            $stmt = $this->conn->prepare("SELECT id FROM invoices WHERE booking_id = ?");
            $stmt->bind_param("i", $booking_id);
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) {
                return [
                    'success' => false,
                    'message' => 'Invoice already exists for this booking'
                ];
            }

            // Generate invoice number
            $invoice_number = $this->generateInvoiceNumber();

            // Calculate charges
            $room_charges = $booking['nights'] * $booking['base_price'];
            $tax_rate = $this->getTaxRate('room_charges');
            $tax_amount = $room_charges * ($tax_rate / 100);
            $subtotal = $room_charges;
            $total_amount = $subtotal + $tax_amount;

            // Create invoice
            $stmt = $this->conn->prepare("
                INSERT INTO invoices (invoice_number, booking_id, guest_id, room_id, 
                                   subtotal, tax_amount, total_amount, due_date, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("siiiddssi", 
                $invoice_number, $booking_id, $booking['guest_id'], $booking['room_id'],
                $subtotal, $tax_amount, $total_amount, $due_date, $notes, $user_id
            );

            if (!$stmt->execute()) {
                throw new Exception("Failed to create invoice");
            }

            $invoice_id = $this->conn->insert_id;

            // Create invoice items
            $this->createInvoiceItems($invoice_id, $booking, $room_charges, $tax_amount);

            return [
                'success' => true,
                'message' => 'Invoice created successfully',
                'data' => [
                    'invoice_id' => $invoice_id,
                    'invoice_number' => $invoice_number,
                    'total_amount' => $total_amount,
                    'due_date' => $due_date
                ]
            ];

        } catch (Exception $e) {
            error_log("Error creating invoice: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to create invoice: ' . $e->getMessage()
            ];
        }
    }

    // Create invoice items
    private function createInvoiceItems($invoice_id, $booking, $room_charges, $tax_amount) {
        // Room charges
        $stmt = $this->conn->prepare("
            INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
            VALUES (?, 'room_charge', ?, ?, ?, ?)
        ");
        $description = "Room {$booking['room_number']} ({$booking['room_type']}) - {$booking['nights']} nights";
        $stmt->bind_param("isidi", $invoice_id, $description, $booking['nights'], $booking['base_price'], $room_charges);
        $stmt->execute();

        // Tax
        if ($tax_amount > 0) {
            $stmt = $this->conn->prepare("
                INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total_price)
                VALUES (?, 'tax', 'GST on room charges', 1, ?, ?)
            ");
            $stmt->bind_param("idd", $invoice_id, $tax_amount, $tax_amount);
            $stmt->execute();
        }
    }

    // Generate unique invoice number
    private function generateInvoiceNumber() {
        $prefix = 'INV';
        $year = date('Y');
        $month = date('m');
        
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as count FROM invoices 
            WHERE YEAR(invoice_date) = ? AND MONTH(invoice_date) = ?
        ");
        $stmt->bind_param("ss", $year, $month);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $count = $result['count'] + 1;
        
        return $prefix . $year . $month . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    // Get tax rate
    private function getTaxRate($applies_to) {
        $stmt = $this->conn->prepare("SELECT tax_rate FROM tax_rates WHERE applies_to = ? AND is_active = 1");
        $stmt->bind_param("s", $applies_to);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        return $result ? $result['tax_rate'] : 0;
    }

    // Get all invoices with filters
    public function getInvoices($filters = []) {
        try {
            $where_conditions = [];
            $params = [];
            $types = '';

            // Build WHERE clause based on filters
            if (!empty($filters['status'])) {
                $where_conditions[] = "i.status = ?";
                $params[] = $filters['status'];
                $types .= 's';
            }

            if (!empty($filters['guest_name'])) {
                $where_conditions[] = "CONCAT(g.first_name, ' ', g.last_name) LIKE ?";
                $params[] = "%{$filters['guest_name']}%";
                $types .= 's';
            }

            if (!empty($filters['booking_reference'])) {
                $where_conditions[] = "b.booking_reference LIKE ?";
                $params[] = "%{$filters['booking_reference']}%";
                $types .= 's';
            }

            if (!empty($filters['date_from'])) {
                $where_conditions[] = "i.invoice_date >= ?";
                $params[] = $filters['date_from'];
                $types .= 's';
            }

            if (!empty($filters['date_to'])) {
                $where_conditions[] = "i.invoice_date <= ?";
                $params[] = $filters['date_to'];
                $types .= 's';
            }

            $where_clause = !empty($where_conditions) ? "WHERE " . implode(" AND ", $where_conditions) : "";

            $query = "
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
                {$where_clause}
                ORDER BY i.invoice_date DESC
            ";

            $stmt = $this->conn->prepare($query);
            if (!empty($params)) {
                $stmt->bind_param($types, ...$params);
            }
            $stmt->execute();
            $invoices = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            return [
                'success' => true,
                'data' => $invoices
            ];

        } catch (Exception $e) {
            error_log("Error getting invoices: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get invoices: ' . $e->getMessage()
            ];
        }
    }

    // Get invoice details by ID
    public function getInvoiceDetails($invoice_id) {
        try {
            $stmt = $this->conn->prepare("
                SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.email as guest_email, g.phone as guest_phone,
                       g.address as guest_address, g.city as guest_city, g.state as guest_state,
                       r.room_number, rt.name as room_type, rt.base_price,
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
                return [
                    'success' => false,
                    'message' => 'Invoice not found'
                ];
            }

            // Get invoice items
            $stmt = $this->conn->prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            // Get payment history
            $stmt = $this->conn->prepare("
                SELECT p.*, pm.method_name 
                FROM payments p 
                JOIN payment_methods pm ON p.payment_method = pm.method_code
                WHERE p.invoice_id = ? 
                ORDER BY p.payment_date DESC
            ");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $payments = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

            return [
                'success' => true,
                'data' => [
                    'invoice' => $invoice,
                    'items' => $items,
                    'payments' => $payments
                ]
            ];

        } catch (Exception $e) {
            error_log("Error getting invoice details: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get invoice details: ' . $e->getMessage()
            ];
        }
    }

    // Update invoice
    public function updateInvoice($invoice_id, $data) {
        try {
            $allowed_fields = ['due_date', 'notes', 'status'];
            $updates = [];
            $params = [];
            $types = '';

            foreach ($data as $field => $value) {
                if (in_array($field, $allowed_fields)) {
                    $updates[] = "{$field} = ?";
                    $params[] = $value;
                    $types .= 's';
                }
            }

            if (empty($updates)) {
                return [
                    'success' => false,
                    'message' => 'No valid fields to update'
                ];
            }

            $params[] = $invoice_id;
            $types .= 'i';

            $query = "UPDATE invoices SET " . implode(", ", $updates) . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->bind_param($types, ...$params);

            if ($stmt->execute()) {
                return [
                    'success' => true,
                    'message' => 'Invoice updated successfully'
                ];
            } else {
                throw new Exception("Failed to update invoice");
            }

        } catch (Exception $e) {
            error_log("Error updating invoice: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to update invoice: ' . $e->getMessage()
            ];
        }
    }

    // Delete invoice
    public function deleteInvoice($invoice_id) {
        try {
            // Check if invoice has payments
            $stmt = $this->conn->prepare("SELECT COUNT(*) as count FROM payments WHERE invoice_id = ?");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();

            if ($result['count'] > 0) {
                return [
                    'success' => false,
                    'message' => 'Cannot delete invoice with existing payments'
                ];
            }

            // Delete invoice items first
            $stmt = $this->conn->prepare("DELETE FROM invoice_items WHERE invoice_id = ?");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();

            // Delete invoice
            $stmt = $this->conn->prepare("DELETE FROM invoices WHERE id = ?");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();

            return [
                'success' => true,
                'message' => 'Invoice deleted successfully'
            ];

        } catch (Exception $e) {
            error_log("Error deleting invoice: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to delete invoice: ' . $e->getMessage()
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
            $notes = $data['notes'] ?? '';
            $processed_by = $data['processed_by'];

            // Validate invoice
            $stmt = $this->conn->prepare("SELECT * FROM invoices WHERE id = ?");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $invoice = $stmt->get_result()->fetch_assoc();

            if (!$invoice) {
                return [
                    'success' => false,
                    'message' => 'Invoice not found'
                ];
            }

            if ($invoice['status'] === 'paid') {
                return [
                    'success' => false,
                    'message' => 'Invoice is already paid'
                ];
            }

            // Generate receipt number
            $receipt_number = $this->generateReceiptNumber();

            // Create payment record
            $stmt = $this->conn->prepare("
                INSERT INTO payments (invoice_id, booking_id, amount, payment_method, 
                                   payment_status, transaction_id, receipt_number, notes, processed_by)
                VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?)
            ");
            $stmt->bind_param("iidsssi", 
                $invoice_id, $invoice['booking_id'], $amount, $payment_method,
                $transaction_id, $receipt_number, $notes, $processed_by
            );

            if (!$stmt->execute()) {
                throw new Exception("Failed to create payment record");
            }

            $payment_id = $this->conn->insert_id;

            // Get guest and room information for notification
            $stmt = $this->conn->prepare("
                SELECT g.first_name, g.last_name, r.room_number, b.booking_reference
                FROM invoices i
                JOIN bookings b ON i.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                WHERE i.id = ?
            ");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $guestInfo = $stmt->get_result()->fetch_assoc();

            // Check if invoice is fully paid
            $stmt = $this->conn->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_paid 
                FROM payments 
                WHERE invoice_id = ? AND payment_status = 'completed'
            ");
            $stmt->bind_param("i", $invoice_id);
            $stmt->execute();
            $result = $stmt->get_result()->fetch_assoc();
            $total_paid = $result['total_paid'];

            // Update invoice status
            $new_status = ($total_paid >= $invoice['total_amount']) ? 'paid' : 'partial';
            $stmt = $this->conn->prepare("UPDATE invoices SET status = ? WHERE id = ?");
            $stmt->bind_param("si", $new_status, $invoice_id);
            $stmt->execute();

            // Send real-time notification
            $paymentData = [
                'id' => $payment_id,
                'receipt_number' => $receipt_number,
                'amount' => $amount,
                'payment_method' => $payment_method,
                'guest_name' => $guestInfo['first_name'] . ' ' . $guestInfo['last_name'],
                'room_number' => $guestInfo['room_number'],
                'processed_by' => $processed_by,
                'transaction_id' => $transaction_id
            ];
            
            $this->paymentNotificationService->notifyNewPayment($paymentData);

            return [
                'success' => true,
                'message' => 'Payment processed successfully',
                'data' => [
                    'payment_id' => $payment_id,
                    'receipt_number' => $receipt_number,
                    'new_status' => $new_status,
                    'total_paid' => $total_paid
                ]
            ];

        } catch (Exception $e) {
            error_log("Error processing payment: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to process payment: ' . $e->getMessage()
            ];
        }
    }

    // Generate receipt number
    private function generateReceiptNumber() {
        $prefix = 'RCPT';
        $year = date('Y');
        $month = date('m');
        
        $stmt = $this->conn->prepare("
            SELECT COUNT(*) as count FROM payments 
            WHERE YEAR(payment_date) = ? AND MONTH(payment_date) = ?
        ");
        $stmt->bind_param("ss", $year, $month);
        $stmt->execute();
        $result = $stmt->get_result()->fetch_assoc();
        $count = $result['count'] + 1;
        
        return $prefix . $year . $month . str_pad($count, 4, '0', STR_PAD_LEFT);
    }

    // Get billing statistics
    public function getBillingStats() {
        try {
            // Total invoices
            $stmt = $this->conn->query("SELECT COUNT(*) as count FROM invoices");
            $totalInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Pending payments
            $stmt = $this->conn->query("SELECT COUNT(*) as count FROM invoices WHERE status IN ('pending', 'sent', 'overdue')");
            $pendingPayments = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            // Total revenue
            $stmt = $this->conn->query("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE status = 'paid'");
            $totalRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Today's payments
            $stmt = $this->conn->query("
                SELECT COALESCE(SUM(p.amount), 0) as total 
                FROM payments p 
                WHERE DATE(p.payment_date) = CURDATE() AND p.payment_status = 'completed'
            ");
            $todayPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Overdue invoices
            $stmt = $this->conn->query("
                SELECT COUNT(*) as count 
                FROM invoices 
                WHERE status IN ('sent', 'pending') AND due_date < CURDATE()
            ");
            $overdueInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

            return [
                'success' => true,
                'data' => [
                    'totalInvoices' => (int)$totalInvoices,
                    'pendingPayments' => (int)$pendingPayments,
                    'totalRevenue' => (float)$totalRevenue,
                    'todayPayments' => (float)$todayPayments,
                    'overdueInvoices' => (int)$overdueInvoices
                ]
            ];

        } catch (Exception $e) {
            error_log("Error getting billing stats: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get billing statistics: ' . $e->getMessage()
            ];
        }
    }

    // Generate invoice in different formats
    public function generateInvoiceFormat($invoice_id, $format) {
        return $this->invoiceGenerator->generateInvoice($invoice_id, $format);
    }

    // Download invoice
    public function downloadInvoice($invoice_id) {
        return $this->invoiceGenerator->downloadInvoice($invoice_id);
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';

    $database = new Database();
    $db = $database->getConnection();
    $api = new ComprehensiveBillingAPI($db);

    switch ($action) {
        case 'create_invoice':
            $result = $api->createInvoice($input);
            break;
            
        case 'update_invoice':
            $invoice_id = $_GET['invoice_id'] ?? null;
            if ($invoice_id) {
                $result = $api->updateInvoice($invoice_id, $input);
            } else {
                $result = ['success' => false, 'message' => 'Invoice ID required'];
            }
            break;
            
        case 'process_payment':
            $result = $api->processPayment($input);
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }

    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}

// Handle GET requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    
    $database = new Database();
    $db = $database->getConnection();
    $api = new ComprehensiveBillingAPI($db);

    switch ($action) {
        case 'get_invoices':
            $filters = $_GET;
            unset($filters['action']);
            $result = $api->getInvoices($filters);
            break;
            
        case 'get_invoice_details':
            $invoice_id = $_GET['invoice_id'] ?? null;
            if ($invoice_id) {
                $result = $api->getInvoiceDetails($invoice_id);
            } else {
                $result = ['success' => false, 'message' => 'Invoice ID required'];
            }
            break;
            
        case 'billing_stats':
            $result = $api->getBillingStats();
            break;
            
        case 'generate_invoice':
            $invoice_id = $_GET['invoice_id'] ?? null;
            $format = $_GET['format'] ?? 'html';
            if ($invoice_id) {
                $result = $api->generateInvoiceFormat($invoice_id, $format);
            } else {
                $result = ['success' => false, 'message' => 'Invoice ID required'];
            }
            break;
            
        case 'download_invoice':
            $invoice_id = $_GET['invoice_id'] ?? null;
            if ($invoice_id) {
                $api->downloadInvoice($invoice_id);
                exit;
            } else {
                $result = ['success' => false, 'message' => 'Invoice ID required'];
            }
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Invalid action'];
    }

    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}
?>
