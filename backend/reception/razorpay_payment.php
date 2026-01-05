<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../config/razorpay.php';
require_once '../utils/response_handler.php';

class RazorpayPayment {
    private $db;
    private $responseHandler;
    private $razorpay;

    public function __construct($db) {
        $this->db = $db;
        $this->responseHandler = new ResponseHandler();
        
        try {
            $this->razorpay = getRazorpayInstance();
        } catch (Exception $e) {
            error_log("Failed to initialize Razorpay: " . $e->getMessage());
        }
    }

    /**
     * Create a new payment order
     */
    public function createOrder($data) {
        try {
            // Validate required fields
            if (empty($data['amount']) || empty($data['booking_id']) || empty($data['guest_id'])) {
                return $this->responseHandler->error('Missing required fields: amount, booking_id, guest_id', 400);
            }

            $amount = (float)$data['amount'];
            $bookingId = (int)$data['booking_id'];
            $guestId = (int)$data['guest_id'];
            $description = $data['description'] ?? 'Hotel booking payment';

            // Create Razorpay order
            $orderData = [
                'receipt' => 'booking_' . $bookingId . '_' . time(),
                'amount' => formatAmountForRazorpay($amount),
                'currency' => RAZORPAY_CURRENCY,
                'notes' => [
                    'booking_id' => $bookingId,
                    'guest_id' => $guestId,
                    'description' => $description
                ]
            ];

            $razorpayOrder = $this->razorpay->order->create($orderData);

            // Store order details in database
            $orderId = $this->storeOrder($razorpayOrder, $data);

            if (!$orderId) {
                return $this->responseHandler->error('Failed to store order details', 500);
            }

            return $this->responseHandler->success([
                'order_id' => $razorpayOrder->id,
                'amount' => $amount,
                'currency' => RAZORPAY_CURRENCY,
                'key_id' => RAZORPAY_KEY_ID,
                'description' => $description,
                'prefill' => [
                    'name' => $data['guest_name'] ?? '',
                    'email' => $data['guest_email'] ?? '',
                    'contact' => $data['guest_phone'] ?? ''
                ]
            ]);

        } catch (Exception $e) {
            error_log("Create order error: " . $e->getMessage());
            return $this->responseHandler->serverError('Failed to create payment order: ' . $e->getMessage());
        }
    }

    /**
     * Create and send payment link via SMS/WhatsApp
     */
    public function createPaymentLink($data) {
        try {
            // Validate required fields
            if (empty($data['amount']) || empty($data['booking_id']) || empty($data['guest_id']) || empty($data['guest_phone'])) {
                return $this->responseHandler->error('Missing required fields: amount, booking_id, guest_id, guest_phone', 400);
            }

            $amount = (float)$data['amount'];
            $bookingId = (int)$data['booking_id'];
            $guestId = (int)$data['guest_id'];
            $guestPhone = $data['guest_phone'];
            $description = $data['description'] ?? 'Hotel booking payment';

            // Create payment link
            $paymentLinkData = [
                'amount' => formatAmountForRazorpay($amount),
                'currency' => RAZORPAY_CURRENCY,
                'accept_partial' => false,
                'first_min_partial_amount' => 0,
                'description' => $description,
                'reference_id' => 'booking_' . $bookingId . '_' . time(),
                'expire_by' => time() + (7 * 24 * 60 * 60), // 7 days expiry
                'notes' => [
                    'booking_id' => $bookingId,
                    'guest_id' => $guestId,
                    'description' => $description
                ],
                'reminder_enable' => true,
                'sms_notify' => 1,
                'email_notify' => 1,
                'callback_url' => 'http://localhost:3000/payment/callback',
                'callback_method' => 'get'
            ];

            $paymentLink = $this->razorpay->paymentLink->create($paymentLinkData);

            // Store payment link details in database
            $linkId = $this->storePaymentLink($paymentLink, $data);

            if (!$linkId) {
                return $this->responseHandler->error('Failed to store payment link details', 500);
            }

            // Send SMS/WhatsApp notification
            $smsResult = $this->sendPaymentLinkNotification($guestPhone, $paymentLink->short_url, $amount, $description);

            return $this->responseHandler->success([
                'payment_link_id' => $paymentLink->id,
                'short_url' => $paymentLink->short_url,
                'long_url' => $paymentLink->long_url,
                'amount' => $amount,
                'currency' => RAZORPAY_CURRENCY,
                'description' => $description,
                'expires_at' => date('Y-m-d H:i:s', $paymentLink->expire_by),
                'sms_sent' => $smsResult['success'],
                'message' => 'Payment link created and sent successfully'
            ]);

        } catch (Exception $e) {
            error_log("Create payment link error: " . $e->getMessage());
            return $this->responseHandler->serverError('Failed to create payment link: ' . $e->getMessage());
        }
    }

