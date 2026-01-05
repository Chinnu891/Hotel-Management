<?php
require_once '../utils/cors_headers.php';
require_once '../config/database.php';
require_once '../utils/response.php';
require_once '../utils/checkout_alert_service.php';

$response = new Response();

try {
    $database = new Database();
    $conn = $database->getConnection();
    
    $checkoutAlertService = new CheckoutAlertService($conn);
    
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'check_overdue':
            // Check for overdue checkouts and send alerts
            $result = $checkoutAlertService->checkOverdueCheckouts();
            
            if ($result['success']) {
                echo json_encode($response->success('Checkout alerts processed', $result));
            } else {
                echo json_encode($response->error('Failed to process checkout alerts: ' . $result['error']));
            }
            break;
            
        case 'get_overdue':
            // Get overdue checkouts without sending alerts
            $overdueCheckouts = $checkoutAlertService->getOverdueCheckouts();
            
            echo json_encode($response->success('Overdue checkouts retrieved', [
                'overdue_bookings' => count($overdueCheckouts),
                'bookings' => $overdueCheckouts
            ]));
            break;
            
        case 'get_upcoming':
            // Get upcoming checkouts
            $upcomingCheckouts = $checkoutAlertService->getUpcomingCheckouts();
            
            echo json_encode($response->success('Upcoming checkouts retrieved', [
                'upcoming_bookings' => count($upcomingCheckouts),
                'bookings' => $upcomingCheckouts
            ]));
            break;
            
        case 'send_reminders':
            // Send upcoming checkout reminders
            $result = $checkoutAlertService->sendUpcomingCheckoutReminders();
            
            if ($result['success']) {
                echo json_encode($response->success('Checkout reminders processed', $result));
            } else {
                echo json_encode($response->error('Failed to process checkout reminders: ' . $result['error']));
            }
            break;
            
        case 'status':
            // Get overall status of checkout alerts
            $overdueCheckouts = $checkoutAlertService->getOverdueCheckouts();
            $upcomingCheckouts = $checkoutAlertService->getUpcomingCheckouts();
            
            echo json_encode($response->success('Checkout alert status', [
                'overdue_bookings' => count($overdueCheckouts),
                'upcoming_bookings' => count($upcomingCheckouts),
                'total_alerts' => count($overdueCheckouts) + count($upcomingCheckouts),
                'current_time' => date('Y-m-d H:i:s'),
                'overdue_bookings_list' => $overdueCheckouts,
                'upcoming_bookings_list' => $upcomingCheckouts
            ]));
            break;
            
        default:
            echo json_encode($response->error('Invalid action. Available actions: check_overdue, get_overdue, get_upcoming, send_reminders, status'));
            break;
    }
    
} catch (Exception $e) {
    error_log("Checkout alert API error: " . $e->getMessage());
    echo json_encode($response->error('Internal server error: ' . $e->getMessage()));
}
?>
