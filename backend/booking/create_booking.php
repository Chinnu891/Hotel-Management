<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';
include_once __DIR__ . '/../utils/email_service.php';
include_once __DIR__ . '/auto_invoice_generator.php';

class CreateBooking {
    private $conn;
    private $response;
    private $emailService;
    private $invoiceGenerator;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
        $this->emailService = new EmailService($db);
        $this->invoiceGenerator = new AutoInvoiceGenerator($db);
    }

    public function create($data) {
        try {
            // Debug: Log the incoming data
            error_log("CreateBooking: Received data - " . json_encode($data));
            
            // Validate required fields
            $required_fields = ['guest_info', 'room_number', 'check_in_date', 'check_out_date', 'adults', 'created_by'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->response->error("Missing required field: $field", 400);
                }
            }
            
            // Validate children field (can be 0)
            if (!isset($data['children'])) {
                return $this->response->error("Missing required field: children", 400);
            }

            // Validate dates
            $check_in = new DateTime($data['check_in_date']);
            $check_out = new DateTime($data['check_out_date']);
            $today = new DateTime();

            // Allow booking past dates - removed the past date restriction
            // if ($check_in < $today) {
            //     return $this->response->error("Check-in date cannot be in the past", 400);
            // }

            if ($check_out <= $check_in) {
                return $this->response->error("Check-out date must be after check-in date", 400);
            }

            // Check if room exists
            error_log("CreateBooking: Checking if room {$data['room_number']} exists");
            if (!$this->roomExists($data['room_number'])) {
                error_log("CreateBooking: Room {$data['room_number']} does not exist");
                return $this->response->error("Room {$data['room_number']} does not exist", 400);
            }
            error_log("CreateBooking: Room {$data['room_number']} exists");
            
            // Check room availability
            error_log("CreateBooking: Checking room availability for room {$data['room_number']}");
            if (!$this->isRoomAvailable($data['room_number'], $data['check_in_date'], $data['check_out_date'])) {
                error_log("CreateBooking: Room {$data['room_number']} is not available for selected dates");
                return $this->response->error("Room is not available for selected dates", 400);
            }
            error_log("CreateBooking: Room {$data['room_number']} is available for selected dates");

            // Create or get guest
            $guest_id = $this->createOrGetGuest($data['guest_info']);
            if (!$guest_id) {
                return $this->response->error("Failed to create guest record", 500);
            }

            // Calculate pricing
            $pricing = $this->calculatePricing($data['room_number'], $data['check_in_date'], $data['check_out_date'], $data['adults'], $data['children']);
            
            // Generate booking reference
            $booking_reference = $this->generateBookingReference();

            // Handle payment requirements - only create booking if payment is made
            $initial_payment = isset($data['initial_payment']) ? (float)$data['initial_payment'] : 0.00;
            $payment_method = $data['payment_method'] ?? 'cash';
            
            // Check if this is an owner reference booking (no payment required)
            $is_owner_reference = isset($data['owner_reference']) && $data['owner_reference'] === true;
            
            // For non-owner reference bookings, require payment
            if (!$is_owner_reference && $initial_payment <= 0) {
                return $this->response->error("Payment is required to create booking. Please provide initial payment amount.", 400);
            }
            
            $remaining_amount = $pricing['total_amount'] - $initial_payment;
            $payment_status = ($initial_payment >= $pricing['total_amount']) ? 'completed' : 'partial';

            // Debug: Log payment details
            error_log("CreateBooking: Payment details - initial_payment: $initial_payment, payment_method: $payment_method, total_amount: " . $pricing['total_amount'] . ", remaining_amount: $remaining_amount, payment_status: $payment_status, is_owner_reference: " . ($is_owner_reference ? 'true' : 'false'));
            error_log("CreateBooking: Full payment data - " . json_encode([
                'initial_payment' => $initial_payment,
                'payment_method' => $payment_method,
                'total_amount' => $pricing['total_amount'],
                'remaining_amount' => $remaining_amount,
                'payment_status' => $payment_status,
                'is_owner_reference' => $is_owner_reference
            ]));

            // Create booking with pending status initially
            $booking_status = ($is_owner_reference || $initial_payment > 0) ? 'confirmed' : 'pending';
            $booking_id = $this->insertBooking($data, $guest_id, $pricing, $booking_reference, $initial_payment, $remaining_amount, $payment_status, $booking_status);
            if (!$booking_id) {
                return $this->response->error("Failed to create booking", 500);
            }

            // Record initial payment if provided
            if ($initial_payment > 0) {
                $this->recordInitialPayment($booking_id, $initial_payment, $payment_method, $data['created_by']);
            }

            // Only update room availability if payment is made or owner reference
            if ($is_owner_reference || $initial_payment > 0) {
                $this->updateRoomAvailability($data['room_number'], 'book', $booking_id);
            }

            // Automatically generate invoice
            $invoice_id = $this->invoiceGenerator->generateInvoiceForBooking($booking_id, $guest_id, $pricing, $booking_reference, $data['room_number']);
            
            if ($invoice_id) {
                // Log invoice generation
                $this->logActivity($data['created_by'], 'invoice_generated', 'invoices', $invoice_id, "Auto-generated invoice for booking: $booking_reference");
            }

            // Log activity
            $this->logActivity($data['created_by'], 'create_booking', 'bookings', $booking_id, "Created new booking: $booking_reference");
            
            // Log detailed pricing information
            error_log("CreateBooking: Pricing details - " . json_encode($pricing));
            
            // Send automatic booking confirmation email
            $this->sendBookingConfirmationEmail($booking_id, $data, $guest_id, $pricing, $booking_reference);

            // Send real-time notification to reception
            $this->sendBookingNotification($booking_id, $data, $guest_id, $pricing, $booking_reference);

            return $this->response->success([
                'booking_id' => $booking_id,
                'booking_reference' => $booking_reference,
                'guest_id' => $guest_id,
                'total_amount' => $pricing['total_amount'],
                'initial_payment' => $initial_payment,
                'remaining_amount' => $remaining_amount,
                'payment_status' => $payment_status,
                'message' => 'Booking created successfully'
            ]);

        } catch (Exception $e) {
            error_log("CreateBooking error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    private function isRoomAvailable($room_number, $check_in, $check_out) {
        error_log("isRoomAvailable: Checking room $room_number for dates $check_in to $check_out");
        
        $query = "SELECT COUNT(*) as count FROM bookings 
                  WHERE room_number = :room_number 
                  AND status IN ('confirmed', 'checked_in')
                  AND (
                      (check_in_date <= :check_in AND check_out_date > :check_in) OR
                      (check_in_date < :check_out AND check_out_date >= :check_out) OR
                      (check_in_date >= :check_in AND check_out_date <= :check_out)
                  )";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':room_number', $room_number);
        $stmt->bindParam(':check_in', $check_in);
        $stmt->bindParam(':check_out', $check_out);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $count = $result['count'];
        error_log("isRoomAvailable: Found $count conflicting bookings for room $room_number");
        
        return $count == 0;
    }

    private function roomExists($room_number) {
        $query = "SELECT COUNT(*) as count FROM rooms WHERE room_number = :room_number";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':room_number', $room_number);
        $stmt->execute();
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $exists = $result['count'] > 0;
        error_log("roomExists: Room $room_number exists: " . ($exists ? 'Yes' : 'No'));
        
        return $exists;
    }

    private function createOrGetGuest($guest_info) {
        // Handle empty email values
        $email = !empty($guest_info['email']) ? $guest_info['email'] : null;
        
        // First check if guest already exists by email (primary check) - only if email is provided
        if (!empty($email)) {
            $query = "SELECT id FROM guests WHERE email = :email LIMIT 1";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':email', $email);
            $stmt->execute();

            $existing_guest = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($existing_guest) {
                // Guest exists with this email, return the existing guest ID
                return $existing_guest['id'];
            }
        }

        // If no guest found by email or no email provided, check by phone as secondary check
        $query = "SELECT id FROM guests WHERE phone = :phone LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $guest_info['phone']);
        $stmt->execute();

        $existing_guest = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing_guest) {
            // Guest exists with this phone, return the existing guest ID
            return $existing_guest['id'];
        }

        // Create new guest if no existing guest found
        $query = "INSERT INTO guests (first_name, last_name, email, phone, address, id_proof_type, id_proof_number) 
                  VALUES (:first_name, :last_name, :email, :phone, :address, :id_proof_type, :id_proof_number)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':first_name', $guest_info['first_name']);
        $stmt->bindParam(':last_name', $guest_info['last_name']);
        $stmt->bindParam(':email', $email); // Use the processed email variable
        $stmt->bindParam(':phone', $guest_info['phone']);
        $stmt->bindParam(':address', $guest_info['address']);
        $stmt->bindParam(':id_proof_type', $guest_info['id_proof_type']);
        $stmt->bindParam(':id_proof_number', $guest_info['id_proof_number']);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }

        return false;
    }

    private function calculatePricing($room_number, $check_in, $check_out, $adults, $children) {
        // Get room type and custom price (fallback to base price if custom price is 0)
        $query = "SELECT r.price, rt.base_price, rt.custom_price, rt.capacity FROM rooms r 
                  JOIN room_types rt ON r.room_type_id = rt.id 
                  WHERE r.room_number = :room_number";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':room_number', $room_number);
        $stmt->execute();
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            throw new Exception("Room not found");
        }

        // Calculate number of nights
        $check_in_date = new DateTime($check_in);
        $check_out_date = new DateTime($check_out);
        $nights = $check_in_date->diff($check_out_date)->days;

        // Priority: 1. Room type custom price, 2. Room custom price, 3. Room type base price
        $base_price_per_night = $room['base_price']; // Default to base price
        
        if ($room['custom_price'] > 0) {
            // Use room type custom price if set
            $base_price_per_night = $room['custom_price'];
            error_log("Room {$room_number}: Using room type custom price = {$room['custom_price']}");
        } elseif ($room['price'] > 0) {
            // Use room custom price if room type custom price not set
            $base_price_per_night = $room['price'];
            error_log("Room {$room_number}: Using room custom price = {$room['price']}");
        } else {
            // Use base price if no custom prices set
            $base_price_per_night = $room['base_price'];
            error_log("Room {$room_number}: Using base price = {$room['base_price']}");
        }
        
        // Log pricing decision for transparency
        if ($room['custom_price'] > 0 && $room['custom_price'] != $room['base_price']) {
            error_log("Custom room type pricing used for room $room_number: Custom price ₹{$room['custom_price']} vs Standard price ₹{$room['base_price']}");
        } elseif ($room['price'] > 0 && $room['price'] != $room['base_price']) {
            error_log("Custom room pricing used for room $room_number: Custom price ₹{$room['price']} vs Standard price ₹{$room['base_price']}");
        }

        // Additional charges for extra guests
        $total_guests = $adults + $children;
        $extra_guest_charge = 0;
        if ($total_guests > $room['capacity']) {
            $extra_guests = $total_guests - $room['capacity'];
            $extra_guest_charge = $extra_guests * 25; // $25 per extra guest per night
        }

        // Calculate total
        $total_amount = ($base_price_per_night + $extra_guest_charge) * $nights;

        return [
            'base_price_per_night' => $base_price_per_night,
            'nights' => $nights,
            'extra_guest_charge' => $extra_guest_charge,
            'total_amount' => $total_amount,
            'custom_price_used' => ($room['price'] > 0 || $room['custom_price'] > 0),
            'standard_price' => $room['base_price']
        ];
    }

    private function generateBookingReference() {
        $prefix = 'BK';
        $timestamp = time();
        $random = rand(1000, 9999);
        return $prefix . $timestamp . $random;
    }

    private function insertBooking($data, $guest_id, $pricing, $booking_reference, $initial_payment, $remaining_amount, $payment_status, $booking_status = 'confirmed') {
        $query = "INSERT INTO bookings (
            booking_reference, guest_id, room_number, check_in_date, check_out_date, 
            adults, children, total_amount, paid_amount, remaining_amount, payment_status, 
            created_by, booking_source, contact_email, contact_person, contact_phone,
            company_name, gst_number, billing_address, notes, owner_reference,
            tariff, number_of_days, plan_type, payment_type, status
        ) VALUES (
            :booking_reference, :guest_id, :room_number, :check_in_date, :check_out_date, 
            :adults, :children, :total_amount, :paid_amount, :remaining_amount, :payment_status, 
            :created_by, :booking_source, :contact_email, :contact_person, :contact_phone,
            :company_name, :gst_number, :billing_address, :notes, :owner_reference,
            :tariff, :number_of_days, :plan_type, :payment_type, :status
        )";

        $stmt = $this->conn->prepare($query);
        // Prepare values for binding
        $room_number = $data['room_number'];
        $check_in_date = $data['check_in_date'];
        $check_out_date = $data['check_out_date'];
        $adults = $data['adults'];
        $children = $data['children'];
        $total_amount = $pricing['total_amount'];
        $created_by = $data['created_by'];
        $booking_source = $data['booking_source'] ?? 'walk_in';
        
        $stmt->bindParam(':booking_reference', $booking_reference);
        $stmt->bindParam(':guest_id', $guest_id);
        $stmt->bindParam(':room_number', $room_number);
        $stmt->bindParam(':check_in_date', $check_in_date);
        $stmt->bindParam(':check_out_date', $check_out_date);
        $stmt->bindParam(':adults', $adults);
        $stmt->bindParam(':children', $children);
        $stmt->bindParam(':total_amount', $total_amount);
        $stmt->bindParam(':paid_amount', $initial_payment);
        $stmt->bindParam(':remaining_amount', $remaining_amount);
        $stmt->bindParam(':payment_status', $payment_status);
        $stmt->bindParam(':created_by', $created_by);
        $stmt->bindParam(':booking_source', $booking_source);
        
        // Bind email and contact fields
        // Prepare values for binding
        $contact_email = $data['contact_email'] ?? '';
        $contact_person = $data['contact_person'] ?? '';
        $contact_phone = $data['contact_phone'] ?? '';
        $company_name = $data['company_name'] ?? '';
        $gst_number = $data['gst_number'] ?? '';
        $billing_address = $data['billing_address'] ?? '';
        $notes = $data['notes'] ?? '';
        $owner_reference = $data['owner_reference'] ?? 0;
        $tariff = $data['tariff'] ?? 0;
        $number_of_days = $data['number_of_days'] ?? 1;
        $plan_type = $data['plan_type'] ?? 'EP';
        $payment_type = $data['payment_type'] ?? 'cash';
        
        $stmt->bindParam(':contact_email', $contact_email);
        $stmt->bindParam(':contact_person', $contact_person);
        $stmt->bindParam(':contact_phone', $contact_phone);
        $stmt->bindParam(':company_name', $company_name);
        $stmt->bindParam(':gst_number', $gst_number);
        $stmt->bindParam(':billing_address', $billing_address);
        $stmt->bindParam(':notes', $notes);
        $stmt->bindParam(':owner_reference', $owner_reference);
        $stmt->bindParam(':tariff', $tariff);
        $stmt->bindParam(':number_of_days', $number_of_days);
        $stmt->bindParam(':plan_type', $plan_type);
        $stmt->bindParam(':payment_type', $payment_type);
        $stmt->bindParam(':status', $booking_status);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }

        return false;
    }

    private function recordInitialPayment($booking_id, $amount, $payment_method, $created_by) {
        // Debug: Log payment recording attempt
        error_log("recordInitialPayment: Attempting to record payment - booking_id: $booking_id, amount: $amount, payment_method: $payment_method, created_by: $created_by");
        
        $query = "INSERT INTO walk_in_payments (booking_id, amount, payment_method, payment_status, notes, payment_date, processed_by) 
                  VALUES (:booking_id, :amount, :payment_method, 'completed', :notes, NOW(), :processed_by)";

        $notes = "Initial payment during booking creation - ₹{$amount}";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':booking_id', $booking_id);
        $stmt->bindParam(':amount', $amount);
        $stmt->bindParam(':payment_method', $payment_method);
        $stmt->bindParam(':notes', $notes);
        $stmt->bindParam(':processed_by', $created_by);

        if ($stmt->execute()) {
            $payment_id = $this->conn->lastInsertId();
            error_log("recordInitialPayment: Payment recorded successfully - payment_id: $payment_id");
            return $payment_id;
        } else {
            error_log("recordInitialPayment: Failed to record payment - " . json_encode($stmt->errorInfo()));
            return false;
        }
    }

    private function updateRoomAvailability($room_number, $action, $booking_id = null) {
        try {
            // Update room status in rooms table
            // When booking is created, set status to 'booked' (not 'occupied')
            // When booking is cancelled, set status to 'available'
            $status = ($action === 'book') ? 'booked' : 'available';
            $query = "UPDATE rooms SET status = :status WHERE room_number = :room_number";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':room_number', $room_number);
            $stmt->execute();

            // Log the room status change
            $log_query = "INSERT INTO activity_logs (action, table_name, record_id, details, ip_address) 
                         VALUES (:action, :table_name, :record_id, :details, :ip_address)";
            $log_stmt = $this->conn->prepare($log_query);
            $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            
            $details = json_encode([
                'room_number' => $room_number,
                'action' => $action,
                'status' => $status,
                'booking_id' => $booking_id,
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
            $log_stmt->execute([
                ':action' => 'room_status_updated',
                ':table_name' => 'rooms',
                ':record_id' => $room_number,
                ':details' => $details,
                ':ip_address' => $ip_address
            ]);

        } catch (Exception $e) {
            error_log("Failed to update room availability: " . $e->getMessage());
            // Don't throw error as this is not critical for booking creation
        }
    }

    private function logActivity($user_id, $action, $table_name, $record_id, $details) {
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
    }

    // Send automatic booking confirmation email
    private function sendBookingConfirmationEmail($booking_id, $data, $guest_id, $pricing, $booking_reference) {
        try {
            // Get guest information
            $guest_query = "SELECT first_name, last_name, email FROM guests WHERE id = :guest_id";
            $guest_stmt = $this->conn->prepare($guest_query);
            $guest_stmt->bindParam(':guest_id', $guest_id);
            $guest_stmt->execute();
            $guest = $guest_stmt->fetch(PDO::FETCH_ASSOC);

            if (!$guest || !$guest['email']) {
                error_log("Guest email not found for booking ID: $booking_id");
                return false;
            }

            // Get room information
            $room_query = "SELECT r.room_number, rt.name as room_type FROM rooms r 
                          JOIN room_types rt ON r.room_type_id = rt.id 
                          WHERE r.room_number = :room_number";
            $room_stmt = $this->conn->prepare($room_query);
            $room_stmt->bindParam(':room_number', $data['room_number']);
            $room_stmt->execute();
            $room = $room_stmt->fetch(PDO::FETCH_ASSOC);

            // Calculate number of nights
            $check_in = new DateTime($data['check_in_date']);
            $check_out = new DateTime($data['check_out_date']);
            $nights = $check_in->diff($check_out)->days;

            // Prepare email data
            $email_data = [
                'email' => $guest['email'],
                'guest_name' => $guest['first_name'] . ' ' . $guest['last_name'],
                'booking_reference' => $booking_reference,
                'invoice_number' => 'INV-' . str_pad($booking_id, 6, '0', STR_PAD_LEFT),
                'check_in_date' => $data['check_in_date'],
                'check_out_date' => $data['check_out_date'],
                'nights' => $nights,
                'room_number' => $data['room_number'],
                'room_type' => $room['room_type'] ?? 'Executive Room',
                'total_amount' => $pricing['total_amount'],
                'adults' => $data['adults'],
                'children' => $data['children'] ?? 0
            ];

            // Send the email
            $email_sent = $this->emailService->sendBookingConfirmationEmail($email_data);
            
            if ($email_sent) {
                // Log successful email
                $this->logActivity($data['created_by'], 'email_sent', 'bookings', $booking_id, "Booking confirmation email sent to: " . $guest['email']);
                error_log("Booking confirmation email sent successfully to: " . $guest['email']);
            } else {
                // Log failed email
                $this->logActivity($data['created_by'], 'email_failed', 'bookings', $booking_id, "Failed to send booking confirmation email to: " . $guest['email']);
                error_log("Failed to send booking confirmation email to: " . $guest['email']);
            }

            return $email_sent;

        } catch (Exception $e) {
            error_log("Error sending booking confirmation email: " . $e->getMessage());
            // Don't fail the booking creation if email fails
            return false;
        }
    }

    /**
     * Send real-time notification about new booking to reception
     */
    private function sendBookingNotification($booking_id, $data, $guest_id, $pricing, $booking_reference) {
        try {
            // Get guest information
            $guest_query = "SELECT first_name, last_name, email FROM guests WHERE id = :guest_id";
            $guest_stmt = $this->conn->prepare($guest_query);
            $guest_stmt->bindParam(':guest_id', $guest_id);
            $guest_stmt->execute();
            $guest = $guest_stmt->fetch(PDO::FETCH_ASSOC);

            // Get room information
            $room_query = "SELECT r.room_number, rt.name as room_type FROM rooms r 
                          JOIN room_types rt ON r.room_type_id = rt.id 
                          WHERE r.room_number = :room_number";
            $room_stmt = $this->conn->prepare($room_query);
            $room_stmt->bindParam(':room_number', $data['room_number']);
            $room_stmt->execute();
            $room = $room_stmt->fetch(PDO::FETCH_ASSOC);

            // Include notification service
            require_once '../utils/notification_service.php';
            $notificationService = new NotificationService($this->conn);

            // Send booking notification to reception
            $notification = [
                'type' => 'booking_update',
                'title' => 'New Booking Created',
                'message' => "New booking created for {$guest['first_name']} {$guest['last_name']} in Room {$data['room_number']}",
                'priority' => 'high',
                'details' => [
                    'booking_id' => $booking_id,
                    'booking_reference' => $booking_reference,
                    'guest_name' => $guest['first_name'] . ' ' . $guest['last_name'],
                    'guest_email' => $guest['email'],
                    'room_number' => $data['room_number'],
                    'room_type' => $room['room_type'] ?? 'Executive Room',
                    'check_in_date' => $data['check_in_date'],
                    'check_out_date' => $data['check_out_date'],
                    'adults' => $data['adults'],
                    'children' => $data['children'] ?? 0,
                    'total_amount' => $pricing['total_amount'],
                    'created_by' => $data['created_by'],
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ];

            $result = $notificationService->sendRealTimeNotification('reception', $notification);
            
            if ($result) {
                error_log("Booking notification sent successfully to reception for booking: $booking_reference");
            } else {
                error_log("Failed to send booking notification to reception for booking: $booking_reference");
            }

            return $result;

        } catch (Exception $e) {
            error_log("Error sending booking notification: " . $e->getMessage());
            // Don't fail the booking creation if notification fails
            return false;
        }
    }
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $database = new Database();
    $db = $database->getConnection();
    
    $create_booking = new CreateBooking($db);
    
    $input = json_decode(file_get_contents("php://input"), true);
    $result = $create_booking->create($input);
    
    http_response_code($result['status']);
    echo json_encode($result);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
