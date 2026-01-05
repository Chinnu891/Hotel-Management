<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class CreateBookingWithWalkInPayment {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function create($data) {
        try {
            // Validate required fields
            $required_fields = [
                'guest_info', 'room_id', 'check_in_date', 'check_out_date', 
                'adults', 'children', 'total_amount', 'booking_source'
            ];
            
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->response->error("Missing required field: $field");
                }
            }

            // Validate guest info
            $guest_required = ['first_name', 'last_name', 'phone'];
            foreach ($guest_required as $field) {
                if (!isset($data['guest_info'][$field]) || empty($data['guest_info'][$field])) {
                    return $this->response->error("Missing required guest field: $field");
                }
            }

            // Validate walk-in payment fields
            if ($data['booking_source'] === 'walk_in') {
                if (!isset($data['paid_amount'])) {
                    return $this->response->error('Paid amount is required for walk-in bookings');
                }
                
                $paid_amount = floatval($data['paid_amount']);
                $total_amount = floatval($data['total_amount']);
                
                if ($paid_amount < 0) {
                    return $this->response->error('Paid amount cannot be negative');
                }
                
                if ($paid_amount > $total_amount) {
                    return $this->response->error('Paid amount cannot exceed total amount');
                }
                
                // Payment method is required if amount > 0 (unless owner referenced)
                if ($paid_amount > 0 && !isset($data['payment_method']) && !($data['referenced_by_owner'] ?? false)) {
                    return $this->response->error('Payment method is required when amount is greater than 0');
                }
            }

            // Start transaction
            $this->conn->begin_transaction();

            try {
                // Create or get guest
                $guest_id = $this->createOrGetGuest($data['guest_info']);
                if (!$guest_id) {
                    throw new Exception('Failed to create/get guest');
                }

                // Generate booking reference
                $booking_reference = $this->generateBookingReference();

                // Create booking
                $booking_id = $this->createBooking($data, $guest_id, $booking_reference);
                if (!$booking_id) {
                    throw new Exception('Failed to create booking');
                }

                // Process walk-in payment if applicable
                if ($data['booking_source'] === 'walk_in' && isset($data['paid_amount'])) {
                    $paid_amount = floatval($data['paid_amount']);
                    
                    if ($paid_amount > 0) {
                        $payment_result = $this->processInitialPayment($booking_id, $data);
                        if (!$payment_result) {
                            throw new Exception('Failed to process initial payment');
                        }
                    }
                }

                // Commit transaction
                $this->conn->commit();

                // Send booking confirmation email
                if (!empty($data['contact_email']) && $data['contact_email'] !== '') {
                    try {
                        require_once '../utils/email_service.php';
                        $emailService = new EmailService($this->conn);
                        
                        // Prepare email data
                        $emailData = [
                            'guest_name' => $data['guest_info']['first_name'] . ' ' . $data['guest_info']['last_name'],
                            'booking_reference' => $booking_reference,
                            'room_number' => $room_number,
                            'check_in_date' => $data['check_in_date'],
                            'check_out_date' => $data['check_out_date'],
                            'adults' => $data['adults'],
                            'children' => $data['children'],
                            'total_amount' => $data['total_amount'],
                            'contact_email' => $data['contact_email'],
                            'contact_person' => $data['contact_person'] ?? '',
                            'booking_id' => $booking_id
                        ];
                        
                        // Send confirmation email
                        $emailResult = $emailService->sendBookingConfirmation($data['contact_email'], $emailData);
                        
                        if ($emailResult['success']) {
                            error_log("Booking confirmation email sent successfully to: " . $data['contact_email']);
                        } else {
                            error_log("Failed to send booking confirmation email: " . $emailResult['message']);
                        }
                    } catch (Exception $e) {
                        error_log("Error sending booking confirmation email: " . $e->getMessage());
                    }
                } else {
                    error_log("No contact email provided, skipping email sending");
                }

                // Send real-time notification to reception
                $this->sendBookingNotification($booking_id, $data, $guest_id, $room_number, $booking_reference);

                // Get created booking details
                $booking_details = $this->getBookingDetails($booking_id);

                return $this->response->success('Booking created successfully', [
                    'booking_id' => $booking_id,
                    'booking_reference' => $booking_reference,
                    'guest_id' => $guest_id,
                    'booking' => $booking_details
                ]);

            } catch (Exception $e) {
                $this->conn->rollback();
                throw $e;
            }

        } catch (Exception $e) {
            error_log("CreateBookingWithWalkInPayment Error: " . $e->getMessage());
            return $this->response->error('Failed to create booking: ' . $e->getMessage());
        }
    }

    private function createOrGetGuest($guest_info) {
        // Check if guest already exists by phone
        $check_query = "SELECT id FROM guests WHERE phone = ?";
        $check_stmt = $this->conn->prepare($check_query);
        $check_stmt->bind_param('s', $guest_info['phone']);
        $check_stmt->execute();
        $result = $check_stmt->get_result();

        if ($result->num_rows > 0) {
            // Guest exists, return existing ID
            $guest = $result->fetch_assoc();
            return $guest['id'];
        }

        // Create new guest
        $insert_query = "
            INSERT INTO guests (
                first_name, last_name, email, phone, address, 
                id_proof_type, id_proof_number, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ";

        $insert_stmt = $this->conn->prepare($insert_query);
        $insert_stmt->bind_param(
            'sssssss',
            $guest_info['first_name'],
            $guest_info['last_name'],
            $guest_info['email'] ?? '',
            $guest_info['phone'],
            $guest_info['address'] ?? '',
            $guest_info['id_proof_type'],
            $guest_info['id_proof_number']
        );

        if ($insert_stmt->execute()) {
            return $this->conn->insert_id;
        }

        return false;
    }

    private function generateBookingReference() {
        $prefix = 'BK';
        $date = date('Ymd');
        $random = strtoupper(substr(md5(uniqid()), 0, 6));
        return $prefix . $date . $random;
    }

    private function createBooking($data, $guest_id, $booking_reference) {
        // Calculate remaining amount
        $paid_amount = floatval($data['paid_amount'] ?? 0);
        $total_amount = floatval($data['total_amount']);
        $remaining_amount = max(0, $total_amount - $paid_amount);

        // Determine payment status
        if ($remaining_amount == 0) {
            $payment_status = 'completed';
        } elseif ($paid_amount > 0) {
            $payment_status = 'partial';
        } else {
            $payment_status = 'pending';
        }

        $insert_query = "
            INSERT INTO bookings (
                booking_reference, guest_id, room_id, room_number,
                check_in_date, check_out_date, adults, children,
                total_amount, paid_amount, remaining_amount, payment_status,
                booking_source, referenced_by_owner, owner_reference_notes,
                status, created_by, created_at, contact_email, contact_person,
                contact_phone, company_name, gst_number, billing_address,
                notes, tariff, number_of_days, plan_type, payment_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ";

        // Get room number
        $room_query = "SELECT room_number FROM rooms WHERE id = ?";
        $room_stmt = $this->conn->prepare($room_query);
        $room_stmt->bind_param('i', $data['room_id']);
        $room_stmt->execute();
        $room_result = $room_stmt->get_result();
        $room = $room_result->fetch_assoc();
        $room_number = $room['room_number'];

        $insert_stmt = $this->conn->prepare($insert_query);
        $insert_stmt->bind_param(
            'siiissiidddssssisssssssss',
            $booking_reference,
            $guest_id,
            $data['room_id'],
            $room_number,
            $data['check_in_date'],
            $data['check_out_date'],
            $data['adults'],
            $data['children'],
            $total_amount,
            $paid_amount,
            $remaining_amount,
            $payment_status,
            $data['booking_source'],
            $data['referenced_by_owner'] ?? false,
            $data['owner_reference_notes'] ?? '',
            $data['created_by'] ?? 1,
            $data['contact_email'] ?? '',
            $data['contact_person'] ?? '',
            $data['contact_phone'] ?? '',
            $data['company_name'] ?? '',
            $data['gst_number'] ?? '',
            $data['billing_address'] ?? '',
            $data['notes'] ?? '',
            $data['tariff'] ?? 0,
            $data['number_of_days'] ?? 1,
            $data['plan_type'] ?? 'EP',
            $data['payment_type'] ?? 'cash'
        );

        if ($insert_stmt->execute()) {
            return $this->conn->insert_id;
        }

        return false;
    }

    private function processInitialPayment($booking_id, $data) {
        $paid_amount = floatval($data['paid_amount']);
        $payment_method = $data['payment_method'] ?? 'cash';
        $processed_by = $data['created_by'] ?? 1;

        // Generate receipt number
        $receipt_number = 'RCP' . date('Ymd') . str_pad($booking_id, 6, '0', STR_PAD_LEFT) . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);

        $insert_query = "
            INSERT INTO walk_in_payments (
                booking_id, amount, payment_method, payment_status,
                receipt_number, notes, processed_by, payment_type
            ) VALUES (?, ?, ?, 'completed', ?, 'Initial walk-in payment', ?, 'initial')
        ";

        $insert_stmt = $this->conn->prepare($insert_query);
        $insert_stmt->bind_param('idssi', $booking_id, $paid_amount, $payment_method, $receipt_number, $processed_by);

        return $insert_stmt->execute();
    }

    private function getBookingDetails($booking_id) {
        $query = "
            SELECT 
                b.id as booking_id,
                b.booking_reference,
                b.check_in_date,
                b.check_out_date,
                b.adults,
                b.children,
                b.total_amount,
                b.paid_amount,
                b.remaining_amount,
                b.payment_status,
                b.booking_source,
                b.referenced_by_owner,
                b.owner_reference_notes,
                b.status as booking_status,
                g.first_name,
                g.last_name,
                g.phone,
                g.email,
                r.room_number,
                rt.name as room_type_name
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            JOIN rooms r ON b.room_id = r.id
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE b.id = ?
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('i', $booking_id);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            return null;
        }

        return $result->fetch_assoc();
    }

    /**
     * Send real-time notification about new booking to reception
     */
    private function sendBookingNotification($booking_id, $data, $guest_id, $room_number, $booking_reference) {
        try {
            // Get guest information
            $guest_query = "SELECT first_name, last_name, email FROM guests WHERE id = ?";
            $guest_stmt = $this->conn->prepare($guest_query);
            $guest_stmt->bind_param('i', $guest_id);
            $guest_stmt->execute();
            $guest_result = $guest_stmt->get_result();
            $guest = $guest_result->fetch_assoc();

            // Get room information
            $room_query = "SELECT r.room_number, rt.name as room_type FROM rooms r JOIN room_types rt ON r.room_type_id = rt.id WHERE r.room_number = ?";
            $room_stmt = $this->conn->prepare($room_query);
            $room_stmt->bind_param('s', $room_number);
            $room_stmt->execute();
            $room_result = $room_stmt->get_result();
            $room = $room_result->fetch_assoc();

            // Calculate number of days
            $check_in = new DateTime($data['check_in_date']);
            $check_out = new DateTime($data['check_out_date']);
            $number_of_days = $check_out->diff($check_in)->days;

            // Prepare notification data
            $notification_data = [
                'type' => 'booking_update',
                'title' => 'New Walk-in Booking Created',
                'message' => "New walk-in booking created for {$guest['first_name']} {$guest['last_name']} in Room {$room_number}",
                'priority' => 'high',
                'details' => [
                    'booking_id' => $booking_id,
                    'booking_reference' => $booking_reference,
                    'guest_name' => $guest['first_name'] . ' ' . $guest['last_name'],
                    'guest_email' => $guest['email'],
                    'room_number' => $room_number,
                    'room_type' => $room['room_type'],
                    'check_in_date' => $data['check_in_date'],
                    'check_out_date' => $data['check_out_date'],
                    'adults' => $data['adults'],
                    'children' => $data['children'],
                    'total_amount' => $data['total_amount'],
                    'number_of_days' => $number_of_days,
                    'payment_type' => $data['payment_type'] ?? 'cash',
                    'booking_source' => 'walk_in',
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ];

            // Send notification
            require_once '../utils/notification_service.php';
            $notificationService = new NotificationService($this->conn);
            $result = $notificationService->sendRealTimeNotification('reception', $notification_data);

            if ($result) {
                error_log("Walk-in booking notification sent successfully for booking ID: $booking_id");
            } else {
                error_log("Failed to send walk-in booking notification for booking ID: $booking_id");
            }

            return $result;

        } catch (Exception $e) {
            error_log("Error sending walk-in booking notification: " . $e->getMessage());
            return false;
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $database = new Database();
    $db = $database->getConnection();
    
    $createBooking = new CreateBookingWithWalkInPayment($db);
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit;
    }

    $result = $createBooking->create($input);
    echo json_encode($result);

} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
