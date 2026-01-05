<?php
require_once '../config/database.php';
require_once '../utils/response_handler.php';
require_once '../vendor/autoload.php';

use Dompdf\Dompdf;
use Dompdf\Options;

class EnhancedInvoiceGenerator {
    private $conn;
    private $response;
    private $hotel_name = "SV ROYAL LUXURY ROOMS";
    private $hotel_address = "123 Luxury Street, City, State 12345";
    private $hotel_phone = "+1-234-567-8900";
    private $hotel_email = "info@svroyalluxury.com";

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new ResponseHandler();
    }

    // Generate invoice in multiple formats
    public function generateInvoice($invoice_id, $format = 'html') {
        try {
            $invoice_data = $this->getInvoiceData($invoice_id);
            if (!$invoice_data) {
                return $this->response->error("Invoice not found", 404);
            }

            switch ($format) {
                case 'html':
                    return $this->generateHTMLInvoice($invoice_data);
                case 'pdf':
                    return $this->generatePDFInvoice($invoice_data);
                case 'email':
                    return $this->generateEmailInvoice($invoice_data);
                default:
                    return $this->response->error("Unsupported format", 400);
            }

        } catch (Exception $e) {
            return $this->response->error("Error generating invoice: " . $e->getMessage(), 500);
        }
    }

    // Get comprehensive invoice data
    private function getInvoiceData($invoice_id) {
        $stmt = $this->conn->prepare("
            SELECT i.*, b.booking_reference, b.check_in_date, b.check_out_date,
                   CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                   g.email as guest_email, g.phone as guest_phone,
                   g.address as guest_address, g.city as guest_city, g.state as guest_state,
                   r.room_number, rt.name as room_type, rt.base_price,
                   u.full_name as created_by_name, u.email as created_by_email
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
            return false;
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
            'invoice' => $invoice,
            'items' => $items,
            'payments' => $payments
        ];
    }

    // Generate HTML invoice
    private function generateHTMLInvoice($data) {
        $invoice = $data['invoice'];
        $items = $data['items'];
        $payments = $data['payments'];

        $html = $this->getInvoiceHTMLTemplate($invoice, $items, $payments);
        return $this->response->success(['html' => $html, 'format' => 'html']);
    }

    // Generate PDF invoice
    private function generatePDFInvoice($data) {
        try {
            $invoice = $data['invoice'];
            $items = $data['items'];
            $payments = $data['payments'];

            $html = $this->getInvoiceHTMLTemplate($invoice, $items, $payments);
            
            // Configure DOMPDF
            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isPhpEnabled', true);
            $options->set('isRemoteEnabled', true);
            $options->set('defaultFont', 'Arial');

            $dompdf = new Dompdf($options);
            $dompdf->loadHtml($html);
            $dompdf->setPaper('A4', 'portrait');
            $dompdf->render();

            $pdf_content = $dompdf->output();
            $filename = "Invoice_{$invoice['invoice_number']}_{$invoice['booking_reference']}.pdf";

            return $this->response->success([
                'pdf_content' => base64_encode($pdf_content),
                'filename' => $filename,
                'format' => 'pdf'
            ]);

        } catch (Exception $e) {
            return $this->response->error("PDF generation failed: " . $e->getMessage(), 500);
        }
    }

    // Generate email invoice
    private function generateEmailInvoice($data) {
        try {
            $invoice = $data['invoice'];
            $items = $data['items'];
            $payments = $data['payments'];

            // Generate PDF for email attachment
            $pdf_result = $this->generatePDFInvoice($data);
            if (!$pdf_result['success']) {
                return $pdf_result;
            }

            $pdf_content = base64_decode($pdf_result['data']['pdf_content']);
            $filename = $pdf_result['data']['filename'];

            // Send email with PDF attachment
            $email_sent = $this->sendInvoiceEmail($invoice, $pdf_content, $filename);
            
            if ($email_sent) {
                // Update invoice status to sent
                $this->updateInvoiceStatus($invoice['id'], 'sent');
                
                return $this->response->success([
                    'message' => 'Invoice sent successfully via email',
                    'email' => $invoice['guest_email'],
                    'format' => 'email'
                ]);
            } else {
                return $this->response->error("Failed to send email", 500);
            }

        } catch (Exception $e) {
            return $this->response->error("Email generation failed: " . $e->getMessage(), 500);
        }
    }

    // Send invoice via email
    private function sendInvoiceEmail($invoice, $pdf_content, $filename) {
        try {
            $to = $invoice['guest_email'];
            $subject = "Invoice #{$invoice['invoice_number']} - {$this->hotel_name}";
            
            $message = $this->getEmailTemplate($invoice);
            
            $headers = [
                'From: ' . $this->hotel_email,
                'Reply-To: ' . $this->hotel_email,
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8'
            ];

            // Create email with PDF attachment
            $boundary = md5(time());
            $headers[] = "Content-Type: multipart/mixed; boundary=\"{$boundary}\"";
            
            $email_body = "--{$boundary}\r\n";
            $email_body .= "Content-Type: text/html; charset=UTF-8\r\n";
            $email_body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
            $email_body .= $message . "\r\n\r\n";
            
            $email_body .= "--{$boundary}\r\n";
            $email_body .= "Content-Type: application/pdf; name=\"{$filename}\"\r\n";
            $email_body .= "Content-Transfer-Encoding: base64\r\n";
            $email_body .= "Content-Disposition: attachment; filename=\"{$filename}\"\r\n\r\n";
            $email_body .= base64_encode($pdf_content) . "\r\n\r\n";
            $email_body .= "--{$boundary}--";

            return mail($to, $subject, $email_body, implode("\r\n", $headers));
            
        } catch (Exception $e) {
            error_log("Email sending failed: " . $e->getMessage());
            return false;
        }
    }

    // Update invoice status
    private function updateInvoiceStatus($invoice_id, $status) {
        $stmt = $this->conn->prepare("UPDATE invoices SET status = ? WHERE id = ?");
        $stmt->bind_param("si", $status, $invoice_id);
        return $stmt->execute();
    }

    // Get email template
    private function getEmailTemplate($invoice) {
        return "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; }
                .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
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
                
                <h3>Invoice Details:</h3>
                <ul>
                    <li><strong>Invoice Number:</strong> {$invoice['invoice_number']}</li>
                    <li><strong>Booking Reference:</strong> {$invoice['booking_reference']}</li>
                    <li><strong>Total Amount:</strong> $" . number_format($invoice['total_amount'], 2) . "</li>
                    <li><strong>Due Date:</strong> " . date('M d, Y', strtotime($invoice['due_date'])) . "</li>
                </ul>
                
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

    // Get invoice HTML template
    private function getInvoiceHTMLTemplate($invoice, $items, $payments) {
        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice ' . htmlspecialchars($invoice['invoice_number']) . '</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
                .invoice-container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1f2937; padding-bottom: 20px; }
                .hotel-name { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 5px; }
                .hotel-tagline { font-size: 14px; color: #6b7280; margin-bottom: 10px; }
                .hotel-address { color: #374151; margin: 5px 0; font-size: 14px; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .guest-info, .invoice-info { flex: 1; }
                .section-title { font-weight: bold; margin-bottom: 15px; color: #1f2937; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
                .info-row { margin: 8px 0; color: #374151; }
                .room-details { background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 25px; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th, .items-table td { border: 1px solid #e5e7eb; padding: 15px; text-align: left; }
                .items-table th { background-color: #f3f4f6; font-weight: bold; color: #1f2937; }
                .items-table tr:nth-child(even) { background-color: #f9fafb; }
                .total-section { text-align: right; margin-top: 20px; background-color: #f9fafb; padding: 20px; border-radius: 6px; }
                .total-row { margin: 10px 0; display: flex; justify-content: space-between; }
                .total-amount { font-size: 20px; font-weight: bold; color: #1f2937; border-top: 2px solid #1f2937; padding-top: 10px; }
                .payment-history { margin-top: 30px; }
                .payment-row { background-color: #f0f9ff; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #3b82f6; }
                .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
                .download-section { text-align: center; margin: 20px 0; }
                .download-btn { display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 0 10px; }
                .download-btn:hover { background-color: #2563eb; }
                @media print { 
                    body { margin: 0; background: white; } 
                    .invoice-container { box-shadow: none; padding: 20px; }
                    .download-section { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="hotel-name">' . $this->hotel_name . '</div>
                    <div class="hotel-tagline">Luxury Accommodation & Exceptional Service</div>
                    <div class="hotel-address">' . $this->hotel_address . '</div>
                    <div class="hotel-address">Phone: ' . $this->hotel_phone . ' | Email: ' . $this->hotel_email . '</div>
                </div>

                <div class="invoice-details">
                    <div class="guest-info">
                        <div class="section-title">Bill To:</div>
                        <div class="info-row">' . htmlspecialchars($invoice['guest_name']) . '</div>
                        <div class="info-row">' . htmlspecialchars($invoice['guest_email']) . '</div>
                        <div class="info-row">' . htmlspecialchars($invoice['guest_phone']) . '</div>';
        
        if ($invoice['guest_address']) {
            $html .= '<div class="info-row">' . htmlspecialchars($invoice['guest_address']) . '</div>';
            if ($invoice['guest_city']) {
                $html .= '<div class="info-row">' . htmlspecialchars($invoice['guest_city']) . ', ' . htmlspecialchars($invoice['guest_state']) . '</div>';
            }
        }

        $html .= '
                    </div>
                    <div class="invoice-info">
                        <div class="section-title">Invoice Details:</div>
                        <div class="info-row"><strong>Invoice #:</strong> ' . htmlspecialchars($invoice['invoice_number']) . '</div>
                        <div class="info-row"><strong>Date:</strong> ' . date('M d, Y', strtotime($invoice['invoice_date'])) . '</div>
                        <div class="info-row"><strong>Booking Ref:</strong> ' . htmlspecialchars($invoice['booking_reference']) . '</div>
                        <div class="info-row"><strong>Due Date:</strong> ' . date('M d, Y', strtotime($invoice['due_date'])) . '</div>
                        <div class="info-row"><strong>Status:</strong> <span style="color: ' . $this->getStatusColor($invoice['status']) . ';">' . ucfirst($invoice['status']) . '</span></div>
                    </div>
                </div>

                <div class="room-details">
                    <div class="section-title">Room Details:</div>
                    <div class="info-row"><strong>Room:</strong> ' . htmlspecialchars($invoice['room_number']) . ' (' . htmlspecialchars($invoice['room_type']) . ')</div>
                    <div class="info-row"><strong>Check-in:</strong> ' . date('M d, Y', strtotime($invoice['check_in_date'])) . '</div>
                    <div class="info-row"><strong>Check-out:</strong> ' . date('M d, Y', strtotime($invoice['check_out_date'])) . '</div>
                </div>

                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>';

        foreach ($items as $item) {
            $html .= '
                        <tr>
                            <td>' . htmlspecialchars($item['description']) . '</td>
                            <td>' . $item['quantity'] . '</td>
                            <td>$' . number_format($item['unit_price'], 2) . '</td>
                            <td>$' . number_format($item['total_price'], 2) . '</td>
                        </tr>';
        }

        $html .= '
                    </tbody>
                </table>

                <div class="total-section">
                    <div class="total-row">
                        <span><strong>Subtotal:</strong></span>
                        <span>$' . number_format($invoice['subtotal'], 2) . '</span>
                    </div>';

        if ($invoice['tax_amount'] > 0) {
            $html .= '
                    <div class="total-row">
                        <span><strong>Tax:</strong></span>
                        <span>$' . number_format($invoice['tax_amount'], 2) . '</span>
                    </div>';
        }

        if ($invoice['discount_amount'] > 0) {
            $html .= '
                    <div class="total-row">
                        <span><strong>Discount:</strong></span>
                        <span>-$' . number_format($invoice['discount_amount'], 2) . '</span>
                    </div>';
        }

        $html .= '
                    <div class="total-row total-amount">
                        <span><strong>Total Amount:</strong></span>
                        <span>$' . number_format($invoice['total_amount'], 2) . '</span>
                    </div>
                </div>';

        // Payment history section
        if (!empty($payments)) {
            $html .= '
                <div class="payment-history">
                    <div class="section-title">Payment History:</div>';
            
            foreach ($payments as $payment) {
                $status_color = $payment['payment_status'] === 'completed' ? '#10b981' : '#f59e0b';
                $html .= '
                    <div class="payment-row">
                        <div class="info-row"><strong>Date:</strong> ' . date('M d, Y H:i', strtotime($payment['payment_date'])) . '</div>
                        <div class="info-row"><strong>Amount:</strong> $' . number_format($payment['amount'], 2) . '</div>
                        <div class="info-row"><strong>Method:</strong> ' . ucfirst($payment['method_name']) . '</div>
                        <div class="info-row"><strong>Status:</strong> <span style="color: ' . $status_color . ';">' . ucfirst($payment['payment_status']) . '</span></div>
                    </div>';
            }
            $html .= '</div>';
        }

        $html .= '
                <div class="download-section">
                    <a href="#" onclick="window.print()" class="download-btn">Print Invoice</a>
                    <a href="?action=download_pdf&invoice_id=' . $invoice['id'] . '" class="download-btn">Download PDF</a>
                    <a href="?action=send_email&invoice_id=' . $invoice['id'] . '" class="download-btn">Send via Email</a>
                </div>

                <div class="footer">
                    <p>Thank you for choosing ' . $this->hotel_name . '!</p>
                    <p>Generated on ' . date('M d, Y H:i:s') . ' by ' . htmlspecialchars($invoice['created_by_name']) . '</p>
                    <p>For any queries, please contact us at ' . $this->hotel_email . ' or call ' . $this->hotel_phone . '</p>
                </div>
            </div>
        </body>
        </html>';

        return $html;
    }

    // Get status color for display
    private function getStatusColor($status) {
        switch ($status) {
            case 'paid': return '#10b981';
            case 'pending': return '#f59e0b';
            case 'overdue': return '#ef4444';
            case 'sent': return '#3b82f6';
            case 'draft': return '#6b7280';
            default: return '#6b7280';
        }
    }

    // Download invoice as PDF
    public function downloadInvoice($invoice_id) {
        try {
            $result = $this->generatePDFInvoice($this->getInvoiceData($invoice_id));
            if ($result['success']) {
                $pdf_content = base64_decode($result['data']['pdf_content']);
                $filename = $result['data']['filename'];
                
                header('Content-Type: application/pdf');
                header('Content-Disposition: attachment; filename="' . $filename . '"');
                header('Content-Length: ' . strlen($pdf_content));
                header('Cache-Control: no-cache, must-revalidate');
                header('Pragma: no-cache');
                
                echo $pdf_content;
                exit;
            } else {
                return $result;
            }
        } catch (Exception $e) {
            return $this->response->error("Download failed: " . $e->getMessage(), 500);
        }
    }
}

// Handle direct requests
if (isset($_GET['action'])) {
    $database = new Database();
    $db = $database->getConnection();
    $generator = new EnhancedInvoiceGenerator($db);
    
    $action = $_GET['action'];
    $invoice_id = $_GET['invoice_id'] ?? null;
    
    switch ($action) {
        case 'generate_html':
            if ($invoice_id) {
                $result = $generator->generateInvoice($invoice_id, 'html');
                echo json_encode($result);
            }
            break;
            
        case 'generate_pdf':
            if ($invoice_id) {
                $result = $generator->generateInvoice($invoice_id, 'pdf');
                echo json_encode($result);
            }
            break;
            
        case 'send_email':
            if ($invoice_id) {
                $result = $generator->generateInvoice($invoice_id, 'email');
                echo json_encode($result);
            }
            break;
            
        case 'download_pdf':
            if ($invoice_id) {
                $generator->downloadInvoice($invoice_id);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
}
?>
