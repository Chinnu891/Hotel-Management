<?php
require_once 'logger.php';

class PaymentNotificationService {
    private $logger;
    private $websocketUrl;
    
    public function __construct($db) {
        $this->logger = new Logger($db);
        $this->websocketUrl = 'http://localhost:8080'; // WebSocket server URL
    }
    
    /**
     * Send real-time notification for new payment
     */
    public function notifyNewPayment($paymentData) {
        try {
            $notification = [
                'type' => 'payment_received',
                'channel' => 'reception',
                'data' => [
                    'payment_id' => $paymentData['id'],
                    'receipt_number' => $paymentData['receipt_number'],
                    'amount' => $paymentData['amount'],
                    'payment_method' => $paymentData['payment_method'],
                    'guest_name' => $paymentData['guest_name'],
                    'room_number' => $paymentData['room_number'] ?? null,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'payment_type' => $this->getPaymentType($paymentData['payment_method'])
                ],
                'timestamp' => time()
            ];
            
            // Send to WebSocket server
            $this->sendToWebSocket($notification);
            
            // Log the notification
            $this->logger->log(
                $paymentData['processed_by'] ?? 0,
                'payment_notification_sent',
                'payments',
                $paymentData['id'],
                "Payment notification sent for receipt {$paymentData['receipt_number']}"
            );
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'payment_notifications',
                0,
                "Failed to send payment notification: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Send real-time notification for payment status change
     */
    public function notifyPaymentStatusChange($paymentData, $oldStatus, $newStatus) {
        try {
            $notification = [
                'type' => 'payment_status_changed',
                'channel' => 'reception',
                'data' => [
                    'payment_id' => $paymentData['id'],
                    'receipt_number' => $paymentData['receipt_number'],
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                    'amount' => $paymentData['amount'],
                    'guest_name' => $paymentData['guest_name'],
                    'timestamp' => date('Y-m-d H:i:s')
                ],
                'timestamp' => time()
            ];
            
            // Send to WebSocket server
            $this->sendToWebSocket($notification);
            
            // Log the notification
            $this->logger->log(
                $paymentData['processed_by'] ?? 0,
                'status_change_notification_sent',
                'payments',
                $paymentData['id'],
                "Payment status change notification sent: {$oldStatus} → {$newStatus}"
            );
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'payment_notifications',
                0,
                "Failed to send status change notification: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Send real-time notification for refund
     */
    public function notifyRefund($paymentData, $refundAmount, $refundReason) {
        try {
            $notification = [
                'type' => 'payment_refunded',
                'channel' => 'reception',
                'data' => [
                    'payment_id' => $paymentData['id'],
                    'receipt_number' => $paymentData['receipt_number'],
                    'original_amount' => $paymentData['amount'],
                    'refund_amount' => $refundAmount,
                    'refund_reason' => $refundReason,
                    'guest_name' => $paymentData['guest_name'],
                    'timestamp' => date('Y-m-d H:i:s')
                ],
                'timestamp' => time()
            ];
            
            // Send to WebSocket server
            $this->sendToWebSocket($notification);
            
            // Log the notification
            $this->logger->log(
                $paymentData['processed_by'] ?? 0,
                'refund_notification_sent',
                'payments',
                $paymentData['id'],
                "Refund notification sent for receipt {$paymentData['receipt_number']}"
            );
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'payment_notifications',
                0,
                "Failed to send refund notification: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Send real-time notification for failed payment
     */
    public function notifyFailedPayment($paymentData, $failureReason) {
        try {
            $notification = [
                'type' => 'payment_failed',
                'channel' => 'reception',
                'data' => [
                    'payment_id' => $paymentData['id'],
                    'receipt_number' => $paymentData['receipt_number'],
                    'amount' => $paymentData['amount'],
                    'payment_method' => $paymentData['payment_method'],
                    'failure_reason' => $failureReason,
                    'guest_name' => $paymentData['guest_name'],
                    'timestamp' => date('Y-m-d H:i:s')
                ],
                'timestamp' => time()
            ];
            
            // Send to WebSocket server
            $this->sendToWebSocket($notification);
            
            // Log the notification
            $this->logger->log(
                $paymentData['processed_by'] ?? 0,
                'failure_notification_sent',
                'payments',
                $paymentData['id'],
                "Payment failure notification sent for receipt {$paymentData['receipt_number']}"
            );
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'payment_notifications',
                0,
                "Failed to send failure notification: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Send real-time notification for online payment verification
     */
    public function notifyOnlinePaymentVerification($paymentData, $verificationStatus) {
        try {
            $notification = [
                'type' => 'online_payment_verified',
                'channel' => 'reception',
                'data' => [
                    'payment_id' => $paymentData['id'],
                    'receipt_number' => $paymentData['receipt_number'],
                    'amount' => $paymentData['amount'],
                    'verification_status' => $verificationStatus,
                    'transaction_id' => $paymentData['transaction_id'],
                    'guest_name' => $paymentData['guest_name'],
                    'timestamp' => date('Y-m-d H:i:s')
                ],
                'timestamp' => time()
            ];
            
            // Send to WebSocket server
            $this->sendToWebSocket($notification);
            
            // Log the notification
            $this->logger->log(
                $paymentData['processed_by'] ?? 0,
                'verification_notification_sent',
                'payments',
                $paymentData['id'],
                "Online payment verification notification sent: {$verificationStatus}"
            );
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'payment_notifications',
                0,
                "Failed to send verification notification: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Get payment type for display
     */
    private function getPaymentType($paymentMethod) {
        $onlineMethods = ['credit_card', 'debit_card', 'upi', 'online_wallet'];
        return in_array($paymentMethod, $onlineMethods) ? 'online' : 'cash';
    }
    
    /**
     * Send notification to WebSocket server
     */
    private function sendToWebSocket($notification) {
        try {
            // Use cURL to send notification to WebSocket server
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $this->websocketUrl . '/notify');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($notification));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Accept: application/json'
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode !== 200) {
                throw new Exception("WebSocket server returned HTTP {$httpCode}");
            }
            
            return true;
            
        } catch (Exception $e) {
            // If WebSocket server is not available, log the error but don't fail
            $this->logger->log(
                0,
                'warning',
                'payment_notifications',
                0,
                "WebSocket server not available: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Broadcast payment update to all connected clients
     */
    public function broadcastPaymentUpdate($channel, $data) {
        try {
            $notification = [
                'type' => 'payment_update',
                'channel' => $channel,
                'data' => $data,
                'timestamp' => time()
            ];
            
            $this->sendToWebSocket($notification);
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'payment_notifications',
                0,
                "Failed to broadcast payment update: " . $e->getMessage()
            );
            return false;
        }
    }
    
    /**
     * Send daily payment summary notification
     */
    public function sendDailyPaymentSummary($summaryData) {
        try {
            $notification = [
                'type' => 'daily_payment_summary',
                'channel' => 'reception',
                'data' => [
                    'date' => date('Y-m-d'),
                    'total_payments' => $summaryData['total_payments'],
                    'total_amount' => $summaryData['total_amount'],
                    'cash_payments' => $summaryData['cash_payments'],
                    'online_payments' => $summaryData['online_payments'],
                    'pending_amount' => $summaryData['pending_amount'],
                    'timestamp' => date('Y-m-d H:i:s')
                ],
                'timestamp' => time()
            ];
            
            $this->sendToWebSocket($notification);
            
            // Log the summary
            $this->logger->log(
                0,
                'daily_summary_sent',
                'payment_notifications',
                0,
                "Daily payment summary sent: {$summaryData['total_payments']} payments, ₹{$summaryData['total_amount']}"
            );
            
            return true;
            
        } catch (Exception $e) {
            $this->logger->log(
                0,
                'error',
                'payment_notifications',
                0,
                "Failed to send daily summary: " . $e->getMessage()
            );
            return false;
        }
    }
}
?>

