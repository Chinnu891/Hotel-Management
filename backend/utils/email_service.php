<?php
/**
 * Basic Email Service for Invoice System
 * Uses PHP's built-in mail() function for simplicity
 */

class EmailService {
    private $hotel_name = "SV ROYAL LUXURY ROOMS";
    private $hotel_email = "info@svroyalluxury.com";
    private $hotel_address = "5-37-222, Opp. Hari Jewellery, 4th line Brodripet, Guntur";
    private $hotel_phone = "+91 9563 776 77";

    public function __construct($db = null) {
        // Initialize email service with optional database connection
        $this->conn = $db;
    }

    /**
     * Send invoice via email
     */
    public function sendInvoice($invoice_data, $pdf_content = null) {
        try {
            $to = $invoice_data['guest_email'];
            $subject = "Invoice #{$invoice_data['invoice_number']} - {$this->hotel_name}";
            
            $message = $this->getInvoiceEmailTemplate($invoice_data);
            $headers = $this->getEmailHeaders();
            
            // If PDF content is provided, create multipart email with attachment
            if ($pdf_content) {
                $boundary = md5(time());
                $headers[] = "Content-Type: multipart/mixed; boundary=\"{$boundary}\"";
                
                $email_body = "--{$boundary}\r\n";
                $email_body .= "Content-Type: text/html; charset=UTF-8\r\n";
                $email_body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
                $email_body .= $message . "\r\n\r\n";
                
                $email_body .= "--{$boundary}\r\n";
                $email_body .= "Content-Type: application/pdf; name=\"invoice_{$invoice_data['invoice_number']}.pdf\"\r\n";
                $email_body .= "Content-Transfer-Encoding: base64\r\n";
                $email_body .= "Content-Disposition: attachment; filename=\"invoice_{$invoice_data['invoice_number']}.pdf\"\r\n\r\n";
                $email_body .= base64_encode($pdf_content) . "\r\n\r\n";
                $email_body .= "--{$boundary}--";
                
                $result = mail($to, $subject, $email_body, implode("\r\n", $headers));
            } else {
                // Send simple HTML email without attachment
                $result = mail($to, $subject, $message, implode("\r\n", $headers));
            }
            
            if ($result) {
                // Log successful email
                $this->logEmail($invoice_data['id'], $to, 'sent', null);
                return true;
            } else {
                // Log failed email
                $this->logEmail($invoice_data['id'], $to, 'failed', 'Mail function failed');
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Email sending failed: " . $e->getMessage());
            $this->logEmail($invoice_data['id'], $to, 'failed', $e->getMessage());
            return false;
        }
    }

    /**
     * Get email headers
     */
    private function getEmailHeaders() {
        return [
            'From: ' . $this->hotel_email,
            'Reply-To: ' . $this->hotel_email,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'X-Priority: 1 (Highest)',
            'X-MSMail-Priority: High',
            'Importance: High',
            'X-Mailer: SV Royal Hotel Booking System v2.0',
            'List-Unsubscribe: <mailto:' . $this->hotel_email . '?subject=unsubscribe>',
            'Precedence: bulk',
            'X-Auto-Response-Suppress: OOF, AutoReply',
            'X-Report-Abuse: Please report abuse here: ' . $this->hotel_email,
            'X-Entity-Ref-ID: SVROYAL-' . time()
        ];
    }

    /**
     * Send booking confirmation email with invoice
     */
    public function sendBookingConfirmationEmail($email_data) {
        // 🎯 FINAL TEST LOGGING - EMAIL SENDING
        error_log("🎯 FINAL TEST === EMAIL SENDING DETAILS ===");
        error_log("🎯 FINAL TEST - Email data received: " . print_r($email_data, true));
        error_log("🎯 FINAL TEST - Email recipient: " . (isset($email_data['email']) ? $email_data['email'] : 'NOT SET'));
        
        try {
            $to = $email_data['email'];
            $subject = "Booking Confirmation #{$email_data['booking_reference']} - {$this->hotel_name}";
            
            error_log("🎯 FINAL TEST - Email subject: " . $subject);
            error_log("🎯 FINAL TEST - Email recipient: " . $to);
            
            $message = $this->getBookingConfirmationEmailTemplate($email_data);
            $headers = $this->getEmailHeaders();
            
            error_log("🎯 FINAL TEST - Email template generated, length: " . strlen($message));
            
            // Send the email using Gmail SMTP
            $result = $this->sendEmailViaSMTP($to, $subject, $message);
            
            error_log("🎯 FINAL TEST - SMTP result: " . ($result ? 'SUCCESS' : 'FAILED'));
            
            // Log the email activity
            $this->logEmailActivity(isset($email_data['booking_id']) ? $email_data['booking_id'] : 0, 'booking_confirmation', $to, $result ? 'success' : 'failed', $result ? null : 'SMTP sending failed');
            
            if ($result) {
                error_log("🎯 FINAL TEST - SUCCESS: Booking confirmation email sent successfully to: " . $to);
                error_log("🎯 FINAL TEST === EMAIL SENDING DETAILS END - SUCCESS ===\n");
                return true;
            } else {
                error_log("🎯 FINAL TEST - FAILED: Failed to send booking confirmation email to: " . $to);
                error_log("🎯 FINAL TEST === EMAIL SENDING DETAILS END - FAILED ===\n");
                return false;
            }
            
        } catch (Exception $e) {
            error_log("🎯 FINAL TEST - ERROR: Error sending booking confirmation email: " . $e->getMessage());
            error_log("🎯 FINAL TEST === EMAIL SENDING DETAILS END - ERROR ===\n");
            // Log the error
            $this->logEmailActivity(isset($email_data['booking_id']) ? $email_data['booking_id'] : 0, 'booking_confirmation', $email_data['email'], 'failed', $e->getMessage());
            return false;
        }
    }

    /**
     * Get payment receipt email template
     */
    private function getPaymentReceiptEmailTemplate($data) {
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; }
                .payment-details { background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
                .amount { font-size: 18px; font-weight: bold; color: #059669; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>{$this->hotel_name}</h1>
                <p>Payment Receipt</p>
            </div>
            
            <div class='content'>
                <h2>Payment Receipt</h2>
                
                <p>Dear {$data['guest_name']},</p>
                
                <p>Thank you for your payment. Here is your payment receipt:</p>
                
                <div class='payment-details'>
                    <h3>Payment Details</h3>
                    <ul>
                        <li><strong>Payment ID:</strong> {$data['id']}</li>
                        <li><strong>Invoice Number:</strong> {$data['invoice_number']}</li>
                        <li><strong>Amount Paid:</strong> <span class='amount'>₹" . number_format($data['amount'], 2) . "</span></li>
                        <li><strong>Payment Method:</strong> {$data['payment_method']}</li>
                        <li><strong>Payment Date:</strong> " . date('M d, Y', strtotime(isset($data['payment_date']) ? $data['payment_date'] : 'now')) . "</li>
                        <li><strong>Transaction ID:</strong> " . (isset($data['transaction_id']) ? $data['transaction_id'] : 'N/A') . "</li>
                    </ul>
                </div>
                
                <p>This receipt confirms that your payment has been received and processed successfully.</p>
                
                <p>If you have any questions about this payment, please contact us.</p>
                
                <p>Best regards,<br>
                The {$this->hotel_name} Team</p>
            </div>
            
            <div class='footer'>
                <p>{$this->hotel_address}<br>
                Phone: {$this->hotel_phone} | Email: {$this->hotel_email}</p>
            </div>
        </body>
        </html>";
    }

    /**
     * Get invoice email template
     */
    private function getInvoiceEmailTemplate($invoice) {
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; }
                .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
                .invoice-details { background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; }
                .total-amount { font-size: 18px; font-weight: bold; color: #1f2937; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>{$this->hotel_name}</h1>
                <p>Luxury Accommodation & Exceptional Service</p>
            </div>
            
            <div class='content'>
                <h2>Dear {$invoice['guest_name']},</h2>
                
                <p>Thank you for choosing {$this->hotel_name} for your stay. Please find attached your invoice for booking reference: <strong>{$invoice['booking_reference']}</strong></p>
                
                <div class='invoice-details'>
                    <h3>Invoice Details:</h3>
                    <ul>
                        <li><strong>Invoice Number:</strong> {$invoice['invoice_number']}</li>
                        <li><strong>Booking Reference:</strong> {$invoice['booking_reference']}</li>
                        <li><strong>Room Number:</strong> {$invoice['room_number']}</li>
                        <li><strong>Total Amount:</strong> <span class='total-amount'>$" . number_format($invoice['total_amount'], 2) . "</span></li>
                        <li><strong>Invoice Date:</strong> " . date('M d, Y', strtotime($invoice['invoice_date'])) . "</li>
                    </ul>
                </div>
                
                <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>
                The {$this->hotel_name} Team</p>
            </div>
            
            <div class='footer'>
                <p>{$this->hotel_address}<br>
                Phone: {$this->hotel_phone} | Email: {$this->hotel_email}</p>
            </div>
        </body>
        </html>";
    }

    /**
     * Send email via Gmail SMTP using PHPMailer
     */
    private function sendEmailViaSMTP($to, $subject, $message) {
        // 🎯 FINAL TEST LOGGING - SMTP METHOD
        error_log("🎯 FINAL TEST === SMTP METHOD START ===");
        error_log("🎯 FINAL TEST - SMTP To: " . $to);
        error_log("🎯 FINAL TEST - SMTP Subject: " . $subject);
        error_log("🎯 FINAL TEST - SMTP Message length: " . strlen($message));
        
        try {
            // Check if PHPMailer is available
            if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                // Try to include PHPMailer manually
                require_once __DIR__ . '/../vendor/autoload.php';
            }
            
            if (!class_exists('PHPMailer\PHPMailer\PHPMailer')) {
                error_log("🎯 FINAL TEST - PHPMailer not found, falling back to basic mail() function");
                return $this->sendEmailViaBasicMail($to, $subject, $message);
            }
            
            // Use PHPMailer for proper SMTP
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            
            // Server settings
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = 'chvamsikrishna577@gmail.com';
            $mail->Password = 'eryt ojyx lqum vesa';
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
            
            // Gmail-specific settings to avoid spam
            $mail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            // Enhanced email reputation and delivery settings
            $mail->Priority = 1; // High priority
            $mail->XMailer = 'SV Royal Hotel Booking System';
            $mail->CharSet = 'UTF-8';
            $mail->Encoding = '8bit';
            
            // Additional headers to improve deliverability
            $mail->addCustomHeader('X-Priority', '1 (Highest)');
            $mail->addCustomHeader('X-MSMail-Priority', 'High');
            $mail->addCustomHeader('Importance', 'High');
            $mail->addCustomHeader('X-Mailer', 'SV Royal Hotel Booking System v2.0');
            $mail->addCustomHeader('List-Unsubscribe', '<mailto:' . $this->hotel_email . '?subject=unsubscribe>');
            $mail->addCustomHeader('Precedence', 'bulk');
            $mail->addCustomHeader('X-Auto-Response-Suppress', 'OOF, AutoReply');
            
            // Recipients
            $mail->setFrom($this->hotel_email, $this->hotel_name);
            $mail->addAddress($to);
            $mail->addReplyTo($this->hotel_email, $this->hotel_name);
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $message;
            $mail->AltBody = strip_tags($message);
            
            // Send email
            error_log("🎯 FINAL TEST - Attempting to send email via PHPMailer...");
            $result = $mail->send();
            
            error_log("🎯 FINAL TEST - PHPMailer send() result: " . ($result ? 'SUCCESS' : 'FAILED'));
            
            if ($result) {
                error_log("🎯 FINAL TEST - SUCCESS: Email sent successfully via PHPMailer SMTP to: " . $to);
                error_log("🎯 FINAL TEST === SMTP METHOD END - SUCCESS ===\n");
                return true;
            } else {
                error_log("🎯 FINAL TEST - FAILED: PHPMailer failed to send email to: " . $to);
                error_log("🎯 FINAL TEST === SMTP METHOD END - FAILED ===\n");
                return false;
            }
            
        } catch (Exception $e) {
            error_log("🎯 FINAL TEST - ERROR: PHPMailer SMTP error: " . $e->getMessage());
            error_log("🎯 FINAL TEST === SMTP METHOD END - ERROR ===\n");
            // Fall back to basic mail function as last resort
            return $this->sendEmailViaBasicMail($to, $subject, $message);
        }
    }
    
    /**
     * Fallback method using basic mail() function
     */
    private function sendEmailViaBasicMail($to, $subject, $message) {
        // 🎯 FINAL TEST LOGGING - BASIC MAIL FALLBACK
        error_log("🎯 FINAL TEST === BASIC MAIL FALLBACK START ===");
        error_log("🎯 FINAL TEST - Basic mail To: " . $to);
        error_log("🎯 FINAL TEST - Basic mail Subject: " . $subject);
        
        try {
            $headers = $this->getEmailHeaders();
            error_log("🎯 FINAL TEST - Basic mail headers prepared");
            $result = mail($to, $subject, $message, implode("\r\n", $headers));
            
            error_log("🎯 FINAL TEST - Basic mail() result: " . ($result ? 'SUCCESS' : 'FAILED'));
            
            if ($result) {
                error_log("🎯 FINAL TEST - SUCCESS: Email sent successfully via basic mail() function to: " . $to);
                error_log("🎯 FINAL TEST === BASIC MAIL FALLBACK END - SUCCESS ===\n");
                return true;
            } else {
                error_log("🎯 FINAL TEST - FAILED: Basic mail() function failed for: " . $to);
                error_log("🎯 FINAL TEST === BASIC MAIL FALLBACK END - FAILED ===\n");
                return false;
            }
            
        } catch (Exception $e) {
            error_log("🎯 FINAL TEST - ERROR: Basic mail() function error: " . $e->getMessage());
            error_log("🎯 FINAL TEST === BASIC MAIL FALLBACK END - ERROR ===\n");
            return false;
        }
    }
    
    /**
     * Log email activity to database
     */
    private function logEmailActivity($reference_id, $email_type, $recipient_email, $status, $error_message = null) {
        try {
            // Create email_logs table if it doesn't exist
            $this->createEmailLogsTable();
            
            $stmt = $this->conn->prepare("
                INSERT INTO email_logs (reference_id, email_type, recipient_email, status, error_message, sent_at) 
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            
            $stmt->bindParam(1, $reference_id);
            $stmt->bindParam(2, $email_type);
            $stmt->bindParam(3, $recipient_email);
            $stmt->bindParam(4, $status);
            $stmt->bindParam(5, $error_message);
            
            return $stmt->execute();
            
        } catch (Exception $e) {
            error_log("Failed to log email activity: " . $e->getMessage());
            return false;
        }
    }
    

    
    /**
     * Get booking confirmation email template
     */
    private function getBookingConfirmationEmailTemplate($data) {
        return "
        <html>
        <head>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    background-color: #f5f5f5; 
                    margin: 0; 
                    padding: 20px; 
                }
                .email-container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background-color: #ffffff; 
                    border-radius: 10px; 
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
                    overflow: hidden; 
                }
                .confetti-banner { 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding: 40px 20px; 
                    text-align: center; 
                    color: #ffffff; 
                }
                .confetti-banner h1 { 
                    font-size: 32px; 
                    font-weight: bold; 
                    margin: 0 0 10px 0; 
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3); 
                }
                .confetti-banner p { 
                    font-size: 18px; 
                    margin: 0; 
                    opacity: 0.9; 
                }
                .content { 
                    padding: 30px; 
                    color: #333; 
                }
                .greeting { 
                    font-size: 20px; 
                    font-weight: bold; 
                    margin-bottom: 20px; 
                    color: #333; 
                }
                .message { 
                    font-size: 16px; 
                    margin-bottom: 30px; 
                    color: #666; 
                    line-height: 1.8; 
                }
                .info-card { 
                    background-color: #ffffff; 
                    padding: 25px; 
                    border-radius: 10px; 
                    margin: 20px 0; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05); 
                    border: 1px solid #e0e0e0; 
                }
                .info-card h3 { 
                    color: #333; 
                    margin: 0 0 20px 0; 
                    font-size: 18px; 
                    display: flex; 
                    align-items: center; 
                    font-weight: bold; 
                }
                .info-card h3:before { 
                    margin-right: 10px; 
                    font-size: 20px; 
                }
                .detail-row { 
                    margin-bottom: 15px; 
                    padding: 8px 0; 
                    border-bottom: 1px solid #f0f0f0; 
                }
                .detail-row:last-child { 
                    border-bottom: none; 
                }
                .detail-label { 
                    font-weight: bold; 
                    color: #333; 
                    display: inline-block; 
                    width: 140px; 
                }
                .detail-value { 
                    color: #666; 
                    font-weight: normal; 
                }
                .room-info { 
                    background-color: #e8f4fd; 
                    border-left: 4px solid #2196f3; 
                }
                .room-info h3:before { 
                    content: '🏨'; 
                }
                .payment-summary { 
                    background-color: #e8f4fd; 
                    border-left: 4px solid #2196f3; 
                }
                .payment-summary h3:before { 
                    content: '💰'; 
                }
                .hotel-info { 
                    border-left: 4px solid #f44336; 
                }
                .hotel-info h3:before { 
                    content: '📍'; 
                }
                .contact-us { 
                    border-left: 4px solid #4caf50; 
                }
                .contact-us h3:before { 
                    content: '📞'; 
                }
                .contact-button { 
                    background-color: #667eea; 
                    color: #ffffff; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    display: inline-block; 
                    margin-top: 15px; 
                    font-weight: bold; 
                    text-align: center; 
                }
                .contact-button:hover { 
                    background-color: #5a6fd8; 
                }
                .footer { 
                    background-color: #f8f9fa; 
                    padding: 25px; 
                    text-align: center; 
                    color: #666; 
                    border-top: 1px solid #e0e0e0; 
                }
                .hotel-name { 
                    color: #667eea; 
                    font-weight: bold; 
                    font-size: 18px; 
                    margin-bottom: 10px; 
                }
                .website-link { 
                    color: #667eea; 
                    text-decoration: underline; 
                }
            </style>
        </head>
        <body>
            <div class='email-container'>
                <div class='confetti-banner'>
                    <h1>🎉 Booking Confirmed!</h1>
                    <p>Thank you for choosing {$this->hotel_name}</p>
            </div>
            
            <div class='content'>
                    <div class='greeting'>Dear {$data['guest_name']},</div>
                    
                    <div class='message'>
                        Your booking has been confirmed! We're excited to welcome you to our hotel.
                    </div>
                    
                    <div class='info-card'>
                        <h3>📋 Booking Details</h3>
                        <div class='detail-row'>
                            <span class='detail-label'>Booking Reference:</span>
                            <span class='detail-value'>{$data['booking_reference']}</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Invoice Number:</span>
                            <span class='detail-value'>{$data['invoice_number']}</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Check-in Date:</span>
                            <span class='detail-value'>" . date('F d, Y', strtotime($data['check_in_date'])) . "</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Check-out Date:</span>
                            <span class='detail-value'>" . date('F d, Y', strtotime($data['check_out_date'])) . "</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Number of Nights:</span>
                            <span class='detail-value'>{$data['nights']}</span>
                        </div>
                    </div>
                    
                    <div class='info-card room-info'>
                        <h3>Room Information</h3>
                        <div class='detail-row'>
                            <span class='detail-label'>Room Number:</span>
                            <span class='detail-value'>{$data['room_number']}</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Room Type:</span>
                            <span class='detail-value'>{$data['room_type']}</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Adults:</span>
                            <span class='detail-value'>" . (isset($data['adults']) ? $data['adults'] : 1) . "</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Children:</span>
                            <span class='detail-value'>" . (isset($data['children']) ? $data['children'] : 0) . "</span>
                        </div>
                </div>
                
                    <div class='info-card payment-summary'>
                        <h3>Payment Summary</h3>
                        <div class='detail-row'>
                            <span class='detail-label'>Total Amount:</span>
                            <span class='detail-value' style='color: #4caf50; font-weight: bold;'>₹" . number_format($data['total_amount'], 2) . "</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Status:</span>
                            <span class='detail-value' style='color: #4caf50; font-weight: bold;'>✅ Paid</span>
                        </div>
                </div>
                
                    <div class='info-card hotel-info'>
                        <h3>Hotel Information</h3>
                        <div class='detail-row'>
                            <span class='detail-label'>Address:</span>
                            <span class='detail-value'>{$this->hotel_address}</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Phone:</span>
                            <span class='detail-value'>{$this->hotel_phone}</span>
                        </div>
                        <div class='detail-row'>
                            <span class='detail-label'>Website:</span>
                            <span class='detail-value'><a href='https://svroyalluxury.com' class='website-link'>https://svroyalluxury.com</a></span>
                        </div>
                    </div>
                    
                    <div class='info-card contact-us'>
                        <h3>Contact Us</h3>
                        <div class='message'>
                            If you have any questions or need to make changes to your booking, please don't hesitate to contact us.
                        </div>
                        <a href='mailto:{$this->hotel_email}' class='contact-button'>Contact Us</a>
            </div>
            
            <div class='footer'>
                        <div class='hotel-name'>Best regards,<br>The {$this->hotel_name} Team</div>
                        <br>
                        <div>We look forward to providing you with an exceptional stay!</div>
                    </div>
                </div>
            </div>
        </body>
        </html>";
    }

    /**
     * Log email activity
     */
    private function logEmail($invoice_id, $recipient_email, $status, $error_message = null) {
        try {
            // Create email_logs table if it doesn't exist
            $this->createEmailLogsTable();
            
            $stmt = $this->conn->prepare("
                INSERT INTO email_logs (reference_id, email_type, recipient_email, status, error_message, sent_at)
                VALUES (?, 'invoice', ?, ?, ?, NOW())
            ");
            $stmt->execute([$invoice_id, $recipient_email, $status, $error_message]);
        } catch (Exception $e) {
            error_log("Failed to log email: " . $e->getMessage());
        }
    }

    /**
     * Create email_logs table if it doesn't exist
     */
    private function createEmailLogsTable() {
        $sql = "CREATE TABLE IF NOT EXISTS email_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            reference_id INT NOT NULL,
            email_type ENUM('invoice', 'booking_confirmation', 'payment_receipt', 'general') NOT NULL,
            recipient_email VARCHAR(255) NOT NULL,
            status ENUM('success', 'failed') NOT NULL,
            error_message TEXT,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX (reference_id),
            INDEX (email_type),
            INDEX (status),
            INDEX (sent_at)
        )";
        
        try {
            $this->conn->exec($sql);
        } catch (Exception $e) {
            error_log("Failed to create email_logs table: " . $e->getMessage());
        }
    }

    /**
     * Send invoice email
     */
    public function sendInvoiceEmail($invoice_data, $pdf_content = null, $filename = null) {
        try {
            $to = $invoice_data['guest_email'];
            $subject = "Invoice #{$invoice_data['invoice_number']} - {$this->hotel_name}";
            
            $message = $this->getInvoiceEmailTemplate($invoice_data);
            $headers = $this->getEmailHeaders();
            
            // Send the email using PHPMailer SMTP
            $result = $this->sendEmailViaSMTP($to, $subject, $message);
            
            // Log the email activity
            $this->logEmailActivity(isset($invoice_data['id']) ? $invoice_data['id'] : 0, 'invoice', $to, $result ? 'success' : 'failed', $result ? null : 'SMTP sending failed');
            
            if ($result) {
                error_log("Invoice email sent successfully to: " . $to);
                return true;
            } else {
                error_log("Failed to send invoice email to: " . $to);
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Error sending invoice email: " . $e->getMessage());
            $this->logEmailActivity(isset($invoice_data['id']) ? $invoice_data['id'] : 0, 'invoice', $invoice_data['guest_email'], 'failed', $e->getMessage());
            return false;
        }
    }

    /**
     * Send booking confirmation email (alias for sendBookingConfirmationEmail)
     */
    public function sendBookingConfirmation($booking_data) {
        // 🎯 FINAL TEST LOGGING - EMAIL SERVICE
        error_log("🎯 FINAL TEST === EMAIL SERVICE START ===");
        error_log("🎯 FINAL TEST - Received booking_data: " . print_r($booking_data, true));
        
        // Convert the booking data format to match what sendBookingConfirmationEmail expects
        $email_data = [
            'email' => isset($booking_data['contact_email']) ? $booking_data['contact_email'] : (isset($booking_data['guest_email']) ? $booking_data['guest_email'] : ''),
            'guest_name' => $booking_data['guest_name'],
            'booking_reference' => $booking_data['booking_reference'],
            'room_number' => $booking_data['room_number'],
            'room_type' => isset($booking_data['room_type']) ? $booking_data['room_type'] : '',
            'check_in_date' => $booking_data['check_in_date'],
            'check_out_date' => $booking_data['check_out_date'],
            'total_amount' => $booking_data['total_amount'],
            'invoice_number' => isset($booking_data['invoice_number']) ? $booking_data['invoice_number'] : 'N/A',
            'nights' => isset($booking_data['nights']) ? $booking_data['nights'] : 1,
            'adults' => isset($booking_data['adults']) ? $booking_data['adults'] : 1,
            'children' => isset($booking_data['children']) ? $booking_data['children'] : 0,
            'booking_id' => isset($booking_data['booking_id']) ? $booking_data['booking_id'] : (isset($booking_data['id']) ? $booking_data['id'] : 0)
        ];
        
        error_log("🎯 FINAL TEST - Converted email_data: " . print_r($email_data, true));
        error_log("🎯 FINAL TEST - Email recipient: " . $email_data['email']);
        error_log("🎯 FINAL TEST === EMAIL SERVICE END ===\n");
        
        return $this->sendBookingConfirmationEmail($email_data);
    }

    /**
     * Send payment receipt email
     */
    public function sendPaymentReceipt($payment_data) {
        try {
            $to = $payment_data['guest_email'];
            $subject = "Payment Receipt - {$this->hotel_name}";
            
            $message = $this->getPaymentReceiptEmailTemplate($payment_data);
            $headers = $this->getEmailHeaders();
            
            // Send the email using PHPMailer SMTP
            $result = $this->sendEmailViaSMTP($to, $subject, $message);
            
            // Log the email activity
            $this->logEmailActivity(isset($payment_data['id']) ? $payment_data['id'] : 0, 'payment_receipt', $to, $result ? 'success' : 'failed', $result ? null : 'SMTP sending failed');
            
            if ($result) {
                error_log("Payment receipt email sent successfully to: " . $to);
                return true;
            } else {
                error_log("Failed to send payment receipt email to: " . $to);
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Error sending payment receipt email: " . $e->getMessage());
            $this->logEmailActivity(isset($payment_data['id']) ? $payment_data['id'] : 0, 'payment_receipt', $payment_data['guest_email'], 'failed', $e->getMessage());
            return false;
        }
    }

    /**
     * Test email configuration
     */
    public function testEmailConfiguration($test_email) {
        try {
            $subject = "Test Email - {$this->hotel_name}";
            $message = "
            <html>
            <body>
                <h2>Test Email</h2>
                <p>This is a test email from {$this->hotel_name} email system.</p>
                <p>If you receive this email, the email configuration is working correctly.</p>
                <p>Sent at: " . date('Y-m-d H:i:s') . "</p>
            </body>
            </html>";
            
            // Send the email using PHPMailer SMTP
            $result = $this->sendEmailViaSMTP($test_email, $subject, $message);
            
            if ($result) {
                $this->logEmailActivity(0, 'general', $test_email, 'success', 'Test email');
                return true;
            } else {
                $this->logEmailActivity(0, 'general', $test_email, 'failed', 'Test email failed');
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Test email failed: " . $e->getMessage());
            $this->logEmailActivity(0, 'general', $test_email, 'failed', $e->getMessage());
            return false;
        }
    }

    /**
     * Get recent email logs
     */
    public function getRecentEmailLogs($limit = 20) {
        try {
            // Create email_logs table if it doesn't exist
            $this->createEmailLogsTable();
            
            // Sanitize limit to prevent SQL injection
            $limit = (int)$limit;
            $limit = max(1, min($limit, 100)); // Limit between 1 and 100
            
            $stmt = $this->conn->prepare("
                SELECT id, reference_id, email_type, recipient_email, status, error_message, sent_at
                FROM email_logs 
                ORDER BY sent_at DESC 
                LIMIT {$limit}
            ");
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Failed to get recent email logs: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Test email configuration
     */
    public function testEmail($test_email) {
        try {
            $subject = "Test Email - {$this->hotel_name}";
            $message = "
            <html>
            <body>
                <h2>Test Email</h2>
                <p>This is a test email from {$this->hotel_name} invoice system.</p>
                <p>If you receive this email, the email configuration is working correctly.</p>
                <p>Sent at: " . date('Y-m-d H:i:s') . "</p>
            </body>
            </html>";
            
            $headers = $this->getEmailHeaders();
            
            $result = mail($test_email, $subject, $message, implode("\r\n", $headers));
            
            if ($result) {
                $this->logEmail(0, $test_email, 'success', 'Test email');
                return true;
            } else {
                $this->logEmail(0, $test_email, 'failed', 'Test email failed');
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Test email failed: " . $e->getMessage());
            return false;
        }
    }
}
?>
