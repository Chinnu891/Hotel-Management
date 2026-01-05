<?php
// Ensure clean output
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Clear any existing output
if (ob_get_level()) {
    ob_end_clean();
}
ob_start();

require_once __DIR__ . '/../utils/cors_headers.php';
header('Content-Type: application/json');

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

// Initialize database connection
$database = new Database();
$conn = $database->getConnection();

class ExtendBooking {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function extend($data) {
        try {
            // Validate required fields
            $required_fields = ['booking_id', 'room_number', 'days_to_extend', 'new_checkout_date', 'new_checkout_time', 'new_checkout_ampm'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->response->error("Missing required field: $field", 400);
                }
            }

            $booking_id = $data['booking_id'];
            $room_number = $data['room_number'];
            $days_to_extend = (int)$data['days_to_extend'];
            $new_checkout_date = $data['new_checkout_date'];
            $new_checkout_time = $data['new_checkout_time'];
            $new_checkout_ampm = $data['new_checkout_ampm'];

            // Validate days to extend
            if ($days_to_extend <= 0 || $days_to_extend > 30) {
                return $this->response->error("Days to extend must be between 1 and 30", 400);
            }

            // Validate time format
            if (!preg_match('/^([01]?[0-9]|1[0-2]):[0-5][0-9]$/', $new_checkout_time)) {
                return $this->response->error("Invalid time format. Use HH:MM format (12-hour)", 400);
            }

            // Validate AM/PM
            if (!in_array($new_checkout_ampm, ['AM', 'PM'])) {
                return $this->response->error("Invalid AM/PM value", 400);
            }

