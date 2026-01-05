<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../utils/email_service.php';

class EmailManagementAPI {
    private $conn;
    private $response;
    private $emailService;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new ResponseHandler();
        $this->emailService = new EmailService($db);
    }

    // Handle API requests
    public function handleRequest() {
        $action = $_GET['action'] ?? $_POST['action'] ?? '';
        
        switch ($action) {
            case 'send_invoice':
                return $this->sendInvoiceEmail();
            case 'send_booking_confirmation':
                return $this->sendBookingConfirmation();
            case 'send_payment_receipt':
                return $this->sendPaymentReceipt();
            case 'test_email_config':
                return $this->testEmailConfiguration();
            case 'get_email_stats':
                return $this->getEmailStats();
            case 'get_email_logs':
                return $this->getEmailLogs();
            case 'update_email_config':
                return $this->updateEmailConfig();
            case 'get_email_config':
                return $this->getEmailConfig();
            case 'resend_invoice':
                return $this->resendInvoice();
            case 'bulk_send_invoices':
                return $this->bulkSendInvoices();
            default:
                return $this->response->error("Invalid action", 400);
        }
    }

    // Send invoice email
    private function sendInvoiceEmail() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->response->error("Invalid input data", 400);
            }

            $invoice_id = $input['invoice_id'] ?? null;
            $guest_email = $input['guest_email'] ?? null;
            
            if (!$invoice_id) {
                return $this->response->error("Invoice ID is required", 400);
            }

            // Get invoice data
            $invoice_data = $this->getInvoiceData($invoice_id);
            if (!$invoice_data) {
                return $this->response->error("Invoice not found", 404);
            }

            // Override guest email if provided
            if ($guest_email) {
                $invoice_data['guest_email'] = $guest_email;
            }

            // Generate PDF for attachment
            $pdf_content = $this->generateInvoicePDF($invoice_data);
            $pdf_filename = "Invoice_{$invoice_data['invoice_number']}.pdf";

            // Send email
            $sent = $this->emailService->sendInvoiceEmail($invoice_data, $pdf_content, $pdf_filename);
            
            if ($sent) {
                // Update invoice status to sent
                $this->updateInvoiceStatus($invoice_id, 'sent');
                
                return $this->response->success([
                    'message' => 'Invoice sent successfully via email',
                    'email' => $invoice_data['guest_email'],
                    'invoice_number' => $invoice_data['invoice_number']
                ]);
            } else {
                return $this->response->error("Failed to send invoice email", 500);
            }

        } catch (Exception $e) {
            return $this->response->error("Error sending invoice email: " . $e->getMessage(), 500);
        }
    }

    // Send booking confirmation email
    private function sendBookingConfirmation() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->response->error("Invalid input data", 400);
            }

            $booking_id = $input['booking_id'] ?? null;
            $guest_email = $input['guest_email'] ?? null;
            
            if (!$booking_id) {
                return $this->response->error("Booking ID is required", 400);
            }

            // Get booking data
            $booking_data = $this->getBookingData($booking_id);
            if (!$booking_data) {
                return $this->response->error("Booking not found", 404);
            }

            // Override guest email if provided
            if ($guest_email) {
                $booking_data['guest_email'] = $guest_email;
            }

            // Send email
            $sent = $this->emailService->sendBookingConfirmation($booking_data);
            
            if ($sent) {
                return $this->response->success([
                    'message' => 'Booking confirmation sent successfully',
                    'email' => $booking_data['guest_email'],
                    'booking_reference' => $booking_data['booking_reference']
                ]);
            } else {
                return $this->response->error("Failed to send booking confirmation", 500);
            }

        } catch (Exception $e) {
            return $this->response->error("Error sending booking confirmation: " . $e->getMessage(), 500);
        }
    }

    // Send payment receipt email
    private function sendPaymentReceipt() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->response->error("Invalid input data", 400);
            }

            $payment_id = $input['payment_id'] ?? null;
            $guest_email = $input['guest_email'] ?? null;
            
            if (!$payment_id) {
                return $this->response->error("Payment ID is required", 400);
            }

            // Get payment data
            $payment_data = $this->getPaymentData($payment_id);
            if (!$payment_data) {
                return $this->response->error("Payment not found", 404);
            }

            // Override guest email if provided
            if ($guest_email) {
                $payment_data['guest_email'] = $guest_email;
            }

            // Send email
            $sent = $this->emailService->sendPaymentReceipt($payment_data);
            
            if ($sent) {
                return $this->response->success([
                    'message' => 'Payment receipt sent successfully',
                    'email' => $payment_data['guest_email'],
                    'receipt_number' => $payment_data['receipt_number']
                ]);
            } else {
                return $this->response->error("Failed to send payment receipt", 500);
            }

        } catch (Exception $e) {
            return $this->response->error("Error sending payment receipt: " . $e->getMessage(), 500);
        }
    }

    // Test email configuration
    private function testEmailConfiguration() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->response->error("Invalid input data", 400);
            }

            $test_email = $input['test_email'] ?? null;
            
            if (!$test_email || !filter_var($test_email, FILTER_VALIDATE_EMAIL)) {
                return $this->response->error("Valid test email is required", 400);
            }

            $result = $this->emailService->testEmailConfiguration($test_email);
            
            if ($result['success']) {
                return $this->response->success([
                    'message' => $result['message'],
                    'test_email' => $test_email
                ]);
            } else {
                return $this->response->error($result['message'], 500);
            }

        } catch (Exception $e) {
            return $this->response->error("Error testing email configuration: " . $e->getMessage(), 500);
        }
    }

    // Get email statistics
    private function getEmailStats() {
        try {
            // Get total email count
            $total_query = "SELECT COUNT(*) as total FROM email_logs";
            $total_stmt = $this->conn->prepare($total_query);
            $total_stmt->execute();
            $total_emails = $total_stmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get successful email count
            $success_query = "SELECT COUNT(*) as successful FROM email_logs WHERE status = 'success'";
            $success_stmt = $this->conn->prepare($success_query);
            $success_stmt->execute();
            $successful_emails = $success_stmt->fetch(PDO::FETCH_ASSOC)['successful'];

            // Get failed email count
            $failed_query = "SELECT COUNT(*) as failed FROM email_logs WHERE status = 'failed'";
            $failed_stmt = $this->conn->prepare($failed_query);
            $failed_stmt->execute();
            $failed_emails = $failed_stmt->fetch(PDO::FETCH_ASSOC)['failed'];

            // Get booking confirmation count
            $booking_query = "SELECT COUNT(*) as booking_confirmations FROM email_logs WHERE email_type = 'booking_confirmation' AND status = 'success'";
            $booking_stmt = $this->conn->prepare($booking_query);
            $booking_stmt->execute();
            $booking_confirmations = $booking_stmt->fetch(PDO::FETCH_ASSOC)['booking_confirmations'];

            // Get invoice email count
            $invoice_query = "SELECT COUNT(*) as invoice_emails FROM email_logs WHERE email_type = 'invoice' AND status = 'success'";
            $invoice_stmt = $this->conn->prepare($invoice_query);
            $invoice_stmt->execute();
            $invoice_emails = $invoice_stmt->fetch(PDO::FETCH_ASSOC)['invoice_emails'];

            // Get payment receipt count
            $payment_query = "SELECT COUNT(*) as payment_receipts FROM email_logs WHERE email_type = 'payment_receipt' AND status = 'success'";
            $payment_stmt = $this->conn->prepare($payment_query);
            $payment_stmt->execute();
            $payment_receipts = $payment_stmt->fetch(PDO::FETCH_ASSOC)['payment_receipts'];

            // Calculate success rate
            $success_rate = $total_emails > 0 ? round(($successful_emails / $total_emails) * 100, 1) : 0;

            $stats = [
                'total_emails' => (int)$total_emails,
                'successful_emails' => (int)$successful_emails,
                'failed_emails' => (int)$failed_emails,
                'success_rate' => $success_rate,
                'booking_confirmations' => (int)$booking_confirmations,
                'invoice_emails' => (int)$invoice_emails,
                'payment_receipts' => (int)$payment_receipts
            ];

            return $this->response->success($stats);

        } catch (Exception $e) {
            return $this->response->error("Error getting email stats: " . $e->getMessage(), 500);
        }
    }

    // Get email logs
    private function getEmailLogs() {
        try {
            $limit = $_GET['limit'] ?? 10;
            $limit = min(max((int)$limit, 1), 100); // Limit between 1 and 100
            
            $logs = $this->emailService->getRecentEmailLogs($limit);
            return $this->response->success([
                'logs' => $logs,
                'total' => count($logs)
            ]);
        } catch (Exception $e) {
            return $this->response->error("Error getting email logs: " . $e->getMessage(), 500);
        }
    }

    // Update email configuration
    private function updateEmailConfig() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->response->error("Invalid input data", 400);
            }

            $required_fields = ['host', 'username', 'password', 'port'];
            foreach ($required_fields as $field) {
                if (!isset($input[$field]) || empty($input[$field])) {
                    return $this->response->error("Field '{$field}' is required", 400);
                }
            }

            // Create email_config table if it doesn't exist
            $this->createEmailConfigTable();

            // Update or insert configuration
            foreach ($input as $key => $value) {
                $stmt = $this->conn->prepare("
                    INSERT INTO email_config (config_key, config_value, updated_at) 
                    VALUES (?, ?, NOW()) 
                    ON DUPLICATE KEY UPDATE 
                    config_value = VALUES(config_value), 
                    updated_at = NOW()
                ");
                $stmt->execute([$key, $value]);
            }

            return $this->response->success([
                'message' => 'Email configuration updated successfully'
            ]);

        } catch (Exception $e) {
            return $this->response->error("Error updating email configuration: " . $e->getMessage(), 500);
        }
    }

    // Get email configuration
    private function getEmailConfig() {
        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'email_config'");
            $stmt->execute();
            if ($stmt->rowCount() == 0) {
                return $this->response->success([
                    'config' => [],
                    'message' => 'Email configuration not set up yet'
                ]);
            }

            $stmt = $this->conn->prepare("SELECT config_key, config_value FROM email_config");
            $stmt->execute();
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $config = [];
            foreach ($result as $row) {
                $config[$row['config_key']] = $row['config_value'];
            }

            // Mask password for security
            if (isset($config['password'])) {
                $config['password'] = str_repeat('*', strlen($config['password']));
            }

            return $this->response->success([
                'config' => $config
            ]);

        } catch (Exception $e) {
            return $this->response->error("Error getting email configuration: " . $e->getMessage(), 500);
        }
    }

    // Resend invoice
    private function resendInvoice() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->response->error("Invalid input data", 400);
            }

            $invoice_id = $input['invoice_id'] ?? null;
            $new_email = $input['new_email'] ?? null;
            
            if (!$invoice_id) {
                return $this->response->error("Invoice ID is required", 400);
            }

            // Get invoice data
            $invoice_data = $this->getInvoiceData($invoice_id);
            if (!$invoice_data) {
                return $this->response->error("Invoice not found", 404);
            }

            // Use new email if provided
            if ($new_email && filter_var($new_email, FILTER_VALIDATE_EMAIL)) {
                $invoice_data['guest_email'] = $new_email;
            }

            // Generate PDF for attachment
            $pdf_content = $this->generateInvoicePDF($invoice_data);
            $pdf_filename = "Invoice_{$invoice_data['invoice_number']}.pdf";

            // Send email
            $sent = $this->emailService->sendInvoiceEmail($invoice_data, $pdf_content, $pdf_filename);
            
            if ($sent) {
                return $this->response->success([
                    'message' => 'Invoice resent successfully',
                    'email' => $invoice_data['guest_email'],
                    'invoice_number' => $invoice_data['invoice_number']
                ]);
            } else {
                return $this->response->error("Failed to resend invoice", 500);
            }

        } catch (Exception $e) {
            return $this->response->error("Error resending invoice: " . $e->getMessage(), 500);
        }
    }

    // Bulk send invoices
    private function bulkSendInvoices() {
        try {
            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                return $this->response->error("Invalid input data", 400);
            }

            $invoice_ids = $input['invoice_ids'] ?? [];
            $guest_emails = $input['guest_emails'] ?? [];
            
            if (empty($invoice_ids)) {
                return $this->response->error("Invoice IDs are required", 400);
            }

            $results = [];
            $success_count = 0;
            $failure_count = 0;

            foreach ($invoice_ids as $index => $invoice_id) {
                try {
                    // Get invoice data
                    $invoice_data = $this->getInvoiceData($invoice_id);
                    if (!$invoice_data) {
                        $results[] = [
                            'invoice_id' => $invoice_id,
                            'status' => 'failed',
                            'message' => 'Invoice not found'
                        ];
                        $failure_count++;
                        continue;
                    }

                    // Use custom email if provided
                    if (isset($guest_emails[$index]) && filter_var($guest_emails[$index], FILTER_VALIDATE_EMAIL)) {
                        $invoice_data['guest_email'] = $guest_emails[$index];
                    }

                    // Generate PDF for attachment
                    $pdf_content = $this->generateInvoicePDF($invoice_data);
                    $pdf_filename = "Invoice_{$invoice_data['invoice_number']}.pdf";

                    // Send email
                    $sent = $this->emailService->sendInvoiceEmail($invoice_data, $pdf_content, $pdf_filename);
                    
                    if ($sent) {
                        $this->updateInvoiceStatus($invoice_id, 'sent');
                        $results[] = [
                            'invoice_id' => $invoice_id,
                            'status' => 'success',
                            'message' => 'Invoice sent successfully',
                            'email' => $invoice_data['guest_email']
                        ];
                        $success_count++;
                    } else {
                        $results[] = [
                            'invoice_id' => $invoice_id,
                            'status' => 'failed',
                            'message' => 'Failed to send invoice'
                        ];
                        $failure_count++;
                    }

                } catch (Exception $e) {
                    $results[] = [
                        'invoice_id' => $invoice_id,
                        'status' => 'failed',
                        'message' => 'Error: ' . $e->getMessage()
                    ];
                    $failure_count++;
                }
            }

            return $this->response->success([
                'message' => "Bulk email operation completed",
                'total_invoices' => count($invoice_ids),
                'successful' => $success_count,
                'failed' => $failure_count,
                'results' => $results
            ]);

        } catch (Exception $e) {
            return $this->response->error("Error in bulk email operation: " . $e->getMessage(), 500);
        }
    }

    // Helper methods

    private function getInvoiceData($invoice_id) {
        $stmt = $this->conn->prepare("
            SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                   CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                   g.email as guest_email, g.phone as guest_phone,
                   r.room_number, rt.name as room_type, rt.base_price
            FROM invoices i
            JOIN bookings b ON i.booking_id = b.id
            JOIN guests g ON b.guest_id = g.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE i.id = ?
        ");
        $stmt->execute([$invoice_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            return false;
        }
        
        return $result;
    }

    private function getBookingData($booking_id) {
        $stmt = $this->conn->prepare("
            SELECT b.*, CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                   g.email as guest_email, g.phone as guest_phone,
                   r.room_number, rt.name as room_type, rt.base_price
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE b.id = ?
        ");
        $stmt->execute([$booking_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            return false;
        }
        
        return $result;
    }

    private function getPaymentData($payment_id) {
        $stmt = $this->conn->prepare("
            SELECT p.*, i.invoice_number, CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                   g.email as guest_email, g.phone as guest_phone
            FROM payments p
            JOIN invoices i ON p.invoice_id = i.id
            JOIN bookings b ON p.booking_id = b.id
            JOIN guests g ON b.guest_id = g.id
            WHERE p.id = ?
        ");
        $stmt->execute([$payment_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result) {
            return false;
        }
        
        return $result;
    }

    private function generateInvoicePDF($invoice_data) {
        // This is a placeholder - you would integrate with your existing PDF generation
        // For now, return a simple text representation
        $pdf_content = "Invoice #{$invoice_data['invoice_number']}\n";
        $pdf_content .= "Guest: {$invoice_data['guest_name']}\n";
        $pdf_content .= "Amount: ₹{$invoice_data['total_amount']}\n";
        $pdf_content .= "Date: " . date('Y-m-d') . "\n";
        
        return base64_encode($pdf_content);
    }

    private function updateInvoiceStatus($invoice_id, $status) {
        $stmt = $this->conn->prepare("UPDATE invoices SET status = ? WHERE id = ?");
        return $stmt->execute([$status, $invoice_id]);
    }

    private function createEmailConfigTable() {
        $sql = "
        CREATE TABLE IF NOT EXISTS email_config (
            id INT PRIMARY KEY AUTO_INCREMENT,
            config_key VARCHAR(100) UNIQUE NOT NULL,
            config_value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_config_key (config_key)
        )";
        
        return $this->conn->exec($sql);
    }
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    $database = new Database();
    $db = $database->getConnection();
    $api = new EmailManagementAPI($db);
    $response = $api->handleRequest();
    
    header('Content-Type: application/json');
    echo json_encode($response);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
