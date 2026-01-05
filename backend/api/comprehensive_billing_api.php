<?php
// Ensure no output before JSON response
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Start output buffering to prevent any unexpected output
ob_start();

// TEST: This should appear in the error log if this file is being executed
error_log("=== COMPREHENSIVE BILLING API FILE IS BEING EXECUTED ===");



require_once '../utils/cors_headers.php';
require_once '../config/database.php';

class ComprehensiveBillingAPI {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Generate invoice for a booking
    public function generateInvoice($data) {
        try {
            $booking_id = $data['booking_id'] ?? $data['id'] ?? null;
            $user_id = $data['user_id'] ?? 1;

            // Get booking details with room_number instead of room_id
            $stmt = $this->conn->prepare("
                SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
                       b.room_number, rt.name as room_type, rt.base_price
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

            // Calculate additional charges
            $service_charges = 0;
            $tax_rate = 0.18; // 18% GST
            $tax_amount = ($room_charges + $service_charges) * $tax_rate;

            $subtotal = $room_charges + $service_charges;
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
                INSERT INTO invoices (invoice_number, booking_id, guest_id, room_number, 
                                    subtotal, tax_amount, total_amount, created_by, status, invoice_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', NOW())
            ");
            $stmt->execute([
                $invoice_number, 
                $booking_id, 
                $booking['guest_id'], 
                $booking['room_number'], 
                $subtotal, 
                $tax_amount, 
                $total_amount, 
                $user_id
            ]);

            $invoice_id = $this->conn->lastInsertId();

            return [
                'success' => true,
                'message' => 'Invoice generated successfully',
                'invoice_id' => $invoice_id,
                'invoice_number' => $invoice_number,
                'total_amount' => $total_amount,
                'details' => [
                    'guest_name' => $booking['first_name'] . ' ' . $booking['last_name'],
                    'room_number' => $booking['room_number'],
                    'nights' => $nights,
                    'room_charges' => $room_charges,
                    'tax_amount' => $tax_amount
                ]
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

    // Get invoice details
    public function getInvoiceDetails($invoice_id) {
        try {
            $stmt = $this->conn->prepare("
                SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.email as guest_email, g.phone as guest_phone,
                       i.room_number, rt.name as room_type
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

            // Generate enhanced HTML for invoice
            $html = $this->generateInvoiceHTML($invoice);

            return [
                'success' => true,
                'invoice' => $invoice,
                'html' => $html
            ];

        } catch (Exception $e) {
            error_log("Error fetching invoice details: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch invoice details',
                'error' => $e->getMessage()
            ];
        }
    }

    // Get all invoices
    public function getAllInvoices($filters = []) {
        try {
            $whereClause = "WHERE 1=1";
            $params = [];

            if (!empty($filters['status'])) {
                $whereClause .= " AND i.status = ?";
                $params[] = $filters['status'];
            }

            if (!empty($filters['date_from'])) {
                $whereClause .= " AND DATE(i.invoice_date) >= ?";
                $params[] = $filters['date_from'];
            }

            if (!empty($filters['date_to'])) {
                $whereClause .= " AND DATE(i.invoice_date) <= ?";
                $params[] = $filters['date_to'];
            }

            $stmt = $this->conn->prepare("
                SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.phone as guest_phone,
                       i.room_number
                FROM invoices i
                JOIN bookings b ON i.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                {$whereClause}
                ORDER BY i.invoice_date DESC
            ");
            $stmt->execute($params);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'invoices' => $invoices
            ];

        } catch (Exception $e) {
            error_log("Error fetching invoices: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch invoices',
                'error' => $e->getMessage()
            ];
        }
    }

    // Update invoice status
    public function updateInvoiceStatus($invoice_id, $status, $user_id) {
        try {
            $stmt = $this->conn->prepare("
                UPDATE invoices 
                SET status = ?
                WHERE id = ?
            ");
            $stmt->execute([$status, $invoice_id]);

            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Invoice status updated successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Invoice not found or no changes made'
                ];
            }

        } catch (Exception $e) {
            error_log("Error updating invoice status: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to update invoice status',
                'error' => $e->getMessage()
            ];
        }
    }

    // Delete invoice
    public function deleteInvoice($invoice_id, $user_id) {
        try {
            $stmt = $this->conn->prepare("DELETE FROM invoices WHERE id = ?");
            $stmt->execute([$invoice_id]);

            if ($stmt->rowCount() > 0) {
                return [
                    'success' => true,
                    'message' => 'Invoice deleted successfully'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Invoice not found'
                ];
            }

        } catch (Exception $e) {
            error_log("Error deleting invoice: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to delete invoice',
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
            $user_id = $data['user_id'] ?? $data['processed_by'] ?? 1;

            // Validate invoice
            $stmt = $this->conn->prepare("SELECT * FROM invoices WHERE id = ?");
            $stmt->execute([$invoice_id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

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

            // Get guest and room information for notification
            $stmt = $this->conn->prepare("
                SELECT b.room_number, CONCAT(g.first_name, ' ', g.last_name) as guest_name
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                WHERE b.id = ?
            ");
            $stmt->execute([$invoice['booking_id']]);
            $guest_info = $stmt->fetch(PDO::FETCH_ASSOC);

            // Generate receipt number
            $receipt_number = 'RCPT-' . date('Y') . '-' . str_pad($invoice_id, 6, '0', STR_PAD_LEFT);

            // Create payment record
            $stmt = $this->conn->prepare("
                INSERT INTO payments (invoice_id, booking_id, amount, payment_method,
                                    payment_status, transaction_id, receipt_number, processed_by)
                VALUES (?, ?, ?, ?, 'completed', ?, ?, ?)
            ");
            $stmt->execute([
                $invoice_id, $invoice['booking_id'], $amount, $payment_method,
                $transaction_id, $receipt_number, $user_id
            ]);

            $payment_id = $this->conn->lastInsertId();

            // Check if invoice is fully paid
            $stmt = $this->conn->prepare("
                SELECT COALESCE(SUM(amount), 0) as total_paid 
                FROM payments 
                WHERE invoice_id = ? AND payment_status = 'completed'
            ");
            $stmt->execute([$invoice_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $total_paid = $result['total_paid'];

            // Update invoice status
            $new_status = ($total_paid >= $invoice['total_amount']) ? 'paid' : 'partial';
            $stmt = $this->conn->prepare("UPDATE invoices SET status = ? WHERE id = ?");
            $stmt->execute([$new_status, $invoice_id]);

            // Validate and sync payment status for corporate bookings
            $stmt = $this->conn->prepare("SELECT booking_source FROM bookings WHERE id = ?");
            $stmt->execute([$invoice['booking_id']]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($booking && $booking['booking_source'] === 'corporate') {
                require_once '../utils/payment_sync_helper.php';
                PaymentSyncHelper::validateCorporateBookingPaymentStatus($invoice['booking_id'], $this->conn);
            }

            // Send real-time notification
            $this->notifyPaymentProcessed([
                'payment_id' => $payment_id,
                'receipt_number' => $receipt_number,
                'amount' => $amount,
                'payment_method' => $payment_method,
                'guest_name' => $guest_info['guest_name'] ?? 'Unknown',
                'room_number' => $guest_info['room_number'] ?? 'Unknown'
            ]);

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

    /**
     * Send payment notification
     */
    private function notifyPaymentProcessed($payment_data) {
        try {
            require_once '../utils/payment_notification_service.php';
            $notificationService = new PaymentNotificationService();
            $notificationService->notifyPaymentProcessed($payment_data);
        } catch (Exception $e) {
            error_log("Failed to send payment notification: " . $e->getMessage());
        }
    }

    /**
     * Send refund notification
     */
    private function notifyRefundProcessed($refund_data) {
        try {
            require_once '../utils/payment_notification_service.php';
            $notificationService = new PaymentNotificationService();
            $notificationService->notifyRefundProcessed($refund_data);
        } catch (Exception $e) {
            error_log("Failed to send refund notification: " . $e->getMessage());
        }
    }

    // Get payment history with enhanced filtering and pagination
    public function getPaymentHistory($filters = []) {
        try {
            error_log("getPaymentHistory called with filters: " . json_encode($filters));
            
            $where_conditions = [];
            $params = [];

            if (!empty($filters['booking_id'])) {
                $where_conditions[] = "booking_id = ?";
                $params[] = $filters['booking_id'];
            }

            if (!empty($filters['guest_name'])) {
                $where_conditions[] = "guest_name LIKE ?";
                $params[] = "%{$filters['guest_name']}%";
            }

            if (!empty($filters['payment_method'])) {
                $where_conditions[] = "payment_method = ?";
                $params[] = $filters['payment_method'];
            }

            if (!empty($filters['payment_status'])) {
                $where_conditions[] = "payment_status = ?";
                $params[] = $filters['payment_status'];
            }

            if (!empty($filters['date_from'])) {
                $where_conditions[] = "DATE(payment_date) >= ?";
                $params[] = $filters['date_from'];
            }

            if (!empty($filters['date_to'])) {
                $where_conditions[] = "DATE(payment_date) <= ?";
                $params[] = $filters['date_to'];
            }

            if (!empty($filters['amount_min'])) {
                $where_conditions[] = "amount >= ?";
                $params[] = $filters['amount_min'];
            }

            if (!empty($filters['amount_max'])) {
                $where_conditions[] = "amount <= ?";
                $params[] = $filters['amount_max'];
            }

            if (!empty($filters['processed_by'])) {
                $where_conditions[] = "processed_by_name LIKE ?";
                $params[] = "%{$filters['processed_by']}%";
            }

            $where_clause = !empty($where_conditions) ? "WHERE " . implode(" AND ", $where_conditions) : "";

            // Create a unified query that combines all payment sources
            $unified_sql = "
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

            error_log("Unified SQL query: " . $unified_sql);

            // Get total count for pagination
            $count_sql = "
                SELECT COUNT(*) as total
                FROM (
                    SELECT 
                        p.id,
                        p.booking_id,
                        p.amount,
                        p.payment_method,
                        p.payment_status,
                        p.payment_date,
                        p.processed_by,
                        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                        u.full_name as processed_by_name
                    FROM payments p
                    JOIN invoices i ON p.invoice_id = i.id
                    JOIN bookings b ON p.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN users u ON p.processed_by = u.id
                    
                    UNION ALL
                    
                    SELECT 
                        wip.id,
                        wip.booking_id,
                        wip.amount,
                        wip.payment_method,
                        wip.payment_status,
                        wip.payment_date,
                        wip.processed_by,
                        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                        u.full_name as processed_by_name
                    FROM walk_in_payments wip
                    JOIN bookings b ON wip.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN users u ON wip.processed_by = u.id
                    
                    UNION ALL
                    
                    SELECT 
                        rp.id,
                        rp.booking_id,
                        rp.payment_amount as amount,
                        rp.payment_method,
                        'completed' as payment_status,
                        rp.payment_date,
                        rp.processed_by,
                        CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                        u.full_name as processed_by_name
                    FROM remaining_payments rp
                    JOIN bookings b ON rp.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN users u ON rp.processed_by = u.id
                ) as count_payments
                {$where_clause}
            ";

            error_log("Count SQL query: " . $count_sql);

            $count_stmt = $this->conn->prepare($count_sql);
            if (!empty($params)) {
                $count_stmt->execute($params);
            } else {
                $count_stmt->execute();
            }
            $total_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

            error_log("Total count result: " . $total_count);

            // Add pagination
            $page = isset($filters['page']) ? (int)$filters['page'] : 1;
            $limit = isset($filters['limit']) ? (int)$filters['limit'] : 20;
            $offset = ($page - 1) * $limit;

            $final_sql = $unified_sql . " LIMIT {$limit} OFFSET {$offset}";

            error_log("Final SQL query: " . $final_sql);

            $stmt = $this->conn->prepare($final_sql);
            if (!empty($params)) {
                $stmt->execute($params);
            } else {
                $stmt->execute();
            }
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            error_log("Payments result count: " . count($payments));

            return [
                'success' => true,
                'payments' => $payments,
                'total_count' => $total_count,
                'current_page' => $page,
                'total_pages' => ceil($total_count / $limit)
            ];

        } catch (Exception $e) {
            error_log("Error fetching payment history: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            return [
                'success' => false,
                'message' => 'Failed to fetch payment history: ' . $e->getMessage()
            ];
        }
    }

    // Get payment statistics
    public function getPaymentStats() {
        try {
            // Total payments from all sources
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as total FROM (
                    SELECT id FROM payments
                    UNION ALL
                    SELECT id FROM walk_in_payments
                    UNION ALL
                    SELECT id FROM remaining_payments
                ) as all_payments
            ");
            $stmt->execute();
            $totalPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Total amount from all sources (completed payments only)
            $stmt = $this->conn->prepare("
                SELECT SUM(total_amount) as total FROM (
                    SELECT amount as total_amount FROM payments WHERE payment_status = 'completed'
                    UNION ALL
                    SELECT amount as total_amount FROM walk_in_payments WHERE payment_status = 'completed'
                    UNION ALL
                    SELECT payment_amount as total_amount FROM remaining_payments
                ) as all_amounts
            ");
            $stmt->execute();
            $totalAmount = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Today's payments from all sources
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as total FROM (
                    SELECT id FROM payments WHERE DATE(payment_date) = CURDATE()
                    UNION ALL
                    SELECT id FROM walk_in_payments WHERE DATE(payment_date) = CURDATE()
                    UNION ALL
                    SELECT id FROM remaining_payments WHERE DATE(payment_date) = CURDATE()
                ) as today_payments
            ");
            $stmt->execute();
            $todayPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Today's amount from all sources (completed payments only)
            $stmt = $this->conn->prepare("
                SELECT SUM(total_amount) as total FROM (
                    SELECT amount as total_amount FROM payments WHERE DATE(payment_date) = CURDATE() AND payment_status = 'completed'
                    UNION ALL
                    SELECT amount as total_amount FROM walk_in_payments WHERE DATE(payment_date) = CURDATE() AND payment_status = 'completed'
                    UNION ALL
                    SELECT payment_amount as total_amount FROM remaining_payments WHERE DATE(payment_date) = CURDATE()
                ) as today_amounts
            ");
            $stmt->execute();
            $todayAmount = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

            // Cash payments count
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as total FROM (
                    SELECT id FROM payments WHERE payment_method = 'cash' AND payment_status = 'completed'
                    UNION ALL
                    SELECT id FROM walk_in_payments WHERE payment_method = 'cash' AND payment_status = 'completed'
                    UNION ALL
                    SELECT id FROM remaining_payments WHERE payment_method = 'cash'
                ) as cash_payments
            ");
            $stmt->execute();
            $cashPayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Online payments count
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as total FROM (
                    SELECT id FROM payments WHERE payment_method != 'cash' AND payment_status = 'completed'
                    UNION ALL
                    SELECT id FROM walk_in_payments WHERE payment_method != 'cash' AND payment_status = 'completed'
                    UNION ALL
                    SELECT id FROM remaining_payments WHERE payment_method != 'cash'
                ) as online_payments
            ");
            $stmt->execute();
            $onlinePayments = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            return [
                'success' => true,
                'stats' => [
                    'totalPayments' => $totalPayments,
                    'totalAmount' => $totalAmount,
                    'todayPayments' => $todayPayments,
                    'todayAmount' => $todayAmount,
                    'cashPayments' => $cashPayments,
                    'onlinePayments' => $onlinePayments
                ]
            ];

        } catch (Exception $e) {
            error_log("Error fetching payment stats: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to fetch payment stats: ' . $e->getMessage()
            ];
        }
    }

    // Process refund
    public function processRefund($data) {
        try {
            $payment_id = $data['payment_id'];
            $refund_amount = $data['refund_amount'];
            $refund_reason = $data['refund_reason'];
            $user_id = $data['user_id'] ?? 1; // Default to admin if not provided

            // Get original payment details
            $stmt = $this->conn->prepare("
                SELECT p.*, i.invoice_number, CONCAT(g.first_name, ' ', g.last_name) as guest_name
                FROM payments p
                JOIN invoices i ON p.invoice_id = i.id
                JOIN bookings b ON p.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                WHERE p.id = ?
            ");
            $stmt->execute([$payment_id]);
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$payment) {
                return [
                    'success' => false,
                    'message' => 'Payment not found'
                ];
            }

            if ($payment['payment_status'] !== 'completed') {
                return [
                    'success' => false,
                    'message' => 'Only completed payments can be refunded'
                ];
            }

            if ($refund_amount > $payment['amount']) {
                return [
                    'success' => false,
                    'message' => 'Refund amount cannot exceed original payment amount'
                ];
            }

            // Start transaction
            $this->conn->beginTransaction();

            // Update payment status
            $new_status = $refund_amount == $payment['amount'] ? 'refunded' : 'partially_refunded';
            $stmt = $this->conn->prepare("
                UPDATE payments 
                SET payment_status = ?, notes = CONCAT(COALESCE(notes, ''), '\nRefund: ', ?)
                WHERE id = ?
            ");
            $stmt->execute([$new_status, $refund_reason, $payment_id]);

            // Create refund record
            $refund_receipt = 'REF-' . date('Y') . '-' . str_pad($payment_id, 6, '0', STR_PAD_LEFT);
            $stmt = $this->conn->prepare("
                INSERT INTO payments (
                    invoice_id, booking_id, amount, payment_method, payment_status,
                    transaction_id, receipt_number, notes, processed_by
                ) VALUES (?, ?, ?, 'refund', 'completed', ?, ?, ?, ?)
            ");
            $stmt->execute([
                $payment['invoice_id'],
                $payment['booking_id'],
                -$refund_amount, // Negative amount for refund
                'REFUND-' . $payment['transaction_id'],
                $refund_receipt,
                "Refund for payment {$payment['receipt_number']}. Reason: {$refund_reason}",
                $user_id
            ]);

            // Update invoice status if fully refunded
            if ($new_status === 'refunded') {
                $stmt = $this->conn->prepare("
                    UPDATE invoices SET status = 'refunded' WHERE id = ?
                ");
                $stmt->execute([$payment['invoice_id']]);
            }

            $this->conn->commit();

            // Send real-time notification
            $this->notifyRefundProcessed([
                'refund_id' => $this->conn->lastInsertId(),
                'refund_receipt' => $refund_receipt,
                'refund_amount' => $refund_amount,
                'original_payment' => $payment['receipt_number'],
                'reason' => $refund_reason
            ]);

            return [
                'success' => true,
                'message' => 'Refund processed successfully',
                'refund_receipt' => $refund_receipt,
                'refund_amount' => $refund_amount
            ];

        } catch (Exception $e) {
            $this->conn->rollBack();
            error_log("Error processing refund: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to process refund: ' . $e->getMessage()
            ];
        }
    }

    // Get billing statistics with real-time sync
    public function getBillingStats() {
        try {
            // Check if billing tables exist
            $tables_exist = $this->checkBillingTablesExist();
            
            if (!$tables_exist) {
                // Return basic stats with message that billing system needs setup
                return [
                    'success' => true,
                    'stats' => [
                        'total_invoices' => 0,
                        'pending_invoices' => 0,
                        'paid_invoices' => 0,
                        'total_revenue' => 0,
                        'today_invoices' => 0,
                        'today_revenue' => 0,
                        'today_collected' => 0,
                        'month_revenue' => 0,
                        'last_sync' => date('Y-m-d H:i:s'),
                        'system_status' => 'billing_tables_missing',
                        'message' => 'Billing system tables not found. Please run database setup.'
                    ]
                ];
            }

            // Get basic booking revenue (fallback when no invoices exist)
            $bookingRevenue = $this->getBookingRevenue();
            
            // Total invoices
            $stmt = $this->conn->prepare("SELECT COUNT(*) as total FROM invoices");
            $stmt->execute();
            $totalInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Pending invoices
            $stmt = $this->conn->prepare("SELECT COUNT(*) as pending FROM invoices WHERE status = 'pending'");
            $stmt->execute();
            $pendingInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['pending'];

            // Paid invoices
            $stmt = $this->conn->prepare("SELECT COUNT(*) as paid FROM invoices WHERE status = 'paid'");
            $stmt->execute();
            $paidInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['paid'];

            // Total revenue from invoices
            $stmt = $this->conn->prepare("SELECT SUM(total_amount) as revenue FROM invoices WHERE status = 'paid'");
            $stmt->execute();
            $totalRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['revenue'] ?? 0;

            // Today's invoices
            $stmt = $this->conn->prepare("SELECT COUNT(*) as today FROM invoices WHERE DATE(invoice_date) = CURDATE()");
            $stmt->execute();
            $todayInvoices = $stmt->fetch(PDO::FETCH_ASSOC)['today'];

            // Today's revenue (real-time)
            $stmt = $this->conn->prepare("
                SELECT SUM(total_amount) as today_revenue 
                FROM invoices 
                WHERE DATE(invoice_date) = CURDATE() AND status = 'paid'
            ");
            $stmt->execute();
            $todayRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['today_revenue'] ?? 0;

            // Today's amount collected (real-time)
            $stmt = $this->conn->prepare("
                SELECT SUM(amount) as today_collected 
                FROM payments 
                WHERE DATE(payment_date) = CURDATE() AND payment_status = 'completed'
            ");
            $stmt->execute();
            $todayCollected = $stmt->fetch(PDO::FETCH_ASSOC)['today_collected'] ?? 0;

            // This month's revenue
            $stmt = $this->conn->prepare("
                SELECT SUM(total_amount) as month_revenue 
                FROM invoices 
                WHERE MONTH(invoice_date) = MONTH(CURDATE()) 
                AND YEAR(invoice_date) = YEAR(CURDATE()) 
                AND status = 'paid'
            ");
            $stmt->execute();
            $monthRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['month_revenue'] ?? 0;

            // If no invoice revenue, use booking revenue as fallback
            if ($totalRevenue == 0 && $bookingRevenue > 0) {
                $totalRevenue = $bookingRevenue['total_revenue'];
                $todayRevenue = $bookingRevenue['today_revenue'];
                $monthRevenue = $bookingRevenue['month_revenue'];
            }

            // Last sync timestamp
            $lastSync = date('Y-m-d H:i:s');

            return [
                'success' => true,
                'stats' => [
                    'total_invoices' => (int)$totalInvoices,
                    'pending_invoices' => (int)$pendingInvoices,
                    'paid_invoices' => (int)$paidInvoices,
                    'total_revenue' => (float)$totalRevenue,
                    'today_invoices' => (int)$todayInvoices,
                    'today_revenue' => (float)$todayRevenue,
                    'today_collected' => (float)$todayCollected,
                    'month_revenue' => (float)$monthRevenue,
                    'last_sync' => $lastSync,
                    'system_status' => 'active',
                    'data_source' => $totalRevenue > 0 ? 'invoices' : 'bookings',
                    'message' => $totalRevenue > 0 ? 'Billing system active' : 'Using booking data as fallback'
                ]
            ];

        } catch (Exception $e) {
            error_log("Error getting billing stats: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get billing statistics',
                'error' => $e->getMessage()
            ];
        }
    }

    // Check if billing tables exist
    private function checkBillingTablesExist() {
        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'invoices'");
            $stmt->execute();
            return $stmt->rowCount() > 0;
        } catch (Exception $e) {
            return false;
        }
    }

    // Get revenue from bookings as fallback
    private function getBookingRevenue() {
        try {
            // Total revenue from confirmed and checked-in bookings
            $stmt = $this->conn->prepare("
                SELECT SUM(total_amount) as total_revenue 
                FROM bookings 
                WHERE status IN ('confirmed', 'checked_in')
            ");
            $stmt->execute();
            $totalRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['total_revenue'] ?? 0;

            // Today's revenue from bookings
            $stmt = $this->conn->prepare("
                SELECT SUM(total_amount) as today_revenue 
                FROM bookings 
                WHERE DATE(created_at) = CURDATE() 
                AND status IN ('confirmed', 'checked_in')
            ");
            $stmt->execute();
            $todayRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['today_revenue'] ?? 0;

            // This month's revenue from bookings
            $stmt = $this->conn->prepare("
                SELECT SUM(total_amount) as month_revenue 
                FROM bookings 
                WHERE MONTH(created_at) = MONTH(CURDATE()) 
                AND YEAR(created_at) = YEAR(CURDATE()) 
                AND status IN ('confirmed', 'checked_in')
            ");
            $stmt->execute();
            $monthRevenue = $stmt->fetch(PDO::FETCH_ASSOC)['month_revenue'] ?? 0;

            return [
                'total_revenue' => (float)$totalRevenue,
                'today_revenue' => (float)$todayRevenue,
                'month_revenue' => (float)$monthRevenue
            ];

        } catch (Exception $e) {
            error_log("Error getting booking revenue: " . $e->getMessage());
            return [
                'total_revenue' => 0,
                'today_revenue' => 0,
                'month_revenue' => 0
            ];
        }
    }

    // Get refundable payments (completed payments that can be refunded)
    public function getRefundablePayments($filters) {
        try {
            $where_conditions = ["p.payment_status = 'completed'"];
            $params = [];

            if (!empty($filters['guest_name'])) {
                $where_conditions[] = "CONCAT(g.first_name, ' ', g.last_name) LIKE ?";
                $params[] = '%' . $filters['guest_name'] . '%';
            }

            if (!empty($filters['payment_method'])) {
                $where_conditions[] = "p.payment_method = ?";
                $params[] = $filters['payment_method'];
            }

            if (!empty($filters['amount_min'])) {
                $where_conditions[] = "p.amount >= ?";
                $params[] = $filters['amount_min'];
            }

            if (!empty($filters['amount_max'])) {
                $where_conditions[] = "p.amount <= ?";
                $params[] = $filters['amount_max'];
            }

            $where_clause = implode(' AND ', $where_conditions);

            $query = "
                SELECT p.*, i.invoice_number, b.booking_reference,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.phone as guest_phone, g.email as guest_email
                FROM payments p
                JOIN invoices i ON p.invoice_id = i.id
                JOIN bookings b ON p.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                WHERE {$where_clause}
                ORDER BY p.payment_date DESC
            ";

            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'payments' => $payments
            ];

        } catch (Exception $e) {
            error_log("Error getting refundable payments: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get refundable payments',
                'error' => $e->getMessage()
            ];
        }
    }

    // Get refund history
    public function getRefundHistory($filters) {
        try {
            error_log("getRefundHistory called with filters: " . json_encode($filters));
            $where_conditions = ["p.payment_status IN ('refunded', 'partially_refunded')"];
            $params = [];

            if (!empty($filters['guest_name'])) {
                $where_conditions[] = "CONCAT(g.first_name, ' ', g.last_name) LIKE ?";
                $params[] = '%' . $filters['guest_name'] . '%';
            }

            if (!empty($filters['refund_method'])) {
                $where_conditions[] = "p.payment_method = ?";
                $params[] = $filters['refund_method'];
            }

            if (!empty($filters['refund_status'])) {
                $where_conditions[] = "p.payment_status = ?";
                $params[] = $filters['refund_status'];
            }

            if (!empty($filters['amount_min'])) {
                $where_conditions[] = "ABS(p.amount) >= ?";
                $params[] = $filters['amount_min'];
            }

            if (!empty($filters['amount_max'])) {
                $where_conditions[] = "ABS(p.amount) <= ?";
                $params[] = $filters['amount_max'];
            }

            $where_clause = implode(' AND ', $where_conditions);

            // Count total records for pagination
            $count_query = "
                SELECT COUNT(*) as total
                FROM payments p
                JOIN invoices i ON p.invoice_id = i.id
                JOIN bookings b ON p.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                WHERE {$where_clause}
            ";
            $count_stmt = $this->conn->prepare($count_query);
            $count_stmt->execute($params);
            $total = $count_stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get paginated results
            $page = $filters['page'] ?? 1;
            $limit = $filters['limit'] ?? 20;
            $offset = ($page - 1) * $limit;

            $query = "
                SELECT p.*, i.invoice_number, b.booking_reference,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.phone as guest_phone, g.email as guest_email,
                       u.full_name as processed_by
                FROM payments p
                JOIN invoices i ON p.invoice_id = i.id
                JOIN bookings b ON p.booking_id = b.id
                JOIN guests g ON b.guest_id = g.id
                LEFT JOIN users u ON p.processed_by = u.id
                WHERE {$where_clause}
                ORDER BY p.payment_date DESC
                LIMIT {$limit} OFFSET {$offset}
            ";
            
            error_log("getRefundHistory query: " . $query);

            $stmt = $this->conn->prepare($query);
            $stmt->execute($params);
            $refunds = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'refunds' => $refunds,
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ];

        } catch (Exception $e) {
            error_log("Error getting refund history: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get refund history',
                'error' => $e->getMessage()
            ];
        }
    }

    // Get refund statistics
    public function getRefundStats() {
        try {
            // Total refunds
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as total FROM payments 
                WHERE payment_status IN ('refunded', 'partially_refunded')
            ");
            $stmt->execute();
            $totalRefunds = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Total refund amount
            $stmt = $this->conn->prepare("
                SELECT SUM(ABS(amount)) as total_amount FROM payments 
                WHERE payment_status IN ('refunded', 'partially_refunded')
            ");
            $stmt->execute();
            $totalAmount = $stmt->fetch(PDO::FETCH_ASSOC)['total_amount'] ?? 0;

            // Today's refunds
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as today FROM payments 
                WHERE payment_status IN ('refunded', 'partially_refunded')
                AND DATE(payment_date) = CURDATE()
            ");
            $stmt->execute();
            $todayRefunds = $stmt->fetch(PDO::FETCH_ASSOC)['today'];

            // Today's refund amount
            $stmt = $this->conn->prepare("
                SELECT SUM(ABS(amount)) as today_amount FROM payments 
                WHERE payment_status IN ('refunded', 'partially_refunded')
                AND DATE(payment_date) = CURDATE()
            ");
            $stmt->execute();
            $todayAmount = $stmt->fetch(PDO::FETCH_ASSOC)['today_amount'] ?? 0;

            // Pending refunds (if you have a separate refunds table)
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as pending FROM payments 
                WHERE payment_status = 'processing'
            ");
            $stmt->execute();
            $pendingRefunds = $stmt->fetch(PDO::FETCH_ASSOC)['pending'];

            // Completed refunds
            $stmt = $this->conn->prepare("
                SELECT COUNT(*) as completed FROM payments 
                WHERE payment_status = 'refunded'
            ");
            $stmt->execute();
            $completedRefunds = $stmt->fetch(PDO::FETCH_ASSOC)['completed'];

            return [
                'success' => true,
                'stats' => [
                    'totalRefunds' => $totalRefunds,
                    'totalAmount' => $totalAmount,
                    'todayRefunds' => $todayRefunds,
                    'todayAmount' => $todayAmount,
                    'pendingRefunds' => $pendingRefunds,
                    'completedRefunds' => $completedRefunds
                ]
            ];

        } catch (Exception $e) {
            error_log("Error getting refund stats: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to get refund statistics',
                'error' => $e->getMessage()
            ];
        }
    }

    // Cancel booking and process refund
    public function cancelBooking($data) {
        try {
            error_log("CancelBooking: === STARTING CANCELLATION PROCESS ===");
            error_log("CancelBooking: Received data - " . json_encode($data));
            error_log("CancelBooking: Function called from comprehensive_billing_api.php");
            
            $booking_id = $data['booking_id'] ?? $data['id'] ?? null;
            
            // Validate booking_id
            if (!$booking_id) {
                error_log("CancelBooking: No booking ID provided");
                return [
                    'success' => false,
                    'message' => 'Booking ID is required'
                ];
            }
            
            $refund_amount = $data['refund_amount'];
            $cancellation_reason = $data['cancellation_reason'];
            
            // Validate cancellation reason
            if (!$cancellation_reason) {
                error_log("CancelBooking: No cancellation reason provided");
                return [
                    'success' => false,
                    'message' => 'Cancellation reason is required'
                ];
            }
            
            $cancellation_fee = $data['cancellation_fee'] ?? 0;
            $notes = $data['notes'] ?? '';
            $user_id = $data['user_id'] ?? 1;

            error_log("CancelBooking: Processing booking ID: {$booking_id}, Reason: {$cancellation_reason}, Refund: {$refund_amount}");

            // Get booking details
            $stmt = $this->conn->prepare("
                SELECT b.*, r.room_number, rt.name as room_type,
                       CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                       g.phone as guest_phone, g.email as guest_email,
                       i.id as invoice_id, i.invoice_number, i.total_amount as invoice_total_amount
                FROM bookings b
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                JOIN guests g ON b.guest_id = g.id
                LEFT JOIN invoices i ON b.id = i.booking_id
                WHERE b.id = ?
            ");
            $stmt->execute([$booking_id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                error_log("CancelBooking: Booking not found for ID: {$booking_id}");
                return [
                    'success' => false,
                    'message' => 'Booking not found'
                ];
            }

            error_log("CancelBooking: Found booking - Guest: {$booking['guest_name']}, Room: {$booking['room_number']}, Status: {$booking['status']}");
            error_log("CancelBooking: Booking total_amount: '{$booking['total_amount']}', type: " . gettype($booking['total_amount']));
            error_log("CancelBooking: Invoice total_amount: '{$booking['invoice_total_amount']}', type: " . gettype($booking['invoice_total_amount']));
            error_log("CancelBooking: Full booking data: " . json_encode($booking));

            if ($booking['status'] !== 'confirmed') {
                error_log("CancelBooking: Cannot cancel booking with status: {$booking['status']}");
                return [
                    'success' => false,
                    'message' => 'Only confirmed bookings can be cancelled'
                ];
            }

            // Calculate paid amount from payments table
            error_log("CancelBooking: About to query payments table for booking ID: {$booking_id}");
            $stmt = $this->conn->prepare("
                SELECT COALESCE(SUM(amount), 0) as paid_amount 
                FROM payments 
                WHERE booking_id = ? AND payment_status = 'completed' AND amount > 0
            ");
            error_log("CancelBooking: Payments query prepared");
            $stmt->execute([$booking_id]);
            error_log("CancelBooking: Payments query executed");
            $payment_result = $stmt->fetch(PDO::FETCH_ASSOC);
            error_log("CancelBooking: Payment result: " . json_encode($payment_result));
            $paid_amount = $payment_result['paid_amount'];
            error_log("CancelBooking: Paid amount extracted: {$paid_amount}");

            // For new bookings with no payment, use total amount as base
            error_log("CancelBooking: About to calculate base amount");
            error_log("CancelBooking: Paid amount: {$paid_amount}, Total amount: {$booking['total_amount']}");
            $base_amount = $paid_amount > 0 ? $paid_amount : $booking['total_amount'];
            error_log("CancelBooking: Base amount calculated: {$base_amount}");
            
            // Verify base_amount is defined
            if (!isset($base_amount)) {
                error_log("CancelBooking: ERROR - base_amount is undefined after calculation!");
                return [
                    'success' => false,
                    'message' => 'Internal error: Base amount calculation failed'
                ];
            }
            
            // Log the base amount calculation for debugging
            error_log("CancelBooking: Base amount calculation - Paid: {$paid_amount}, Total: {$booking['total_amount']}, Using: {$base_amount}");
            
            // No need to calculate max_refund - user has full control
            error_log("CancelBooking: Skipping max_refund calculation - user controls refund amount");

            // Ensure base_amount is defined before logging
            if (!isset($base_amount)) {
                error_log("CancelBooking: ERROR - base_amount is undefined!");
                return [
                    'success' => false,
                    'message' => 'Internal error: Base amount not defined'
                ];
            }
            
            error_log("CancelBooking: Paid amount: {$paid_amount}, Refund requested: {$refund_amount}, Cancellation fee: {$cancellation_fee}");
            error_log("CancelBooking: Base amount: {$base_amount}");
            error_log("CancelBooking: Total amount from booking: {$booking['total_amount']}");
            error_log("CancelBooking: User has full control over cancellation fee and refund amount");

            // Validate cancellation fee
            if ($cancellation_fee < 0) {
                error_log("CancelBooking: Invalid cancellation fee: {$cancellation_fee}");
                return [
                    'success' => false,
                    'message' => 'Cancellation fee cannot be negative'
                ];
            }
            
            // Validate refund amount
            if ($refund_amount < 0) {
                error_log("CancelBooking: Refund amount cannot be negative");
                return [
                    'success' => false,
                    'message' => 'Refund amount cannot be negative'
                ];
            }
            
            // Allow any refund amount - user has full control
            error_log("CancelBooking: Refund validation bypassed - user has full control over refund amount");
            error_log("CancelBooking: About to proceed with cancellation - no validation checks");
            
            // Log the values for transparency
            error_log("CancelBooking: User requested - Cancellation fee: ₹{$cancellation_fee}, Refund: ₹{$refund_amount}");
            error_log("CancelBooking: Total amount: ₹{$base_amount}");
            
            // Log the final values for debugging
            error_log("CancelBooking: Final values - Refund requested: {$refund_amount}, Base amount: {$base_amount}, Cancellation fee: {$cancellation_fee}");
            
            // DEBUG: Check if we reach this point
            error_log("CancelBooking: DEBUG - Reached validation bypass point");
            
            // No validation on cancellation fee - user has full control
            error_log("CancelBooking: Cancellation fee validation bypassed - user controls amount");

            // Start transaction
            error_log("CancelBooking: DEBUG - About to start database transaction");
            error_log("CancelBooking: Starting database transaction");
            $this->conn->beginTransaction();

            try {
                // 1. Update booking status to cancelled
                error_log("CancelBooking: Updating booking status to cancelled");
                $stmt = $this->conn->prepare("
                    UPDATE bookings 
                    SET status = 'cancelled', 
                        notes = CONCAT(COALESCE(notes, ''), '\nCancellation: ', ?)
                    WHERE id = ?
                ");
                $updateResult = $stmt->execute([$cancellation_reason . ' - ' . $notes, $booking_id]);
                error_log("CancelBooking: Booking status update result: " . ($updateResult ? 'success' : 'failed'));

                // 2. Update room status to available
                error_log("CancelBooking: Updating room status to available");
                $stmt = $this->conn->prepare("
                    UPDATE rooms 
                    SET status = 'available'
                    WHERE room_number = ?
                ");
                $roomUpdateResult = $stmt->execute([$booking['room_number']]);
                error_log("CancelBooking: Room status update result: " . ($roomUpdateResult ? 'success' : 'failed'));

                // 3. Process refund if amount > 0
                $refund_receipt = null;
                if ($refund_amount > 0) {
                    error_log("CancelBooking: Processing refund of {$refund_amount}");
                    // Find the payment record for this booking
                    $stmt = $this->conn->prepare("
                        SELECT id, amount, payment_status 
                        FROM payments 
                        WHERE booking_id = ? AND payment_status = 'completed'
                        ORDER BY payment_date DESC 
                        LIMIT 1
                    ");
                    $stmt->execute([$booking_id]);
                    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($payment) {
                        error_log("CancelBooking: Found payment record ID: {$payment['id']}, Amount: {$payment['amount']}");
                        // Update payment status
                        $new_status = $refund_amount >= $payment['amount'] ? 'refunded' : 'partially_refunded';
                        $stmt = $this->conn->prepare("
                            UPDATE payments 
                            SET payment_status = ?, 
                                notes = CONCAT(COALESCE(notes, ''), '\nCancellation Refund: ', ?)
                            WHERE id = ?
                        ");
                        $paymentUpdateResult = $stmt->execute([$new_status, $cancellation_reason, $payment['id']]);
                        error_log("CancelBooking: Payment status update result: " . ($paymentUpdateResult ? 'success' : 'failed'));

                        // Create refund record in payments table (since refunds table doesn't exist)
                        $refund_receipt = 'REF-' . date('Y') . '-' . str_pad($payment['id'], 6, '0', STR_PAD_LEFT);
                        
                        // Check if processed_by column exists in payments table
                        $checkColumn = "SHOW COLUMNS FROM payments LIKE 'processed_by'";
                        $stmt = $this->conn->prepare($checkColumn);
                        $stmt->execute();
                        $hasProcessedBy = $stmt->rowCount() > 0;
                        
                        if ($hasProcessedBy) {
                            $stmt = $this->conn->prepare("
                                INSERT INTO payments (
                                    booking_id, amount, payment_method, payment_status,
                                    transaction_id, notes, processed_by, payment_date
                                ) VALUES (?, ?, 'refund', 'completed', ?, ?, ?, NOW())
                            ");
                            $refundInsertResult = $stmt->execute([
                                $booking_id,
                                -$refund_amount, // Negative amount for refund
                                'CANCEL-REFUND-' . $payment['id'],
                                "Cancellation refund. Reason: {$cancellation_reason}. Notes: {$notes}",
                                $user_id
                            ]);
                        } else {
                            // Fallback without processed_by column
                            $stmt = $this->conn->prepare("
                                INSERT INTO payments (
                                    booking_id, amount, payment_method, payment_status,
                                    transaction_id, notes, payment_date
                                ) VALUES (?, ?, 'refund', 'completed', ?, ?, NOW())
                            ");
                            $refundInsertResult = $stmt->execute([
                                $booking_id,
                                -$refund_amount, // Negative amount for refund
                                'CANCEL-REFUND-' . $payment['id'],
                                "Cancellation refund. Reason: {$cancellation_reason}. Notes: {$notes}"
                            ]);
                        }
                        
                        error_log("CancelBooking: Refund record insert result: " . ($refundInsertResult ? 'success' : 'failed'));
                    } else {
                        error_log("CancelBooking: No payment record found for refund");
                    }
                }

                // 4. Update invoice status if exists
                if ($booking['invoice_id']) {
                    error_log("CancelBooking: Updating invoice status to cancelled");
                    $stmt = $this->conn->prepare("
                        UPDATE invoices 
                        SET status = 'cancelled',
                            notes = CONCAT(COALESCE(notes, ''), '\nCancelled due to booking cancellation')
                        WHERE id = ?
                    ");
                    $invoiceUpdateResult = $stmt->execute([$booking['invoice_id']]);
                    error_log("CancelBooking: Invoice status update result: " . ($invoiceUpdateResult ? 'success' : 'failed'));
                }

                // 5. Log the cancellation (if activity_logs table exists)
                try {
                    error_log("CancelBooking: Logging cancellation activity");
                    $stmt = $this->conn->prepare("
                        INSERT INTO activity_logs (
                            user_id, action, table_name, record_id, details, ip_address
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    ");
                    $activityLogResult = $stmt->execute([
                        $user_id,
                        'CANCELLED_BOOKING',
                        'bookings',
                        $booking_id,
                        "Cancelled booking for {$booking['guest_name']} in room {$booking['room_number']}. Reason: {$cancellation_reason}. Cancellation Fee: ₹{$cancellation_fee}. Refund: ₹{$refund_amount}",
                        $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                    ]);
                    error_log("CancelBooking: Activity log insert result: " . ($activityLogResult ? 'success' : 'failed'));
                } catch (Exception $e) {
                    // Log to error log if activity logging fails
                    error_log("Failed to log cancellation activity: " . $e->getMessage());
                }

                error_log("CancelBooking: Committing transaction");
                $this->conn->commit();
                error_log("CancelBooking: Transaction committed successfully");

                $result = [
                    'success' => true,
                    'message' => 'Booking cancelled successfully',
                    'refund_receipt' => $refund_receipt,
                    'refund_amount' => $refund_amount,
                    'cancellation_fee' => $cancellation_fee,
                    'cancellation_reason' => $cancellation_reason,
                    'room_number' => $booking['room_number'],
                    'guest_name' => $booking['guest_name']
                ];
                
                error_log("CancelBooking: Returning success result: " . json_encode($result));
                return $result;

            } catch (Exception $e) {
                error_log("CancelBooking: Error during transaction: " . $e->getMessage());
                $this->conn->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            error_log("Error cancelling booking: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to cancel booking',
                'error' => $e->getMessage()
            ];
        }
    }

    // Generate enhanced HTML invoice
    private function generateInvoiceHTML($invoice) {
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice {$invoice['invoice_number']}</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    margin: 40px; 
                    background-color: #f8f9fa;
                    color: #333;
                }
                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 40px;
                    border-bottom: 3px solid #007bff;
                    padding-bottom: 20px;
                }
                .header h1 {
                    color: #007bff;
                    margin: 0;
                    font-size: 32px;
                }
                .header h2 {
                    color: #6c757d;
                    margin: 10px 0 0 0;
                    font-size: 24px;
                }
                .invoice-details { 
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: space-between;
                }
                .guest-details { 
                    margin-bottom: 30px;
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                }
                .guest-details h3 {
                    color: #007bff;
                    margin-top: 0;
                }
                .items { 
                    margin-bottom: 30px;
                }
                .items h3 {
                    color: #007bff;
                    border-bottom: 2px solid #dee2e6;
                    padding-bottom: 10px;
                }
                .total { 
                    font-weight: bold; 
                    font-size: 20px;
                    text-align: right;
                    background: #007bff;
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td { 
                    padding: 15px; 
                    text-align: left; 
                    border-bottom: 1px solid #dee2e6; 
                }
                th { 
                    background-color: #f8f9fa;
                    font-weight: 600;
                    color: #495057;
                }
                .amount {
                    text-align: right;
                    font-weight: 600;
                }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    color: #6c757d;
                    font-size: 14px;
                    border-top: 1px solid #dee2e6;
                    padding-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class='invoice-container'>
                <div class='header'>
                    <h1>SV Royal Hotel</h1>
                    <h2>Invoice {$invoice['invoice_number']}</h2>
                </div>
                
                <div class='invoice-details'>
                    <div>
                        <p><strong>Invoice Date:</strong> " . date('F j, Y') . "</p>
                        <p><strong>Due Date:</strong> " . date('F j, Y', strtotime('+30 days')) . "</p>
                    </div>
                    <div>
                        <p><strong>Booking Reference:</strong> {$invoice['booking_reference']}</p>
                        <p><strong>Invoice Status:</strong> <span style='color: #007bff; font-weight: bold;'>{$invoice['status']}</span></p>
                    </div>
                </div>
                
                <div class='guest-details'>
                    <h3>Guest Information</h3>
                    <p><strong>Name:</strong> {$invoice['guest_name']}</p>
                    <p><strong>Email:</strong> {$invoice['guest_email']}</p>
                    <p><strong>Phone:</strong> {$invoice['guest_phone']}</p>
                    <p><strong>Room:</strong> {$invoice['room_number']} ({$invoice['room_type']})</p>
                    <p><strong>Check-in:</strong> " . date('F j, Y', strtotime($invoice['check_in_date'])) . "</p>
                    <p><strong>Check-out:</strong> " . date('F j, Y', strtotime($invoice['check_out_date'])) . "</p>
                </div>
                
                <div class='items'>
                    <h3>Invoice Items</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th class='amount'>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Room {$invoice['room_number']} - {$invoice['room_type']}</td>
                                <td class='amount'>₹" . number_format($invoice['subtotal'], 2) . "</td>
                            </tr>
                            <tr>
                                <td>Tax (GST 18%)</td>
                                <td class='amount'>₹" . number_format($invoice['tax_amount'], 2) . "</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class='total'>
                    <strong>Total Amount: ₹" . number_format($invoice['total_amount'], 2) . "</strong>
                </div>
                
                <div class='footer'>
                    <p>Thank you for choosing SV Royal Hotel!</p>
                    <p>For any queries, please contact us at billing@svroyal.com</p>
                    <p>This is a computer generated invoice.</p>
                </div>
            </div>
        </body>
        </html>";

        return $html;
    }
}

// Handle API requests
try {
    // Debug: Log the request
    error_log("API Request - Method: " . $_SERVER['REQUEST_METHOD'] . ", Action: " . ($_GET['action'] ?? 'none'));
    
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception('Database connection failed');
    }
    
    error_log("Database connection successful");
    $billingAPI = new ComprehensiveBillingAPI($db);

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            switch ($action) {
                case 'generate_invoice':
                    $result = $billingAPI->generateInvoice($data);
                    break;
                
                case 'update_status':
                    $result = $billingAPI->updateInvoiceStatus($data['invoice_id'], $data['status'], $data['user_id']);
                    break;
                
                case 'delete_invoice':
                    $result = $billingAPI->deleteInvoice($data['invoice_id'], $data['user_id']);
                    break;
                
                case 'process_payment':
                    $result = $billingAPI->processPayment($data);
                    break;
                
                case 'process_refund':
                    $result = $billingAPI->processRefund($data);
                    break;
                
                case 'cancel_booking':
                    error_log("Cancel booking action called with data: " . json_encode($data));
                    $result = $billingAPI->cancelBooking($data);
                    error_log("Cancel booking result: " . json_encode($result));
                    break;
                
                default:
                    $result = [
                        'success' => false,
                        'message' => 'Invalid action'
                    ];
            }
            break;
        
        case 'GET':
            switch ($action) {
                case 'invoice_details':
                    $invoice_id = $_GET['invoice_id'] ?? 0;
                    $result = $billingAPI->getInvoiceDetails($invoice_id);
                    break;
                
                case 'all_invoices':
                    $filters = [
                        'status' => $_GET['status'] ?? '',
                        'date_from' => $_GET['date_from'] ?? '',
                        'date_to' => $_GET['date_to'] ?? ''
                    ];
                    $result = $billingAPI->getAllInvoices($filters);
                    break;
                
                case 'billing_stats':
                    $result = $billingAPI->getBillingStats();
                    break;
                
                case 'payment_history':
                    error_log("Payment history action called");
                    
                    // Test if the function exists
                    if (!method_exists($billingAPI, 'getPaymentHistory')) {
                        error_log("ERROR: getPaymentHistory method does not exist!");
                        $result = [
                            'success' => false,
                            'message' => 'getPaymentHistory method not found'
                        ];
                        break;
                    }
                    
                    $filters = [
                        'guest_name' => $_GET['guest_name'] ?? '',
                        'payment_method' => $_GET['payment_method'] ?? '',
                        'payment_status' => $_GET['payment_status'] ?? '',
                        'date_from' => $_GET['date_from'] ?? '',
                        'date_to' => $_GET['date_to'] ?? '',
                        'amount_min' => $_GET['amount_min'] ?? '',
                        'amount_max' => $_GET['amount_max'] ?? '',
                        'processed_by' => $_GET['processed_by'] ?? '',
                        'booking_id' => $_GET['booking_id'] ?? '',
                        'page' => $_GET['page'] ?? 1,
                        'limit' => $_GET['limit'] ?? 20
                    ];
                    error_log("Payment history filters: " . json_encode($filters));
                    $result = $billingAPI->getPaymentHistory($filters);
                    error_log("Payment history result: " . json_encode($result));
                    break;
                
                case 'payment_stats':
                    $result = $billingAPI->getPaymentStats();
                    break;
                
                case 'refundable_payments':
                    $filters = [
                        'guest_name' => $_GET['guest_name'] ?? '',
                        'payment_method' => $_GET['payment_method'] ?? '',
                        'payment_status' => $_GET['payment_status'] ?? 'completed',
                        'date_from' => $_GET['date_from'] ?? '',
                        'date_to' => $_GET['date_to'] ?? '',
                        'amount_min' => $_GET['amount_min'] ?? '',
                        'amount_max' => $_GET['amount_max'] ?? ''
                    ];
                    $result = $billingAPI->getRefundablePayments($filters);
                    break;
                
                case 'refund_history':
                    $filters = [
                        'guest_name' => $_GET['guest_name'] ?? '',
                        'refund_method' => $_GET['refund_method'] ?? '',
                        'refund_status' => $_GET['refund_status'] ?? '',
                        'refund_reason' => $_GET['refund_reason'] ?? '',
                        'date_from' => $_GET['date_from'] ?? '',
                        'date_to' => $_GET['date_to'] ?? '',
                        'amount_min' => $_GET['amount_min'] ?? '',
                        'amount_max' => $_GET['amount_max'] ?? '',
                        'processed_by' => $_GET['processed_by'] ?? '',
                        'page' => $_GET['page'] ?? 1,
                        'limit' => $_GET['limit'] ?? 20
                    ];
                    $result = $billingAPI->getRefundHistory($filters);
                    break;
                
                case 'refund_stats':
                    $result = $billingAPI->getRefundStats();
                    break;
                
                case 'cancel_booking':
                    $result = $billingAPI->cancelBooking($_POST);
                    break;
                
                default:
                    $result = [
                        'success' => false,
                        'message' => 'Invalid action'
                    ];
            }
            break;
        
        default:
            $result = [
                'success' => false,
                'message' => 'Method not allowed'
            ];
    }

    // Clean any output buffer before sending JSON
    ob_clean();
    
    // Debug: Log what we're about to send
    error_log("About to send JSON response: " . json_encode($result));
    
    echo json_encode($result);

} catch (Exception $e) {
    // Clean any output buffer before sending JSON
    ob_clean();
    
    // Debug: Log the error
    error_log("Exception caught in API: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    $error_response = [
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ];
    echo json_encode($error_response);
}

// End output buffering
ob_end_flush();
?>
