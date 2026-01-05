<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';

class BillingAPI {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
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

            // For now, set service charges and tax to 0
            $service_charges = 0;
            $tax_amount = 0;

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

            // Generate simple HTML for invoice
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

    // Generate simple HTML invoice
    private function generateInvoiceHTML($invoice) {
        $html = "
        <!DOCTYPE html>
        <html>
        <head>
            <title>Invoice {$invoice['invoice_number']}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .header { text-align: center; margin-bottom: 30px; }
                .invoice-details { margin-bottom: 20px; }
                .guest-details { margin-bottom: 20px; }
                .items { margin-bottom: 20px; }
                .total { font-weight: bold; font-size: 18px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f5f5f5; }
            </style>
        </head>
        <body>
            <div class='header'>
                <h1>SV Royal Hotel</h1>
                <h2>Invoice {$invoice['invoice_number']}</h2>
            </div>
            
            <div class='invoice-details'>
                <p><strong>Date:</strong> " . date('Y-m-d') . "</p>
                <p><strong>Booking Reference:</strong> {$invoice['booking_reference']}</p>
            </div>
            
            <div class='guest-details'>
                <h3>Guest Information</h3>
                <p><strong>Name:</strong> {$invoice['guest_name']}</p>
                <p><strong>Email:</strong> {$invoice['guest_email']}</p>
                <p><strong>Phone:</strong> {$invoice['guest_phone']}</p>
            </div>
            
            <div class='items'>
                <h3>Invoice Items</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Room {$invoice['room_number']} - {$invoice['room_type']}</td>
                            <td>₹{$invoice['subtotal']}</td>
                        </tr>
                        <tr>
                            <td>Tax</td>
                            <td>₹{$invoice['tax_amount']}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class='total'>
                <p><strong>Total Amount: ₹{$invoice['total_amount']}</strong></p>
            </div>
        </body>
        </html>";

        return $html;
    }
}

// Handle API requests
try {
    $database = new Database();
    $db = $database->getConnection();
    $billingAPI = new BillingAPI($db);

    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';

    switch ($method) {
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            
            switch ($action) {
                case 'generate_invoice':
                    $result = $billingAPI->generateInvoice($data);
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

    echo json_encode($result);

} catch (Exception $e) {
    $error_response = [
        'success' => false,
        'message' => 'Internal server error: ' . $e->getMessage()
    ];
    echo json_encode($error_response);
}
?>
