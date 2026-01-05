<?php
require_once 'notification_service.php';

class CheckoutAlertService {
    private $conn;
    private $notificationService;
    
    public function __construct($conn) {
        $this->conn = $conn;
        $this->notificationService = new NotificationService($conn);
    }
    
    /**
     * Check for overdue checkouts and send alerts
     */
    public function checkOverdueCheckouts() {
        try {
            // Get all checked-in bookings where checkout time has passed
            $query = "
                SELECT 
                    b.id as booking_id,
                    b.booking_reference,
                    b.check_in_date,
                    b.check_out_date,
                    b.check_out_time,
                    b.total_amount,
                    b.paid_amount,
                    b.remaining_amount,
                    b.status,
                    g.first_name,
                    g.last_name,
                    g.phone,
                    g.email,
                    r.room_number,
                    rt.name as room_type,
                    TIMESTAMPDIFF(MINUTE, CONCAT(b.check_out_date, ' ', COALESCE(b.check_out_time, '11:00:00')), NOW()) as minutes_overdue
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.status = 'checked_in'
                AND CONCAT(b.check_out_date, ' ', COALESCE(b.check_out_time, '11:00:00')) < NOW()
                ORDER BY minutes_overdue DESC
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            $overdueBookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $alertsSent = 0;
            
            foreach ($overdueBookings as $booking) {
                // Send alert for each overdue booking
                $alertSent = $this->sendOverdueCheckoutAlert($booking);
                if ($alertSent) {
                    $alertsSent++;
                }
            }
            
            return [
                'success' => true,
                'overdue_bookings' => count($overdueBookings),
                'alerts_sent' => $alertsSent,
                'bookings' => $overdueBookings
            ];
            
        } catch (Exception $e) {
            error_log("Error checking overdue checkouts: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Send overdue checkout alert for a specific booking
     */
    private function sendOverdueCheckoutAlert($booking) {
        try {
            $minutesOverdue = $booking['minutes_overdue'];
            $hoursOverdue = floor($minutesOverdue / 60);
            $remainingMinutes = $minutesOverdue % 60;
            
            // Format overdue time
            if ($hoursOverdue > 0) {
                $overdueText = "{$hoursOverdue}h {$remainingMinutes}m";
            } else {
                $overdueText = "{$remainingMinutes}m";
            }
            
            // Determine alert priority based on how overdue
            $priority = 'medium';
            if ($minutesOverdue > 120) { // More than 2 hours
                $priority = 'high';
            } elseif ($minutesOverdue > 60) { // More than 1 hour
                $priority = 'medium';
            } else {
                $priority = 'low';
            }
            
            // Prepare notification data
            $notificationData = [
                'type' => 'checkout_overdue',
                'title' => 'Guest Overdue for Check-out',
                'message' => "Guest {$booking['first_name']} {$booking['last_name']} in Room {$booking['room_number']} is overdue for check-out by {$overdueText}",
                'priority' => $priority,
                'details' => [
                    'booking_id' => $booking['booking_id'],
                    'booking_reference' => $booking['booking_reference'],
                    'guest_name' => $booking['first_name'] . ' ' . $booking['last_name'],
                    'guest_phone' => $booking['phone'],
                    'guest_email' => $booking['email'],
                    'room_number' => $booking['room_number'],
                    'room_type' => $booking['room_type'],
                    'check_in_date' => $booking['check_in_date'],
                    'check_out_date' => $booking['check_out_date'],
                    'check_out_time' => $booking['check_out_time'],
                    'minutes_overdue' => $minutesOverdue,
                    'overdue_text' => $overdueText,
                    'total_amount' => $booking['total_amount'],
                    'paid_amount' => $booking['paid_amount'],
                    'remaining_amount' => $booking['remaining_amount'],
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ];
            
            // Send notification to reception channel
            $result = $this->notificationService->sendRealTimeNotification('reception', $notificationData);
            
            if ($result) {
                error_log("Overdue checkout alert sent for booking ID: {$booking['booking_id']} - Guest: {$booking['first_name']} {$booking['last_name']} - Room: {$booking['room_number']} - Overdue: {$overdueText}");
            } else {
                error_log("Failed to send overdue checkout alert for booking ID: {$booking['booking_id']}");
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("Error sending overdue checkout alert: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get all overdue checkouts without sending alerts
     */
    public function getOverdueCheckouts() {
        try {
            $query = "
                SELECT 
                    b.id as booking_id,
                    b.booking_reference,
                    b.check_in_date,
                    b.check_out_date,
                    b.check_out_time,
                    b.total_amount,
                    b.paid_amount,
                    b.remaining_amount,
                    b.status,
                    g.first_name,
                    g.last_name,
                    g.phone,
                    g.email,
                    r.room_number,
                    rt.name as room_type,
                    TIMESTAMPDIFF(MINUTE, CONCAT(b.check_out_date, ' ', COALESCE(b.check_out_time, '11:00:00')), NOW()) as minutes_overdue
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.status = 'checked_in'
                AND CONCAT(b.check_out_date, ' ', COALESCE(b.check_out_time, '11:00:00')) < NOW()
                ORDER BY minutes_overdue DESC
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Error getting overdue checkouts: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get upcoming checkouts (within next 2 hours)
     */
    public function getUpcomingCheckouts() {
        try {
            $query = "
                SELECT 
                    b.id as booking_id,
                    b.booking_reference,
                    b.check_in_date,
                    b.check_out_date,
                    b.check_out_time,
                    b.total_amount,
                    b.paid_amount,
                    b.remaining_amount,
                    b.status,
                    g.first_name,
                    g.last_name,
                    g.phone,
                    g.email,
                    r.room_number,
                    rt.name as room_type,
                    TIMESTAMPDIFF(MINUTE, NOW(), CONCAT(b.check_out_date, ' ', COALESCE(b.check_out_time, '11:00:00'))) as minutes_until_checkout
                FROM bookings b
                JOIN guests g ON b.guest_id = g.id
                JOIN rooms r ON b.room_id = r.id
                JOIN room_types rt ON r.room_type_id = rt.id
                WHERE b.status = 'checked_in'
                AND CONCAT(b.check_out_date, ' ', COALESCE(b.check_out_time, '11:00:00')) > NOW()
                AND CONCAT(b.check_out_date, ' ', COALESCE(b.check_out_time, '11:00:00')) <= DATE_ADD(NOW(), INTERVAL 2 HOUR)
                ORDER BY minutes_until_checkout ASC
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (Exception $e) {
            error_log("Error getting upcoming checkouts: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Send upcoming checkout reminders
     */
    public function sendUpcomingCheckoutReminders() {
        try {
            $upcomingCheckouts = $this->getUpcomingCheckouts();
            $remindersSent = 0;
            
            foreach ($upcomingCheckouts as $booking) {
                $minutesUntilCheckout = $booking['minutes_until_checkout'];
                
                // Only send reminder if checkout is within 1 hour
                if ($minutesUntilCheckout <= 60) {
                    $reminderSent = $this->sendUpcomingCheckoutReminder($booking);
                    if ($reminderSent) {
                        $remindersSent++;
                    }
                }
            }
            
            return [
                'success' => true,
                'upcoming_checkouts' => count($upcomingCheckouts),
                'reminders_sent' => $remindersSent
            ];
            
        } catch (Exception $e) {
            error_log("Error sending upcoming checkout reminders: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Send upcoming checkout reminder for a specific booking
     */
    private function sendUpcomingCheckoutReminder($booking) {
        try {
            $minutesUntilCheckout = $booking['minutes_until_checkout'];
            
            if ($minutesUntilCheckout <= 30) {
                $timeText = "in {$minutesUntilCheckout} minutes";
                $priority = 'high';
            } else {
                $hours = floor($minutesUntilCheckout / 60);
                $minutes = $minutesUntilCheckout % 60;
                $timeText = "in {$hours}h {$minutes}m";
                $priority = 'medium';
            }
            
            // Prepare notification data
            $notificationData = [
                'type' => 'checkout_reminder',
                'title' => 'Upcoming Check-out Reminder',
                'message' => "Guest {$booking['first_name']} {$booking['last_name']} in Room {$booking['room_number']} is due to check out {$timeText}",
                'priority' => $priority,
                'details' => [
                    'booking_id' => $booking['booking_id'],
                    'booking_reference' => $booking['booking_reference'],
                    'guest_name' => $booking['first_name'] . ' ' . $booking['last_name'],
                    'guest_phone' => $booking['phone'],
                    'guest_email' => $booking['email'],
                    'room_number' => $booking['room_number'],
                    'room_type' => $booking['room_type'],
                    'check_out_date' => $booking['check_out_date'],
                    'check_out_time' => $booking['check_out_time'],
                    'minutes_until_checkout' => $minutesUntilCheckout,
                    'time_text' => $timeText,
                    'total_amount' => $booking['total_amount'],
                    'paid_amount' => $booking['paid_amount'],
                    'remaining_amount' => $booking['remaining_amount'],
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ];
            
            // Send notification to reception channel
            $result = $this->notificationService->sendRealTimeNotification('reception', $notificationData);
            
            if ($result) {
                error_log("Upcoming checkout reminder sent for booking ID: {$booking['booking_id']} - Guest: {$booking['first_name']} {$booking['last_name']} - Room: {$booking['room_number']} - Time: {$timeText}");
            } else {
                error_log("Failed to send upcoming checkout reminder for booking ID: {$booking['booking_id']}");
            }
            
            return $result;
            
        } catch (Exception $e) {
            error_log("Error sending upcoming checkout reminder: " . $e->getMessage());
            return false;
        }
    }
}
?>
