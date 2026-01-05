<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../utils/cors_headers.php';

require_once '../config/database.php';
require_once '../utils/jwt_helper.php';
require_once '../utils/logger.php';

// Create uploads directory if it doesn't exist
$uploadsDir = '../uploads';
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

class NewBookingAPI {
    private $conn;
    private $logger;
    
    public function __construct($db) {
        $this->conn = $db;
        $this->logger = new Logger($db);
    }
    
    // Check specific room availability for given dates
    public function checkSpecificRoomAvailability($roomNumber, $checkIn, $checkOut) {
        try {
            // For past dates, all rooms should be available since no current bookings conflict with past dates
            $today = date('Y-m-d');
            $isPastDate = ($checkIn < $today);
            
            if ($isPastDate) {
                // For past dates, all rooms are available
                return [
                    'available' => true,
                    'conflicts' => 'None (past date booking)',
                    'conflict_count' => 0
                ];
            }
            
            // Check if the specific room has any conflicting bookings
            $bookingSql = "SELECT COUNT(*) as booking_count,
                                 GROUP_CONCAT(CONCAT(b.status, ':', b.check_in_date, '-', b.check_out_date, ':', COALESCE(b.check_out_time, '11:00:00')) SEPARATOR '; ') as conflict_details
                          FROM bookings b
                          WHERE b.room_number = :roomNumber
                          AND b.status IN ('pending', 'confirmed', 'checked_in')
                          AND (
                              -- Standard date overlap (different days)
                              (b.check_in_date < :checkOut AND b.check_out_date > :checkIn AND b.check_out_date != :checkIn)
                              -- Same day check-in and checkout - check times
                              OR (b.check_out_date = :checkIn AND (
                                  b.check_out_time IS NULL 
                                  OR b.check_out_time >= '11:00:00'
                              ))
                              -- Check-in on checkout date but different days
                              OR (b.check_in_date = :checkOut AND :checkIn != :checkOut)
                              -- Full date range overlap
                              OR (b.check_in_date <= :checkIn AND b.check_out_date >= :checkOut AND :checkIn != :checkOut)
                          )";
            
            $stmt = $this->conn->prepare($bookingSql);
            $stmt->bindParam(':roomNumber', $roomNumber);
            $stmt->bindParam(':checkIn', $checkIn);
            $stmt->bindParam(':checkOut', $checkOut);
            $stmt->execute();
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            $conflictCount = $result['booking_count'];
            $conflictDetails = $result['conflict_details'] ?? 'None';
            
            return [
                'available' => ($conflictCount == 0),
                'conflicts' => $conflictDetails,
                'conflict_count' => $conflictCount
            ];
            
        } catch (Exception $e) {
            error_log("Error checking specific room availability: " . $e->getMessage());
            return [
                'available' => false,
                'conflicts' => 'Error checking availability',
                'conflict_count' => 999
            ];
        }
    }
    
    // Get room availability
    public function getRoomAvailability($checkIn, $checkOut, $roomType = null) {
        try {
            // First, get all rooms of the specified type with their custom prices
            $roomSql = "SELECT r.id, r.room_number, r.status, r.floor, r.price as custom_price
                       FROM rooms r
                       JOIN room_types rt ON r.room_type_id = rt.id
                       WHERE rt.name = :roomType";
            
            $stmt = $this->conn->prepare($roomSql);
            $stmt->bindParam(':roomType', $roomType);
            $stmt->execute();
            $allRooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($allRooms)) {
                return ['success' => false, 'message' => 'Room type not found'];
            }
            
            // Check which rooms are available for the given dates
            $availableRooms = [];
            $detailedRooms = [];
            
            foreach ($allRooms as $room) {
                // For past dates, all rooms should be available since no current bookings conflict with past dates
                $today = date('Y-m-d');
                $isPastDate = ($checkIn < $today);
                
                if ($isPastDate) {
                    // For past dates, all rooms are available
                    $isAvailable = true;
                    $bookingResult = ['booking_count' => 0, 'conflict_details' => null];
                } else {
                    // Check if room is available (not occupied by other bookings for the requested dates)
                    // Include pending, confirmed, and checked_in bookings as they all affect availability
                    // Improved date overlap logic: check if the requested dates overlap with existing bookings
                    $bookingSql = "SELECT COUNT(*) as booking_count,
                                         GROUP_CONCAT(CONCAT(b.status, ':', b.check_in_date, '-', b.check_out_date, ':', COALESCE(b.check_out_time, '11:00:00')) SEPARATOR '; ') as conflict_details
                                  FROM bookings b
                                  WHERE b.room_number = :roomNumber
                                  AND b.status IN ('pending', 'confirmed', 'checked_in')
                                  AND (
                                      -- Standard date overlap (different days)
                                      (b.check_in_date < :checkOut AND b.check_out_date > :checkIn AND b.check_out_date != :checkIn)
                                      -- Same day check-in and checkout - check times
                                      OR (b.check_out_date = :checkIn AND (
                                          b.check_out_time IS NULL 
                                          OR b.check_out_time >= '11:00:00'
                                      ))
                                      -- Check-in on checkout date but different days
                                      OR (b.check_in_date = :checkOut AND :checkIn != :checkOut)
                                      -- Full date range overlap
                                      OR (b.check_in_date <= :checkIn AND b.check_out_date >= :checkOut AND :checkIn != :checkOut)
                                  )";
                    
                    $bookingStmt = $this->conn->prepare($bookingSql);
                    $bookingStmt->bindParam(':roomNumber', $room['room_number']);
                    $bookingStmt->bindParam(':checkIn', $checkIn);
                    $bookingStmt->bindParam(':checkOut', $checkOut);
                    $bookingStmt->execute();
                    
                    $bookingResult = $bookingStmt->fetch(PDO::FETCH_ASSOC);
                    
                    // Room is available if no conflicting bookings for the requested dates
                    $isAvailable = ($bookingResult['booking_count'] == 0);
                }
                
                if ($isAvailable) {
                    $availableRooms[] = $room;
                }
                
                // Add detailed room information with conflict details
                $detailedRooms[] = [
                    'id' => $room['id'],
                    'room_number' => $room['room_number'],
                    'status' => $room['status'],
                    'floor' => $room['floor'],
                    'available' => $isAvailable,
                    'conflicts' => $bookingResult['booking_count'],
                    'conflict_details' => $bookingResult['conflict_details'] ?? 'None'
                ];
                
                // Log availability check for debugging
                if ($isPastDate) {
                    error_log("Room {$room['room_number']} PAST DATE BOOKING: Check-in: $checkIn, Check-out: $checkOut, Available: Yes (past date)");
                } else {
                    error_log("Room {$room['room_number']} availability check: Check-in: $checkIn, Check-out: $checkOut, Conflicts: {$bookingResult['booking_count']}, Available: " . ($isAvailable ? 'Yes' : 'No'));
                    if ($bookingResult['conflict_details']) {
                        error_log("Room {$room['room_number']} conflicts: {$bookingResult['conflict_details']}");
                    }
                }
            }
            
            // Get room type details
            $typeSql = "SELECT id, name, base_price, capacity FROM room_types WHERE name = :roomType";
            $typeStmt = $this->conn->prepare($typeSql);
            $typeStmt->bindParam(':roomType', $roomType);
            $typeStmt->execute();
            $roomTypeInfo = $typeStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$roomTypeInfo) {
                return ['success' => false, 'message' => 'Room type not found'];
            }
            
