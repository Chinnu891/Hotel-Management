<?php
/**
 * Automatic Email Trigger System
 * This script monitors bookings and automatically sends confirmation emails
 * when a booking status becomes "confirmed"
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/email_service.php';

class AutoEmailTrigger {
    private $conn;
    private $emailService;
    
    public function __construct($db) {
        $this->conn = $db;
        $this->emailService = new EmailService($this->conn);
    }
    
    /**
     * Check for confirmed bookings that haven't received confirmation emails
     */
    public function processUnsentEmails() {
        try {
            // Only output when run directly from command line, not when included as library
            if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                echo "🔍 Checking for confirmed bookings without emails...\n";
            }
            
            // Find confirmed bookings that don't have confirmation emails sent
            $query = "
                SELECT DISTINCT b.id, b.booking_reference, b.status, b.created_at,
                       g.first_name, g.last_name, g.email, g.phone,
                       r.room_number, rt.name as room_type
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                LEFT JOIN email_logs el ON (el.reference_id = b.id AND el.email_type = 'booking_confirmation')
                WHERE b.status = 'confirmed'
                AND el.id IS NULL
                AND g.email IS NOT NULL 
                AND g.email != ''
                ORDER BY b.created_at DESC
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (empty($bookings)) {
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "✅ No confirmed bookings found that need emails\n";
                }
                return true;
            }
            
            if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                echo "📧 Found " . count($bookings) . " confirmed booking(s) that need confirmation emails:\n\n";
            }
            
            $success_count = 0;
            $failed_count = 0;
            
            foreach ($bookings as $booking) {
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "📋 Processing Booking ID: " . $booking['id'] . "\n";
                    echo "   Reference: " . $booking['booking_reference'] . "\n";
                    echo "   Guest: " . $booking['first_name'] . " " . $booking['last_name'] . "\n";
                    echo "   Email: " . $booking['email'] . "\n";
                    echo "   Room: " . $booking['room_number'] . " (" . $booking['room_type'] . ")\n";
                }
                
                // Send confirmation email
                $result = $this->sendBookingConfirmationEmail($booking);
                
                if ($result) {
                    $success_count++;
                    if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                        echo "   ✅ Email sent successfully!\n";
                    }
                } else {
                    $failed_count++;
                    if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                        echo "   ❌ Email failed to send!\n";
                    }
                }
                
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "   " . str_repeat("-", 50) . "\n";
                }
            }
            
            if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                echo "\n📊 Summary:\n";
                echo "   ✅ Successfully sent: $success_count emails\n";
                echo "   ❌ Failed to send: $failed_count emails\n";
            }
            
            return true;
            
        } catch (Exception $e) {
            if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                echo "❌ Error in processUnsentEmails: " . $e->getMessage() . "\n";
            }
            return false;
        }
    }
    
    /**
     * Send booking confirmation email for a specific booking
     */
    private function sendBookingConfirmationEmail($booking) {
        try {
            // Calculate number of nights
            $check_in = new DateTime($booking['check_in_date'] ?? date('Y-m-d'));
            $check_out = new DateTime($booking['check_out_date'] ?? date('Y-m-d', strtotime('+1 day')));
            $nights = $check_in->diff($check_out)->days;
            
            // Generate invoice number if not exists
            $invoice_number = 'INV-' . date('Y') . '-' . str_pad($booking['id'], 6, '0', STR_PAD_LEFT);
            
            // Prepare email data
            $email_data = [
                'email' => $booking['email'],
                'guest_name' => $booking['first_name'] . ' ' . $booking['last_name'],
                'booking_reference' => $booking['booking_reference'],
                'invoice_number' => $invoice_number,
                'check_in_date' => $booking['check_in_date'] ?? date('Y-m-d'),
                'check_out_date' => $booking['check_out_date'] ?? date('Y-m-d', strtotime('+1 day')),
                'nights' => $nights,
                'room_number' => $booking['room_number'],
                'room_type' => $booking['room_type'],
                'total_amount' => $booking['total_amount'] ?? 0,
                'adults' => $booking['adults'] ?? 1,
                'children' => $booking['children'] ?? 0,
                'booking_id' => $booking['id']
            ];
            
            // Send the email
            $email_sent = $this->emailService->sendBookingConfirmationEmail($email_data);
            
            if ($email_sent) {
                // Log successful email
                $this->logActivity(1, 'auto_email_sent', 'bookings', $booking['id'], "Auto confirmation email sent to: " . $booking['email']);
                error_log("Auto confirmation email sent successfully to: " . $booking['email'] . " for booking: " . $booking['booking_reference']);
            }
            
            return $email_sent;
            
        } catch (Exception $e) {
            error_log("Error sending auto confirmation email: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Log activity to database
     */
    private function logActivity($user_id, $action, $table_name, $record_id, $details) {
        try {
            $query = "INSERT INTO activity_logs (user_id, action, table_name, record_id, details, ip_address) 
                      VALUES (:user_id, :action, :table_name, :record_id, :details, :ip_address)";
            
            $stmt = $this->conn->prepare($query);
            $ip_address = $_SERVER['REMOTE_ADDR'] ?? 'auto-system';
            
            $stmt->bindParam(':user_id', $user_id);
            $stmt->bindParam(':action', $action);
            $stmt->bindParam(':table_name', $table_name);
            $stmt->bindParam(':record_id', $record_id);
            $stmt->bindParam(':details', $details);
            $stmt->bindParam(':ip_address', $ip_address);
            
            $stmt->execute();
        } catch (Exception $e) {
            error_log("Failed to log auto email activity: " . $e->getMessage());
        }
    }
    
    /**
     * Process a specific booking ID
     */
    public function processSpecificBooking($booking_id) {
        try {
            // Only output when run directly from command line, not when included as library
            if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                echo "🔍 Processing specific booking ID: $booking_id\n";
            }
            
            // Get booking details
            $query = "
                SELECT b.*, g.first_name, g.last_name, g.email, g.phone,
                       r.room_number, rt.name as room_type
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.id = :booking_id AND b.status = 'confirmed'
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->execute();
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$booking) {
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "❌ Booking not found or not confirmed\n";
                }
                return false;
            }
            
            if (!$booking['email']) {
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "❌ No email address found for guest\n";
                }
                return false;
            }
            
            // Check if email already sent
            $stmt = $this->conn->prepare("
                SELECT id FROM email_logs 
                WHERE reference_id = :booking_id 
                AND email_type = 'booking_confirmation'
            ");
            $stmt->bindParam(':booking_id', $booking_id);
            $stmt->execute();
            
            if ($stmt->rowCount() > 0) {
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "ℹ️  Email already sent for this booking\n";
                }
                return true;
            }
            
            // Send email
            $result = $this->sendBookingConfirmationEmail($booking);
            
            if ($result) {
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "✅ Confirmation email sent successfully to: " . $booking['email'] . "\n";
                }
            } else {
                if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                    echo "❌ Failed to send confirmation email\n";
                }
            }
            
            return $result;
            
        } catch (Exception $e) {
            if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
                echo "❌ Error processing specific booking: " . $e->getMessage() . "\n";
            }
            return false;
        }
    }
}

// If this script is run directly, process unsent emails
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    try {
        $database = new Database();
        $db = $database->getConnection();
        
        $autoTrigger = new AutoEmailTrigger($db);
        
        // Check for command line arguments
        if (isset($argv[1]) && is_numeric($argv[1])) {
            // Process specific booking ID
            $booking_id = (int)$argv[1];
            $autoTrigger->processSpecificBooking($booking_id);
        } else {
            // Process all unsent emails
            $autoTrigger->processUnsentEmails();
        }
        
    } catch (Exception $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
    }
}
?>
