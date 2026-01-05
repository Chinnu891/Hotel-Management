<?php
require_once __DIR__ . '/../utils/cors_headers.php';

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/simple_jwt_helper.php';

class TallyIntegration {
    private $conn;
    private $response;
    private $jwtHelper;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
        $this->jwtHelper = new SimpleJWTHelper();
    }

    public function handleRequest() {
        // Verify JWT token and admin role
        $authResult = $this->authenticateAdmin();
        if (!$authResult['success']) {
            return $this->response->error(401, 'Unauthorized', $authResult['message']);
        }

        $action = $_GET['action'] ?? $_POST['action'] ?? '';
        
        switch ($action) {
            case 'export_daily_transactions':
                return $this->exportDailyTransactions();
            case 'export_monthly_summary':
                return $this->exportMonthlySummary();
            case 'export_guest_payments':
                return $this->exportGuestPayments();
            case 'export_room_revenue':
                return $this->exportRoomRevenue();
            case 'export_service_charges':
                return $this->exportServiceCharges();
            default:
                return $this->response->error(400, 'Bad Request', 'Invalid action specified');
        }
    }

    private function authenticateAdmin() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader) || !str_starts_with($authHeader, 'Bearer ')) {
            return ['success' => false, 'message' => 'Authorization header missing or invalid'];
        }

        $token = substr($authHeader, 7);
        $decoded = $this->jwtHelper->validateToken($token);
        
        if (!$decoded) {
            return ['success' => false, 'message' => 'Invalid or expired token'];
        }

        if ($decoded['role'] !== 'admin') {
            return ['success' => false, 'message' => 'Admin access required'];
        }

        return ['success' => true, 'user_id' => $decoded['user_id'], 'role' => $decoded['role']];
    }

    private function exportDailyTransactions() {
        try {
            $date = $_GET['date'] ?? date('Y-m-d');
            
            // Get daily transactions
            $sql = "SELECT 
                        p.id,
                        p.amount,
                        p.payment_method,
                        p.payment_status,
                        p.payment_date,
                        p.transaction_id,
                        g.first_name,
                        g.last_name,
                        r.room_number,
                        rt.room_type_name,
                        i.invoice_number
                    FROM payments p
                    JOIN invoices i ON p.invoice_id = i.id
                    JOIN bookings b ON p.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN rooms r ON b.room_id = r.id
                    JOIN room_types rt ON r.room_type_id = rt.id
                    WHERE DATE(p.payment_date) = ? AND p.payment_status = 'completed'
                    ORDER BY p.payment_date";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$date]);
            $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Generate Tally XML
            $xml = $this->generateTallyXML($transactions, 'Daily Transactions', $date);
            
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="tally_daily_' . $date . '.xml"');
            echo $xml;
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function exportMonthlySummary() {
        try {
            $month = $_GET['month'] ?? date('Y-m');
            $year = substr($month, 0, 4);
            $monthNum = substr($month, 5, 2);
            
            // Get monthly summary
            $sql = "SELECT 
                        DATE(p.payment_date) as payment_date,
                        SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END) as cash_amount,
                        SUM(CASE WHEN p.payment_method = 'credit_card' THEN p.amount ELSE 0 END) as card_amount,
                        SUM(CASE WHEN p.payment_method = 'upi' THEN p.amount ELSE 0 END) as upi_amount,
                        SUM(CASE WHEN p.payment_method = 'bank_transfer' THEN p.amount ELSE 0 END) as bank_amount,
                        SUM(p.amount) as total_amount,
                        COUNT(*) as transaction_count
                    FROM payments p
                    WHERE YEAR(p.payment_date) = ? AND MONTH(p.payment_date) = ? 
                    AND p.payment_status = 'completed'
                    GROUP BY DATE(p.payment_date)
                    ORDER BY payment_date";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$year, $monthNum]);
            $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Generate Tally XML for monthly summary
            $xml = $this->generateMonthlyTallyXML($summary, $month);
            
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="tally_monthly_' . $month . '.xml"');
            echo $xml;
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function exportGuestPayments() {
        try {
            $guestId = $_GET['guest_id'] ?? '';
            $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
            $dateTo = $_GET['date_to'] ?? date('Y-m-d');
            
            $sql = "SELECT 
                        p.id,
                        p.amount,
                        p.payment_method,
                        p.payment_status,
                        p.payment_date,
                        p.transaction_id,
                        p.receipt_number,
                        g.first_name,
                        g.last_name,
                        g.phone,
                        g.email,
                        i.invoice_number,
                        b.booking_reference
                    FROM payments p
                    JOIN invoices i ON p.invoice_id = i.id
                    JOIN bookings b ON p.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    WHERE p.payment_status = 'completed'";
            
            $params = [];
            if ($guestId) {
                $sql .= " AND g.id = ?";
                $params[] = $guestId;
            }
            
            $sql .= " AND DATE(p.payment_date) BETWEEN ? AND ? ORDER BY p.payment_date";
            $params[] = $dateFrom;
            $params[] = $dateTo;
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Generate Tally XML for guest payments
            $xml = $this->generateGuestPaymentsTallyXML($payments, $dateFrom, $dateTo);
            
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="tally_guest_payments.xml"');
            echo $xml;
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function exportRoomRevenue() {
        try {
            $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
            $dateTo = $_GET['date_to'] ?? date('Y-m-d');
            
            // Get room revenue breakdown
            $sql = "SELECT 
                        rt.room_type_name,
                        r.room_number,
                        COUNT(b.id) as total_bookings,
                        SUM(p.amount) as total_revenue,
                        AVG(p.amount) as avg_revenue_per_booking,
                        SUM(CASE WHEN b.booking_status = 'checked_in' THEN 1 ELSE 0 END) as active_bookings,
                        SUM(CASE WHEN b.booking_status = 'checked_out' THEN 1 ELSE 0 END) as completed_bookings
                    FROM rooms r
                    JOIN room_types rt ON r.room_type_id = rt.id
                    LEFT JOIN bookings b ON r.id = b.room_id
                    LEFT JOIN payments p ON b.id = p.booking_id
                    WHERE (b.check_in_date BETWEEN ? AND ? OR b.check_out_date BETWEEN ? AND ?)
                    AND p.payment_status = 'completed'
                    GROUP BY r.id, rt.room_type_name, r.room_number
                    ORDER BY total_revenue DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo, $dateFrom, $dateTo]);
            $revenue = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Generate Tally XML for room revenue
            $xml = $this->generateRoomRevenueTallyXML($revenue, $dateFrom, $dateTo);
            
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="tally_room_revenue.xml"');
            echo $xml;
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function exportServiceCharges() {
        try {
            $dateFrom = $_GET['date_from'] ?? date('Y-m-01');
            $dateTo = $_GET['date_to'] ?? date('Y-m-d');
            
            // Get service charges
            $sql = "SELECT 
                        es.service_name,
                        es.service_price,
                        COUNT(es.id) as service_count,
                        SUM(es.service_price) as total_amount,
                        DATE(es.created_at) as service_date,
                        g.first_name,
                        g.last_name,
                        r.room_number
                    FROM extra_services es
                    JOIN bookings b ON es.booking_id = b.id
                    JOIN guests g ON b.guest_id = g.id
                    JOIN rooms r ON b.room_id = r.id
                    WHERE DATE(es.created_at) BETWEEN ? AND ?
                    GROUP BY es.service_name, DATE(es.created_at)
                    ORDER BY service_date, service_name";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$dateFrom, $dateTo]);
            $services = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Generate Tally XML for service charges
            $xml = $this->generateServiceChargesTallyXML($services, $dateFrom, $dateTo);
            
            header('Content-Type: application/xml');
            header('Content-Disposition: attachment; filename="tally_service_charges.xml"');
            echo $xml;
            
        } catch (Exception $e) {
            return $this->response->error(500, 'Internal Server Error', $e->getMessage());
        }
    }

    private function generateTallyXML($transactions, $title, $date) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<ENVELOPE>';
        $xml .= '<HEADER>';
        $xml .= '<TALLYREQUEST>Export Data</TALLYREQUEST>';
        $xml .= '</HEADER>';
        $xml .= '<BODY>';
        $xml .= '<IMPORTDATA>';
        $xml .= '<REQUESTDESC>';
        $xml .= '<REPORTNAME>Hotel Transactions</REPORTNAME>';
        $xml .= '<STATICVARIABLES>';
        $xml .= '<SVCURRENTCOMPANY>Hotel Management</SVCURRENTCOMPANY>';
        $xml .= '</STATICVARIABLES>';
        $xml .= '</REQUESTDESC>';
        $xml .= '<REQUESTDATA>';
        
        foreach ($transactions as $transaction) {
            $xml .= '<TALLYMESSAGE>';
            $xml .= '<VOUCHER>';
            $xml .= '<DATE>' . date('Ymd', strtotime($transaction['payment_date'])) . '</DATE>';
            $xml .= '<VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>';
            $xml .= '<VOUCHERNUMBER>' . $transaction['receipt_number'] ?? $transaction['id'] . '</VOUCHERNUMBER>';
            $xml .= '<REFERENCE>' . $transaction['transaction_id'] . '</REFERENCE>';
            $xml .= '<NARRATION>Payment received from ' . $transaction['first_name'] . ' ' . $transaction['last_name'] . ' for Room ' . $transaction['room_number'] . '</NARRATION>';
            
            // Debit entry - Bank/Cash account
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>' . $this->getTallyAccountName($transaction['payment_method']) . '</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>' . $transaction['amount'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            // Credit entry - Hotel Revenue
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>Hotel Revenue</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>-'. $transaction['amount'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            $xml .= '</VOUCHER>';
            $xml .= '</TALLYMESSAGE>';
        }
        
        $xml .= '</REQUESTDATA>';
        $xml .= '</IMPORTDATA>';
        $xml .= '</BODY>';
        $xml .= '</ENVELOPE>';
        
        return $xml;
    }

    private function generateMonthlyTallyXML($summary, $month) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<ENVELOPE>';
        $xml .= '<HEADER>';
        $xml .= '<TALLYREQUEST>Export Data</TALLYREQUEST>';
        $xml .= '</HEADER>';
        $xml .= '<BODY>';
        $xml .= '<IMPORTDATA>';
        $xml .= '<REQUESTDESC>';
        $xml .= '<REPORTNAME>Monthly Summary</REPORTNAME>';
        $xml .= '<STATICVARIABLES>';
        $xml .= '<SVCURRENTCOMPANY>Hotel Management</SVCURRENTCOMPANY>';
        $xml .= '</STATICVARIABLES>';
        $xml .= '</REQUESTDESC>';
        $xml .= '<REQUESTDATA>';
        
        foreach ($summary as $day) {
            $xml .= '<TALLYMESSAGE>';
            $xml .= '<VOUCHER>';
            $xml .= '<DATE>' . date('Ymd', strtotime($day['payment_date'])) . '</DATE>';
            $xml .= '<VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>';
            $xml .= '<VOUCHERNUMBER>MS' . date('Ymd', strtotime($day['payment_date'])) . '</VOUCHERNUMBER>';
            $xml .= '<NARRATION>Daily collection summary for ' . $day['payment_date'] . '</NARRATION>';
            
            // Debit entries for different payment methods
            if ($day['cash_amount'] > 0) {
                $xml .= '<ALLLEDGERENTRIES.LIST>';
                $xml .= '<LEDGERNAME>Cash Account</LEDGERNAME>';
                $xml .= '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>';
                $xml .= '<AMOUNT>' . $day['cash_amount'] . '</AMOUNT>';
                $xml .= '</ALLLEDGERENTRIES.LIST>';
            }
            
            if ($day['card_amount'] > 0) {
                $xml .= '<ALLLEDGERENTRIES.LIST>';
                $xml .= '<LEDGERNAME>Bank Account</LEDGERNAME>';
                $xml .= '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>';
                $xml .= '<AMOUNT>' . $day['card_amount'] . '</AMOUNT>';
                $xml .= '</ALLLEDGERENTRIES.LIST>';
            }
            
            if ($day['upi_amount'] > 0) {
                $xml .= '<ALLLEDGERENTRIES.LIST>';
                $xml .= '<LEDGERNAME>UPI Account</LEDGERNAME>';
                $xml .= '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>';
                $xml .= '<AMOUNT>' . $day['upi_amount'] . '</AMOUNT>';
                $xml .= '</ALLLEDGERENTRIES.LIST>';
            }
            
            // Credit entry - Total Revenue
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>Hotel Revenue</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>-'. $day['total_amount'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            $xml .= '</VOUCHER>';
            $xml .= '</TALLYMESSAGE>';
        }
        
        $xml .= '</REQUESTDATA>';
        $xml .= '</IMPORTDATA>';
        $xml .= '</BODY>';
        $xml .= '</ENVELOPE>';
        
        return $xml;
    }

    private function generateGuestPaymentsTallyXML($payments, $dateFrom, $dateTo) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<ENVELOPE>';
        $xml .= '<HEADER>';
        $xml .= '<TALLYREQUEST>Export Data</TALLYREQUEST>';
        $xml .= '</HEADER>';
        $xml .= '<BODY>';
        $xml .= '<IMPORTDATA>';
        $xml .= '<REQUESTDESC>';
        $xml .= '<REPORTNAME>Guest Payments</REPORTNAME>';
        $xml .= '<STATICVARIABLES>';
        $xml .= '<SVCURRENTCOMPANY>Hotel Management</SVCURRENTCOMPANY>';
        $xml .= '</STATICVARIABLES>';
        $xml .= '</REQUESTDESC>';
        $xml .= '<REQUESTDATA>';
        
        foreach ($payments as $payment) {
            $xml .= '<TALLYMESSAGE>';
            $xml .= '<VOUCHER>';
            $xml .= '<DATE>' . date('Ymd', strtotime($payment['payment_date'])) . '</DATE>';
            $xml .= '<VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>';
            $xml .= '<VOUCHERNUMBER>' . $payment['receipt_number'] . '</VOUCHERNUMBER>';
            $xml .= '<REFERENCE>' . $payment['transaction_id'] . '</REFERENCE>';
            $xml .= '<NARRATION>Payment from ' . $payment['first_name'] . ' ' . $payment['last_name'] . ' - ' . $payment['booking_reference'] . '</NARRATION>';
            
            // Debit entry
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>' . $this->getTallyAccountName($payment['payment_method']) . '</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>' . $payment['amount'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            // Credit entry
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>Hotel Revenue</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>-'. $payment['amount'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            $xml .= '</VOUCHER>';
            $xml .= '</TALLYMESSAGE>';
        }
        
        $xml .= '</REQUESTDATA>';
        $xml .= '</IMPORTDATA>';
        $xml .= '</BODY>';
        $xml .= '</ENVELOPE>';
        
        return $xml;
    }

    private function generateRoomRevenueTallyXML($revenue, $dateFrom, $dateTo) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<ENVELOPE>';
        $xml .= '<HEADER>';
        $xml .= '<TALLYREQUEST>Export Data</TALLYREQUEST>';
        $xml .= '</HEADER>';
        $xml .= '<BODY>';
        $xml .= '<IMPORTDATA>';
        $xml .= '<REQUESTDESC>';
        $xml .= '<REPORTNAME>Room Revenue</REPORTNAME>';
        $xml .= '<STATICVARIABLES>';
        $xml .= '<SVCURRENTCOMPANY>Hotel Management</SVCURRENTCOMPANY>';
        $xml .= '</STATICVARIABLES>';
        $xml .= '</REQUESTDESC>';
        $xml .= '<REQUESTDATA>';
        
        foreach ($revenue as $room) {
            $xml .= '<TALLYMESSAGE>';
            $xml .= '<VOUCHER>';
            $xml .= '<DATE>' . date('Ymd') . '</DATE>';
            $xml .= '<VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>';
            $xml .= '<VOUCHERNUMBER>RR' . date('Ymd') . '</VOUCHERNUMBER>';
            $xml .= '<NARRATION>Room revenue summary for ' . $room['room_type_name'] . ' - ' . $room['room_number'] . '</NARRATION>';
            
            // Debit entry - Room Revenue
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>Room Revenue - ' . $room['room_type_name'] . '</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>' . $room['total_revenue'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            // Credit entry - Hotel Revenue
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>Hotel Revenue</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>-'. $room['total_revenue'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            $xml .= '</VOUCHER>';
            $xml .= '</TALLYMESSAGE>';
        }
        
        $xml .= '</REQUESTDATA>';
        $xml .= '</IMPORTDATA>';
        $xml .= '</BODY>';
        $xml .= '</ENVELOPE>';
        
        return $xml;
    }

    private function generateServiceChargesTallyXML($services, $dateFrom, $dateTo) {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<ENVELOPE>';
        $xml .= '<HEADER>';
        $xml .= '<TALLYREQUEST>Export Data</TALLYREQUEST>';
        $xml .= '</HEADER>';
        $xml .= '<BODY>';
        $xml .= '<IMPORTDATA>';
        $xml .= '<REQUESTDESC>';
        $xml .= '<REPORTNAME>Service Charges</REPORTNAME>';
        $xml .= '<STATICVARIABLES>';
        $xml .= '<SVCURRENTCOMPANY>Hotel Management</SVCURRENTCOMPANY>';
        $xml .= '</STATICVARIABLES>';
        $xml .= '</REQUESTDESC>';
        $xml .= '<REQUESTDATA>';
        
        foreach ($services as $service) {
            $xml .= '<TALLYMESSAGE>';
            $xml .= '<VOUCHER>';
            $xml .= '<DATE>' . date('Ymd', strtotime($service['service_date'])) . '</DATE>';
            $xml .= '<VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>';
            $xml .= '<VOUCHERNUMBER>SC' . date('Ymd', strtotime($service['service_date'])) . '</VOUCHERNUMBER>';
            $xml .= '<NARRATION>Service charges for ' . $service['service_name'] . '</NARRATION>';
            
            // Debit entry - Service Revenue
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>Service Revenue - ' . $service['service_name'] . '</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>' . $service['total_amount'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            // Credit entry - Hotel Revenue
            $xml .= '<ALLLEDGERENTRIES.LIST>';
            $xml .= '<LEDGERNAME>Hotel Revenue</LEDGERNAME>';
            $xml .= '<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>';
            $xml .= '<AMOUNT>-'. $service['total_amount'] . '</AMOUNT>';
            $xml .= '</ALLLEDGERENTRIES.LIST>';
            
            $xml .= '</VOUCHER>';
            $xml .= '</TALLYMESSAGE>';
        }
        
        $xml .= '</REQUESTDATA>';
        $xml .= '</IMPORTDATA>';
        $xml .= '</BODY>';
        $xml .= '</ENVELOPE>';
        
        return $xml;
    }

    private function getTallyAccountName($paymentMethod) {
        $accountMap = [
            'cash' => 'Cash Account',
            'credit_card' => 'Bank Account',
            'debit_card' => 'Bank Account',
            'upi' => 'UPI Account',
            'bank_transfer' => 'Bank Account',
            'cheque' => 'Bank Account',
            'online_wallet' => 'Digital Wallet Account'
        ];
        
        return $accountMap[$paymentMethod] ?? 'Bank Account';
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $tally = new TallyIntegration($db);
        $result = $tally->handleRequest();
        
        if (is_array($result)) {
            // JSON response for errors
            header('Content-Type: application/json');
            echo json_encode($result);
        }
        // XML output is handled directly in the methods
    } catch (Exception $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Internal Server Error',
            'error' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
