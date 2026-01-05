<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/response.php';

class AutoInvoiceGenerator {
    private $conn;
    private $response;

    public function __construct($db) {
        $this->conn = $db;
        $this->response = new Response();
    }

    /**
     * Automatically generate invoice for a new booking
     */
    public function generateInvoiceForBooking($booking_id, $guest_id, $pricing, $booking_reference, $room_number) {
        try {
            // Check if invoice already exists for this booking
            $check_stmt = $this->conn->prepare("SELECT id FROM invoices WHERE booking_id = ?");
            $check_stmt->bindParam(1, $booking_id);
            $check_stmt->execute();
            
            if ($check_stmt->fetch()) {
                error_log("Invoice already exists for booking ID: $booking_id");
                return true; // Invoice already exists
            }

            // Generate invoice number
            $invoice_number = 'INV-' . str_pad($booking_id, 6, '0', STR_PAD_LEFT);
            
            // Get room information
            $room_stmt = $this->conn->prepare("
                SELECT r.room_number, rt.name as room_type, rt.base_price 
                FROM rooms r 
                JOIN room_types rt ON r.room_type_id = rt.id 
                WHERE r.room_number = (SELECT room_number FROM bookings WHERE id = ?)
            ");
            $room_stmt->bindParam(1, $booking_id);
            $room_stmt->execute();
            $room = $room_stmt->fetch(PDO::FETCH_ASSOC);

            // Get booking information
            $booking_stmt = $this->conn->prepare("
                SELECT check_in_date, check_out_date, adults, children 
                FROM bookings 
                WHERE id = ?
            ");
            $booking_stmt->bindParam(1, $booking_id);
            $booking_stmt->execute();
            $booking = $booking_stmt->fetch(PDO::FETCH_ASSOC);

            // Calculate number of nights
            $check_in = new DateTime($booking['check_in_date']);
            $check_out = new DateTime($booking['check_out_date']);
            $nights = $check_in->diff($check_out)->days;

            // Create invoice
            $invoice_stmt = $this->conn->prepare("
                INSERT INTO invoices (
                    invoice_number, booking_id, guest_id, room_id, 
                    room_number, subtotal, total_amount, status, 
                    created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)
            ");

            $room_id = $this->getRoomId($booking_id);
            $room_rate = $pricing['per_night_rate'] ?? $room['base_price'] ?? 100;
            $total_amount = $pricing['total_amount'];
            $subtotal = $total_amount; // No tax/discount for now

            $invoice_stmt->bindValue(1, $invoice_number);
            $invoice_stmt->bindValue(2, $booking_id);
            $invoice_stmt->bindValue(3, $guest_id);
            $invoice_stmt->bindValue(4, $room_id);
            $invoice_stmt->bindValue(5, $room_number);
            $invoice_stmt->bindValue(6, $subtotal);
            $invoice_stmt->bindValue(7, $total_amount);
            $invoice_stmt->bindValue(8, 1);

            if ($invoice_stmt->execute()) {
                $invoice_id = $this->conn->lastInsertId();
                
                // Create invoice items
                $this->createInvoiceItems($invoice_id, $nights, $room_rate, $total_amount);
                
                error_log("Auto-generated invoice $invoice_number for booking $booking_id");
                return $invoice_id;
            } else {
                error_log("Failed to create invoice for booking $booking_id");
                return false;
            }

        } catch (Exception $e) {
            error_log("Error generating invoice for booking $booking_id: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get room ID from room number
     */
    private function getRoomId($booking_id) {
        $stmt = $this->conn->prepare("
            SELECT r.id FROM rooms r 
            JOIN bookings b ON r.room_number = b.room_number 
            WHERE b.id = ?
        ");
        $stmt->bindParam(1, $booking_id);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ? $result['id'] : null;
    }

    /**
     * Create invoice items
     */
    private function createInvoiceItems($invoice_id, $nights, $room_rate, $total_amount) {
        try {
            // Create room charge item
            $item_stmt = $this->conn->prepare("
                INSERT INTO invoice_items (
                    invoice_id, item_type, description, quantity, unit_price, total_price
                ) VALUES (?, 'room_charge', ?, ?, ?, ?)
            ");

            $description = "Room accommodation";
            $quantity = $nights;
            $unit_price = $room_rate;
            $total_price = $nights * $room_rate;

            $item_stmt->bindParam(1, $invoice_id);
            $item_stmt->bindParam(2, $description);
            $item_stmt->bindParam(3, $quantity);
            $item_stmt->bindParam(4, $unit_price);
            $item_stmt->bindParam(5, $total_price);

            $item_stmt->execute();

            // Add any additional charges if total doesn't match
            if ($total_amount > ($nights * $room_rate)) {
                $additional_amount = $total_amount - ($nights * $room_rate);
                if ($additional_amount > 0) {
                    $additional_stmt = $this->conn->prepare("
                        INSERT INTO invoice_items (
                            invoice_id, item_type, description, quantity, unit_price, total_price
                        ) VALUES (?, 'service', ?, ?, ?, ?)
                    ");

                    $additional_stmt->bindParam(1, $invoice_id);
                    $additional_stmt->bindParam(2, 'Additional charges');
                    $additional_stmt->bindParam(3, 1);
                    $additional_stmt->bindParam(4, $additional_amount);
                    $additional_stmt->bindParam(5, $additional_amount);

                    $additional_stmt->execute();
                }
            }

        } catch (Exception $e) {
            error_log("Error creating invoice items: " . $e->getMessage());
        }
    }
}

// This file is included by other scripts, not meant to be called directly
?>