            // Validate date format
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $new_checkout_date)) {
                return $this->response->error("Invalid date format. Use YYYY-MM-DD", 400);
            }

            // Begin transaction
            $this->conn->beginTransaction();

            try {
                // Get current booking details
                $stmt = $this->conn->prepare("
                    SELECT b.*, g.first_name, g.last_name, r.price, rt.base_price, rt.custom_price
                    FROM bookings b
                    JOIN guests g ON b.guest_id = g.id
                    LEFT JOIN rooms r ON b.room_number = r.room_number
                    LEFT JOIN room_types rt ON r.room_type_id = rt.id
                    WHERE b.id = ? AND b.room_number = ?
                ");
                $stmt->execute([$booking_id, $room_number]);
                $booking = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$booking) {
                    throw new Exception('Booking not found');
                }

                // Check if guest is checked in
                if ($booking['status'] !== 'checked_in') {
                    throw new Exception('Only checked-in guests can extend their stay');
                }

                // Check room availability for extended period
                $availabilityCheck = $this->checkRoomAvailabilityForExtension($room_number, $booking['check_out_date'], $new_checkout_date, $booking_id);
                if (!$availabilityCheck['available']) {
                    throw new Exception($availabilityCheck['message']);
                }

                            // Use manually entered additional amount if provided, otherwise calculate it
            $manual_additional_amount = isset($data['additional_amount']) ? (float)$data['additional_amount'] : null;
            
            if ($manual_additional_amount !== null && $manual_additional_amount >= 0) {
                // Use manually entered amount
                $additional_amount = $manual_additional_amount;
            } else {
                // Calculate additional amount automatically
                $additional_amount = $this->calculateAdditionalAmount($room_number, $booking['check_out_date'], $new_checkout_date, $booking['adults'], $booking['children']);
            }

                // Update booking with new checkout date and time
                $stmt = $this->conn->prepare("
                    UPDATE bookings 
                    SET check_out_date = ?,
                        check_out_time = ?,
                        check_out_ampm = ?,
                        total_amount = total_amount + ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $stmt->execute([$new_checkout_date, $new_checkout_time, $new_checkout_ampm, $additional_amount, $booking_id]);

                if ($stmt->rowCount() === 0) {
                    throw new Exception('Failed to update booking');
                }

                // Log the extension activity
                $amount_type = ($manual_additional_amount !== null && $manual_additional_amount >= 0) ? 'manual' : 'calculated';
                $this->logActivity(1, 'extend_booking', 'bookings', $booking_id, 
                    "Booking extended by {$days_to_extend} days. New checkout: {$new_checkout_date} {$new_checkout_time} {$new_checkout_ampm}. Additional amount: ₹{$additional_amount} ({$amount_type})");

                $this->conn->commit();

                // Get updated booking details
                $stmt = $this->conn->prepare("
                    SELECT b.*, g.first_name, g.last_name
                    FROM bookings b
                    JOIN guests g ON b.guest_id = g.id
                    WHERE b.id = ?
                ");
                $stmt->execute([$booking_id]);
                $updated_booking = $stmt->fetch(PDO::FETCH_ASSOC);

                $amount_type = ($manual_additional_amount !== null && $manual_additional_amount >= 0) ? 'manual' : 'calculated';
                return $this->response->success([
                    'message' => "Stay extended successfully by {$days_to_extend} days with ₹{$additional_amount} additional amount ({$amount_type})",
                    'booking' => $updated_booking,
                    'new_total_amount' => $updated_booking['total_amount'],
                    'additional_amount' => $additional_amount,
                    'amount_type' => $amount_type
                ]);

            } catch (Exception $e) {
                $this->conn->rollBack();
                return $this->response->error($e->getMessage(), 400);
            }

        } catch (Exception $e) {
            return $this->response->error($e->getMessage(), 500);
        }
    }

    private function checkRoomAvailabilityForExtension($room_number, $current_checkout_date, $new_checkout_date, $exclude_booking_id) {
        // Check if there are any other bookings that conflict with the extended period
        $stmt = $this->conn->prepare("
            SELECT b.id, b.booking_reference, b.status, b.check_in_date, b.check_out_date, 
                   g.first_name, g.last_name, b.created_at
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            WHERE b.room_number = ? 
            AND b.id != ?
            AND b.status IN ('confirmed', 'checked_in')
            AND (
                (b.check_in_date < ? AND b.check_out_date > ?) OR
                (b.check_in_date >= ? AND b.check_in_date < ?) OR
                (b.check_out_date > ? AND b.check_out_date <= ?)
            )
            ORDER BY b.check_in_date ASC
            LIMIT 1
        ");
        $stmt->execute([$room_number, $exclude_booking_id, $new_checkout_date, $current_checkout_date, $current_checkout_date, $new_checkout_date, $current_checkout_date, $new_checkout_date]);
        $conflicting_booking = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($conflicting_booking) {
            // Format the conflicting booking details
            $guest_name = trim($conflicting_booking['first_name'] . ' ' . $conflicting_booking['last_name']);
            $check_in = date('M d, Y', strtotime($conflicting_booking['check_in_date']));
            $check_out = date('M d, Y', strtotime($conflicting_booking['check_out_date']));
            $booking_ref = $conflicting_booking['booking_reference'];
            
            if ($conflicting_booking['status'] === 'confirmed') {
                $message = "Room {$room_number} is already pre-booked for {$guest_name} (Ref: {$booking_ref}) from {$check_in} to {$check_out}. Cannot extend the current booking.";
            } else {
                $message = "Room {$room_number} is occupied by {$guest_name} (Ref: {$booking_ref}) from {$check_in} to {$check_out}. Cannot extend the current booking.";
            }
            
            return [
                'available' => false,
                'message' => $message,
                'conflicting_booking' => $conflicting_booking
            ];
        }

        return [
            'available' => true,
            'message' => 'Room is available for extension'
        ];
    }

    private function calculateAdditionalAmount($room_number, $current_checkout_date, $new_checkout_date, $adults, $children) {
        // Get room pricing with room type information
        $stmt = $this->conn->prepare("
            SELECT r.price, rt.base_price, rt.custom_price, rt.capacity
            FROM rooms r
            LEFT JOIN room_types rt ON r.room_type_id = rt.id
            WHERE r.room_number = ?
        ");
        $stmt->execute([$room_number]);
        $room = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$room) {
            throw new Exception('Room not found');
        }

        // Priority: 1. Room type custom price, 2. Room custom price, 3. Room type base price
        $base_price_per_night = $room['base_price']; // Default to base price
        
        if ($room['custom_price'] > 0) {
            // Use room type custom price if set
            $base_price_per_night = $room['custom_price'];
        } elseif ($room['price'] > 0) {
            // Use room custom price if room type custom price not set
            $base_price_per_night = $room['price'];
        } else {
            // Use base price if no custom prices set
            $base_price_per_night = $room['base_price'];
        }

        // Calculate number of additional nights
        $current_checkout = new DateTime($current_checkout_date);
        $new_checkout = new DateTime($new_checkout_date);
        $interval = $current_checkout->diff($new_checkout);
        $additional_nights = $interval->days;

        // Calculate extra guest charges
        $extra_guest_charge = 0;
        $total_guests = $adults + $children;
        $capacity = $room['capacity'] ?? 2; // Default to 2 if capacity not set
        if ($total_guests > $capacity) {
            $extra_guests = $total_guests - $capacity;
            $extra_guest_charge = $extra_guests * 25; // ₹25 per extra guest per night
        }

        $price_per_night = $base_price_per_night + $extra_guest_charge;
        $additional_amount = $price_per_night * $additional_nights;

        return $additional_amount;
    }

    private function logActivity($user_id, $action, $table, $record_id, $description) {
        try {
            $stmt = $this->conn->prepare("
                INSERT INTO activity_logs (user_id, action, table_name, record_id, description, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$user_id, $action, $table, $record_id, $description]);
        } catch (Exception $e) {
            // Log error but don't fail the main operation
            error_log("Failed to log activity: " . $e->getMessage());
        }
    }
}

// Handle the request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        // Debug: Log the request
        error_log("Extend booking API called");
        
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            error_log("Invalid JSON input received");
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            exit;
        }

        error_log("Input received: " . json_encode($input));
        
        // Check if database connection exists
        if (!isset($conn) || !$conn) {
            error_log("Database connection not available");
            echo json_encode(['success' => false, 'message' => 'Database connection error']);
            exit;
        }

        $extendBooking = new ExtendBooking($conn);
        $result = $extendBooking->extend($input);
        
        error_log("API result: " . json_encode($result));
        echo json_encode($result);
    } catch (Exception $e) {
        error_log("Extend booking error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

// Clean output buffer
if (ob_get_level()) {
    ob_end_flush();
}
?>
