<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response.php';
require_once '../utils/simple_jwt_helper.php';

$response = new Response();

try {
    // Verify JWT token
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : null;
    
    if (!$token) {
        echo json_encode($response->unauthorized('Authorization token required'));
        exit;
    }
    
    $decoded = SimpleJWTHelper::validateToken($token);
    
    if (!$decoded || $decoded['role'] !== 'admin') {
        echo json_encode($response->forbidden('Access denied. Admin role required.'));
        exit;
    }
    
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo json_encode($response->error('Method not allowed', 405));
        exit;
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    
    $database = new Database();
    $db = $database->getConnection();
    
    switch ($action) {
        case 'update_section':
            handleUpdateSection($db, $input, $response);
            break;
            
        case 'update_guest_info':
            handleUpdateGuestInfo($db, $input, $response);
            break;
            
        case 'update_booking_info':
            handleUpdateBookingInfo($db, $input, $response);
            break;
            
        case 'export_guest_history':
            handleExportGuestHistory($db, $input, $response);
            break;
            
        default:
            echo json_encode($response->error('Invalid action specified'));
            break;
    }
    
} catch (Exception $e) {
    error_log("Guest history API error: " . $e->getMessage());
    echo json_encode($response->error('Failed to process request: ' . $e->getMessage()));
}

function handleUpdateSection($db, $input, $response) {
    try {
        $guest_id = $input['guest_id'] ?? null;
        $booking_id = $input['booking_id'] ?? null;
        $section = $input['section'] ?? '';
        $data = $input['data'] ?? [];
        
        if (!$guest_id || !$booking_id || !$section || empty($data)) {
            echo json_encode($response->error('Missing required parameters'));
            return;
        }
        
        $db->beginTransaction();
        
        switch ($section) {
            case 'contact':
                updateContactInfo($db, $guest_id, $data);
                break;
                
            case 'room':
                updateRoomInfo($db, $booking_id, $data);
                break;
                
            case 'stay':
                updateStayInfo($db, $booking_id, $data);
                break;
                
            case 'financial':
                updateFinancialInfo($db, $booking_id, $data);
                break;
                
            default:
                throw new Exception('Invalid section specified');
        }
        
        // Log the activity
        logActivity($db, $guest_id, $booking_id, "updated_{$section}_info", json_encode($data));
        
        $db->commit();
        
        echo json_encode($response->success(null, ucfirst($section) . ' information updated successfully'));
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Update section error: " . $e->getMessage());
        echo json_encode($response->error('Failed to update information: ' . $e->getMessage()));
    }
}