            // Calculate the actual price for each available room
            $roomPrices = [];
            foreach ($availableRooms as $room) {
                // Use custom room price if available, otherwise use room type base price
                $actualPrice = ($room['custom_price'] > 0) ? $room['custom_price'] : $roomTypeInfo['base_price'];
                $roomPrices[$room['room_number']] = $actualPrice;
            }
            
            $availability = [
                'room_type_id' => $roomTypeInfo['id'],
                'room_type_name' => $roomTypeInfo['name'],
                'base_price' => $roomTypeInfo['base_price'],
                'capacity' => $roomTypeInfo['capacity'],
                'total_rooms' => count($allRooms),
                'available_rooms' => count($availableRooms),
                'occupied_rooms' => count($allRooms) - count($availableRooms),
                'detailed_rooms' => $detailedRooms,
                'room_prices' => $roomPrices  // Add individual room prices
            ];
            
            return ['success' => true, 'data' => [$availability]];
        } catch (Exception $e) {
            // $this->logger->log('ERROR', 'getRoomAvailability: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error getting room availability'];
        }
    }
    
    // Helper method to check if guest exists and return guest ID
    private function getOrCreateGuest($data) {
        $guestName = explode(' ', $data['guest_name'], 2);
        $firstName = $guestName[0];
        $lastName = isset($guestName[1]) ? $guestName[1] : '';
        $email = $data['email'] ?? '';
        $idProofType = $data['id_proof_type'] ?? '';
        $idProofNumber = $data['id_proof_number'] ?? '';
        $idProofImage = $data['id_proof_photo_path'] ?? '';
        $customerPhoto = $data['customer_photo_path'] ?? '';
        
        // Check if exact match exists (email, phone, and name all match)
        if (!empty($data['email'])) {
            $exactMatchSql = "SELECT id FROM guests WHERE email = :email AND phone = :phone AND first_name = :firstName LIMIT 1";
            $stmt = $this->conn->prepare($exactMatchSql);
            $stmt->bindParam(':email', $data['email']);
            $stmt->bindParam(':phone', $data['phone']);
            $stmt->bindParam(':firstName', $firstName);
            $stmt->execute();
            
            $exactMatch = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($exactMatch) {
                error_log("Found exact match guest ID: " . $exactMatch['id'] . " for " . $firstName . " " . $lastName . ", Email: " . $email);
                return $exactMatch['id'];
            }
        }
        
        // Check if guest exists by email only (different phone/name - update the record)
        if (!empty($data['email'])) {
            $emailOnlyMatchSql = "SELECT id, first_name, phone FROM guests WHERE email = :email LIMIT 1";
            $stmt = $this->conn->prepare($emailOnlyMatchSql);
            $stmt->bindParam(':email', $data['email']);
            $stmt->execute();
            
            $emailMatch = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($emailMatch) {
                // Same email but different name/phone - update the existing record
                $updateSql = "UPDATE guests SET 
                             first_name = :firstName, 
                             last_name = :lastName, 
                             phone = :phone, 
                             address = :address, 
                             id_proof_type = :idProofType, 
                             id_proof_number = :idProofNumber,
                             id_proof_image = :idProofImage,
                             customer_photo = :customerPhoto,
                             updated_at = NOW()
                             WHERE id = :guestId";
                
                $updateStmt = $this->conn->prepare($updateSql);
                $updateStmt->bindParam(':firstName', $firstName);
                $updateStmt->bindParam(':lastName', $lastName);
                $updateStmt->bindParam(':phone', $data['phone']);
                $updateStmt->bindParam(':address', $data['address']);
                $updateStmt->bindParam(':idProofType', $idProofType);
                $updateStmt->bindParam(':idProofNumber', $idProofNumber);
                $updateStmt->bindParam(':idProofImage', $idProofImage);
                $updateStmt->bindParam(':customerPhoto', $customerPhoto);
                $updateStmt->bindParam(':guestId', $emailMatch['id']);
                
                $updateStmt->execute();
                error_log("Updated guest (by email) ID: " . $emailMatch['id'] . " from '" . $emailMatch['first_name'] . "' to '" . $firstName . " " . $lastName . "'");
                
                return $emailMatch['id'];
            }
        }
        
        // If same phone number but different name/email, create a new guest record
        // This allows multiple people to use the same phone number (family members, etc.)
        $phoneMatchSql = "SELECT id, first_name, email FROM guests WHERE phone = :phone ORDER BY id DESC LIMIT 1";
        $stmt = $this->conn->prepare($phoneMatchSql);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->execute();
        
        $phoneMatch = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($phoneMatch) {
            // Check if it's the same person (same name) or different person (different name)
            $existingFirstName = strtolower(trim($phoneMatch['first_name']));
            $newFirstName = strtolower(trim($firstName));
            $existingEmail = strtolower(trim($phoneMatch['email'] ?? ''));
            $newEmail = strtolower(trim($email));
            
            if ($existingFirstName === $newFirstName && $existingEmail === $newEmail) {
                // Same person - return existing ID
                error_log("Same person found with phone " . $data['phone'] . " - using existing guest ID: " . $phoneMatch['id']);
                return $phoneMatch['id'];
            } else {
                // Different person using same phone - create new guest
                error_log("Different person using same phone " . $data['phone'] . " - existing: '" . $phoneMatch['first_name'] . "', new: '" . $firstName . "' - creating new guest");
            }
        }
        
        // Create new guest
        $guestSql = "INSERT INTO guests (first_name, last_name, email, phone, address, id_proof_type, id_proof_number, id_proof_image, customer_photo, created_at) 
                    VALUES (:firstName, :lastName, :email, :phone, :address, :idProofType, :idProofNumber, :idProofImage, :customerPhoto, NOW())";
        
        $stmt = $this->conn->prepare($guestSql);
        
        $stmt->bindParam(':firstName', $firstName);
        $stmt->bindParam(':lastName', $lastName);
        $stmt->bindParam(':email', $email);
        $stmt->bindParam(':phone', $data['phone']);
        $stmt->bindParam(':address', $data['address']);
        $stmt->bindParam(':idProofType', $idProofType);
        $stmt->bindParam(':idProofNumber', $idProofNumber);
        $stmt->bindParam(':idProofImage', $idProofImage);
        $stmt->bindParam(':customerPhoto', $customerPhoto);
        
        if (!$stmt->execute()) {
            throw new Exception("Error creating guest record");
        }
        
        $newGuestId = $this->conn->lastInsertId();
        error_log("Created new guest ID: " . $newGuestId . " with data: " . $firstName . " " . $lastName . ", Email: " . $email . ", Phone: " . $data['phone']);
        
        return $newGuestId;
    }

    // Create new booking
    public function createBooking($data) {
        // 🎯 FINAL TEST LOGGING - COMPREHENSIVE EMAIL DEBUGGING
        error_log("🎯 FINAL TEST === BOOKING CREATION START ===");
        error_log("🎯 FINAL TEST - Received data: " . print_r($data, true));
        error_log("🎯 FINAL TEST - Contact email value: " . (isset($data["contact_email"]) ? $data["contact_email"] : "NOT SET"));
        error_log("🎯 FINAL TEST - Guest email value: " . (isset($data["email"]) ? $data["email"] : "NOT SET"));
        error_log("🎯 FINAL TEST - Contact person value: " . (isset($data["contact_person"]) ? $data["contact_person"] : "NOT SET"));
        error_log("🎯 FINAL TEST - Company name value: " . (isset($data["company_name"]) ? $data["company_name"] : "NOT SET"));
        error_log("🎯 FINAL TEST - Guest name value: " . (isset($data["guest_name"]) ? $data["guest_name"] : "NOT SET"));
        error_log("🎯 FINAL TEST - Phone value: " . (isset($data["phone"]) ? $data["phone"] : "NOT SET"));
        error_log("🎯 FINAL TEST === END RECEIVED DATA ===\n");
        
        try {
            error_log("createBooking called with data: " . print_r($data, true));
            error_log("Paid amount in data: " . (isset($data['paid_amount']) ? $data['paid_amount'] : 'NOT SET'));
            
            // Check database connection
            if (!$this->conn) {
                error_log("Database connection is null");
                return ['success' => false, 'message' => 'Database connection failed'];
            }
            
            $this->conn->beginTransaction();
            
            // Validate required fields
            $requiredFields = ['guest_name', 'phone', 'address', 'check_in_date', 'check_out_date', 'room_type', 'tariff'];
            foreach ($requiredFields as $field) {
                if (empty($data[$field])) {
                    error_log("Missing required field: $field");
                    throw new Exception("Field '$field' is required");
                }
            }
            
            // Validate room_number if provided
            if (!empty($data['room_number'])) {
                error_log("Room number provided: " . $data['room_number']);
                if (!is_numeric($data['room_number']) && !preg_match('/^[A-Z]?\d+$/', $data['room_number'])) {
                    throw new Exception("Invalid room number format");
                }
            } else {
                error_log("No room number provided - will select any available room");
            }
            
            // Validate dates
            $checkIn = new DateTime($data['check_in_date']);
            $checkOut = new DateTime($data['check_out_date']);
            
            if ($checkOut <= $checkIn) {
                throw new Exception("Check-out date must be after check-in date");
            }
            
            // Calculate number of days
            $interval = $checkIn->diff($checkOut);
            $numberOfDays = $interval->days;
            
            // Check room availability
            error_log("Checking room availability for dates: " . $data['check_in_date'] . " to " . $data['check_out_date'] . ", room type: " . $data['room_type']);
            $availability = $this->getRoomAvailability($data['check_in_date'], $data['check_out_date'], $data['room_type']);
            error_log("Room availability result: " . print_r($availability, true));
            
            // Additional validation: Check if the specific room is actually available for the requested dates
            if (!empty($data['room_number'])) {
                $roomAvailabilityCheck = $this->checkSpecificRoomAvailability($data['room_number'], $data['check_in_date'], $data['check_out_date']);
                error_log("Specific room availability check for room {$data['room_number']}: " . print_r($roomAvailabilityCheck, true));
                
                if (!$roomAvailabilityCheck['available']) {
                    throw new Exception("Room {$data['room_number']} is not available for the requested dates. Conflicts: " . $roomAvailabilityCheck['conflicts']);
                }
                
                // Double-check: Verify no new bookings were created between our check and now
                $finalCheck = $this->checkSpecificRoomAvailability($data['room_number'], $data['check_in_date'], $data['check_out_date']);
                if (!$finalCheck['available']) {
                    throw new Exception("Room {$data['room_number']} became unavailable while processing. Please try again.");
                }
            }
            
            if (!$availability['success']) {
                throw new Exception("Error checking room availability");
            }
            
            if (empty($availability['data'])) {
                throw new Exception("No rooms available for selected type and dates");
            }
            
            $roomType = $availability['data'][0];
            error_log("Room type availability: " . print_r($roomType, true));
            
            if ($roomType['available_rooms'] <= 0) {
                throw new Exception("No rooms available for selected type and dates");
            }
            
            // Get specific room if room_number is provided, otherwise get any available room
            if (!empty($data['room_number'])) {
                // Check if this is a past date booking
                $today = date('Y-m-d');
                $isPastDate = ($data['check_in_date'] < $today);
                
                // Single atomic check for room availability - prevents race conditions
                if ($isPastDate) {
                    // For past dates, allow any room regardless of status
                    $availabilitySql = "SELECT r.room_number, r.status
                                       FROM rooms r 
                                       JOIN room_types rt ON r.room_type_id = rt.id 
                                       WHERE r.room_number = :roomNumber 
                                       AND rt.name = :roomType
                                       AND NOT EXISTS (
                                           SELECT 1 FROM bookings b 
                                           WHERE b.room_number = r.room_number
                                           AND b.status IN ('confirmed', 'checked_in')
                                           AND (
                                               (b.check_in_date < :checkOut AND b.check_out_date > :checkIn)
                                           )
                                       )";
                } else {
                    // For current/future dates, check availability (ignore room status, focus on actual conflicts)
                    $availabilitySql = "SELECT r.room_number, r.status
                                       FROM rooms r 
                                       JOIN room_types rt ON r.room_type_id = rt.id 
                                       WHERE r.room_number = :roomNumber 
                                       AND rt.name = :roomType
                                       AND NOT EXISTS (
                                           SELECT 1 FROM bookings b 
                                           WHERE b.room_number = r.room_number
                                           AND b.status IN ('confirmed', 'checked_in')
                                           AND (
                                               (b.check_in_date < :checkOut AND b.check_out_date > :checkIn)
                                           )
                                       )";
                }
                
                error_log("Atomic room availability check SQL: " . $availabilitySql);
                error_log("Room number parameter: " . $data['room_number']);
                error_log("Room type parameter: " . $data['room_type']);
                error_log("Check-in date: " . $data['check_in_date']);
                error_log("Check-out date: " . $data['check_out_date']);
                error_log("Is past date: " . ($isPastDate ? 'Yes' : 'No'));
                
                $stmt = $this->conn->prepare($availabilitySql);
                $stmt->bindParam(':roomNumber', $data['room_number']);
                $stmt->bindParam(':roomType', $data['room_type']);
                $stmt->bindParam(':checkIn', $data['check_in_date']);
                $stmt->bindParam(':checkOut', $data['check_out_date']);
                $stmt->execute();
                $room = $stmt->fetch(PDO::FETCH_ASSOC);
                
                error_log("Atomic availability check result: " . print_r($room, true));
                
                if (!$room) {
                    // Validate database consistency to help debug the issue
                    $validationResult = $this->validateRoomAvailability($data['room_number'], $data['check_in_date'], $data['check_out_date']);
                    error_log("Database consistency validation result: " . print_r($validationResult, true));
                    
                    // Get details of why the room is not available for debugging
                    $conflictDetailsSql = "SELECT id, check_in_date, check_out_date, status 
                                         FROM bookings b
                                         WHERE b.room_number = :roomNumber
                                         AND b.status IN ('confirmed', 'checked_in')
                                         AND (
                                             (b.check_in_date < :checkOut AND b.check_out_date > :checkIn)
                                         )";
                    
                    $conflictDetailsStmt = $this->conn->prepare($conflictDetailsSql);
                    $conflictDetailsStmt->bindParam(':roomNumber', $data['room_number']);
                    $conflictDetailsStmt->bindParam(':checkIn', $data['check_in_date']);
                    $conflictDetailsStmt->bindParam(':checkOut', $data['check_out_date']);
                    $conflictDetailsStmt->execute();
                    
                    $conflictingBookings = $conflictDetailsStmt->fetchAll(PDO::FETCH_ASSOC);
                    error_log("Conflicting bookings found: " . print_r($conflictingBookings, true));
                    
                    // Check if room exists but is not available
                    $roomCheckSql = "SELECT r.room_number, r.status, rt.name as room_type_name
                                    FROM rooms r 
                                    JOIN room_types rt ON r.room_type_id = rt.id 
                                    WHERE r.room_number = :roomNumber";
                    
                    $roomCheckStmt = $this->conn->prepare($roomCheckSql);
                    $roomCheckStmt->bindParam(':roomNumber', $data['room_number']);
                    $roomCheckStmt->execute();
                    $roomInfo = $roomCheckStmt->fetch(PDO::FETCH_ASSOC);
                    
                    if (!$roomInfo) {
                        throw new Exception("Room number {$data['room_number']} does not exist");
                    }
                    
                    if ($roomInfo['room_type_name'] !== $data['room_type']) {
                        throw new Exception("Room {$data['room_number']} is of type '{$roomInfo['room_type_name']}', not '{$data['room_type']}'");
                    }
                    
                    // For past dates, allow booking regardless of current room status
                    $today = date('Y-m-d');
                    $isPastDate = ($data['check_in_date'] < $today);
                    
                    error_log("Room status check - Room: {$data['room_number']}, Status: {$roomInfo['status']}, Is past date: " . ($isPastDate ? 'Yes' : 'No'));
                    
                    if (!$isPastDate && $roomInfo['status'] !== 'available') {
                        throw new Exception("Room {$data['room_number']} is currently {$roomInfo['status']}, not available");
                    }
                    
                    if (!empty($conflictingBookings)) {
                        $conflictDetails = [];
                        foreach ($conflictingBookings as $conflict) {
                            $conflictDetails[] = "Booking #{$conflict['id']} ({$conflict['status']}) from {$conflict['check_in_date']} to {$conflict['check_out_date']}";
                        }
                        throw new Exception("Room {$data['room_number']} has conflicting bookings: " . implode(', ', $conflictDetails));
                    }
                    
                    // If we reach here, there might be a data inconsistency
                    if (!$validationResult['valid']) {
                        $issues = implode('; ', $validationResult['issues']);
                        throw new Exception("Room availability issue detected: $issues");
                    }
                    
                    throw new Exception("Selected room is not available for the requested dates");
                }
                
            } else {
                // Fallback: Get any available room that doesn't have conflicting bookings
                // For past dates, allow any room regardless of current status
                $today = date('Y-m-d');
                $isPastDate = ($data['check_in_date'] < $today);
                
                if ($isPastDate) {
                    // For past dates, get any room of the specified type
                    $roomSql = "SELECT r.room_number 
                               FROM rooms r 
                               JOIN room_types rt ON r.room_type_id = rt.id 
                               WHERE rt.name = :roomType 
                               LIMIT 1";
                } else {
                    // For current/future dates, check availability and status
                    $roomSql = "SELECT r.room_number 
                               FROM rooms r 
                               JOIN room_types rt ON r.room_type_id = rt.id 
                               WHERE rt.name = :roomType 
                               AND r.status = 'available'
                               AND NOT EXISTS (
                                   SELECT 1 FROM bookings b 
                                   WHERE b.room_number = r.room_number
                                   AND b.status IN ('confirmed', 'checked_in')
                                   AND (
                                       (b.check_in_date < :checkOut AND b.check_out_date > :checkIn)
                                   )
                               )
                               LIMIT 1";
                }
                
                error_log("Fallback room selection SQL: " . $roomSql);
                error_log("Room type parameter: " . $data['room_type']);
                error_log("Check-in date: " . $data['check_in_date']);
                error_log("Check-out date: " . $data['check_out_date']);
                error_log("Is past date: " . ($isPastDate ? 'Yes' : 'No'));
                
                $stmt = $this->conn->prepare($roomSql);
                $stmt->bindParam(':roomType', $data['room_type']);
                $stmt->bindParam(':checkIn', $data['check_in_date']);
                $stmt->bindParam(':checkOut', $data['check_out_date']);
                $stmt->execute();
                $room = $stmt->fetch(PDO::FETCH_ASSOC);
                
                error_log("Selected fallback room: " . print_r($room, true));
                
                if (!$room) {
                    throw new Exception("No available rooms found for the selected dates");
                }
            }
            
            // Create guest record
            $guestId = $this->getOrCreateGuest($data);
            
            // Create booking record
            $bookingSql = "INSERT INTO bookings (
                booking_reference, guest_id, room_number, check_in_date, check_out_date, 
                check_in_time, check_in_ampm, check_out_time, check_out_ampm, adults, children, total_amount, paid_amount, 
                remaining_amount, status, booking_source, plan_type, payment_type, 
                payment_status, notes, owner_reference, created_by, created_at, 
                contact_email, contact_person, contact_phone, company_name, gst_number, 
                billing_address, tariff, number_of_days
            ) VALUES (
                :bookingRef, :guestId, :roomNumber, :checkIn, :checkOut, :checkInTime, 
                :checkInAMPM, :checkOutTime, :checkOutAMPM, :adults, :children, :totalAmount, :paidAmount, :remainingAmount, 
                :bookingStatus, :bookingSource, :planType, :paymentType, :paymentStatus, 
                :notes, :ownerReference, :createdBy, NOW(), :contactEmail, :contactPerson, 
                :contactPhone, :companyName, :gstNumber, :billingAddress, :tariff, :numberOfDays
            )";
            
            error_log("SQL Parameters - Paid Amount: " . $paidAmount . ", Remaining Amount: " . $remainingAmount);
            
            $bookingRef = 'BK' . date('Ymd') . str_pad(mt_rand(1, 9999), 4, '0', STR_PAD_LEFT);
            $totalAmount = $data['tariff'] * $numberOfDays;
            
            // Calculate paid amount and remaining amount for walk-in bookings
            $paidAmount = 0.00;
            $remainingAmount = $totalAmount;
            
            // Log the received data for debugging
            error_log("Received paid_amount: " . (isset($data['paid_amount']) ? $data['paid_amount'] : 'NOT SET'));
            error_log("Received booking_source: " . (isset($data['booking_source']) ? $data['booking_source'] : 'NOT SET'));
            error_log("Received owner_reference: " . var_export($data['owner_reference'] ?? 'NOT SET', true));
            error_log("Received owner_reference type: " . (isset($data['owner_reference']) ? gettype($data['owner_reference']) : 'NOT SET'));
            
            // Handle owner reference - skip payment requirements
            $ownerReference = false; // Default to false
            if (isset($data['owner_reference'])) {
                // Convert various forms of "false" to actual false
                $ownerRefValue = $data['owner_reference'];
                if ($ownerRefValue === false || $ownerRefValue === 'false' || $ownerRefValue === '0' || $ownerRefValue === 0 || $ownerRefValue === '' || $ownerRefValue === 'off') {
                    $ownerReference = false;
                } else if ($ownerRefValue === true || $ownerRefValue === 'true' || $ownerRefValue === '1' || $ownerRefValue === 1 || $ownerRefValue === 'on') {
                    $ownerReference = true;
                } else {
                    $ownerReference = (bool)$ownerRefValue;
                }
            }
            error_log("Owner reference processing - Raw value: " . var_export($data['owner_reference'] ?? 'NOT SET', true) . ", Processed: " . ($ownerReference ? 'true' : 'false'));
            if ($ownerReference) {
                // For owner reference bookings, set payment fields to show no payment required
                $paidAmount = 0.00; // No actual payment made
                $remainingAmount = 0.00; // No remaining amount for owner reference
                error_log("Owner reference booking - No payment required, setting remaining amount to 0");
            } else {
                error_log("NOT an owner reference booking - processing paid amount normally");
                if ($data['booking_source'] === 'walk_in' && isset($data['paid_amount']) && $data['paid_amount'] !== '' && $data['paid_amount'] !== null) {
                    // Process paid amount for walk-in bookings
                    error_log("Processing paid amount - Raw value: " . $data['paid_amount']);
                    $paidAmount = floatval($data['paid_amount']);
                    $remainingAmount = max(0, $totalAmount - $paidAmount);
                    error_log("Walk-in booking - Paid: $paidAmount, Remaining: $remainingAmount");
                } else if ($data['booking_source'] === 'corporate' && isset($data['paid_amount']) && $data['paid_amount'] !== '' && $data['paid_amount'] !== null) {
                    // Process paid amount for corporate bookings
                    error_log("Processing corporate booking paid amount - Raw value: " . $data['paid_amount']);
                    $paidAmount = floatval($data['paid_amount']);
                    $remainingAmount = max(0, $totalAmount - $paidAmount);
                    error_log("Corporate booking - Paid: $paidAmount, Remaining: $remainingAmount");
                } else if (isset($data['paid_amount']) && $data['paid_amount'] !== '' && $data['paid_amount'] !== null) {
                    // Process paid amount for any other booking source (fallback)
                    error_log("Processing paid amount (fallback) - Raw value: " . $data['paid_amount']);
                    $paidAmount = floatval($data['paid_amount']);
                    $remainingAmount = max(0, $totalAmount - $paidAmount);
                    error_log("Fallback booking - Paid: $paidAmount, Remaining: $remainingAmount");
                } else {
                    error_log("No paid amount processed - Owner reference: " . ($ownerReference ? 'true' : 'false') . ", Booking source: " . ($data['booking_source'] ?? 'NOT SET'));
                }
            }
            
            // Auto-confirm booking for cash payments or owner reference
            $bookingStatus = 'confirmed';
            $paymentStatus = 'pending';
            
            if ($ownerReference) {
                $bookingStatus = 'confirmed';
                $paymentStatus = 'referred_by_owner'; // Special status for owner reference bookings
                error_log("Owner reference booking - Auto-confirmed, payment status: referred_by_owner");
            } else if ($data['payment_type'] === 'cash' && $data['booking_source'] === 'walk_in') {
                $bookingStatus = 'confirmed';
                // For walk-in bookings, only mark as completed if explicitly indicated
                // Otherwise, treat as partial payment even if amount equals total
                if ($paidAmount >= $totalAmount && isset($data['payment_received']) && $data['payment_received'] === 'true') {
                    $paymentStatus = 'completed';
                    error_log("Cash payment selected - Full payment received, payment status: completed");
                } else {
                    $paymentStatus = 'partial';
                    error_log("Cash payment selected - Payment amount set but not confirmed as received, payment status: partial");
                }
            } else if ($data['booking_source'] === 'corporate') {
                // Corporate booking - calculate payment status based on actual amounts
                $bookingStatus = 'confirmed';
                if ($paidAmount >= $totalAmount && isset($data['payment_received']) && $data['payment_received'] === 'true') {
                    $paymentStatus = 'completed';
                    error_log("Corporate booking - Full payment received, payment status: completed");
                } elseif ($paidAmount > 0) {
                    $paymentStatus = 'partial';
                    error_log("Corporate booking - Partial payment made, payment status: partial");
                } else {
                    $paymentStatus = 'pending';
                    error_log("Corporate booking - No payment made, payment status: pending");
                }
            }
            
            // Get adults and children from form data
            $adults = intval($data['adults'] ?? 1);
            $children = intval($data['children'] ?? 0);
            
            // Ensure adults is at least 1 and children is non-negative
            if ($adults < 1) $adults = 1;
            if ($children < 0) $children = 0;
            
            error_log("Adults: $adults, Children: $children");
            
            $stmt = $this->conn->prepare($bookingSql);
            $bookingSource = $data['booking_source'] ?? 'walk_in';
            $planType = $data['plan_type'] ?? 'EP';
            $paymentType = $data['payment_type'] ?? 'cash';
            $notes = $data['notes'] ?? '';
            $createdBy = $data['created_by'] ?? 1;
            
            $stmt->bindParam(':bookingRef', $bookingRef);
            $stmt->bindParam(':guestId', $guestId);
            $stmt->bindParam(':roomNumber', $room['room_number']);
            $stmt->bindParam(':checkIn', $data['check_in_date']);
            $stmt->bindParam(':checkOut', $data['check_out_date']);
            // Handle time fields - convert empty strings to NULL for TIME columns
            $checkInTime = !empty($data['check_in_time']) ? $data['check_in_time'] : null;
            $checkOutTime = !empty($data['check_out_time']) ? $data['check_out_time'] : null;
            $checkInAMPM = !empty($data['check_in_ampm']) ? $data['check_in_ampm'] : 'AM';
            $checkOutAMPM = !empty($data['check_out_ampm']) ? $data['check_out_ampm'] : 'AM';
            $stmt->bindParam(':checkInTime', $checkInTime);
            $stmt->bindParam(':checkInAMPM', $checkInAMPM);
            $stmt->bindParam(':checkOutTime', $checkOutTime);
            $stmt->bindParam(':checkOutAMPM', $checkOutAMPM);
            $stmt->bindParam(':adults', $adults);
            $stmt->bindParam(':children', $children);
            $stmt->bindParam(':totalAmount', $totalAmount);
            error_log("Final values before database insertion - Paid Amount: $paidAmount, Remaining Amount: $remainingAmount");
            $stmt->bindParam(':paidAmount', $paidAmount);
            $stmt->bindParam(':remainingAmount', $remainingAmount);
            $stmt->bindParam(':bookingStatus', $bookingStatus);
            $stmt->bindParam(':bookingSource', $bookingSource);
            $stmt->bindParam(':planType', $planType);
            $stmt->bindParam(':paymentType', $paymentType);
            $stmt->bindParam(':paymentStatus', $paymentStatus);
            $stmt->bindParam(':notes', $notes);
            $stmt->bindParam(':ownerReference', $ownerReference);
            $stmt->bindParam(':createdBy', $createdBy);
            
            
            // LOGGING BEFORE DATABASE INSERTION
            error_log("=== DATABASE INSERTION START ===");
            error_log("Contact email to insert: " . ($contactEmail ?: "EMPTY"));
            error_log("Contact person to insert: " . ($contactPerson ?: "EMPTY"));
            error_log("Company name to insert: " . ($companyName ?: "EMPTY"));
            error_log("=== END INSERTION DATA ===\n");
            // Bind email and contact fields
            $contactEmail = $data['contact_email'] ?? '';
            $contactPerson = $data['contact_person'] ?? '';
            $contactPhone = $data['contact_phone'] ?? '';
            $companyName = $data['company_name'] ?? '';
            $gstNumber = $data['gst_number'] ?? '';
            $billingAddress = $data['billing_address'] ?? '';
            $tariff = $data['tariff'] ?? 0;
            $numberOfDays = $numberOfDays;
            
            $stmt->bindParam(':contactEmail', $contactEmail);
            $stmt->bindParam(':contactPerson', $contactPerson);
            $stmt->bindParam(':contactPhone', $contactPhone);
            $stmt->bindParam(':companyName', $companyName);
            $stmt->bindParam(':gstNumber', $gstNumber);
            $stmt->bindParam(':billingAddress', $billingAddress);
            $stmt->bindParam(':tariff', $tariff);
            $stmt->bindParam(':numberOfDays', $numberOfDays);
            
            if (!$stmt->execute()) {
                throw new Exception("Error creating booking record");
            }
            
            error_log("Booking record created successfully with ID: " . $this->conn->lastInsertId());
            $bookingId = $this->conn->lastInsertId();
            
            // Note: We don't update room status to 'occupied' anymore
            // Room availability is now managed through date-based booking conflicts
            // This allows multiple bookings for the same room on different dates
            
            // Create corporate booking record if company details provided
            if (!empty($data['company_name']) || !empty($data['gst_number'])) {
                $corporateSql = "INSERT INTO corporate_bookings (booking_id, company_name, gst_number, contact_person, contact_phone, contact_email, billing_address, created_at) 
                                VALUES (:bookingId, :companyName, :gstNumber, :contactPerson, :contactPhone, :contactEmail, :billingAddress, NOW())";
                
                $stmt = $this->conn->prepare($corporateSql);
                $companyName = $data['company_name'] ?? '';
                $gstNumber = $data['gst_number'] ?? '';
                $contactPerson = $data['contact_person'] ?? '';
                $contactPhone = $data['contact_phone'] ?? '';
                $contactEmail = $data['contact_email'] ?? '';
                $billingAddress = $data['billing_address'] ?? '';
                
                $stmt->bindParam(':bookingId', $bookingId);
                $stmt->bindParam(':companyName', $companyName);
                $stmt->bindParam(':gstNumber', $gstNumber);
                $stmt->bindParam(':contactPerson', $contactPerson);
                $stmt->bindParam(':contactPhone', $contactPhone);
                $stmt->bindParam(':contactEmail', $contactEmail);
                $stmt->bindParam(':billingAddress', $billingAddress);
                $stmt->execute();
            }
            
            // Log owner reference booking if applicable
            if ($ownerReference) {
                // $this->logger->log('INFO', "Owner reference booking created: {$bookingRef} for room {$room['room_number']} - No payment required");
            }
            
            $this->conn->commit();
            
            // Send email immediately (fast synchronous)
            $emailToSend = !empty($contactEmail) ? $contactEmail : (isset($data['email']) ? $data['email'] : '');
            
            if (!empty($emailToSend) && $emailToSend !== '') {
                try {
                    require_once '../utils/email_service.php';
                    $emailService = new EmailService($this->conn);
                    
                    // Prepare email data
                    $emailData = [
                        'guest_name' => $data['guest_name'],
                        'booking_reference' => $bookingRef,
                        'room_number' => $room['room_number'],
                        'room_type' => $data['room_type'],
                        'check_in_date' => $data['check_in_date'],
                        'check_out_date' => $data['check_out_date'],
                        'adults' => $adults,
                        'children' => $children,
                        'total_amount' => $totalAmount,
                        'contact_email' => $emailToSend,
                        'contact_person' => $contactPerson,
                        'booking_id' => $bookingId
                    ];
                    
                    // Send confirmation email (fast)
                    $emailResult = $emailService->sendBookingConfirmation($emailData);
                    
                    if ($emailResult) {
                        error_log("✅ Email sent successfully to: $emailToSend");
                    } else {
                        error_log("❌ Failed to send email to: $emailToSend");
                    }
                } catch (Exception $e) {
                    error_log("❌ Email error: " . $e->getMessage());
                }
            }
            
            // Update room status based on booking type
            $current_date = date('Y-m-d');
            $check_in_date = $data['check_in_date'];
            
            // If it's a future booking, set status to 'booked', otherwise 'occupied'
            if ($check_in_date > $current_date) {
                $this->updateRoomStatus($room['room_number'], 'booked');
                error_log("Future booking created: Room {$room['room_number']} status set to 'booked' for check-in date: $check_in_date");
            } else {
                $this->updateRoomStatus($room['room_number'], 'occupied');
                error_log("Current booking created: Room {$room['room_number']} status set to 'occupied' for check-in date: $check_in_date");
            }
            
            // Send real-time notification to reception
            $this->sendBookingNotification($bookingId, $data, $guestId, $room, $bookingRef, $totalAmount, $numberOfDays);
            
            // Prepare success message based on payment type
            $successMessage = 'Booking created successfully';
            if ($ownerReference) {
                $successMessage = 'Owner reference booking confirmed! Room has been booked without payment requirement.';
            } else if ($data['payment_type'] === 'cash' && $data['booking_source'] === 'walk_in') {
                if ($paidAmount >= $totalAmount) {
                    $successMessage = 'Booking confirmed! Room has been booked and payment completed.';
                } else {
                    $successMessage = 'Booking confirmed! Room has been booked with partial payment. Amount due: ₹' . number_format($remainingAmount, 2);
                }
            }
            
            $responseData = [
                'success' => true,
                'message' => $successMessage,
                'data' => [
                    'booking_id' => $bookingId,
                    'booking_reference' => $bookingRef,
                    'guest_id' => $guestId,
                    'room_number' => $room['room_number'],
                    'total_amount' => $totalAmount,
                    'number_of_days' => $numberOfDays,
                    'paid_amount' => $paidAmount,
                    'remaining_amount' => $remainingAmount,
                    'payment_type' => $paymentType,
                    'payment_status' => $paymentStatus,
                    'booking_status' => $bookingStatus,
                    'requires_payment' => ($remainingAmount > 0 && !$ownerReference && $data['payment_type'] !== 'cash'),
                    'auto_confirmed' => ($data['payment_type'] === 'cash' && $data['booking_source'] === 'walk_in') || $ownerReference
                ]
            ];
            
                        // Response ready - booking confirmed quickly!
            
            return $responseData;
            
        } catch (Exception $e) {
            $this->conn->rollback();
            $this->logger->log('ERROR', 'createBooking: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    

    
    // Update room status
    private function updateRoomStatus($roomNumber, $status) {
        try {
            $updateSql = "UPDATE rooms SET status = :status WHERE room_number = :roomNumber";
            $stmt = $this->conn->prepare($updateSql);
            $stmt->bindParam(':status', $status);
            $stmt->bindParam(':roomNumber', $roomNumber);
            $stmt->execute();
            
            // Log the room status change
            // $this->logger->log('INFO', "Room {$roomNumber} status updated to {$status}");
            
        } catch (Exception $e) {
            // $this->logger->log('ERROR', "Failed to update room {$roomNumber} status: " . $e->getMessage());
            // Don't throw error as this is not critical for booking creation
        }
    }
    
    // Validate database consistency for room availability
    private function validateRoomAvailability($roomNumber, $checkIn, $checkOut) {
        try {
            // Check for any data inconsistencies
            $inconsistencyChecks = [];
            
            // Check 1: Room exists and has valid room type
            $roomCheckSql = "SELECT r.room_number, r.status, rt.name as room_type_name, rt.id as room_type_id
                            FROM rooms r 
                            JOIN room_types rt ON r.room_type_id = rt.id 
                            WHERE r.room_number = :roomNumber";
            
            $roomCheckStmt = $this->conn->prepare($roomCheckSql);
            $roomCheckStmt->bindParam(':roomNumber', $roomNumber);
            $roomCheckStmt->execute();
            $roomInfo = $roomCheckStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$roomInfo) {
                $inconsistencyChecks[] = "Room number $roomNumber does not exist in the database";
                return ['valid' => false, 'issues' => $inconsistencyChecks];
            }
            
            // Check 2: Room status is valid
            $validStatuses = ['available', 'occupied', 'cleaning', 'maintenance', 'booked'];
            if (!in_array($roomInfo['status'], $validStatuses)) {
                $inconsistencyChecks[] = "Room $roomNumber has invalid status: {$roomInfo['status']}";
            }
            
            // Check 3: Check for orphaned bookings (bookings without valid room)
            $orphanedBookingsSql = "SELECT COUNT(*) as count FROM bookings b 
                                   WHERE b.room_number = :roomNumber 
                                   AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.room_number = b.room_number)";
            
            $orphanedStmt = $this->conn->prepare($orphanedBookingsSql);
            $orphanedStmt->bindParam(':roomNumber', $roomNumber);
            $orphanedStmt->execute();
            $orphanedCount = $orphanedStmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            if ($orphanedCount > 0) {
                $inconsistencyChecks[] = "Found $orphanedCount orphaned bookings for room $roomNumber";
            }
            
            // Check 4: Check for overlapping bookings with invalid statuses
            $overlappingBookingsSql = "SELECT id, status, check_in_date, check_out_date 
                                     FROM bookings b 
                                     WHERE b.room_number = :roomNumber
                                     AND (
                                         (b.check_in_date < :checkOut AND b.check_out_date > :checkIn)
                                     )
                                     ORDER BY check_in_date ASC";
            
            $overlappingStmt = $this->conn->prepare($overlappingBookingsSql);
            $overlappingStmt->bindParam(':roomNumber', $roomNumber);
            $overlappingStmt->bindParam(':checkIn', $checkIn);
            $overlappingStmt->bindParam(':checkOut', $checkOut);
            $overlappingStmt->execute();
            $overlappingBookings = $overlappingStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($overlappingBookings as $booking) {
                if (!in_array($booking['status'], ['confirmed', 'checked_in', 'checked_out', 'cancelled'])) {
                    $inconsistencyChecks[] = "Booking #{$booking['id']} has invalid status: {$booking['status']}";
                }
            }
            
            // Check 5: Room type consistency
            if (empty($roomInfo['room_type_name'])) {
                $inconsistencyChecks[] = "Room $roomNumber has no associated room type";
            }
            
            return [
                'valid' => empty($inconsistencyChecks),
                'issues' => $inconsistencyChecks,
                'room_info' => $roomInfo,
                'overlapping_bookings' => $overlappingBookings
            ];
            
        } catch (Exception $e) {
            error_log("Error validating room availability: " . $e->getMessage());
            return ['valid' => false, 'issues' => ['Database error during validation: ' . $e->getMessage()]];
        }
    }

    // Handle file uploads
    public function handleFileUpload($file, $type) {
        try {
            if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
                return ['success' => false, 'message' => 'No file uploaded'];
            }
            
            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            $fileInfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($fileInfo, $file['tmp_name']);
            finfo_close($fileInfo);
            
            if (!in_array($mimeType, $allowedTypes)) {
                return ['success' => false, 'message' => 'Only JPEG and PNG files are allowed'];
            }
            
            // Validate file size (5MB)
            if ($file['size'] > 5 * 1024 * 1024) {
                return ['success' => false, 'message' => 'File size must be less than 5MB'];
            }
            
            // Generate unique filename
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = $type . '_' . uniqid() . '_' . time() . '.' . $extension;
            $filepath = '../uploads/' . $filename;
            
            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $filepath)) {
                return [
                    'success' => true,
                    'filename' => $filename,
                    'filepath' => $filepath
                ];
            } else {
                return ['success' => false, 'message' => 'Error saving file'];
            }
            
        } catch (Exception $e) {
            // $this->logger->log('ERROR', 'handleFileUpload: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Error processing file upload'];
        }
    }
    
    // Get booking sources
    public function getBookingSources() {
        return [
            'MMT' => 'MakeMyTrip',
            'Agoda' => 'Agoda',
            'Travel Plus' => 'Travel Plus',
            'Phone Call Booking' => 'Phone Call Booking',
            'walk_in' => 'Walk In'
        ];
    }
    
    // Get plan types
    public function getPlanTypes() {
        return [
            'EP' => 'European Plan (Room Only)',
            'CP' => 'Continental Plan (Room + Breakfast)'
        ];
    }
    
    // Get room types
    public function getRoomTypes() {
        return [
            'Executive' => 'Executive',
            'Deluxe' => 'Deluxe',
            'Suite' => 'Suite'
        ];
    }
    
    // Get ID proof types
    public function getIdProofTypes() {
        return [
            'Aadhar Number' => 'Aadhar Number',
            'Driving License' => 'Driving License',
            'Passport ID' => 'Passport ID',
            'Voter ID' => 'Voter ID'
        ];
    }
    
    // Get payment types
    public function getPaymentTypes() {
        return [
            'cash' => 'Cash',
            'upi' => 'UPI',
            'debit_card' => 'Debit Card',
            'credit_card' => 'Credit Card',
            'net_banking' => 'Net Banking',
            'online' => 'Online'
        ];
    }

    /**
     * Send real-time notification about new booking to reception
     */
    private function sendBookingNotification($bookingId, $data, $guestId, $room, $bookingRef, $totalAmount, $numberOfDays) {
        try {
            // Get guest information
            $guest_query = "SELECT first_name, last_name, email FROM guests WHERE id = :guest_id";
            $guest_stmt = $this->conn->prepare($guest_query);
            $guest_stmt->bindParam(':guest_id', $guestId);
            $guest_stmt->execute();
            $guest = $guest_stmt->fetch(PDO::FETCH_ASSOC);

            // Include notification service
            require_once '../utils/notification_service.php';
            $notificationService = new NotificationService($this->conn);

            // Send booking notification to reception
            $notification = [
                'type' => 'booking_update',
                'title' => 'New Booking Created',
                'message' => "New booking created for {$guest['first_name']} {$guest['last_name']} in Room {$room['room_number']}",
                'priority' => 'high',
                'details' => [
                    'booking_id' => $bookingId,
                    'booking_reference' => $bookingRef,
                    'guest_name' => $guest['first_name'] . ' ' . $guest['last_name'],
                    'guest_email' => $guest['email'],
                    'room_number' => $room['room_number'],
                    'room_type' => $room['room_type'] ?? 'Executive Room',
                    'check_in_date' => $data['check_in_date'],
                    'check_out_date' => $data['check_out_date'],
                    'adults' => $data['adults'],
                    'children' => $data['children'] ?? 0,
                    'total_amount' => $totalAmount,
                    'number_of_days' => $numberOfDays,
                    'payment_type' => $data['payment_type'] ?? 'cash',
                    'booking_source' => $data['booking_source'] ?? 'reception',
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ];

            $result = $notificationService->sendRealTimeNotification('reception', $notification);
            
            if ($result) {
                error_log("Booking notification sent successfully to reception for booking: $bookingRef");
            } else {
                error_log("Failed to send booking notification to reception for booking: $bookingRef");
            }

            return $result;

        } catch (Exception $e) {
            error_log("Error sending booking notification: " . $e->getMessage());
            // Don't fail the booking creation if notification fails
            return false;
        }
    }
}

