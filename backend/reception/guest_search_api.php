<?php
// Guest Search and Management API
require_once '../utils/cors_headers.php';

try {
    require_once '../config/database.php';
    $database = new Database();
    $conn = $database->getConnection();
    
    if (!$conn) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit();
    }
    
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? '';
    
    // If no action is specified, provide a helpful response
    if (empty($action)) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false, 
            'message' => 'No action specified. Available actions: stats, search, guest_history, get_admin_updates, checkin, checkout, pay_due_amount',
            'available_actions' => ['stats', 'search', 'guest_history', 'get_admin_updates', 'checkin', 'checkout', 'pay_due_amount']
        ]);
        exit();
    }
    
    /**
     * Calculate correct payment status based on actual amounts
     */
    function calculatePaymentStatus($guest, $conn) {
        $total_amount = (float)$guest['total_amount'];
        $paid_amount = (float)($guest['paid_amount'] ?? 0);
        $remaining_amount = (float)($guest['remaining_amount'] ?? 0);
        $payment_status = $guest['payment_status'] ?? 'pending';
        $payment_summary = '';
        
        // Check if this is an owner reference booking
        if (isset($guest['owner_reference']) && $guest['owner_reference']) {
            $payment_status = 'referred_by_owner';
            $payment_summary = 'Referred by Owner of the Hotel';
            $remaining_amount = 0.00;
        } else {
            // For corporate and regular bookings, calculate based on actual amounts
            if ($paid_amount >= $total_amount) {
                $payment_status = 'completed';
                $payment_summary = 'Fully Paid';
                $remaining_amount = 0.00;
            } elseif ($paid_amount > 0) {
                $payment_status = 'partial';
                $payment_summary = 'Partial Payment';
                $remaining_amount = $total_amount - $paid_amount; // Calculate remaining amount
            } else {
                $payment_status = 'pending';
                $payment_summary = 'Payment Pending';
                $remaining_amount = $total_amount; // Full amount is remaining
            }
        }
        
        // Update the guest data with correct values
        $guest['calculated_payment_status'] = $payment_status;
        $guest['calculated_remaining_amount'] = $remaining_amount;
        $guest['payment_summary'] = $payment_summary;
        $guest['is_fully_paid'] = ($paid_amount >= $total_amount);
        $guest['paid_amount'] = $paid_amount;
        $guest['remaining_amount'] = $remaining_amount;
        $guest['payment_status'] = $payment_status;
        
        return $guest;
    }
    
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'stats':
                    // Get guest statistics
                    $sql = "SELECT 
                                COUNT(*) as total_guests,
                                COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                                COUNT(CASE WHEN b.status = 'checked_in' THEN 1 END) as checked_in_guests,
                                COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                                COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings
                            FROM bookings b
                            WHERE b.status != 'checked_out'";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    $result = [
                        'success' => true,
                        'data' => $stats
                    ];
                    break;
                    
                case 'guest_history_stats':
                    $sql = "SELECT 
                                COUNT(*) as total_guests,
                                COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                                COUNT(CASE WHEN b.status = 'checked_in' THEN 1 END) as checked_in_guests,
                                COUNT(CASE WHEN b.status = 'checked_out' THEN 1 END) as checked_out_guests,
                                COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                                COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
                                COUNT(CASE WHEN b.booking_source = 'corporate' THEN 1 END) as corporate_bookings,
                                COUNT(CASE WHEN b.booking_source != 'corporate' THEN 1 END) as regular_bookings
                            FROM bookings b";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $stats = $stmt->fetch(PDO::FETCH_ASSOC);
                    
                    $result = [
                        'success' => true,
                        'data' => $stats
                    ];
                    break;
                    
                case 'search':
                    $searchType = $_GET['type'] ?? 'all';
                    $searchTerm = $_GET['term'] ?? '';
                    $statusFilter = $_GET['status'] ?? 'all';
                    $corporateFilter = $_GET['corporate'] ?? 'all'; // New corporate filter
                    $includeCheckedOut = $_GET['include_checked_out'] ?? 'false'; // New parameter to include checked-out guests
                    $includeFutureBookings = $_GET['include_future_bookings'] ?? 'false'; // New parameter to include future bookings
                    
                    $sql = "SELECT 
                                b.id as booking_id,
                                b.booking_reference,
                                b.room_number,
                                b.check_in_date,
                                b.check_out_date,
                                b.check_in_time,
                                b.check_in_ampm,
                                b.check_out_time,
                                b.check_out_ampm,
                                b.actual_checkout_date,
                                b.actual_checkout_time,
                                b.total_amount,
                                b.paid_amount,
                                b.remaining_amount,
                                b.payment_status,
                                b.owner_reference,
                                b.status as booking_status,
                                b.created_at as booking_created_at,
                                b.adults,
                                b.children,
                                b.booking_source,
                                b.plan_type,
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
                                r.status as room_status,
                                rt.name as room_type_name,
                                rt.base_price as room_price
                            FROM bookings b
                            JOIN guests g ON b.guest_id = g.id
                            LEFT JOIN rooms r ON b.room_number = r.room_number
                            LEFT JOIN room_types rt ON r.room_type_id = rt.id
                            LEFT JOIN corporate_bookings cb ON b.id = cb.booking_id
                            WHERE 1=1";
                    
                    $params = [];
                    
                    // Apply search filters
                    if ($searchType !== 'all' && !empty($searchTerm)) {
                        switch ($searchType) {
                            case 'name':
                                $sql .= " AND (g.first_name LIKE ? OR g.last_name LIKE ?)";
                                $searchPattern = "%$searchTerm%";
                                $params[] = $searchPattern;
                                $params[] = $searchPattern;
                                break;
                            case 'email':
                                $sql .= " AND g.email LIKE ?";
                                $params[] = "%$searchTerm%";
                                break;
                            case 'phone':
                                $sql .= " AND g.phone LIKE ?";
                                $params[] = "%$searchTerm%";
                                break;
                            case 'room':
                                $sql .= " AND b.room_number LIKE ?";
                                $params[] = "%$searchTerm%";
                                break;
                            case 'booking_ref':
                                $sql .= " AND b.booking_reference LIKE ?";
                                $params[] = "%$searchTerm%";
                                break;
                            case 'company':
                                $sql .= " AND cb.company_name LIKE ?";
                                $params[] = "%$searchTerm%";
                                break;
                        }
                    }
                    
                    // Apply status filter
                    if ($statusFilter !== 'all') {
                        $sql .= " AND b.status = ?";
                        $params[] = $statusFilter;
                    }
                    
                    // Apply corporate filter
                    if ($corporateFilter === 'corporate') {
                        $sql .= " AND b.booking_source = 'corporate'";
                    } elseif ($corporateFilter === 'regular') {
                        $sql .= " AND b.booking_source != 'corporate'";
                    }
                    
                    // Conditionally include checked-out guests based on parameter
                    if ($includeCheckedOut !== 'true') {
                        $sql .= " AND b.status != 'checked_out'";
                    }
                    
                    // Guest Search: Show current guests and recent check-ins
                    // Include today's bookings, active (checked-in) bookings, and recent late entries
                    if ($includeFutureBookings !== 'true') {
                        $sql .= " AND (
                            b.check_in_date = CURDATE() OR 
                            b.status = 'checked_in' OR 
                            (b.status = 'confirmed' AND b.check_in_date <= CURDATE() AND b.check_out_date >= CURDATE()) OR
                            (b.status = 'pending' AND b.check_in_date <= CURDATE() AND b.check_out_date >= CURDATE())
                        )";
                    }
                    
                    $sql .= " ORDER BY b.created_at DESC";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute($params);
                    $guests = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Format the results
                    $formattedGuests = array_map(function($guest) use ($conn) {
                        // Use the comprehensive payment status calculation function
                        $formattedGuest = calculatePaymentStatus($guest, $conn);
                        
                        // Add full_name field for frontend compatibility
                        $formattedGuest['full_name'] = !empty($guest['last_name']) ? trim($guest['first_name'] . ' ' . $guest['last_name']) : $guest['first_name'];
                        
                        // Use actual checkout time for checked-out guests
                        if ($guest['booking_status'] === 'checked_out' && !empty($guest['actual_checkout_time'])) {
                            $formattedGuest['check_out_time'] = $guest['actual_checkout_time'];
                            $formattedGuest['check_out_date'] = $guest['actual_checkout_date'] ?? $guest['check_out_date'];
                            $formattedGuest['is_smart_checkout'] = true;
                        } else {
                            $formattedGuest['is_smart_checkout'] = false;
                        }
                        
                        // Add late entry indicator
                        $checkInDate = $guest['check_in_date'];
                        $createdAt = $guest['created_at'] ?? $guest['booking_created_at'] ?? '';
                        $currentDate = date('Y-m-d');
                        $status = $guest['status'] ?? $guest['booking_status'] ?? 'unknown';
                        
                        // Check if this is a late entry (check-in date is yesterday but created today)
                        $isLateEntry = false;
                        if ($checkInDate < $currentDate && $status === 'confirmed') {
                            $createdDate = date('Y-m-d', strtotime($createdAt));
                            $isLateEntry = ($createdDate === $currentDate);
                        }
                        
                        $formattedGuest['is_late_entry'] = $isLateEntry;
                        $formattedGuest['late_entry_note'] = $isLateEntry ? 'Late Entry' : '';
                        
                        return $formattedGuest;
                    }, $guests);
                    
                    $result = [
                        'success' => true,
                        'data' => $formattedGuests
                    ];
                    break;
                    
                case 'guest_history':
                    // Get guest history (includes checked-out guests but excludes future bookings by default)
                    $includeFutureBookings = $_GET['include_future_bookings'] ?? 'false';
                    
                    $sql = "SELECT 
                                b.id as booking_id,
                                b.booking_reference,
                                b.room_number,
                                b.check_in_date,
                                b.check_out_date,
                                b.check_in_time,
                                b.check_in_ampm,
                                b.check_out_time,
                                b.check_out_ampm,
                                b.actual_checkout_date,
                                b.actual_checkout_time,
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
                                b.plan_type,
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
                                r.status as room_status,
                                rt.name as room_type_name,
                                rt.base_price,
                                wip.payment_method,
                                wip.payment_type,
                                wip.transaction_id,
                                wip.receipt_number,
                                wip.notes as payment_notes
                            FROM bookings b
                            JOIN guests g ON b.guest_id = g.id
                            LEFT JOIN rooms r ON b.room_number = r.room_number
                            LEFT JOIN room_types rt ON r.room_type_id = rt.id
                            LEFT JOIN corporate_bookings cb ON b.id = cb.booking_id
                            LEFT JOIN walk_in_payments wip ON b.id = wip.booking_id";
                    
                    // Guest History: Show past bookings and completed stays
                    // Exclude current guests and recent late entries from history
                    if ($includeFutureBookings !== 'true') {
                        $sql .= " WHERE (
                            (b.check_in_date < CURDATE() AND b.status != 'checked_in' AND b.check_out_date < CURDATE()) OR 
                            b.status = 'checked_out' OR
                            (b.check_in_date < CURDATE() AND b.status = 'cancelled')
                        )";
                    }
                    
                    $sql .= " ORDER BY b.created_at DESC";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Format the results to include full_name and other computed fields
                    $formattedResult = array_map(function($guest) use ($conn) {
                        // Use the comprehensive payment status calculation function
                        $guest = calculatePaymentStatus($guest, $conn);
                        
                        // Add additional fields that are specific to guest history
                        $guest['full_name'] = !empty($guest['last_name']) ? trim($guest['first_name'] . ' ' . $guest['last_name']) : $guest['first_name'];
                        
                        // Always use original booking times for consistent display
                        $guest['is_smart_checkout'] = false;
                        
                        $guest['room_status'] = $guest['room_status'];
                        $guest['room_type_name'] = $guest['room_type_name'];
                        $guest['room_price'] = $guest['base_price'];
                        $guest['payment_method'] = $guest['payment_method'];
                        $guest['payment_type'] = $guest['payment_type'];
                        $guest['transaction_id'] = $guest['transaction_id'];
                        $guest['receipt_number'] = $guest['receipt_number'];
                        $guest['payment_notes'] = $guest['payment_notes'];
                        
                        return $guest;
                    }, $result);
                    
                    $result = [
                        'success' => true,
                        'data' => $formattedResult
                    ];
                    break;
                    
                case 'get_admin_updates':
                    // Get recent updates made by admin staff
                    $sql = "SELECT 
                                n.id,
                                n.type,
                                n.title,
                                n.message,
                                n.data,
                                n.created_at,
                                n.target_role
                            FROM notifications n
                            WHERE n.target_role = 'reception' 
                            AND n.created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                            ORDER BY n.created_at DESC
                            LIMIT 50";
                    
                    $stmt = $conn->prepare($sql);
                    $stmt->execute();
                    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    // Also get WebSocket notifications
                    $wsSql = "SELECT 
                                id,
                                channel,
                                data,
                                created_at
                            FROM websocket_notifications
                            WHERE channel = 'reception'
                            AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
                            ORDER BY created_at DESC
                            LIMIT 50";
                    
                    $wsStmt = $conn->prepare($wsSql);
                    $wsStmt->execute();
                    $wsNotifications = $wsStmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    $result = [
                        'success' => true,
                        'data' => [
                            'notifications' => $notifications,
                            'websocket_notifications' => $wsNotifications,
                            'last_updated' => date('Y-m-d H:i:s')
                        ]
                    ];
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        case 'POST':
            switch ($action) {
                case 'checkin':
                    // Temporarily remove authentication requirement for debugging
                    // TODO: Re-enable authentication once JWT issue is resolved
                    /*
                    // Require authentication for check-in
                    try {
                        $current_user = SimpleJWTHelper::requireAuth();
                    } catch (Exception $e) {
                        http_response_code(401);
                        header('Content-Type: application/json');
                        echo json_encode(['success' => false, 'message' => 'Unauthorized: ' . $e->getMessage()]);
                        exit();
                    }
                    */
                    
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    $bookingId = $input['booking_id'] ?? null;
                    $roomNumber = $input['room_number'] ?? null;
                    $checkInTime = $input['check_in_time'] ?? null;
                    $checkOutTime = $input['check_out_time'] ?? null;
                    $checkInAMPM = $input['check_in_ampm'] ?? 'AM';
                    $checkOutAMPM = $input['check_out_ampm'] ?? 'AM';
                    
                    error_log("Check-in request received: " . json_encode($input));
                    
                    if (!$bookingId || !$roomNumber) {
                        $result = ['success' => false, 'message' => 'Booking ID and room number are required'];
                        break;
                    }
                    
                    if (!$checkInTime || !$checkOutTime || !$checkInAMPM || !$checkOutAMPM) {
                        $result = ['success' => false, 'message' => 'Check-in time, check-out time, and AM/PM are required'];
                        break;
                    }
                    
                    // Validate time format (12-hour: HH:MM)
                    if (!preg_match('/^([01]?[0-9]|1[0-2]):[0-5][0-9]$/', $checkInTime) ||
                        !preg_match('/^([01]?[0-9]|1[0-2]):[0-5][0-9]$/', $checkOutTime)) {
                        $result = ['success' => false, 'message' => 'Invalid time format. Use HH:MM format (12-hour)'];
                        break;
                    }
                    
                    // Validate AM/PM values
                    if (!in_array($checkInAMPM, ['AM', 'PM']) || !in_array($checkOutAMPM, ['AM', 'PM'])) {
                        $result = ['success' => false, 'message' => 'Invalid AM/PM values'];
                        break;
                    }
                    
                    try {
                        $conn->beginTransaction();
                        
                        // Get booking details
                        $stmt = $conn->prepare("
                            SELECT b.*, g.first_name, g.last_name, g.email, g.phone
                            FROM bookings b
                            JOIN guests g ON b.guest_id = g.id
                            WHERE b.id = ? AND b.room_number = ?
                        ");
                        $stmt->execute([$bookingId, $roomNumber]);
                        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if (!$booking) {
                            throw new Exception('Booking not found');
                        }
                        
                        error_log("Booking found: " . json_encode($booking));
                        
                        // Check if already checked in
                        if ($booking['status'] === 'checked_in') {
                            throw new Exception('Guest is already checked in');
                        }
                        
                        // Allow re-checking in a guest who has checked out
                        // This is common in hotels where guests extend their stay
                        if ($booking['status'] === 'checked_out') {
                            error_log("Re-checking in guest who was checked out: Booking ID {$bookingId}");
                        }
                        
                        // Update booking status to checked_in and add time information
                        $stmt = $conn->prepare("
                            UPDATE bookings 
                            SET status = 'checked_in',
                                check_in_time = ?,
                                check_in_ampm = ?,
                                check_out_time = ?,
                                check_out_ampm = ?
                            WHERE id = ?
                        ");
                        $stmt->execute([$checkInTime, $checkInAMPM, $checkOutTime, $checkOutAMPM, $bookingId]);
                        
                        if ($stmt->rowCount() === 0) {
                            throw new Exception('Failed to update booking status');
                        }
                        
                        // Update room status to occupied
                        $stmt = $conn->prepare("
                            UPDATE rooms 
                            SET status = 'occupied'
                            WHERE room_number = ?
                        ");
                        $stmt->execute([$roomNumber]);
                        
                        // Check if room was updated or was already occupied
                        $roomRows = $stmt->rowCount();
                        if ($roomRows === 0) {
                            // Check if room is already occupied
                            $stmt = $conn->prepare("SELECT status FROM rooms WHERE room_number = ?");
                            $stmt->execute([$roomNumber]);
                            $currentRoomStatus = $stmt->fetchColumn();
                            
                            if ($currentRoomStatus !== 'occupied') {
                                throw new Exception('Failed to update room status');
                            } else {
                                error_log("Room {$roomNumber} was already occupied, no update needed");
                            }
                        }
                        
                        // Log the activity
                        $stmt = $conn->prepare("
                            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
                            VALUES (?, 'check_in', 'bookings', ?, ?, ?, NOW())
                        ");
                        
                        // Get a valid user ID from the database
                        $stmt_user = $conn->prepare("SELECT id FROM users WHERE role IN ('admin', 'reception') LIMIT 1");
                        $stmt_user->execute();
                        $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
                        $user_id = $user ? $user['id'] : 1; // Fallback to 1 if no user found
                        
                        $stmt->execute([
                            $user_id,
                            $bookingId,
                            "Guest {$booking['first_name']} {$booking['last_name']} checked into room {$roomNumber} at {$checkInTime} {$checkInAMPM} (Check-out time: {$checkOutTime} {$checkOutAMPM})",
                            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                        ]);
                        
                        $conn->commit();
                        
                        error_log("Check-in successful for booking ID: {$bookingId}, room: {$roomNumber}");
                        
                        // Format time for display (already in 12-hour format)
                        $checkInTimeDisplay = $checkInTime . ' ' . $checkInAMPM;
                        $checkOutTimeDisplay = $checkOutTime . ' ' . $checkOutAMPM;
                        
                        $result = [
                            'success' => true,
                            'message' => "Guest {$booking['first_name']} {$booking['last_name']} successfully checked into room {$roomNumber} at {$checkInTimeDisplay}",
                            'data' => [
                                'booking_id' => $bookingId,
                                'room_number' => $roomNumber,
                                'status' => 'checked_in',
                                'guest_name' => "{$booking['first_name']} {$booking['last_name']}",
                                'check_in_time' => $checkInTime,
                                'check_in_ampm' => $checkInAMPM,
                                'check_out_time' => $checkOutTime,
                                'check_out_ampm' => $checkOutAMPM,
                                'check_in_time_display' => $checkInTimeDisplay,
                                'check_out_time_display' => $checkOutTimeDisplay
                            ]
                        ];
                        
                    } catch (Exception $e) {
                        $conn->rollBack();
                        error_log("Check-in failed: " . $e->getMessage());
                        $result = [
                            'success' => false,
                            'message' => 'Check-in failed: ' . $e->getMessage()
                        ];
                    }
                    break;
                    
                case 'pay_due_amount':
                    $input = json_decode(file_get_contents('php://input'), true);

                    $bookingId = $input['booking_id'] ?? null;
                    $amount = $input['amount'] ?? null;
                    $paymentMethod = $input['payment_method'] ?? 'cash';
                    $notes = $input['notes'] ?? '';
                    $adjustedRemaining = $input['adjusted_remaining'] ?? null;
                    
                    // Razorpay payment verification data
                    $razorpayPaymentId = $input['razorpay_payment_id'] ?? null;
                    $razorpayOrderId = $input['razorpay_order_id'] ?? null;
                    $razorpaySignature = $input['razorpay_signature'] ?? null;
                    
                    if (!$bookingId || !$amount || $amount <= 0) {
                        $result = ['success' => false, 'message' => 'Booking ID and valid amount are required'];
                        break;
                    }
                    
                    try {
                        $conn->beginTransaction();
                        
                        // Get booking details
                        $stmt = $conn->prepare("
                            SELECT b.*, g.first_name, g.last_name
                            FROM bookings b
                            JOIN guests g ON b.guest_id = g.id
                            WHERE b.id = ?
                        ");
                        $stmt->execute([$bookingId]);
                        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if (!$booking) {
                            throw new Exception('Booking not found');
                        }
                        
                        // Check if amount exceeds remaining amount
                        if ($amount > $booking['remaining_amount']) {
                            throw new Exception('Payment amount cannot exceed remaining amount');
                        }
                        
                        // Verify Razorpay payment if payment method is Razorpay
                        if ($paymentMethod === 'razorpay') {
                            if (!$razorpayPaymentId || !$razorpayOrderId || !$razorpaySignature) {
                                throw new Exception('Razorpay payment verification data is missing');
                            }
                            
                            // Include Razorpay verification
                            require_once '../config/razorpay.php';
                            
                            // Verify payment signature
                            $expectedSignature = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, RAZORPAY_KEY_SECRET);
                            if (!hash_equals($expectedSignature, $razorpaySignature)) {
                                throw new Exception('Razorpay payment signature verification failed');
                            }
                            
                            // Additional verification can be done here by calling Razorpay API
                            // For now, we'll trust the signature verification
                        }
                        
                        // Get a valid user ID for processed_by
                        $stmt_user = $conn->prepare("SELECT id FROM users WHERE role IN ('admin', 'reception') LIMIT 1");
                        $stmt_user->execute();
                        $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
                        $processed_by = $user ? $user['id'] : 1;
                        
                        // Insert payment record
                        $stmt = $conn->prepare("
                            INSERT INTO walk_in_payments (
                                booking_id, amount, payment_method, payment_status,
                                receipt_number, notes, processed_by, payment_type
                            ) VALUES (?, ?, ?, 'completed', ?, ?, ?, 'partial')
                        ");
                        
                        // Generate receipt number based on payment method
                        if ($paymentMethod === 'razorpay') {
                            $receiptNumber = 'RZP' . date('Ymd') . str_pad($bookingId, 6, '0', STR_PAD_LEFT) . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
                        } else {
                            $receiptNumber = 'RCP' . date('Ymd') . str_pad($bookingId, 6, '0', STR_PAD_LEFT) . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
                        }
                        
                        // Add Razorpay reference to notes if it's a Razorpay payment
                        $paymentNotes = $notes ?: "Due amount payment";
                        if ($paymentMethod === 'razorpay' && $razorpayPaymentId) {
                            $paymentNotes .= " (Razorpay: {$razorpayPaymentId})";
                        }
                        
                        $stmt->execute([
                            $bookingId,
                            $amount,
                            $paymentMethod,
                            $receiptNumber,
                            $paymentNotes,
                            $processed_by
                        ]);
                        
                        // Validate and sync payment status for corporate bookings
                        if (isset($booking['booking_source']) && $booking['booking_source'] === 'corporate') {
                            try {
                                require_once '../utils/payment_sync_helper.php';
                                PaymentSyncHelper::validateCorporateBookingPaymentStatus($bookingId, $conn);
                            } catch (Exception $e) {
                                // Log the error but don't fail the payment
                                error_log("Payment sync error: " . $e->getMessage());
                            }
                        }
                        
                        // Update booking payment status
                        $newPaidAmount = $booking['paid_amount'] + $amount;
                        
                        // Use adjusted remaining amount if provided, otherwise calculate normally
                        if ($adjustedRemaining !== null && $adjustedRemaining >= 0) {
                            // Use the adjusted remaining amount as the new remaining amount
                            $newRemainingAmount = max(0, $adjustedRemaining - $amount);
                            error_log("Using adjusted remaining amount: {$adjustedRemaining}, new remaining: {$newRemainingAmount}");
                        } else {
                            // Calculate normally based on total amount
                            $newRemainingAmount = max(0, $booking['total_amount'] - $newPaidAmount);
                            error_log("Using normal calculation, new remaining: {$newRemainingAmount}");
                        }
                        
                        // Double-check the calculation
                        if (abs($newPaidAmount + $newRemainingAmount - $booking['total_amount']) > 0.01) {
                            throw new Exception('Payment calculation error. Please contact support.');
                        }
                        
                        // Determine new payment status
                        if ($newRemainingAmount == 0) {
                            $newPaymentStatus = 'completed';
                        } else {
                            $newPaymentStatus = 'partial';
                        }
                        
                        // Update the booking with new payment information
                        // Use robust approach with multiple fallback strategies
                        
                        $updateSuccess = false;
                        $updateError = '';
                        
                        // Strategy 1: Single UPDATE with both fields
                        try {
                            $stmt = $conn->prepare("
                                UPDATE bookings 
                                SET paid_amount = ?, payment_status = ?
                                WHERE id = ?
                            ");
                            $result = $stmt->execute([$newPaidAmount, $newPaymentStatus, $bookingId]);
                            
                            if ($result && $stmt->rowCount() > 0) {
                                $updateSuccess = true;
                                error_log("Payment update successful: Single UPDATE approach");
                            } else {
                                $updateError = "Single UPDATE failed (rows affected: {$stmt->rowCount()})";
                            }
                        } catch (Exception $e) {
                            $updateError = "Single UPDATE exception: " . $e->getMessage();
                        }
                        
                        // Strategy 2: Separate UPDATEs if single UPDATE fails
                        if (!$updateSuccess) {
                            try {
                                // Update paid_amount first
                                $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ? WHERE id = ?");
                                $result1 = $stmt->execute([$newPaidAmount, $bookingId]);
                                
                                if ($result1 && $stmt->rowCount() > 0) {
                                    // Update payment_status
                                    $stmt = $conn->prepare("UPDATE bookings SET payment_status = ? WHERE id = ?");
                                    $result2 = $stmt->execute([$newPaymentStatus, $bookingId]);
                                    
                                    if ($result2 && $stmt->rowCount() > 0) {
                                        $updateSuccess = true;
                                        error_log("Payment update successful: Separate UPDATEs approach");
                                    } else {
                                        $updateError = "payment_status UPDATE failed (rows affected: {$stmt->rowCount()})";
                                    }
                                } else {
                                    $updateError = "paid_amount UPDATE failed (rows affected: {$stmt->rowCount()})";
                                }
                            } catch (Exception $e) {
                                $updateError = "Separate UPDATEs exception: " . $e->getMessage();
                            }
                        }
                        
                        // Strategy 3: Direct SQL with hardcoded ID if parameter approach fails
                        if (!$updateSuccess) {
                            try {
                                $stmt = $conn->prepare("UPDATE bookings SET paid_amount = ?, payment_status = ? WHERE id = " . intval($bookingId));
                                $result = $stmt->execute([$newPaidAmount, $newPaymentStatus]);
                                
                                if ($result && $stmt->rowCount() > 0) {
                                    $updateSuccess = true;
                                    error_log("Payment update successful: Direct SQL approach");
                                } else {
                                    $updateError = "Direct SQL UPDATE failed (rows affected: {$stmt->rowCount()})";
                                }
                            } catch (Exception $e) {
                                $updateError = "Direct SQL UPDATE exception: " . $e->getMessage();
                            }
                        }
                        
                        if (!$updateSuccess) {
                            throw new Exception("Failed to update booking payment status: $updateError");
                        }
                        
                        // The remaining_amount will be calculated by the trigger automatically
                        
                        // Log the payment details for debugging
                        error_log("Payment processed successfully: Booking ID: {$bookingId}, Amount: {$amount}, New Paid: {$newPaidAmount}, New Remaining: {$newRemainingAmount}, Status: {$newPaymentStatus}");
                        
                        // Log the activity
                        $stmt = $conn->prepare("
                            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
                            VALUES (?, 'due_payment', 'bookings', ?, ?, ?, NOW())
                        ");
                        
                        // Get a valid user ID from the database
                        $stmt_user = $conn->prepare("SELECT id FROM users WHERE role IN ('admin', 'reception') LIMIT 1");
                        $stmt_user->execute();
                        $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
                        $user_id = $user ? $user['id'] : 1; // Fallback to 1 if no user found
                        
                        $stmt->execute([
                            $user_id,
                            $bookingId,
                            "Due amount payment of {$amount} received for booking {$booking['booking_reference']}",
                            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                        ]);
                        
                        $conn->commit();
                        
                        $result = [
                            'success' => true,
                            'message' => "Due amount payment of " . number_format($amount, 2) . " received successfully via " . ucfirst($paymentMethod),
                            'data' => [
                                'booking_id' => $bookingId,
                                'amount_paid' => $amount,
                                'new_paid_amount' => $newPaidAmount,
                                'new_remaining_amount' => $newRemainingAmount,
                                'payment_status' => $newPaymentStatus,
                                'receipt_number' => $receiptNumber,
                                'payment_method' => $paymentMethod
                            ]
                        ];
                        
                    } catch (Exception $e) {
                        $conn->rollBack();
                        error_log("Due amount payment failed: " . $e->getMessage());
                        $result = [
                            'success' => false,
                            'message' => 'Payment failed: ' . $e->getMessage()
                        ];
                    }
                    break;
                    
                case 'checkout':
                    $input = json_decode(file_get_contents('php://input'), true);
                    
                    $bookingId = $input['booking_id'] ?? null;
                    $roomNumber = $input['room_number'] ?? null;
                    
                    error_log("Check-out request received: " . json_encode($input));
                    
                    if (!$bookingId || !$roomNumber) {
                        $result = ['success' => false, 'message' => 'Booking ID and room number are required'];
                        break;
                    }
                    
                    try {
                        $conn->beginTransaction();
                        
                        // Get booking details
                        $stmt = $conn->prepare("
                            SELECT b.*, g.first_name, g.last_name, g.email, g.phone
                            FROM bookings b
                            JOIN guests g ON b.guest_id = g.id
                            WHERE b.id = ? AND b.room_number = ?
                        ");
                        $stmt->execute([$bookingId, $roomNumber]);
                        $booking = $stmt->fetch(PDO::FETCH_ASSOC);
                        
                        if (!$booking) {
                            throw new Exception('Booking not found');
                        }
                        
                        error_log("Booking found: " . json_encode($booking));
                        
                        // Check if already checked out
                        if ($booking['status'] === 'checked_out') {
                            throw new Exception('Guest is already checked out');
                        }
                        
                        // Check if not checked in
                        if ($booking['status'] !== 'checked_in') {
                            throw new Exception('Guest must be checked in before checking out');
                        }
                        
                        // Calculate smart checkout time
                        $currentDateTime = new DateTime();
                        $currentTime = $currentDateTime->format('H:i:s');
                        $currentDate = $currentDateTime->format('Y-m-d');
                        
                        // Get scheduled checkout date and time
                        $scheduledCheckoutDate = $booking['check_out_date'];
                        $scheduledCheckoutTime = $booking['check_out_time'] ?? '11:00:00'; // Default to 11:00 AM if not set
                        
                        // Create DateTime objects for comparison
                        $scheduledCheckoutDateTime = new DateTime($scheduledCheckoutDate . ' ' . $scheduledCheckoutTime);
                        
                        // Debug logging
                        error_log("Smart checkout debug:");
                        error_log("Current DateTime: " . $currentDateTime->format('Y-m-d H:i:s'));
                        error_log("Scheduled DateTime: " . $scheduledCheckoutDateTime->format('Y-m-d H:i:s'));
                        error_log("Is current > scheduled? " . ($currentDateTime > $scheduledCheckoutDateTime ? 'YES' : 'NO'));
                        
                        // Always use the original booking times to preserve user-entered times
                        $actualCheckoutTime = $scheduledCheckoutTime;
                        $actualCheckoutDate = $scheduledCheckoutDate;
                        error_log("Using original booking time: " . $actualCheckoutTime);
                        
                        // Update booking status to checked_out with original booking times
                        $stmt = $conn->prepare("
                            UPDATE bookings 
                            SET status = 'checked_out',
                                check_out_date = ?,
                                check_out_time = ?,
                                actual_checkout_date = ?,
                                actual_checkout_time = ?
                            WHERE id = ?
                        ");
                        $stmt->execute([$actualCheckoutDate, $actualCheckoutTime, $actualCheckoutDate, $actualCheckoutTime, $bookingId]);
                        
                        if ($stmt->rowCount() === 0) {
                            throw new Exception('Failed to update booking status');
                        }
                        
                        // Update room status to available
                        $stmt = $conn->prepare("
                            UPDATE rooms 
                            SET status = 'available'
                            WHERE room_number = ?
                        ");
                        $stmt->execute([$roomNumber]);
                        
                        // Check if room was updated or was already available
                        $roomRows = $stmt->rowCount();
                        if ($roomRows === 0) {
                            // Check if room is already available
                            $stmt = $conn->prepare("SELECT status FROM rooms WHERE room_number = ?");
                            $stmt->execute([$roomNumber]);
                            $currentRoomStatus = $stmt->fetchColumn();
                            
                            if ($currentRoomStatus !== 'available') {
                                throw new Exception('Failed to update room status');
                            } else {
                                error_log("Room {$roomNumber} was already available, no update needed");
                            }
                        }
                        
                        // Log the activity
                        $stmt = $conn->prepare("
                            INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address, created_at)
                            VALUES (?, 'check_out', 'bookings', ?, ?, ?, NOW())
                        ");
                        
                        // Get a valid user ID from the database
                        $stmt_user = $conn->prepare("SELECT id FROM users WHERE role IN ('admin', 'reception') LIMIT 1");
                        $stmt_user->execute();
                        $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
                        $user_id = $user ? $user['id'] : 1; // Fallback to 1 if no user found
                        
                        $stmt->execute([
                            $user_id,
                            $bookingId,
                            "Guest {$booking['first_name']} {$booking['last_name']} checked out from room {$roomNumber}",
                            $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                        ]);
                        
                        $conn->commit();
                        
                        error_log("Check-out successful for booking ID: {$bookingId}, room: {$roomNumber}");
                        
                        // Format times for display
                        $actualCheckoutTimeFormatted = date('g:i A', strtotime($actualCheckoutTime));
                        $scheduledCheckoutTimeFormatted = date('g:i A', strtotime($scheduledCheckoutTime));
                        
                        $result = [
                            'success' => true,
                            'message' => "Guest {$booking['first_name']} {$booking['last_name']} successfully checked out from room {$roomNumber} at {$actualCheckoutTimeFormatted}",
                            'data' => [
                                'booking_id' => $bookingId,
                                'room_number' => $roomNumber,
                                'status' => 'checked_out',
                                'guest_name' => "{$booking['first_name']} {$booking['last_name']}",
                                'scheduled_checkout_time' => $scheduledCheckoutTimeFormatted,
                                'actual_checkout_time' => $actualCheckoutTimeFormatted,
                                'scheduled_checkout_date' => $scheduledCheckoutDate,
                                'actual_checkout_date' => $actualCheckoutDate,
                                'checkout_type' => $currentDateTime > $scheduledCheckoutDateTime ? 'late_checkout' : 'early_checkout'
                            ]
                        ];
                        
                    } catch (Exception $e) {
                        $conn->rollBack();
                        error_log("Check-out failed: " . $e->getMessage());
                        $result = [
                            'success' => false,
                            'message' => 'Check-out failed: ' . $e->getMessage()
                        ];
                    }
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Method not allowed'];
    }
    
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    $result = ['success' => false, 'message' => 'Server error: ' . $e->getMessage()];
}

// Helper function to convert 12-hour time to 24-hour format
function convert12To24Hour($time, $ampm) {
    if (!$time || !$ampm) return null;
    
    $parts = explode(':', $time);
    $hour = (int)$parts[0];
    $minute = isset($parts[1]) ? (int)$parts[1] : 0;
    
    if ($ampm === 'PM' && $hour !== 12) {
        $hour += 12;
    } elseif ($ampm === 'PM' && $hour === 12) {
        $hour = 12;
    } elseif ($ampm === 'AM' && $hour === 12) {
        $hour = 0;
    }
    
    return sprintf('%02d:%02d:00', $hour, $minute);
}

header('Content-Type: application/json');
echo json_encode($result);
?>