    /**
     * Send payment link via SMS/WhatsApp
     */
    public function sendPaymentLinkNotification($phone, $paymentUrl, $amount, $description) {
        try {
            // Format phone number (remove +91 if present and add it)
            $formattedPhone = $this->formatPhoneNumber($phone);
            
            // Create SMS message
            $message = "SV Royal Hotel: Payment link for ₹{$amount} - {$description}. Click here: {$paymentUrl}";
            
            // For now, we'll simulate SMS sending
            // In production, you would integrate with SMS gateway like Twilio, MSG91, etc.
            $smsResult = $this->simulateSMS($formattedPhone, $message);
            
            // Store SMS log
            $this->logSMSNotification($formattedPhone, $message, $smsResult);
            
            return $smsResult;
            
        } catch (Exception $e) {
            error_log("Send notification error: " . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Format phone number for SMS
     */
    private function formatPhoneNumber($phone) {
        // Remove any non-digit characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // If it's a 10-digit number, add +91
        if (strlen($phone) === 10) {
            $phone = '+91' . $phone;
        }
        
        return $phone;
    }

    /**
     * Simulate SMS sending (replace with actual SMS gateway)
     */
    private function simulateSMS($phone, $message) {
        // This is a simulation - replace with actual SMS gateway integration
        // Example: Twilio, MSG91, etc.
        
        // Log the SMS details
        error_log("SMS would be sent to {$phone}: {$message}");
        
        return [
            'success' => true,
            'message' => 'SMS sent successfully (simulated)',
            'phone' => $phone,
            'message_length' => strlen($message)
        ];
    }

    /**
     * Log SMS notification
     */
    private function logSMSNotification($phone, $message, $result) {
        try {
            $query = "INSERT INTO razorpay_payment_logs (
                order_id, event_type, event_data, created_at
            ) VALUES (?, ?, ?, NOW())";
            
            $eventData = json_encode([
                'phone' => $phone,
                'message' => $message,
                'result' => $result,
                'type' => 'sms_notification'
            ]);
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([1, 'sms_sent', $eventData]); // Using order_id = 1 for now
            
        } catch (Exception $e) {
            error_log("Failed to log SMS notification: " . $e->getMessage());
        }
    }

    /**
     * Verify payment and process it
     */
    public function verifyPayment($data) {
        try {
            // Validate required fields
            if (empty($data['razorpay_payment_id']) || empty($data['razorpay_order_id']) || empty($data['razorpay_signature'])) {
                return $this->responseHandler->error('Missing payment verification data', 400);
            }

            $paymentId = $data['razorpay_payment_id'];
            $orderId = $data['razorpay_order_id'];
            $signature = $data['razorpay_signature'];

            // Verify payment signature
            if (!verifyPaymentSignature($paymentId, $orderId, $signature)) {
                return $this->responseHandler->error('Payment signature verification failed', 400);
            }

            // Get payment details from Razorpay
            $payment = $this->razorpay->payment->fetch($paymentId);
            
            if ($payment->status !== 'captured') {
                return $this->responseHandler->error('Payment not completed', 400);
            }

            // Process the payment in our system
            $result = $this->processPayment($payment, $orderId);

            if (!$result) {
                return $this->responseHandler->error('Failed to process payment', 500);
            }

            return $this->responseHandler->success([
                'payment_id' => $paymentId,
                'order_id' => $orderId,
                'amount' => formatAmountFromRazorpay($payment->amount),
                'status' => 'completed',
                'message' => 'Payment processed successfully'
            ]);

        } catch (Exception $e) {
            error_log("Payment verification error: " . $e->getMessage());
            return $this->responseHandler->serverError('Failed to verify payment: ' . $e->getMessage());
        }
    }

    /**
     * Get payment status
     */
    public function getPaymentStatus($paymentId) {
        try {
            $payment = $this->razorpay->payment->fetch($paymentId);
            
            return $this->responseHandler->success([
                'payment_id' => $payment->id,
                'status' => $payment->status,
                'amount' => formatAmountFromRazorpay($payment->amount),
                'currency' => $payment->currency,
                'created_at' => $payment->created_at,
                'method' => $payment->method
            ]);

        } catch (Exception $e) {
            error_log("Get payment status error: " . $e->getMessage());
            return $this->responseHandler->serverError('Failed to get payment status: ' . $e->getMessage());
        }
    }

    /**
     * Store order details in database
     */
    private function storeOrder($razorpayOrder, $data) {
        try {
            $query = "INSERT INTO razorpay_orders (
                razorpay_order_id, booking_id, guest_id, amount, currency, 
                description, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $razorpayOrder->id,
                $data['booking_id'],
                $data['guest_id'],
                $data['amount'],
                RAZORPAY_CURRENCY,
                $data['description'] ?? 'Hotel booking payment',
                'created'
            ]);

            return $this->db->lastInsertId();
        } catch (Exception $e) {
            error_log("Store order error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Store payment link details in database
     */
    private function storePaymentLink($paymentLink, $data) {
        try {
            $query = "INSERT INTO razorpay_payment_links (
                payment_link_id, booking_id, guest_id, amount, currency, 
                description, short_url, long_url, expires_at, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $paymentLink->id,
                $data['booking_id'],
                $data['guest_id'],
                $data['amount'],
                RAZORPAY_CURRENCY,
                $data['description'] ?? 'Hotel booking payment',
                $paymentLink->short_url,
                $paymentLink->long_url,
                date('Y-m-d H:i:s', $paymentLink->expire_by),
                'active'
            ]);

            return $this->db->lastInsertId();
        } catch (Exception $e) {
            error_log("Store payment link error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Process payment in our system
     */
    private function processPayment($payment, $orderId) {
        try {
            // Update order status
            $query = "UPDATE razorpay_orders SET 
                status = 'completed', 
                payment_id = ?, 
                updated_at = NOW() 
                WHERE razorpay_order_id = ?";
            
            $stmt = $this->db->prepare($query);
            $stmt->execute([$payment->id, $orderId]);

            // Get order details
            $query = "SELECT * FROM razorpay_orders WHERE razorpay_order_id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$order) {
                return false;
            }

            // Get invoice details for this booking
            $query = "SELECT i.*, b.room_number, CONCAT(g.first_name, ' ', g.last_name) as guest_name
                     FROM invoices i 
                     JOIN bookings b ON i.booking_id = b.id 
                     JOIN guests g ON b.guest_id = g.id
                     WHERE i.booking_id = ? AND i.status != 'paid'
                     ORDER BY i.id ASC LIMIT 1";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$order['booking_id']]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                error_log("No unpaid invoice found for booking: " . $order['booking_id']);
                return false;
            }

            // Generate receipt number
            $receipt_number = 'RCPT-' . date('Y') . '-' . str_pad($invoice['id'], 6, '0', STR_PAD_LEFT);

            // Create payment record with all required fields
            $query = "INSERT INTO payments (
                invoice_id, booking_id, amount, payment_method, payment_status, 
                transaction_id, receipt_number, payment_date, processed_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)";

            $stmt = $this->db->prepare($query);
            $stmt->execute([
                $invoice['id'],
                $order['booking_id'],
                formatAmountFromRazorpay($payment->amount),
                'razorpay',
                'completed',
                $payment->id,
                $receipt_number,
                1, // Default user ID, replace with actual user ID
                "Razorpay payment - Order: {$orderId}"
            ]);

            $payment_id = $this->db->lastInsertId();

            // Update invoice status
            $this->updateInvoiceStatus($invoice['id'], $payment_id);

            // Log successful payment
            error_log("Razorpay payment processed successfully: Payment ID {$payment_id}, Receipt: {$receipt_number}");

            return true;
        } catch (Exception $e) {
            error_log("Process payment error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Update invoice status after payment
     */
    private function updateInvoiceStatus($invoice_id, $payment_id) {
        try {
            // Get total paid amount for this invoice
            $query = "SELECT COALESCE(SUM(amount), 0) as total_paid 
                     FROM payments 
                     WHERE invoice_id = ? AND payment_status = 'completed'";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$invoice_id]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $total_paid = $result['total_paid'];

            // Get invoice total
            $query = "SELECT total_amount FROM invoices WHERE id = ?";
            $stmt = $this->db->prepare($query);
            $stmt->execute([$invoice_id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($invoice) {
                $new_status = ($total_paid >= $invoice['total_amount']) ? 'paid' : 'partial';
                
                $query = "UPDATE invoices SET status = ? WHERE id = ?";
                $stmt = $this->db->prepare($query);
                $stmt->execute([$new_status, $invoice_id]);

                error_log("Invoice {$invoice_id} status updated to: {$new_status}");
            }
        } catch (Exception $e) {
            error_log("Error updating invoice status: " . $e->getMessage());
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $razorpayPayment = new RazorpayPayment($db);
        
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $_GET['action'] ?? '';

        switch ($action) {
            case 'create_order':
                $result = $razorpayPayment->createOrder($input);
                break;
                
            case 'create_payment_link':
                $result = $razorpayPayment->createPaymentLink($input);
                break;
                
            case 'verify_payment':
                $result = $razorpayPayment->verifyPayment($input);
                break;
                
            case 'payment_status':
                $paymentId = $input['payment_id'] ?? '';
                if (empty($paymentId)) {
                    $result = $responseHandler->error('Payment ID required', 400);
                } else {
                    $result = $razorpayPayment->getPaymentStatus($paymentId);
                }
                break;
                
            default:
                $result = $this->responseHandler->error('Invalid action', 400);
        }

        http_response_code($result['success'] ? 200 : 400);
        echo json_encode($result);

    } catch (Exception $e) {
        $responseHandler = new ResponseHandler();
        $errorResponse = $responseHandler->serverError('Internal server error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode($errorResponse);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