// Initialize database connection
try {
    $database = new Database();
    $conn = $database->getConnection();
    
    // Initialize API
    $api = new NewBookingAPI($conn);
} catch (Exception $e) {
    error_log("Database connection error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($method) {
        case 'GET':
            switch ($action) {
                case 'availability':
                    $checkIn = $_GET['check_in'] ?? date('Y-m-d');
                    $checkOut = $_GET['check_out'] ?? date('Y-m-d', strtotime('+1 day'));
                    $roomType = $_GET['room_type'] ?? null;
                    
                    $result = $api->getRoomAvailability($checkIn, $checkOut, $roomType);
                    break;
                    
                case 'sources':
                    $result = ['success' => true, 'data' => $api->getBookingSources()];
                    break;
                    
                case 'plans':
                    $result = ['success' => true, 'data' => $api->getPlanTypes()];
                    break;
                    
                case 'room_types':
                    $result = ['success' => true, 'data' => $api->getRoomTypes()];
                    break;
                    
                case 'id_proof_types':
                    $result = ['success' => true, 'data' => $api->getIdProofTypes()];
                    break;
                    
                case 'payment_types':
                    $result = ['success' => true, 'data' => $api->getPaymentTypes()];
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        case 'POST':
            switch ($action) {
                case 'create':
                    // Handle FormData instead of JSON
                    $input = $_POST;
                    
                    // Log all received POST data for debugging
                    error_log("POST data received: " . print_r($_POST, true));
                    
                    // Handle file uploads if present
                    if (isset($_FILES['customer_photo']) && $_FILES['customer_photo']['error'] === UPLOAD_ERR_OK) {
                        $photoResult = $api->handleFileUpload($_FILES['customer_photo'], 'customer');
                        if ($photoResult['success']) {
                            $input['customer_photo_path'] = $photoResult['filename'];
                        }
                    }
                    
                    if (isset($_FILES['id_proof_photo']) && $_FILES['id_proof_photo']['error'] === UPLOAD_ERR_OK) {
                        $idResult = $api->handleFileUpload($_FILES['id_proof_photo'], 'id_proof');
                        if ($idResult['success']) {
                            $input['id_proof_photo_path'] = $idResult['filename'];
                        }
                    }
                    
                    $result = $api->createBooking($input);
                    break;
                    
                default:
                    $result = ['success' => false, 'message' => 'Invalid action'];
            }
            break;
            
        default:
            $result = ['success' => false, 'message' => 'Method not allowed'];
    }
    
} catch (Exception $e) {
    $result = ['success' => false, 'message' => 'Server error: ' . $e->getMessage()];
}

echo json_encode($result);
?>
