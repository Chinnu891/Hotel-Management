<?php
// Include CORS headers
require_once __DIR__ . '/../utils/cors_headers.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../config/database.php';

class RoomGuestDetails {
    private $conn;
    
    public function __construct($database) {
        $this->conn = $database->getConnection();
    }
    
    public function getGuestDetailsForRoom($roomNumber) {
        try {
            // Get guest details for the specified room and date range
            $includePrebooked = isset($_GET['include_prebooked']) && $_GET['include_prebooked'] === 'true';
            
            // Get the selected dates from the request
            $selectedCheckInDate = $_GET['check_in_date'] ?? null;
            $selectedCheckOutDate = $_GET['check_out_date'] ?? null;
            
            if ($includePrebooked) {
                // For pre-booked rooms, get future bookings
                $query = "
                    SELECT
                        b.id as booking_id,
                        b.booking_reference,
                        b.room_number,
                        b.check_in_date,
                        b.check_out_date,
                        b.check_in_time,
                        b.check_in_ampm,
                        b.check_out_time,
                        b.check_out_ampm,
                        b.total_amount,
                        b.paid_amount,
                        b.remaining_amount,
                        b.payment_status,
                        b.status as booking_status,
                        b.created_at as booking_created_at,
                        b.adults,
                        b.children,
                        b.booking_source,
                        b.owner_reference,
                        b.owner_reference_notes,
                        b.owner_referenced,
                        b.plan_type,
                        b.payment_type,
                        b.notes,
                        b.special_requests,
                        b.advance_amount,
                        cb.company_name,
                        cb.gst_number,
                        cb.contact_person,
                        cb.contact_phone,
                        cb.contact_email,
                        cb.billing_address,
                        g.id as guest_id,
                        g.first_name,
                        g.last_name,
                        g.email,
                        g.phone,
                        g.address,
                        g.id_proof_type,
                        g.id_proof_number,
                        g.company_name as guest_company_name,
                        g.gst_number as guest_gst_number,
                        r.id as room_id,
                        r.status as room_status,
                        rt.name as room_type_name,
                        rt.base_price,
                        rt.capacity,
                        rt.amenities
                    FROM bookings b
                    JOIN guests g ON b.guest_id = g.id
                    LEFT JOIN rooms r ON b.room_number = r.room_number
                    LEFT JOIN room_types rt ON r.room_type_id = rt.id
                    LEFT JOIN corporate_bookings cb ON b.id = cb.booking_id
                    WHERE b.room_number = :room_number
                    AND b.status IN ('confirmed', 'checked_in')
                    AND b.check_in_date > CURDATE()
                    ORDER BY b.check_in_date ASC
                    LIMIT 1
                ";
            } else {
                // For current/past bookings, use the selected dates if provided
                if ($selectedCheckInDate && $selectedCheckOutDate) {
                    // Use selected dates to find guest for specific date range
                    $query = "
                        SELECT
                            b.id as booking_id,
                            b.booking_reference,
                            b.room_number,
                            b.check_in_date,
                            b.check_out_date,
                            b.check_in_time,
                            b.check_in_ampm,
                            b.check_out_time,
                            b.check_out_ampm,
                            b.total_amount,
                            b.paid_amount,
                            b.remaining_amount,
                            b.payment_status,
                            b.status as booking_status,
                            b.created_at as booking_created_at,
                            b.adults,
                            b.children,
                            b.booking_source,
                            b.owner_reference,
                            b.owner_reference_notes,
                            b.owner_referenced,
                            b.plan_type,
                            b.payment_type,
                            b.notes,
                            b.special_requests,
                            b.advance_amount,
                            cb.company_name,
                            cb.gst_number,
                            cb.contact_person,
                            cb.contact_phone,
                            cb.contact_email,
                            cb.billing_address,
                            g.id as guest_id,
                            g.first_name,
                            g.last_name,
                            g.email,
                            g.phone,
                            g.address,
                            g.id_proof_type,
                            g.id_proof_number,
                            g.company_name as guest_company_name,
                            g.gst_number as guest_gst_number,
                            r.id as room_id,
                            r.status as room_status,
                            rt.name as room_type_name,
                            rt.base_price,
                            rt.capacity,
                            rt.amenities
                        FROM bookings b
                        JOIN guests g ON b.guest_id = g.id
                        LEFT JOIN rooms r ON b.room_number = r.room_number
                        LEFT JOIN room_types rt ON r.room_type_id = rt.id
                        LEFT JOIN corporate_bookings cb ON b.id = cb.booking_id
                        WHERE b.room_number = :room_number
                        AND b.status IN ('confirmed', 'checked_in')
                        AND :selected_check_in_date BETWEEN b.check_in_date AND b.check_out_date
                        ORDER BY b.created_at DESC
                        LIMIT 1
                    ";
                } else {
                    // Fallback to current date logic (existing behavior)
                    $query = "
                        SELECT
                            b.id as booking_id,
                            b.booking_reference,
                            b.room_number,
                            b.check_in_date,
                            b.check_out_date,
                            b.check_in_time,
                            b.check_in_ampm,
                            b.check_out_time,
                            b.check_out_ampm,
                            b.total_amount,
                            b.paid_amount,
                            b.remaining_amount,
                            b.payment_status,
                            b.status as booking_status,
                            b.created_at as booking_created_at,
                            b.adults,
                            b.children,
                            b.booking_source,
                            b.owner_reference,
                            b.owner_reference_notes,
                            b.owner_referenced,
                            b.plan_type,
                            b.payment_type,
                            b.notes,
                            b.special_requests,
                            b.advance_amount,
                            cb.company_name,
                            cb.gst_number,
                            cb.contact_person,
                            cb.contact_phone,
                            cb.contact_email,
                            cb.billing_address,
                            g.id as guest_id,
                            g.first_name,
                            g.last_name,
                            g.email,
                            g.phone,
                            g.address,
                            g.id_proof_type,
                            g.id_proof_number,
                            g.company_name as guest_company_name,
                            g.gst_number as guest_gst_number,
                            r.id as room_id,
                            r.status as room_status,
                            rt.name as room_type_name,
                            rt.base_price,
                            rt.capacity,
                            rt.amenities
                        FROM bookings b
                        JOIN guests g ON b.guest_id = g.id
                        LEFT JOIN rooms r ON b.room_number = r.room_number
                        LEFT JOIN room_types rt ON r.room_type_id = rt.id
                        LEFT JOIN corporate_bookings cb ON b.id = cb.booking_id
                        WHERE b.room_number = :room_number
                        AND b.status IN ('confirmed', 'checked_in')
                        AND CURDATE() BETWEEN b.check_in_date AND b.check_out_date
                        ORDER BY b.created_at DESC
                        LIMIT 1
                    ";
                }
            }
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':room_number', $roomNumber);
            
            // Bind the selected date parameter if it's used in the query
            if ($selectedCheckInDate && $selectedCheckOutDate && strpos($query, ':selected_check_in_date') !== false) {
                $stmt->bindParam(':selected_check_in_date', $selectedCheckInDate);
            }
            
            $stmt->execute();
            
            $guestDetails = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$guestDetails) {
                if ($includePrebooked) {
                    $message = 'No pre-booking found for this room';
                } elseif ($selectedCheckInDate && $selectedCheckOutDate) {
                    $message = "No guest found for this room on the selected date: {$selectedCheckInDate}";
                } else {
                    $message = 'No current guest found for this room';
                }
                return [
                    'success' => false,
                    'message' => $message,
                    'room_number' => $roomNumber,
                    'debug_info' => [
                        'selected_check_in_date' => $selectedCheckInDate,
                        'selected_check_out_date' => $selectedCheckOutDate,
                        'include_prebooked' => $includePrebooked,
                        'current_date' => date('Y-m-d')
                    ]
                ];
            }
            