function updateContactInfo($db, $guest_id, $data) {
    $stmt = $db->prepare("
        UPDATE guests 
        SET first_name = ?, last_name = ?, phone = ?, email = ?, address = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    $stmt->execute([
        $data['first_name'] ?? '',
        $data['last_name'] ?? '',
        $data['phone'] ?? '',
        $data['email'] ?? '',
        $data['address'] ?? '',
        $guest_id
    ]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Guest not found or no changes made');
    }
}

function updateRoomInfo($db, $booking_id, $data) {
    // First update the room assignment in the booking
    if (isset($data['room_number']) && !empty($data['room_number'])) {
        $new_room_number = $data['room_number'];
        
        // Get current booking details to check dates
        $stmt = $db->prepare("
            SELECT check_in_date, check_out_date, room_number 
            FROM bookings 
            WHERE id = ?
        ");
        $stmt->execute([$booking_id]);
        $current_booking = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$current_booking) {
            throw new Exception('Current booking not found');
        }
        
        // Check if room is available for the selected dates
        $stmt = $db->prepare("
            SELECT b.id, b.booking_reference, g.first_name, g.last_name, 
                   b.check_in_date, b.check_out_date, b.status
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            WHERE b.room_number = ? 
            AND b.id != ? 
            AND b.status IN ('confirmed', 'checked_in', 'prebooked')
            AND (
                (b.check_in_date <= ? AND b.check_out_date > ?) OR
                (b.check_in_date < ? AND b.check_out_date >= ?) OR
                (b.check_in_date >= ? AND b.check_out_date <= ?)
            )
        ");
        
        $stmt->execute([
            $new_room_number,
            $booking_id,
            $current_booking['check_in_date'],
            $current_booking['check_in_date'],
            $current_booking['check_out_date'],
            $current_booking['check_out_date'],
            $current_booking['check_in_date'],
            $current_booking['check_out_date']
        ]);
        
        $conflicting_bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($conflicting_bookings)) {
            // Build detailed conflict message
            $conflict_details = [];
            foreach ($conflicting_bookings as $conflict) {
                $conflict_details[] = sprintf(
                    "Booking #%s (%s %s): %s to %s (Status: %s)",
                    $conflict['booking_reference'],
                    $conflict['first_name'],
                    $conflict['last_name'],
                    $conflict['check_in_date'],
                    $conflict['check_out_date'],
                    $conflict['status']
                );
            }
            
            $conflict_message = "Room $new_room_number is not available for the selected dates due to existing bookings:\n" . 
                               implode("\n", $conflict_details);
            
            throw new Exception($conflict_message);
        }
        
        // Room is available, proceed with update
        $stmt = $db->prepare("
            UPDATE bookings 
            SET room_number = ?, updated_at = NOW()
            WHERE id = ?
        ");
        
        $stmt->execute([$new_room_number, $booking_id]);
        
        if ($stmt->rowCount() === 0) {
            throw new Exception('Booking not found or no changes made');
        }
    }
    
    // Update room type if provided
    if (isset($data['room_type_name']) && !empty($data['room_type_name'])) {
        // This would require updating the room_types table or adding a room_type_name field to bookings
        // For now, we'll just log that this field was requested
        error_log("Room type update requested for booking $booking_id: " . $data['room_type_name']);
    }
}

function updateStayInfo($db, $booking_id, $data) {
    $stmt = $db->prepare("
        UPDATE bookings 
        SET check_in_date = ?, check_out_date = ?, adults = ?, children = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    $stmt->execute([
        $data['check_in_date'] ?? null,
        $data['check_out_date'] ?? null,
        $data['adults'] ?? 1,
        $data['children'] ?? 0,
        $booking_id
    ]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Booking not found or no changes made');
    }
}

function updateFinancialInfo($db, $booking_id, $data) {
    $stmt = $db->prepare("
        UPDATE bookings 
        SET total_amount = ?, paid_amount = ?, remaining_amount = ?, payment_type = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    $stmt->execute([
        $data['total_amount'] ?? 0,
        $data['paid_amount'] ?? 0,
        $data['remaining_amount'] ?? 0,
        $data['payment_type'] ?? '',
        $booking_id
    ]);
    
    if ($stmt->rowCount() === 0) {
        throw new Exception('Booking not found or no changes made');
    }
    
    // Update payment status based on amounts
    $payment_status = 'pending';
    if (($data['paid_amount'] ?? 0) > 0) {
        if (($data['remaining_amount'] ?? 0) <= 0) {
            $payment_status = 'completed';
        } else {
            $payment_status = 'partial';
        }
    }
    
    $stmt = $db->prepare("
        UPDATE bookings 
        SET payment_status = ?, updated_at = NOW()
        WHERE id = ?
    ");
    
    $stmt->execute([$payment_status, $booking_id]);
}

function handleUpdateGuestInfo($db, $input, $response) {
    try {
        $guest_id = $input['guest_id'] ?? null;
        $data = $input['data'] ?? [];
        
        if (!$guest_id || empty($data)) {
            echo json_encode($response->error('Missing required parameters'));
            return;
        }
        
        $db->beginTransaction();
        
        updateContactInfo($db, $guest_id, $data);
        
        // Log the activity
        logActivity($db, $guest_id, null, 'updated_guest_info', json_encode($data));
        
        $db->commit();
        
        echo json_encode($response->success(null, 'Guest information updated successfully'));
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Update guest info error: " . $e->getMessage());
        echo json_encode($response->error('Failed to update guest information: ' . $e->getMessage()));
    }
}

function handleUpdateBookingInfo($db, $input, $response) {
    try {
        $booking_id = $input['booking_id'] ?? null;
        $data = $input['data'] ?? [];
        
        if (!$booking_id || empty($data)) {
            echo json_encode($response->error('Missing required parameters'));
            return;
        }
        
        $db->beginTransaction();
        
        // Update booking fields
        $updateFields = [];
        $updateValues = [];
        
        $allowedFields = [
            'check_in_date', 'check_out_date', 'adults', 'children',
            'total_amount', 'paid_amount', 'remaining_amount', 'payment_method',
            'room_number', 'notes', 'status'
        ];
        
        foreach ($data as $field => $value) {
            if (in_array($field, $allowedFields)) {
                $updateFields[] = "$field = ?";
                $updateValues[] = $value;
            }
        }
        
        if (!empty($updateFields)) {
            $updateValues[] = $booking_id;
            
            $sql = "UPDATE bookings SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($updateValues);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('Booking not found or no changes made');
            }
        }
        
        // Log the activity
        logActivity($db, null, $booking_id, 'updated_booking_info', json_encode($data));
        
        $db->commit();
        
        echo json_encode($response->success(null, 'Booking information updated successfully'));
        
    } catch (Exception $e) {
        $db->rollBack();
        error_log("Update booking info error: " . $e->getMessage());
        echo json_encode($response->error('Failed to update booking information: ' . $e->getMessage()));
    }
}

function handleExportGuestHistory($db, $input, $response) {
    try {
        $format = $input['format'] ?? 'csv';
        $date_from = $input['date_from'] ?? '';
        $date_to = $input['date_to'] ?? '';
        
        $whereClause = "WHERE 1=1";
        $params = [];
        
        if ($date_from) {
            $whereClause .= " AND b.check_in_date >= ?";
            $params[] = $date_from;
        }
        
        if ($date_to) {
            $whereClause .= " AND b.check_in_date <= ?";
            $params[] = $date_to;
        }
        
        $sql = "
            SELECT 
                g.id as guest_id,
                g.first_name,
                g.last_name,
                g.phone,
                g.email,
                g.address,
                b.id as booking_id,
                b.booking_reference,
                b.check_in_date,
                b.check_out_date,
                b.adults,
                b.children,
                b.total_amount,
                b.paid_amount,
                b.remaining_amount,
                b.payment_type,
                b.status as booking_status,
                b.booking_source,
                r.room_number,
                rt.name as room_type_name,
                b.created_at as booking_created_at
            FROM guests g
            JOIN bookings b ON g.id = b.guest_id
            LEFT JOIN rooms r ON b.room_number = r.room_number
            LEFT JOIN room_types rt ON r.room_type_id = rt.id
            $whereClause
            ORDER BY b.created_at DESC
        ";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if ($format === 'csv') {
            header('Content-Type: text/csv');
            header('Content-Disposition: attachment; filename="guest_history_' . date('Y-m-d') . '.csv"');
            
            $output = fopen('php://output', 'w');
            
            // CSV headers
            if (!empty($results)) {
                fputcsv($output, array_keys($results[0]));
                
                // CSV data
                foreach ($results as $row) {
                    fputcsv($output, $row);
                }
            }
            
            fclose($output);
        } else {
            echo json_encode($response->success(['export_data' => $results], 'Guest history exported successfully'));
        }
        
    } catch (Exception $e) {
        error_log("Export guest history error: " . $e->getMessage());
        echo json_encode($response->error('Failed to export guest history: ' . $e->getMessage()));
    }
}

function logActivity($db, $guest_id, $booking_id, $action, $details) {
    try {
        $stmt = $db->prepare("
            INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        
        $entity_type = $guest_id ? 'guest' : 'booking';
        $entity_id = $guest_id ?: $booking_id;
        
        $stmt->execute([1, $action, $entity_type, $entity_id, $details]);
        
    } catch (Exception $e) {
        error_log("Failed to log activity: " . $e->getMessage());
    }
}
?>
