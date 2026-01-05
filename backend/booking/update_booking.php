<?php
require_once '../utils/cors_headers.php';

include_once __DIR__ . '/../config/database.php';
include_once __DIR__ . '/../utils/response.php';

class UpdateBooking {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    public function update($data) {
        try {
            // Validate required fields
            $required_fields = ['booking_id'];
            foreach ($required_fields as $field) {
                if (!isset($data[$field]) || empty($data[$field])) {
                    return $this->response->error("Missing required field: $field", 400);
                }
            }

            $booking_id = $data['booking_id'];

            // Get existing booking details
            $existing_booking = $this->getBookingDetails($booking_id);
            if (!$existing_booking) {
                return $this->response->error("Booking not found", 404);
            }

            // Begin transaction
            $this->conn->beginTransaction();

            try {
                // Update guest information
                if (isset($data['guest_info'])) {
                    $this->updateGuestInfo($existing_booking['guest_id'], $data['guest_info']);
                }

                // Update booking details
                $this->updateBookingDetails($booking_id, $data);

                // Log the activity
                $this->logActivity(1, 'update_booking', 'bookings', $booking_id, 
                    "Booking updated: Guest details and booking information modified");

                $this->conn->commit();

                // Get updated booking details
                $updated_booking = $this->getBookingDetails($booking_id);

                return $this->response->success([
                    'booking' => $updated_booking,
                    'message' => 'Booking updated successfully'
                ]);

            } catch (Exception $e) {
                $this->conn->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            error_log("Update booking error: " . $e->getMessage());
            return $this->response->error("Failed to update booking: " . $e->getMessage(), 500);
        }
    }

    private function getBookingDetails($booking_id) {
        $query = "SELECT b.*, g.id as guest_id, g.first_name, g.last_name, g.email, g.phone, g.address,
                          g.id_proof_type, g.id_proof_number,
                          r.room_number, rt.name as room_type
                   FROM bookings b
                   JOIN guests g ON b.guest_id = g.id
                   JOIN rooms r ON b.room_number = r.room_number
                   JOIN room_types rt ON r.room_type_id = rt.id
                   WHERE b.id = ?";

        $stmt = $this->conn->prepare($query);
        $stmt->execute([$booking_id]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function updateGuestInfo($guest_id, $guest_info) {
        $fields = [];
        $values = [];

        if (isset($guest_info['first_name'])) {
            $fields[] = 'first_name = ?';
            $values[] = $guest_info['first_name'];
        }
        if (isset($guest_info['last_name'])) {
            $fields[] = 'last_name = ?';
            $values[] = $guest_info['last_name'];
        }
        if (isset($guest_info['email'])) {
            $fields[] = 'email = ?';
            $values[] = $guest_info['email'];
        }
        if (isset($guest_info['phone'])) {
            $fields[] = 'phone = ?';
            $values[] = $guest_info['phone'];
        }
        if (isset($guest_info['address'])) {
            $fields[] = 'address = ?';
            $values[] = $guest_info['address'];
        }
        if (isset($guest_info['id_proof_type'])) {
            $fields[] = 'id_proof_type = ?';
            $values[] = $guest_info['id_proof_type'];
        }
        if (isset($guest_info['id_proof_number'])) {
            $fields[] = 'id_proof_number = ?';
            $values[] = $guest_info['id_proof_number'];
        }

        if (!empty($fields)) {
            $values[] = $guest_id;
            $query = "UPDATE guests SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute($values);
        }
    }

    private function updateBookingDetails($booking_id, $data) {
        $fields = [];
        $values = [];

        if (isset($data['check_in_date'])) {
            $fields[] = 'check_in_date = ?';
            $values[] = $data['check_in_date'];
        }
        if (isset($data['check_out_date'])) {
            $fields[] = 'check_out_date = ?';
            $values[] = $data['check_out_date'];
        }
        if (isset($data['adults'])) {
            $fields[] = 'adults = ?';
            $values[] = $data['adults'];
        }
        if (isset($data['children'])) {
            $fields[] = 'children = ?';
            $values[] = $data['children'];
        }
        if (isset($data['room_number'])) {
            $fields[] = 'room_number = ?';
            $values[] = $data['room_number'];
        }
        if (isset($data['notes'])) {
            $fields[] = 'notes = ?';
            $values[] = $data['notes'];
        }

        // Add updated_at if column exists
        $checkColumn = "SHOW COLUMNS FROM bookings LIKE 'updated_at'";
        $stmt = $this->conn->prepare($checkColumn);
        $stmt->execute();
        $hasUpdatedAt = $stmt->rowCount() > 0;
        
        if ($hasUpdatedAt) {
            $fields[] = 'updated_at = NOW()';
        }

        if (!empty($fields)) {
            $values[] = $booking_id;
            $query = "UPDATE bookings SET " . implode(', ', $fields) . " WHERE id = ?";
            $stmt = $this->conn->prepare($query);
            $stmt->execute($values);
        }
    }

    private function logActivity($user_id, $action, $table_name, $record_id, $details) {
        try {
            $query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address)
                      VALUES (?, ?, ?, ?, ?, ?)";

            $stmt = $this->conn->prepare($query);
            $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
            $stmt->execute([$user_id, $action, $table_name, $record_id, $details, $ip_address]);
        } catch (Exception $e) {
            // Log activity logging failure but don't fail the main operation
            error_log("Failed to log activity: " . $e->getMessage());
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $updater = new UpdateBooking($db);
        $data = json_decode(file_get_contents('php://input'), true);
        
        $result = $updater->update($data);
        header('Content-Type: application/json');
        echo json_encode($result);
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