            // Calculate payment status
            $totalAmount = (float)$guestDetails['total_amount'];
            $paidAmount = (float)($guestDetails['paid_amount'] ?? 0);
            $remainingAmount = (float)($guestDetails['remaining_amount'] ?? 0);
            
            // Determine payment status
            if ($guestDetails['owner_reference']) {
                $paymentStatus = 'referred_by_owner';
                $paymentSummary = 'Referred by Owner of the Hotel';
                $remainingAmount = 0.00;
            } elseif ($paidAmount >= $totalAmount) {
                $paymentStatus = 'completed';
                $paymentSummary = 'Fully Paid';
                $remainingAmount = 0.00;
            } elseif ($paidAmount > 0) {
                $paymentStatus = 'partial';
                $paymentSummary = 'Partial Payment';
            } else {
                $paymentStatus = 'pending';
                $paymentSummary = 'Payment Pending';
            }
            
            // Add calculated fields
            $guestDetails['calculated_payment_status'] = $paymentStatus;
            $guestDetails['calculated_remaining_amount'] = $remainingAmount;
            $guestDetails['payment_summary'] = $paymentSummary;
            $guestDetails['is_fully_paid'] = ($paidAmount >= $totalAmount);
            
            // Format dates
            $guestDetails['check_in_date_formatted'] = date('M d, Y', strtotime($guestDetails['check_in_date']));
            $guestDetails['check_out_date_formatted'] = date('M d, Y', strtotime($guestDetails['check_out_date']));
            $guestDetails['booking_created_formatted'] = date('M d, Y H:i', strtotime($guestDetails['booking_created_at']));
            
            return [
                'success' => true,
                'data' => $guestDetails
            ];
            
        } catch (Exception $e) {
            error_log("Error getting guest details for room: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error retrieving guest details',
                'error' => $e->getMessage()
            ];
        }
    }
}

// Handle the request
try {
    $database = new Database();
    $api = new RoomGuestDetails($database);
    
    $roomNumber = $_GET['room_number'] ?? null;
    
    if (!$roomNumber) {
        echo json_encode([
            'success' => false,
            'message' => 'Room number is required'
        ]);
        exit;
    }
    
    $result = $api->getGuestDetailsForRoom($roomNumber);
    echo json_encode($result);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Server error',
        'error' => $e->getMessage()
    ]);
}
?>
