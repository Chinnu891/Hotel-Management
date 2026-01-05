<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/database.php';
require_once '../utils/cors_headers.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Extract filter parameters
        $searchType = $input['searchType'] ?? 'All';
        $searchTerm = $input['searchTerm'] ?? '';
        $statusFilter = $input['statusFilter'] ?? 'All Status';
        $corporateOnly = $input['corporateOnly'] ?? false;
        $dueAmount = $input['dueAmount'] ?? 'All';
        $showCheckedOut = $input['showCheckedOut'] ?? false;
        
        // Extract pagination parameters
        $page = $input['page'] ?? 1;
        $limit = $input['limit'] ?? 20;
        $offset = ($page - 1) * $limit;
        
        // Extract date filter parameters
        $dateFrom = $input['dateFrom'] ?? '';
        $dateTo = $input['dateTo'] ?? '';

        // Extract export parameter
        $exportFormat = $input['exportFormat'] ?? 'json';

        // Build the base query with proper table joins
        $query = "SELECT 
                    g.id as guest_id,
                    CONCAT(g.first_name, ' ', g.last_name) as guest_name,
                    g.phone,
                    g.email,
                    g.id_proof_type,
                    g.id_proof_number,
                    g.id_proof_image,
                    g.customer_photo,
                    g.address,
                    g.city,
                    g.state,
                    g.pincode,
                    g.corporate_name,
                    g.corporate_id,
                    b.id as booking_id,
                    b.booking_reference,
                    b.check_in_date,
                    b.check_out_date,
                    b.check_in_time,
                    b.check_out_time,
                    b.adults,
                    b.children,
                    b.total_amount,
                    b.status as booking_status,
                    b.notes,
                    b.created_at,
                    b.owner_reference,
                    b.plan_type,
                    b.payment_type,
                    b.check_in_ampm,
                    b.check_out_ampm,
                    r.id as room_id,
                    r.room_number,
                    rt.name as room_type,
                    rt.base_price,
                    COALESCE(SUM(p.amount), 0) as paid_amount,
                    (b.total_amount - COALESCE(SUM(p.amount), 0)) as due_amount
                  FROM guests g
                  INNER JOIN bookings b ON g.id = b.guest_id
                  INNER JOIN rooms r ON b.room_number = r.room_number
                  INNER JOIN room_types rt ON r.room_type_id = rt.id
                  LEFT JOIN payments p ON b.id = p.booking_id AND p.payment_status = 'completed'
                  WHERE 1=1";

        $params = [];

        // Apply search filters
        if ($searchType !== 'All' && !empty($searchTerm)) {
            switch ($searchType) {
                case 'Guest Name':
                    $query .= " AND (g.first_name LIKE ? OR g.last_name LIKE ? OR CONCAT(g.first_name, ' ', g.last_name) LIKE ?)";
                    $params[] = "%$searchTerm%";
                    $params[] = "%$searchTerm%";
                    $params[] = "%$searchTerm%";
                    break;
                case 'Room Number':
                    $query .= " AND r.room_number LIKE ?";
                    $params[] = "%$searchTerm%";
                    break;
                case 'Phone Number':
                    $query .= " AND g.phone LIKE ?";
                    $params[] = "%$searchTerm%";
                    break;
                case 'Email':
                    $query .= " AND g.email LIKE ?";
                    $params[] = "%$searchTerm%";
                    break;
                case 'Booking ID':
                    $query .= " AND b.booking_reference LIKE ?";
                    $params[] = "%$searchTerm%";
                    break;
            }
        }

        // Apply status filter
        if ($statusFilter !== 'All Status') {
            $statusValue = strtolower(str_replace(' ', '_', $statusFilter));
            $query .= " AND b.status = ?";
            $params[] = $statusValue;
        }

        // Apply corporate filter
        if ($corporateOnly) {
            $query .= " AND g.corporate_name IS NOT NULL AND g.corporate_name != ''";
        }

        // Apply due amount filter
        if ($dueAmount !== 'All') {
            switch ($dueAmount) {
                case 'No Due':
                    $query .= " AND (b.total_amount - COALESCE(SUM(p.amount), 0)) <= 0";
                    break;
                case 'Less than ₹1000':
                    $query .= " AND (b.total_amount - COALESCE(SUM(p.amount), 0)) > 0 AND (b.total_amount - COALESCE(SUM(p.amount), 0)) < 1000";
                    break;
                case '₹1000 - ₹5000':
                    $query .= " AND (b.total_amount - COALESCE(SUM(p.amount), 0)) >= 1000 AND (b.total_amount - COALESCE(SUM(p.amount), 0)) <= 5000";
                    break;
                case 'More than ₹5000':
                    $query .= " AND (b.total_amount - COALESCE(SUM(p.amount), 0)) > 5000";
                    break;
            }
        }

        // Apply checked out filter
        if (!$showCheckedOut) {
            $query .= " AND b.status != 'checked_out'";
        }

        // Apply date filters
        if (!empty($dateFrom)) {
            $query .= " AND b.check_in_date >= ?";
            $params[] = $dateFrom;
        }
        if (!empty($dateTo)) {
            $query .= " AND b.check_in_date <= ?";
            $params[] = $dateTo;
        }

        // Group by to handle payment aggregation
        $query .= " GROUP BY g.id, b.id, r.id, rt.id";

        // Get total count for pagination (without LIMIT)
        $countQuery = "SELECT COUNT(DISTINCT CONCAT(g.id, '-', b.id)) as total FROM (" . $query . ") as subquery";
        $countStmt = $pdo->prepare($countQuery);
        $countStmt->execute($params);
        $totalCount = $countStmt->fetchColumn();

        // Order by check-in date (most recent first)
        $query .= " ORDER BY b.check_in_date DESC";
        
        // Add pagination only if not exporting
        if ($exportFormat === 'json') {
            $query .= " LIMIT ? OFFSET ?";
            $params[] = (int)$limit;
            $params[] = (int)$offset;
        }

        // Prepare and execute the query
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format the results for frontend
        $formattedResults = [];
        foreach ($results as $row) {
            $formattedResults[] = [
                'id' => $row['guest_id'],
                'bookingId' => $row['booking_id'],
                'guestName' => $row['guest_name'],
                'phone' => $row['phone'],
                'email' => $row['email'],
                'roomNumber' => $row['room_number'],
                'roomType' => $row['room_type'],
                'checkIn' => $row['check_in_date'],
                'checkOut' => $row['check_out_date'],
                'checkInTime' => $row['check_in_time'],
                'checkOutTime' => $row['check_out_time'],
                'status' => ucfirst(str_replace('_', ' ', $row['booking_status'])),
                'adults' => $row['adults'],
                'children' => $row['children'],
                'ratePerNight' => $row['base_price'],
                'totalAmount' => $row['total_amount'],
                'paidAmount' => $row['paid_amount'],
                'dueAmount' => $row['due_amount'] ?? 0,
                'bookingReference' => $row['booking_reference'],
                'corporateName' => $row['corporate_name'],
                'corporateId' => $row['corporate_id'],
                'address' => $row['address'],
                'city' => $row['city'],
                'state' => $row['state'],
                'pincode' => $row['pincode'],
                'idProofType' => $row['id_proof_type'],
                'idProofNumber' => $row['id_proof_number'],
                'notes' => $row['notes'],
                'createdAt' => $row['created_at'],
                'ownerReference' => $row['owner_reference']
            ];
        }

        // Handle CSV export
        if ($exportFormat === 'csv') {
            // Set CSV headers
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="guest_history_' . date('Y-m-d_H-i-s') . '.csv"');
            
            // Create CSV output
            $output = fopen('php://output', 'w');
            
            // Add BOM for proper UTF-8 encoding in Excel
            fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // CSV headers
            $csvHeaders = [
                'Guest ID',
                'Booking ID',
                'Guest Name',
                'Phone',
                'Email',
                'Room Number',
                'Room Type',
                'Check In Date',
                'Check Out Date',
                'Check In Time',
                'Check Out Time',
                'Status',
                'Adults',
                'Children',
                'Rate Per Night',
                'Total Amount',
                'Paid Amount',
                'Due Amount',
                'Booking Reference',
                'Corporate Name',
                'Corporate ID',
                'Address',
                'City',
                'State',
                'Pincode',
                'ID Proof Type',
                'ID Proof Number',
                'Notes',
                'Created At',
                'Owner Reference'
            ];
            
            fputcsv($output, $csvHeaders);
            
            // CSV data rows
            foreach ($formattedResults as $row) {
                $csvRow = [
                    $row['id'],
                    $row['bookingId'],
                    $row['guestName'],
                    $row['phone'],
                    $row['email'],
                    $row['roomNumber'],
                    $row['roomType'],
                    $row['checkIn'],
                    $row['checkOut'],
                    $row['checkInTime'],
                    $row['checkOutTime'],
                    $row['status'],
                    $row['adults'],
                    $row['children'],
                    $row['ratePerNight'],
                    $row['totalAmount'],
                    $row['paidAmount'],
                    $row['dueAmount'],
                    $row['bookingReference'],
                    $row['corporateName'],
                    $row['corporateId'],
                    $row['address'],
                    $row['city'],
                    $row['state'],
                    $row['pincode'],
                    $row['idProofType'],
                    $row['idProofNumber'],
                    $row['notes'],
                    $row['createdAt'],
                    $row['ownerReference']
                ];
                fputcsv($output, $csvRow);
            }
            
            fclose($output);
            exit;
        }

        // Calculate pagination info for JSON response
        $totalPages = ceil($totalCount / $limit);
        $currentPage = $page;
        $hasNextPage = $currentPage < $totalPages;
        $hasPrevPage = $currentPage > 1;

        echo json_encode([
            'success' => true,
            'data' => $formattedResults,
            'count' => count($formattedResults),
            'totalCount' => $totalCount,
            'pagination' => [
                'currentPage' => $currentPage,
                'totalPages' => $totalPages,
                'limit' => $limit,
                'hasNextPage' => $hasNextPage,
                'hasPrevPage' => $hasPrevPage
            ],
            'filters' => [
                'searchType' => $searchType,
                'searchTerm' => $searchTerm,
                'statusFilter' => $statusFilter,
                'corporateOnly' => $corporateOnly,
                'dueAmount' => $dueAmount,
                'showCheckedOut' => $showCheckedOut,
                'dateFrom' => $dateFrom,
                'dateTo' => $dateTo
            ]
        ]);

    } else {
        // GET request - return sample data or error
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Method not allowed. Use POST for search queries.'
        ]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>
