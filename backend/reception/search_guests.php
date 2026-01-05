<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response_handler.php';

class GuestSearch {
    private $db;
    private $responseHandler;

    public function __construct($db) {
        $this->db = $db;
        $this->responseHandler = new ResponseHandler();
    }

    public function searchGuests($searchTerm) {
        try {
            if (empty($searchTerm) || strlen($searchTerm) < 3) {
                return $this->responseHandler->error('Search term must be at least 3 characters long', 400);
            }

            $searchTerm = '%' . $searchTerm . '%';

            $query = "SELECT 
                        b.id,
                        b.booking_reference,
                        b.check_in_date,
                        b.check_out_date,
                        b.total_amount,
                        b.paid_amount,
                        b.remaining_amount,
                        b.status,
                        b.booking_source,
                        g.first_name,
                        g.last_name,
                        g.email,
                        g.phone,
                        g.address,
                        r.room_number,
                        r.floor,
                        rt.name as room_type_name,
                        rt.description as room_description
                      FROM bookings b
                      JOIN guests g ON b.guest_id = g.id
                      JOIN rooms r ON b.room_id = r.id
                      JOIN room_types rt ON r.room_type_id = rt.id
                      WHERE (g.first_name LIKE :search 
                             OR g.last_name LIKE :search 
                             OR g.phone LIKE :search 
                             OR r.room_number LIKE :search
                             OR b.booking_reference LIKE :search)
                      AND (
                          -- Show checked-in guests (always visible)
                          b.status = 'checked_in' OR
                          -- Show confirmed guests only on or after their check-in date
                          (b.status = 'confirmed' AND b.check_in_date <= CURDATE()) OR
                          -- Show pending guests only on or after their check-in date
                          (b.status = 'pending' AND b.check_in_date <= CURDATE())
                      )
                      ORDER BY b.created_at DESC
                      LIMIT 50";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':search', $searchTerm);
            $stmt->execute();

            $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format dates and calculate remaining amounts
            foreach ($guests as &$guest) {
                $guest['check_in_date'] = date('M d, Y', strtotime($guest['check_in_date']));
                $guest['check_out_date'] = date('M d, Y', strtotime($guest['check_out_date']));
                
                // Ensure remaining amount is calculated correctly
                if ($guest['remaining_amount'] === null) {
                    $guest['remaining_amount'] = max(0, $guest['total_amount'] - ($guest['paid_amount'] ?? 0));
                }
                
                // Format amounts
                $guest['total_amount'] = number_format($guest['total_amount'], 2);
                $guest['paid_amount'] = number_format($guest['paid_amount'] ?? 0, 2);
                $guest['remaining_amount'] = number_format($guest['remaining_amount'], 2);
            }

            return $this->responseHandler->success([
                'guests' => $guests,
                'total_count' => count($guests),
                'search_term' => trim($searchTerm, '%')
            ]);

        } catch (Exception $e) {
            error_log("Guest search error: " . $e->getMessage());
            return $this->responseHandler->error("Internal server error", 500);
        }
    }

    public function getGuestDetails($guestId) {
        try {
            $query = "SELECT 
                        b.*,
                        g.first_name,
                        g.last_name,
                        g.email,
                        g.phone,
                        g.address,
                        g.id_proof_type,
                        g.id_proof_number,
                        r.room_number,
                        r.floor,
                        rt.name as room_type_name,
                        rt.description as room_description,
                        rt.amenities
                      FROM bookings b
                      JOIN guests g ON b.guest_id = g.id
                      JOIN rooms r ON b.room_id = r.id
                      JOIN room_types rt ON r.room_type_id = rt.id
                      WHERE b.id = :guest_id";

            $stmt = $this->db->prepare($query);
            $stmt->bindParam(':guest_id', $guestId);
            $stmt->execute();

            $guest = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$guest) {
                return $this->responseHandler->error("Guest not found", 404);
            }

            // Format dates
            $guest['check_in_date'] = date('M d, Y', strtotime($guest['check_in_date']));
            $guest['check_out_date'] = date('M d, Y', strtotime($guest['check_out_date']));
            
            // Calculate remaining amount
            if ($guest['remaining_amount'] === null) {
                $guest['remaining_amount'] = max(0, $guest['total_amount'] - ($guest['paid_amount'] ?? 0));
            }

            // Get payment history
            $paymentQuery = "SELECT 
                              amount,
                              payment_method,
                              payment_date,
                              notes
                            FROM walk_in_payments
                            WHERE booking_id = :booking_id
                            ORDER BY payment_date DESC";

            $paymentStmt = $this->db->prepare($paymentQuery);
            $paymentStmt->bindParam(':booking_id', $guestId);
            $paymentStmt->execute();

            $guest['payment_history'] = $paymentStmt->fetchAll(PDO::FETCH_ASSOC);

            return $this->responseHandler->success($guest);

        } catch (Exception $e) {
            error_log("Get guest details error: " . $e->getMessage());
            return $this->responseHandler->error("Internal server error", 500);
        }
    }

    public function getGuestsWithRemainingAmount() {
        try {
            $query = "SELECT 
                        b.id,
                        b.booking_reference,
                        b.check_in_date,
                        b.check_out_date,
                        b.total_amount,
                        b.paid_amount,
                        b.remaining_amount,
                        b.status,
                        g.first_name,
                        g.last_name,
                        g.phone,
                        r.room_number,
                        rt.name as room_type_name
                      FROM bookings b
                      JOIN guests g ON b.guest_id = g.id
                      JOIN rooms r ON b.room_id = r.id
                      JOIN room_types rt ON r.room_type_id = rt.id
                      WHERE b.remaining_amount > 0 
                        AND b.status IN ('confirmed', 'checked_in')
                      ORDER BY b.remaining_amount DESC";

            $stmt = $this->db->prepare($query);
            $stmt->execute();

            $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format dates and amounts
            foreach ($guests as &$guest) {
                $guest['check_in_date'] = date('M d, Y', strtotime($guest['check_in_date']));
                $guest['check_out_date'] = date('M d, Y', strtotime($guest['check_out_date']));
                $guest['total_amount'] = number_format($guest['total_amount'], 2);
                $guest['paid_amount'] = number_format($guest['paid_amount'] ?? 0, 2);
                $guest['remaining_amount'] = number_format($guest['remaining_amount'], 2);
            }

            return $this->responseHandler->success([
                'guests' => $guests,
                'total_outstanding' => array_sum(array_column($guests, 'remaining_amount'))
            ]);

        } catch (Exception $e) {
            error_log("Get guests with remaining amount error: " . $e->getMessage());
            return $this->responseHandler->error("Internal server error", 500);
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? 'search';
    $searchTerm = $_GET['search'] ?? '';
    $guestId = $_GET['guest_id'] ?? null;

    $database = new Database();
    $db = $database->getConnection();
    $guestSearch = new GuestSearch($db);

    switch ($action) {
        case 'search':
            if (empty($searchTerm)) {
                echo json_encode(['success' => false, 'message' => 'Search term is required']);
                exit;
            }
            echo json_encode($guestSearch->searchGuests($searchTerm));
            break;
            
        case 'details':
            if (empty($guestId)) {
                echo json_encode(['success' => false, 'message' => 'Guest ID is required']);
                exit;
            }
            echo json_encode($guestSearch->getGuestDetails($guestId));
            break;
            
        case 'remaining_amount':
            echo json_encode($guestSearch->getGuestsWithRemainingAmount());
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}
