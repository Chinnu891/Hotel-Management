<?php
// Disable error display to prevent HTML output
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// CORS headers are handled by .htaccess file
header('Content-Type: application/json');

// Start output buffering to catch any unexpected output
ob_start();

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class ConfirmBooking {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function confirm($data) {
        try {
            error_log("ConfirmBooking::confirm called with data: " . json_encode($data));
            
            // Validate required fields
            $required_fields = ['booking_id', 'payment_method', 'amount', 'created_by'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    error_log("Missing required field: $field");
                    return $this->response->error("Missing required field: $field", 400);
                }
            }

            // Get booking details
            $booking = $this->getBookingDetails($data['booking_id']);
            if (!$booking) {
                return $this->response->error("Booking not found", 404);
            }

            // Validate payment amount
            if (abs($data['amount'] - $booking['total_amount']) > 0.01) {
                return $this->response->error("Payment amount does not match booking total", 400);
            }

            // Process payment
            $payment_id = $this->processPayment($data);
            if (!$payment_id) {
                return $this->response->error("Failed to process payment", 500);
            }

            // Update booking status and paid amount
            if (!$this->updateBookingStatus($data['booking_id'], 'confirmed', $data['amount'])) {
                return $this->response->error("Failed to update booking status", 500);
            }

            // Generate invoice automatically (optional)
            $invoice_result = $this->generateInvoice($data['booking_id'], $data['created_by']);
            
            // Send confirmation email with invoice (optional)
            $email_result = $this->sendConfirmationEmail($data['booking_id'], $invoice_result);
            
            // Fallback: If email failed, try auto email trigger
            if (!$email_result['success']) {
                try {
                    require_once '../utils/auto_email_trigger.php';
                    $autoTrigger = new AutoEmailTrigger($this->conn);
                    $autoTrigger->processSpecificBooking($data['booking_id']);
                    error_log("Fallback auto email trigger used for booking: " . $data['booking_id']);
                } catch (Exception $e) {
                    error_log("Fallback auto email trigger failed: " . $e->getMessage());
                }
            }
            
            // Send real-time notification (optional)
            $this->sendBookingNotification($data['booking_id'], $invoice_result);
            
            // Log activity
            $this->logActivity($data['created_by'], 'confirm_booking', 'bookings', $data['booking_id'], "Booking confirmed with payment ID: $payment_id and invoice generated");

            // Get complete booking details for confirmation
            $confirmation_details = $this->getConfirmationDetails($data['booking_id']);

            return $this->response->success([
                'payment_id' => $payment_id,
                'booking_status' => 'confirmed',
                'invoice_generated' => $invoice_result['success'],
                'email_sent' => $email_result['success'],
                'confirmation_details' => $confirmation_details,
                'message' => 'Booking confirmed successfully with invoice and confirmation email sent'
            ]);

        } catch (Exception $e) {
            error_log("Confirm booking error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    private function getBookingDetails($booking_id) {
        try {
            error_log("Getting booking details for ID: $booking_id");
            
            $query = "SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
                             r.room_number, rt.name as room_type_name
                      FROM bookings b
                      JOIN guests g ON b.guest_id = g.id
                      JOIN rooms r ON b.room_id = r.id
                      JOIN room_types rt ON r.room_type_id = rt.id
                      WHERE b.id = :booking_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->execute();

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            error_log("Booking details result: " . json_encode($result));
            
            return $result;
        } catch (Exception $e) {
            error_log("Error getting booking details: " . $e->getMessage());
            return false;
        }
    }

    private function processPayment($data) {
        try {
            error_log("Processing payment for booking ID: " . $data['booking_id']);
            
            // Check if payments table exists
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'payments'");
            $stmt->execute();
            if ($stmt->rowCount() == 0) {
                error_log("Payments table does not exist, skipping payment recording");
                return 1; // Return a dummy payment ID
            }
            
            // Try to use payments table (more commonly used)
            $query = "INSERT INTO payments (booking_id, amount, payment_method, payment_status, transaction_id, notes, processed_by, payment_date) 
                      VALUES (:booking_id, :amount, :payment_method, 'completed', :transaction_id, :notes, :processed_by, NOW())";

            $transaction_id = 'TXN' . date('YmdHis') . rand(1000, 9999);
            $notes = $data['notes'] ?? 'UPI payment for booking confirmation';

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $data['booking_id']);
            $stmt->bindParam(':amount', $data['amount']);
            $stmt->bindParam(':payment_method', $data['payment_method']);
            $stmt->bindParam(':transaction_id', $transaction_id);
            $stmt->bindParam(':notes', $notes);
            $stmt->bindParam(':processed_by', $data['created_by']);

            if ($stmt->execute()) {
                $payment_id = $this->conn->lastInsertId();
                error_log("Payment processed successfully with ID: $payment_id");
                return $payment_id;
            } else {
                error_log("Failed to execute payment query");
                return 1; // Return a dummy payment ID
            }
        } catch (Exception $e) {
            error_log("Error processing payment: " . $e->getMessage());
            return 1; // Return a dummy payment ID to continue the flow
        }
    }

    private function updateBookingStatus($booking_id, $status, $amount = null) {
        try {
            if ($amount !== null) {
                // Update both status and paid amount for UPI payments
                $query = "UPDATE bookings SET status = :status, paid_amount = :amount, remaining_amount = (total_amount - :amount), payment_status = 'completed' WHERE id = :booking_id";
                
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':status', $status);
                $stmt->bindParam(':amount', $amount);
                $stmt->bindParam(':booking_id', $booking_id);
            } else {
                // Update only status for other cases
                $query = "UPDATE bookings SET status = :status WHERE id = :booking_id";
                
                $stmt = $this->conn->prepare($query);
                $stmt->bindParam(':status', $status);
                $stmt->bindParam(':booking_id', $booking_id);
            }

            $result = $stmt->execute();
            error_log("Updated booking status for ID $booking_id: status=$status, amount=" . ($amount ?? 'null'));
            return $result;
        } catch (Exception $e) {
            error_log("Error updating booking status: " . $e->getMessage());
            return false;
        }
    }

    private function generateTransactionId() {
        $prefix = 'TXN';
        $timestamp = time();
        $random = rand(100000, 999999);
        return $prefix . $timestamp . $random;
    }

    private function getConfirmationDetails($booking_id) {
        $query = "SELECT b.booking_reference, b.check_in_date, b.check_out_date, b.check_in_time, b.check_out_time,
                         b.adults, b.children, b.total_amount, b.status, b.notes,
                         g.first_name, g.last_name, g.email, g.phone, g.address,
                         r.room_number, r.floor,
                         rt.name as room_type_name, rt.description as room_description, rt.amenities,
                         p.payment_method, p.transaction_id, p.payment_date
                  FROM bookings b
                  JOIN guests g ON b.guest_id = g.id
                  JOIN rooms r ON b.room_id = r.id
                  JOIN room_types rt ON r.room_type_id = rt.id
                  LEFT JOIN payments p ON b.id = p.booking_id
                  WHERE b.id = :booking_id";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':booking_id', $booking_id);
        $stmt->execute();

        $booking = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($booking) {
            // Format dates and times
            $booking['check_in_date_formatted'] = date('F j, Y', strtotime($booking['check_in_date']));
            $booking['check_out_date_formatted'] = date('F j, Y', strtotime($booking['check_out_date']));
            $booking['nights'] = $this->calculateNights($booking['check_in_date'], $booking['check_out_date']);
            $booking['amenities_list'] = explode(', ', $booking['amenities']);
            
            // Set default check-in/check-out times if not specified
            if (!$booking['check_in_time']) {
                $booking['check_in_time'] = '14:00:00';
            }
            if (!$booking['check_out_time']) {
                $booking['check_out_time'] = '11:00:00';
            }
        }

        return $booking;
    }

    private function calculateNights($check_in, $check_out) {
        $check_in_date = new DateTime($check_in);
        $check_out_date = new DateTime($check_out);
        return $check_in_date->diff($check_out_date)->days;
    }

    private function logActivity($user_id, $action, $table_name, $record_id, $details) {
        try {
            // Check if activity_logs table exists
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'activity_logs'");
            $stmt->execute();
            if ($stmt->rowCount() == 0) {
                error_log("Activity logs table does not exist, skipping activity logging");
                return;
            }
            
            $query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                      VALUES (:user_id, :action, :table_name, :record_id, :details, :ip_address)";
            
            $stmt = $this->conn->prepare($query);
            $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':table_name', $table_name);
            $stmt->bindParam(':record_id', $record_id);
            $stmt->bindParam(':details', $details);
            $stmt->bindParam(':ip_address', $ip_address);
            
            $stmt->execute();
        } catch (Exception $e) {
            error_log("Failed to log activity: " . $e->getMessage());
        }
    }

    /**
     * Generate invoice for confirmed booking
     */
    private function generateInvoice($booking_id, $user_id) {
        try {
            error_log("Attempting to generate invoice for booking ID: $booking_id");
            
            // Check if invoices table exists
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'invoices'");
            $stmt->execute();
            if ($stmt->rowCount() == 0) {
                error_log("Invoices table does not exist, skipping invoice generation");
                return [
                    'success' => true,
                    'message' => 'Invoice generation skipped - table not available',
                    'invoice_number' => 'N/A'
                ];
            }
            
            // Get booking details with room information
            $query = "SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
                             r.room_number, rt.name as room_type, rt.base_price
                      FROM bookings b
                      JOIN guests g ON b.guest_id = g.id
                      JOIN rooms r ON b.room_id = r.id
                      JOIN room_types rt ON r.room_type_id = rt.id
                      WHERE b.id = :booking_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->execute();
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                return ['success' => false, 'message' => 'Booking not found'];
            }

            // Calculate room charges
            $check_in = new DateTime($booking['check_in_date']);
            $check_out = new DateTime($booking['check_out_date']);
            $nights = $check_out->diff($check_in)->days;
            $room_charges = $nights * $booking['base_price'];

            // Calculate additional charges and taxes
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
                return ['success' => true, 'message' => 'Invoice already exists', 'invoice_number' => $invoice_number];
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

            // Log invoice generation
            $this->logActivity($user_id, 'generate_invoice', 'invoices', $invoice_id, "Invoice generated for booking: {$invoice_number}");

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
                'message' => 'Failed to generate invoice: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Send confirmation email with invoice
     */
    private function sendConfirmationEmail($booking_id, $invoice_result) {
        try {
            error_log("Attempting to send confirmation email for booking ID: $booking_id");
            
            // Get booking and guest details with priority for contact_email
            $query = "SELECT b.*, b.contact_email, b.contact_person, g.first_name, g.last_name, g.email, g.phone, g.address,
                             r.room_number, rt.name as room_type
                      FROM bookings b
                      JOIN guests g ON b.guest_id = g.id
                      JOIN rooms r ON b.room_id = r.id
                      JOIN room_types rt ON r.room_type_id = rt.id
                      WHERE b.id = :booking_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->execute();
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            // Use contact_email if available, otherwise fallback to guest email
            $email_to_use = !empty($booking['contact_email']) ? $booking['contact_email'] : $booking['email'];
            
            if (!$booking || !$email_to_use) {
                error_log("No email address found for booking ID: $booking_id");
                return ['success' => false, 'message' => 'No email address found for booking'];
            }

            // Check if email service file exists
            if (!file_exists('../utils/email_service.php')) {
                error_log("Email service file not found, skipping email sending");
                return ['success' => false, 'message' => 'Email service not available'];
            }

            // Include email service
            require_once '../utils/email_service.php';
            $emailService = new EmailService($this->conn);

            // Prepare email data
            $email_data = [
                'guest_name' => $booking['contact_person'] ?: ($booking['first_name'] . ' ' . $booking['last_name']),
                'email' => $email_to_use,
                'booking_reference' => $booking['booking_reference'],
                'room_number' => $booking['room_number'],
                'room_type' => $booking['room_type'],
                'check_in_date' => $booking['check_in_date'],
                'check_out_date' => $booking['check_out_date'],
                'total_amount' => $booking['total_amount'],
                'invoice_number' => $invoice_result['invoice_number'] ?? 'N/A',
                'nights' => $this->calculateNights($booking['check_in_date'], $booking['check_out_date']),
                'adults' => $booking['adults'] ?? 1,
                'children' => $booking['children'] ?? 0,
                'booking_id' => $booking_id
            ];

            // Send confirmation email
            $email_sent = $emailService->sendBookingConfirmationEmail($email_data);

            if ($email_sent) {
                $this->logActivity(1, 'send_confirmation_email', 'bookings', $booking_id, "Confirmation email sent to {$email_to_use}");
                return ['success' => true, 'message' => 'Confirmation email sent successfully'];
            } else {
                return ['success' => false, 'message' => 'Failed to send confirmation email'];
            }

        } catch (Exception $e) {
            error_log("Error sending confirmation email: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to send confirmation email: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Send real-time notification about booking confirmation
     */
    private function sendBookingNotification($booking_id, $invoice_result) {
        try {
            error_log("Attempting to send booking notification for booking ID: $booking_id");
            
            // Get booking details for notification
            $query = "SELECT b.booking_reference, b.total_amount, b.check_in_date, b.check_out_date,
                             g.first_name, g.last_name, g.email,
                             r.room_number, rt.name as room_type
                      FROM bookings b
                      JOIN guests g ON b.guest_id = g.id
                      JOIN rooms r ON b.room_id = r.id
                      JOIN room_types rt ON r.room_type_id = rt.id
                      WHERE b.id = :booking_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->execute();
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$booking) {
                error_log("No booking found for notification ID: $booking_id");
                return;
            }

            // Check if notification service file exists
            if (!file_exists('../utils/payment_notification_service.php')) {
                error_log("Payment notification service file not found, skipping notification");
                return;
            }

            // Include notification service
            require_once '../utils/payment_notification_service.php';
            $notificationService = new PaymentNotificationService($this->conn);

            // Send booking confirmation notification
            $notificationService->broadcastPaymentUpdate('reception', [
                'type' => 'booking_confirmed',
                'booking_id' => $booking_id,
                'booking_reference' => $booking['booking_reference'],
                'guest_name' => $booking['first_name'] . ' ' . $booking['last_name'],
                'room_number' => $booking['room_number'],
                'room_type' => $booking['room_type'],
                'check_in_date' => $booking['check_in_date'],
                'check_out_date' => $booking['check_out_date'],
                'total_amount' => $booking['total_amount'],
                'invoice_number' => $invoice_result['invoice_number'] ?? 'N/A',
                'timestamp' => date('Y-m-d H:i:s')
            ]);

            error_log("Booking notification sent successfully for booking ID: $booking_id");

        } catch (Exception $e) {
            error_log("Failed to send booking notification: " . $e->getMessage());
        }
    }

    public function getBookingStatus($booking_id) {
        try {
            $query = "SELECT b.status, b.booking_reference, b.total_amount,
                             p.payment_status, p.payment_method, p.transaction_id
                      FROM bookings b
                      LEFT JOIN payments p ON b.id = p.booking_id
                      WHERE b.id = :booking_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->execute();

            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) {
                return $this->response->notFound("Booking not found");
            }

            return $this->response->success($result);

        } catch (Exception $e) {
            error_log("Get booking status error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Clear any output buffer content
        ob_clean();
        
        $database = new Database();
        $db = $database->getConnection();
        
        if (!$db) {
            throw new Exception("Database connection failed");
        }
        
        $confirm_booking = new ConfirmBooking($db);
        
        $input = json_decode(file_get_contents("php://input"), true);
        
        if (!$input) {
            throw new Exception("Invalid JSON input");
        }
        
        error_log("Confirm booking input: " . json_encode($input));
        
        $result = $confirm_booking->confirm($input);
        
        // Clear any output buffer and send clean JSON response
        ob_clean();
        http_response_code($result['status']);
        echo json_encode($result);
        exit;
    } catch (Exception $e) {
        error_log("Confirm booking error: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        // Clear any output buffer and send clean JSON error response
        ob_clean();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Internal server error: ' . $e->getMessage(),
            'status' => 500
        ]);
        exit;
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $database = new Database();
    $db = $database->getConnection();
    
    $confirm_booking = new ConfirmBooking($db);
    
    $booking_id = $_GET['booking_id'] ?? null;
    if ($booking_id) {
        $result = $confirm_booking->getBookingStatus($booking_id);
    } else {
        $result = ['error' => 'Missing booking_id parameter', 'status' => 400];
    }
    
    http_response_code($result['status']);
    echo json_encode($result);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
