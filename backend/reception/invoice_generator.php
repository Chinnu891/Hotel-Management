<?php
require_once '../config/database.php';
require_once '../utils/response_handler.php';

class InvoiceGenerator {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new ResponseHandler();
    }

    // Generate HTML invoice for printing
    public function generateHTMLInvoice($invoice_id) {
        try {
            $invoice_data = $this->getInvoiceData($invoice_id);
            if (!$invoice_data) {
                return $this->response->error("Invoice not found", 404);
            }

            $html = $this->createInvoiceHTML($invoice_data);
            return $this->response->success(['html' => $html]);

        } catch (Exception $e) {
            return $this->response->error("Error generating HTML: " . $e->getMessage(), 500);
        }
    }

    // Get invoice data from database
    private function getInvoiceData($invoice_id) {
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
            return false;
        }

        // Get invoice items
        $stmt = $this->conn->prepare("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id");
        $stmt->bind_param("i", $invoice_id);
        $stmt->execute();
        $items = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

        return [
            'invoice' => $invoice,
            'items' => $items
        ];
    }

    // Create HTML content for invoice
    private function createInvoiceHTML($data) {
        $invoice = $data['invoice'];
        $items = $data['items'];

        $html = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice ' . htmlspecialchars($invoice['invoice_number']) . '</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .invoice-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .hotel-name { font-size: 24px; font-weight: bold; color: #333; }
                .hotel-address { color: #666; margin: 10px 0; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                .guest-info, .invoice-info { flex: 1; }
                .section-title { font-weight: bold; margin-bottom: 10px; color: #333; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                .items-table th { background-color: #f5f5f5; font-weight: bold; }
                .total-section { text-align: right; margin-top: 20px; }
                .total-row { margin: 10px 0; }
                .total-amount { font-size: 18px; font-weight: bold; color: #333; }
                .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
                @media print { body { margin: 0; } .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="invoice-header">
                <div class="hotel-name">SV ROYAL HOTEL</div>
                <div class="hotel-address">123 Hotel Street, City, State 12345</div>
                <div class="hotel-address">Phone: +1-234-567-8900 | Email: info@svroyal.com</div>
            </div>

            <div class="invoice-details">
                <div class="guest-info">
                    <div class="section-title">Bill To:</div>
                    <div>' . htmlspecialchars($invoice['guest_name']) . '</div>
                    <div>' . htmlspecialchars($invoice['guest_email']) . '</div>
                    <div>' . htmlspecialchars($invoice['guest_phone']) . '</div>
                </div>
                <div class="invoice-info">
                    <div class="section-title">Invoice Details:</div>
                    <div><strong>Invoice #:</strong> ' . htmlspecialchars($invoice['invoice_number']) . '</div>
                    <div><strong>Date:</strong> ' . date('M d, Y', strtotime($invoice['invoice_date'])) . '</div>
                    <div><strong>Booking Ref:</strong> ' . htmlspecialchars($invoice['booking_reference']) . '</div>
                </div>
            </div>

            <div class="section-title">Room Details:</div>
            <div style="margin-bottom: 20px;">
                <div><strong>Room:</strong> ' . htmlspecialchars($invoice['room_number']) . ' (' . htmlspecialchars($invoice['room_type']) . ')</div>
                <div><strong>Check-in:</strong> ' . date('M d, Y', strtotime($invoice['check_in_date'])) . '</div>
                <div><strong>Check-out:</strong> ' . date('M d, Y', strtotime($invoice['check_out_date'])) . '</div>
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
                    <span style="margin-right: 20px;"><strong>Subtotal:</strong></span>
                    <span>$' . number_format($invoice['subtotal'], 2) . '</span>
                </div>';

        if ($invoice['tax_amount'] > 0) {
            $html .= '
                <div class="total-row">
                    <span style="margin-right: 20px;"><strong>Tax:</strong></span>
                    <span>$' . number_format($invoice['tax_amount'], 2) . '</span>
                </div>';
        }

        $html .= '
                <div class="total-row total-amount">
                    <span style="margin-right: 20px;"><strong>Total Amount:</strong></span>
                    <span>$' . number_format($invoice['total_amount'], 2) . '</span>
                </div>
            </div>

            <div class="footer">
                <p>Thank you for choosing SV Royal Hotel!</p>
                <p>Generated on ' . date('M d, Y H:i:s') . ' by ' . htmlspecialchars($invoice['created_by_name']) . '</p>
            </div>
        </body>
        </html>';

        return $html;
    }
}

// Handle direct requests for invoice generation
if (isset($_GET['invoice_id']) && isset($_GET['format'])) {
    $database = new Database();
    $db = $database->getConnection();
    $generator = new InvoiceGenerator($db);
    
    $invoice_id = $_GET['invoice_id'];
    $format = $_GET['format'];
    
    if ($format === 'html') {
        $result = $generator->generateHTMLInvoice($invoice_id);
        echo json_encode($result);
    }
}
?>
