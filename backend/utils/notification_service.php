<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/logger.php';

class NotificationService {
    private $pdo;
    private $logger;
    private $notification_endpoint_url;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        $this->logger = new Logger($pdo);
        $this->notification_endpoint_url = 'http://localhost/hotel-management/backend/notification_endpoint.php';
    }
    
    /**
     * Send real-time notification to WebSocket server
     */
    public function sendRealTimeNotification($channel, $data) {
        try {
            $currentTimestamp = date('Y-m-d H:i:s');
            
            $notification = [
                'type' => 'notification',
                'channel' => $channel,
                'data' => array_merge($data, [
                    'timestamp' => $currentTimestamp,
                    'created_at' => $currentTimestamp
                ]),
                'timestamp' => $currentTimestamp
            ];
            
            // Send to WebSocket server via HTTP endpoint
            $this->sendToWebSocketServer($notification);
            
            // Log the notification
            $this->logger->log('info', "Real-time notification sent to channel: $channel");
            
            return true;
        } catch (Exception $e) {
            $this->logger->log('error', "Failed to send real-time notification: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send maintenance update notification
     */
    public function sendMaintenanceUpdate($maintenance_id, $action, $details = []) {
        $notification = [
            'type' => 'maintenance_update',
            'title' => 'Maintenance Update',
            'message' => "Maintenance request {$action} for Room {$details['room_number']}",
            'priority' => $details['priority'] ?? 'medium',
            'details' => $details,
            'maintenance_id' => $maintenance_id,
            'action' => $action
        ];
        
        return $this->sendRealTimeNotification('maintenance', $notification);
    }
    
    /**
     * Send housekeeping update notification
     */
    public function sendHousekeepingUpdate($task_id, $action, $details = []) {
        $notification = [
            'type' => 'housekeeping_update',
            'title' => 'Housekeeping Update',
            'message' => "Housekeeping task {$action} for Room {$details['room_number']}",
            'priority' => $details['priority'] ?? 'medium',
            'details' => $details,
            'task_id' => $task_id,
            'action' => $action
        ];
        
        return $this->sendRealTimeNotification('housekeeping', $notification);
    }
    
    /**
     * Send room status update notification
     */
    public function sendRoomStatusUpdate($room_id, $old_status, $new_status, $reason = '') {
        $notification = [
            'type' => 'room_status_update',
            'title' => 'Room Status Update',
            'message' => "Room {$room_id} status changed from {$old_status} to {$new_status}",
            'priority' => 'medium',
            'details' => [
                'room_id' => $room_id,
                'old_status' => $old_status,
                'new_status' => $new_status,
                'reason' => $reason
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }
    
    /**
     * Send booking update notification
     */
    public function sendBookingUpdate($booking_id, $action, $details = []) {
        $notification = [
            'type' => 'booking_update',
            'title' => 'Booking Update',
            'message' => "Booking {$action} for Room {$details['room_number']}",
            'priority' => 'medium',
            'details' => array_merge($details, [
                'booking_id' => $booking_id,
                'action' => $action
            ])
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }
    
    /**
     * Send billing update notification
     */
    public function sendBillingUpdate($billing_id, $action, $details = []) {
        $notification = [
            'type' => 'billing_update',
            'title' => 'Billing Update',
            'message' => "Billing record {$action}",
            'priority' => 'medium',
            'details' => array_merge($details, [
                'billing_id' => $billing_id,
                'action' => $action
            ])
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }
    
    /**
     * Send system alert notification
     */
    public function sendSystemAlert($alert_type, $message, $severity = 'info', $target_channels = ['admin']) {
        $notification = [
            'type' => 'system_alert',
            'title' => 'System Alert',
            'message' => $message,
            'priority' => $severity,
            'alert_type' => $alert_type,
            'severity' => $severity
        ];
        
        // Send to specified channels
        $success = true;
        foreach ($target_channels as $channel) {
            $result = $this->sendRealTimeNotification($channel, $notification);
            if (!$result) {
                $success = false;
            }
        }
        
        return $success;
    }
    
    /**
     * Send to notification endpoint
     */
    private function sendToWebSocketServer($data) {
        try {
            // Send via HTTP to notification endpoint
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $this->notification_endpoint_url);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $this->logger->log('info', "Notification sent to endpoint successfully");
            } else {
                $this->logger->log('warning', "Notification endpoint returned HTTP code: $httpCode");
            }
            
            return true;
        } catch (Exception $e) {
            $this->logger->log('error', "Failed to send to notification endpoint: " . $e->getMessage());
            // Still return true since we logged to database
            return true;
        }
    }
    
    /**
     * Get notification history for a specific channel
     */
    public function getNotificationHistory($channel, $limit = 50) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT * FROM notification_logs 
                WHERE channel = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            $stmt->execute([$channel, $limit]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->logger->log('error', "Failed to get notification history: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Log notification to database
     */
    public function logNotification($channel, $type, $data) {
        try {
            $stmt = $this->pdo->prepare("
                INSERT INTO notification_logs (channel, type, data, created_at)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([$channel, $type, json_encode($data)]);
            return true;
        } catch (Exception $e) {
            $this->logger->log('error', "Failed to log notification: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send payment confirmation notification
     */
    public function sendPaymentConfirmation($payment_id, $amount, $guest_name, $room_number, $payment_method, $booking_reference) {
        $notification = [
            'type' => 'payment_confirmation',
            'title' => 'Payment Confirmed',
            'message' => "Payment of ₹{$amount} received from {$guest_name} for Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'payment_id' => $payment_id,
                'amount' => $amount,
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'payment_method' => $payment_method,
                'booking_reference' => $booking_reference,
                'timestamp' => date('Y-m-d H:i:s')
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }
    
    /**
     * Send check-in notification
     */
    public function sendCheckInNotification($guest_name, $room_number, $booking_reference) {
        $notification = [
            'type' => 'check_in',
            'title' => 'Guest Check-in',
            'message' => "{$guest_name} has checked into Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'booking_reference' => $booking_reference,
                'check_in_time' => date('H:i')
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }
    
    /**
     * Send check-out notification
     */
    public function sendCheckOutNotification($guest_name, $room_number, $check_out_time) {
        $notification = [
            'type' => 'check_out',
            'title' => 'Guest Check-out',
            'message' => "{$guest_name} has checked out of Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'check_out_time' => $check_out_time
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send guest check-in notification
     */
    public function sendGuestCheckIn($guest_name, $room_number, $check_in_time, $booking_reference, $duration) {
        $notification = [
            'type' => 'guest_checkin',
            'title' => 'Guest Checked In',
            'message' => "{$guest_name} has checked into Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'check_in_time' => $check_in_time,
                'booking_reference' => $booking_reference,
                'duration' => $duration
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send guest check-out notification
     */
    public function sendGuestCheckOut($guest_name, $room_number, $check_out_time, $booking_reference, $total_amount) {
        $notification = [
            'type' => 'guest_checkout',
            'title' => 'Guest Checked Out',
            'message' => "{$guest_name} has checked out of Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'check_out_time' => $check_out_time,
                'booking_reference' => $booking_reference,
                'total_amount' => $total_amount
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send room booking confirmed notification
     */
    public function sendRoomBookingConfirmed($guest_name, $room_number, $check_in_date, $check_out_date, $booking_reference, $total_amount) {
        $notification = [
            'type' => 'booking_confirmed',
            'title' => 'Booking Confirmed',
            'message' => "Booking confirmed for {$guest_name} in Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'check_in_date' => $check_in_date,
                'check_out_date' => $check_out_date,
                'booking_reference' => $booking_reference,
                'total_amount' => $total_amount
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send room booking cancelled notification
     */
    public function sendRoomBookingCancelled($guest_name, $room_number, $booking_reference, $cancellation_reason) {
        $notification = [
            'type' => 'booking_cancelled',
            'title' => 'Booking Cancelled',
            'message' => "Booking cancelled for {$guest_name} in Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'booking_reference' => $booking_reference,
                'cancellation_reason' => $cancellation_reason
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send room available notification
     */
    public function sendRoomAvailable($room_number, $last_guest, $cleaning_status) {
        $notification = [
            'type' => 'room_available',
            'title' => 'Room Available',
            'message' => "Room {$room_number} is now available",
            'priority' => 'low',
            'details' => [
                'room_number' => $room_number,
                'last_guest' => $last_guest,
                'cleaning_status' => $cleaning_status
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send check-out deadline alert
     */
    public function sendCheckoutDeadlineAlert($guest_name, $room_number, $check_out_time, $deadline_hours) {
        $notification = [
            'type' => 'checkout_deadline',
            'title' => 'Check-out Deadline Alert',
            'message' => "Check-out deadline approaching for {$guest_name} in Room {$room_number}",
            'priority' => 'high',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'check_out_time' => $check_out_time,
                'deadline_hours' => $deadline_hours
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send early check-out notification
     */
    public function sendEarlyCheckout($guest_name, $room_number, $original_checkout, $actual_checkout, $booking_reference) {
        $notification = [
            'type' => 'early_checkout',
            'title' => 'Early Check-out',
            'message' => "{$guest_name} checked out early from Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'original_checkout' => $original_checkout,
                'actual_checkout' => $actual_checkout,
                'booking_reference' => $booking_reference
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send late check-out notification
     */
    public function sendLateCheckout($guest_name, $room_number, $original_checkout, $actual_checkout, $booking_reference, $late_fee) {
        $notification = [
            'type' => 'late_checkout',
            'title' => 'Late Check-out',
            'message' => "{$guest_name} checked out late from Room {$room_number}",
            'priority' => 'high',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'original_checkout' => $original_checkout,
                'actual_checkout' => $actual_checkout,
                'booking_reference' => $booking_reference,
                'late_fee' => $late_fee
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send payment overdue notification
     */
    public function sendPaymentOverdue($guest_name, $room_number, $amount_due, $days_overdue, $booking_reference) {
        $notification = [
            'type' => 'payment_overdue',
            'title' => 'Payment Overdue',
            'message' => "Payment overdue for {$guest_name} in Room {$room_number}",
            'priority' => 'high',
            'details' => [
                'guest_name' => $guest_name,
                'room_number' => $room_number,
                'amount_due' => $amount_due,
                'days_overdue' => $days_overdue,
                'booking_reference' => $booking_reference
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send room maintenance completed notification
     */
    public function sendRoomMaintenanceCompleted($room_number, $issue_type, $technician_name, $completion_time) {
        $notification = [
            'type' => 'maintenance_completed',
            'title' => 'Maintenance Completed',
            'message' => "Maintenance completed for Room {$room_number} by {$technician_name}",
            'priority' => 'medium',
            'details' => [
                'room_number' => $room_number,
                'issue_type' => $issue_type,
                'technician_name' => $technician_name,
                'completion_time' => $completion_time
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }

    /**
     * Send housekeeping task completed notification
     */
    public function sendHousekeepingCompleted($room_number, $task_type, $staff_name, $completion_time, $rating) {
        $notification = [
            'type' => 'housekeeping_completed',
            'title' => 'Housekeeping Completed',
            'message' => "Housekeeping task completed for Room {$room_number}",
            'priority' => 'medium',
            'details' => [
                'room_number' => $room_number,
                'task_type' => $task_type,
                'staff_name' => $staff_name,
                'completion_time' => $completion_time,
                'rating' => $rating
            ]
        ];
        
        return $this->sendRealTimeNotification('reception', $notification);
    }
}
?>
