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
            $required_fields = ['guest_info', 'room_number', 'check_in_date', 'check_out_date', 'adults', 'children', 'created_by'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->response->error("Missing required field: $field", 400);
                }
            }

            // Validate dates
            $check_in = new DateTime($data['check_in_date']);
            $check_out = new DateTime($data['check_out_date']);

            if ($check_out <= $check_in) {
                return $this->response->error("Check-out date must be after check-in date", 400);
            }

            // Check room availability
            if (!$this->isRoomAvailable($data['room_number'], $data['check_in_date'], $data['check_out_date'])) {
                return $this->response->error("Room is not available for selected dates", 400);
            }

            // Create or get guest with corporate information
            $guest_id = $this->createOrGetGuest($data['guest_info'], $data);
            if (!$guest_id) {
                return $this->response->error("Failed to create guest record", 500);
            }

            // Calculate pricing
            $pricing = $this->calculatePricing($data['room_number'], $data['check_in_date'], $data['check_out_date'], $data['adults'], $data['children']);
            
            // Generate booking reference
            $booking_reference = $this->generateBookingReference();

            // Create booking
            $booking_id = $this->insertBooking($data, $guest_id, $pricing, $booking_reference);
            if (!$booking_id) {
                return $this->response->error("Failed to create booking", 500);
            }

            // Create corporate booking record if corporate information exists
            if ($data['booking_source'] === 'corporate' && !empty($data['company_name'])) {
                $this->createCorporateBooking($booking_id, $data);
            }

            // Update room availability status
            $this->updateRoomAvailability($data['room_number'], 'book', $booking_id);

            // Automatically generate invoice (skip if owner reference)
            if (!isset($data['owner_reference']) || !$data['owner_reference']) {
                $invoice_id = $this->invoiceGenerator->generateInvoiceForBooking($booking_id, $guest_id, $pricing, $booking_reference);
                
                if ($invoice_id) {
                    // Log invoice generation
                    $this->logActivity($data['created_by'], 'invoice_generated', 'invoices', $invoice_id, "Auto-generated invoice for booking: $booking_reference");
                }
            } else {
                // Log owner reference booking (no invoice)
                $this->logActivity($data['created_by'], 'owner_reference_booking', 'bookings', $booking_id, "Owner reference booking created: $booking_reference (No payment required)");
            }

            // Log activity
            $this->logActivity($data['created_by'], 'create_booking', 'bookings', $booking_id, "Created new booking: $booking_reference");

            // Send automatic booking confirmation email with invoice
            $this->sendBookingConfirmationEmail($booking_id, $data, $guest_id, $pricing, $booking_reference);

            return $this->response->success([
                'booking_id' => $booking_id,
                'booking_reference' => $booking_reference,
                'total_amount' => $pricing['total_amount'],
                'message' => 'Booking created successfully'
            ]);

        } catch (Exception $e) {
            error_log("Create booking error: " . $e->getMessage());
            return $this->response->error("Internal server error", 500);
        }
    }

    private function isRoomAvailable($room_number, $check_in, $check_out) {
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
        return $result['count'] == 0;
    }

    private function createOrGetGuest($guest_info, $data) {
        // First check if guest already exists by email (primary check)
        $query = "SELECT id FROM guests WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $guest_info['email']);
        $stmt->execute();

        $existing_guest = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing_guest) {
            // Guest exists with this email, update corporate information if needed
            $this->updateGuestCorporateInfo($existing_guest['id'], $data);
            return $existing_guest['id'];
        }

        // If no guest found by email, check by phone as secondary check
        $query = "SELECT id FROM guests WHERE phone = :phone LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $guest_info['phone']);
        $stmt->execute();

        $existing_guest = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing_guest) {
            // Guest exists with this phone, update corporate information if needed
            $this->updateGuestCorporateInfo($existing_guest['id'], $data);
            return $existing_guest['id'];
        }

        // Create new guest with corporate information
        $query = "INSERT INTO guests (first_name, last_name, email, phone, address, id_proof_type, id_proof_number, company_name, gst_number) 
                  VALUES (:first_name, :last_name, :email, :phone, :address, :id_proof_type, :id_proof_number, :company_name, :gst_number)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':first_name', $guest_info['first_name']);
        $stmt->bindParam(':last_name', $guest_info['last_name']);
        $stmt->bindParam(':email', $guest_info['email']);
        $stmt->bindParam(':phone', $guest_info['phone']);
        $stmt->bindParam(':address', $guest_info['address']);
        $stmt->bindParam(':id_proof_type', $guest_info['id_proof_type']);
        $stmt->bindParam(':id_proof_number', $guest_info['id_proof_number']);
        $stmt->bindParam(':company_name', $data['company_name'] ?? null);
        $stmt->bindParam(':gst_number', $data['gst_number'] ?? null);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }

        return false;
    }

    private function updateGuestCorporateInfo($guest_id, $data) {
        // Update guest's corporate information if provided
        if (!empty($data['company_name']) || !empty($data['gst_number'])) {
            $query = "UPDATE guests SET company_name = :company_name, gst_number = :gst_number WHERE id = :guest_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':company_name', $data['company_name'] ?? null);
            $stmt->bindParam(':gst_number', $data['gst_number'] ?? null);
            $stmt->bindParam(':guest_id', $guest_id);
            $stmt->execute();
        }
    }

    private function createCorporateBooking($booking_id, $data) {
        try {
            $query = "INSERT INTO corporate_bookings (booking_id, company_name, gst_number, contact_person, contact_phone, contact_email, billing_address) 
                      VALUES (:booking_id, :company_name, :gst_number, :contact_person, :contact_phone, :contact_email, :billing_address)";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->bindParam(':company_name', $data['company_name'] ?? null);
            $stmt->bindParam(':gst_number', $data['gst_number'] ?? null);
            $stmt->bindParam(':contact_person', $data['contact_person'] ?? null);
            $stmt->bindParam(':contact_phone', $data['contact_phone'] ?? null);
            $stmt->bindParam(':contact_email', $data['contact_email'] ?? null);
            $stmt->bindParam(':billing_address', $data['billing_address'] ?? null);
            
            $stmt->execute();
            
            error_log("Corporate booking created for booking ID: $booking_id");
        } catch (Exception $e) {
            error_log("Failed to create corporate booking: " . $e->getMessage());
            // Don't throw error as this is not critical for booking creation
        }
    }

    private function calculatePricing($room_number, $check_in, $check_out, $adults, $children) {
        // Get room type and custom price (fallback to base price if custom price is 0)
        $query = "SELECT r.price, rt.base_price, rt.capacity FROM rooms r 
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

        // Use custom room price if available, otherwise fallback to base price
        $base_price_per_night = ($room['price'] > 0) ? $room['price'] : $room['base_price'];

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
            'total_amount' => $total_amount
        ];
    }

    private function generateBookingReference() {
        $prefix = 'BK';
        $timestamp = time();
        $random = rand(1000, 9999);
        return $prefix . $timestamp . $random;
    }

    private function insertBooking($data, $guest_id, $pricing, $booking_reference) {
        $query = "INSERT INTO bookings (booking_reference, guest_id, room_number, check_in_date, check_out_date, 
                  adults, children, total_amount, created_by, booking_source, owner_reference, payment_status) 
                  VALUES (:booking_reference, :guest_id, :room_number, :check_in_date, :check_out_date, 
                  :adults, :children, :total_amount, :created_by, :booking_source, :owner_reference, :payment_status)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':booking_reference', $booking_reference);
        $stmt->bindParam(':guest_id', $guest_id);
        $stmt->bindParam(':room_number', $data['room_number']);
        $stmt->bindParam(':check_in_date', $data['check_in_date']);
        $stmt->bindParam(':check_out_date', $data['check_out_date']);
        $stmt->bindParam(':adults', $data['adults']);
        $stmt->bindParam(':children', $data['children']);
        $stmt->bindParam(':total_amount', $pricing['total_amount']);
        $stmt->bindParam(':created_by', $data['created_by']);
        $stmt->bindParam(':booking_source', $data['booking_source'] ?? 'walk_in');
        $stmt->bindParam(':owner_reference', $data['owner_reference'] ?? false);
        
        // Set payment status based on owner reference
        $payment_status = (isset($data['owner_reference']) && $data['owner_reference']) ? 'paid' : 'pending';
        $stmt->bindParam(':payment_status', $payment_status);

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }

        return false;
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
            $query = "SELECT first_name, last_name, email FROM guests WHERE id = :guest_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':guest_id', $guest_id);
            $stmt->execute();
            $guest = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($guest && $guest['email']) {
                $subject = "Booking Confirmation - $booking_reference";
                $message = "Dear {$guest['first_name']} {$guest['last_name']},\n\n";
                $message .= "Your booking has been confirmed!\n\n";
                $message .= "Booking Reference: $booking_reference\n";
                $message .= "Room Number: {$data['room_number']}\n";
                $message .= "Check-in: {$data['check_in_date']}\n";
                $message .= "Check-out: {$data['check_out_date']}\n";
                $message .= "Total Amount: ₹{$pricing['total_amount']}\n\n";
                $message .= "Thank you for choosing our hotel!\n\n";
                $message .= "Best regards,\nHotel Management Team";

                $this->emailService->sendEmail($guest['email'], $subject, $message);
            }
        } catch (Exception $e) {
            error_log("Failed to send booking confirmation email: " . $e->getMessage());
            // Don't throw error as this is not critical for booking creation
        }
    }
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            exit;
        }

        $db = new Database();
        $conn = $db->getConnection();
        
        $createBooking = new CreateBooking($conn);
        $result = $createBooking->create($input);
        
        echo json_encode($result);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Internal server error: ' . $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
?>
