<?php
require_once '../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class CreatePendingBooking {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function create($data) {
        try {
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

            // Check room availability (only confirmed bookings block rooms)
            if (!$this->isRoomAvailable($data['room_number'], $data['check_in_date'], $data['check_out_date'])) {
                return $this->response->error("Room is not available for selected dates", 400);
            }

            // Create or get guest
            $guest_id = $this->createOrGetGuest($data['guest_info']);
            if (!$guest_id) {
                return $this->response->error("Failed to create guest record", 500);
            }

            // Calculate pricing
            $pricing = $this->calculatePricing($data['room_number'], $data['check_in_date'], $data['check_out_date'], $data['adults'], $data['children']);
            
            // Generate booking reference
            $booking_reference = $this->generateBookingReference();

            // Create pending booking (no payment required initially)
            $booking_id = $this->insertPendingBooking($data, $guest_id, $pricing, $booking_reference);
            if (!$booking_id) {
                return $this->response->error("Failed to create pending booking", 500);
            }

            // Log activity
            $this->logActivity($data['created_by'], 'create_pending_booking', 'bookings', $booking_id, "Created pending booking: $booking_reference");

            return $this->response->success([
                'booking_id' => $booking_id,
                'booking_reference' => $booking_reference,
                'guest_id' => $guest_id,
                'total_amount' => $pricing['total_amount'],
                'status' => 'pending',
                'message' => 'Pending booking created successfully. Payment required to confirm booking.',
                'requires_payment' => true,
                'payment_amount' => $pricing['total_amount']
            ]);

        } catch (Exception $e) {
            error_log("CreatePendingBooking error: " . $e->getMessage());
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

    private function createOrGetGuest($guest_info) {
        // First check if guest already exists by email
        $query = "SELECT id FROM guests WHERE email = :email LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':email', $guest_info['email']);
        $stmt->execute();

        $existing_guest = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing_guest) {
            return $existing_guest['id'];
        }

        // Check by phone as secondary check
        $query = "SELECT id FROM guests WHERE phone = :phone LIMIT 1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':phone', $guest_info['phone']);
        $stmt->execute();

        $existing_guest = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing_guest) {
            return $existing_guest['id'];
        }

        // Create new guest if no existing guest found
        $query = "INSERT INTO guests (first_name, last_name, email, phone, address, id_proof_type, id_proof_number) 
                  VALUES (:first_name, :last_name, :email, :phone, :address, :id_proof_type, :id_proof_number)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':first_name', $guest_info['first_name']);
        $stmt->bindParam(':last_name', $guest_info['last_name']);
        $stmt->bindParam(':email', $guest_info['email']);
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
        // Get room type and custom price
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

        // Calculate nights
        $check_in_date = new DateTime($check_in);
        $check_out_date = new DateTime($check_out);
        $nights = $check_out_date->diff($check_in_date)->days;

        // Determine price to use (priority: custom room type price > custom room price > base price)
        $price_per_night = $room['base_price'];
        if ($room['custom_price'] > 0) {
            $price_per_night = $room['custom_price'];
            error_log("Room {$room_number}: Using room type custom price = {$room['custom_price']}");
        } elseif ($room['price'] > 0) {
            $price_per_night = $room['price'];
            error_log("Room {$room_number}: Using room custom price = {$room['price']}");
        } else {
            error_log("Room {$room_number}: Using base price = {$room['base_price']}");
        }

        $total_amount = $nights * $price_per_night;

        return [
            'nights' => $nights,
            'price_per_night' => $price_per_night,
            'total_amount' => $total_amount,
            'adults' => $adults,
            'children' => $children
        ];
    }

    private function generateBookingReference() {
        $prefix = 'BK';
        $year = date('Y');
        $random = rand(100000, 999999);
        return $prefix . $year . $random;
    }

    private function insertPendingBooking($data, $guest_id, $pricing, $booking_reference) {
        $query = "INSERT INTO bookings (booking_reference, guest_id, room_number, check_in_date, check_out_date, 
                                      adults, children, total_amount, initial_payment, remaining_amount, payment_status, 
                                      booking_source, contact_email, contact_person, contact_phone, company_name, 
                                      gst_number, billing_address, notes, owner_reference, tariff, number_of_days, 
                                      plan_type, payment_type, created_by, status) 
                  VALUES (:booking_reference, :guest_id, :room_number, :check_in_date, :check_out_date, 
                         :adults, :children, :total_amount, :initial_payment, :remaining_amount, :payment_status, 
                         :booking_source, :contact_email, :contact_person, :contact_phone, :company_name, 
                         :gst_number, :billing_address, :notes, :owner_reference, :tariff, :number_of_days, 
                         :plan_type, :payment_type, :created_by, :status)";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':booking_reference', $booking_reference);
        $stmt->bindParam(':guest_id', $guest_id);
        $stmt->bindParam(':room_number', $data['room_number']);
        $stmt->bindParam(':check_in_date', $data['check_in_date']);
        $stmt->bindParam(':check_out_date', $data['check_out_date']);
        $stmt->bindParam(':adults', $data['adults']);
        $stmt->bindParam(':children', $data['children']);
        $stmt->bindParam(':total_amount', $pricing['total_amount']);
        $stmt->bindParam(':initial_payment', 0); // No initial payment for pending bookings
        $stmt->bindParam(':remaining_amount', $pricing['total_amount']); // Full amount remaining
        $stmt->bindParam(':payment_status', 'pending');
        $stmt->bindParam(':booking_source', $data['booking_source'] ?? 'walk_in');
        $stmt->bindParam(':contact_email', $data['contact_email'] ?? '');
        $stmt->bindParam(':contact_person', $data['contact_person'] ?? '');
        $stmt->bindParam(':contact_phone', $data['contact_phone'] ?? '');
        $stmt->bindParam(':company_name', $data['company_name'] ?? '');
        $stmt->bindParam(':gst_number', $data['gst_number'] ?? '');
        $stmt->bindParam(':billing_address', $data['billing_address'] ?? '');
        $stmt->bindParam(':notes', $data['notes'] ?? '');
        $stmt->bindParam(':owner_reference', $data['owner_reference'] ?? 0);
        $stmt->bindParam(':tariff', $data['tariff'] ?? 0);
        $stmt->bindParam(':number_of_days', $data['number_of_days'] ?? 1);
        $stmt->bindParam(':plan_type', $data['plan_type'] ?? 'EP');
        $stmt->bindParam(':payment_type', $data['payment_type'] ?? 'cash');
        $stmt->bindParam(':created_by', $data['created_by']);
        $stmt->bindParam(':status', 'pending'); // Always pending for this endpoint

        if ($stmt->execute()) {
            return $this->conn->lastInsertId();
        }

        return false;
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
}

// Handle request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $database = new Database();
    $db = $database->getConnection();
    
    $pending_booking = new CreatePendingBooking($db);
    
    $input = json_decode(file_get_contents("php://input"), true);
    $result = $pending_booking->create($input);
    
    http_response_code($result['status']);
    echo json_encode($result);
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
