<?php
/**
 * Razorpay Configuration
 * Production-ready configuration for SV Royal Hotel
 */

// Razorpay API Configuration
// IMPORTANT: Replace these with your actual production keys from Razorpay Dashboard
define('RAZORPAY_KEY_ID', 'rzp_live_y4wL8tAIgkczGA'); // Your live key ID
define('RAZORPAY_KEY_SECRET', 'v39fZVOZbO7fdA8hBagKspqO'); // Your live secret key

// Environment (test/live) - Change to 'live' for production
define('RAZORPAY_ENVIRONMENT', 'live'); // Production environment

// Webhook secret (for payment verification) - Get this from Razorpay Dashboard
define('RAZORPAY_WEBHOOK_SECRET', 'YOUR_ACTUAL_WEBHOOK_SECRET');

// Currency
define('RAZORPAY_CURRENCY', 'INR');

// Company details for payment description
define('COMPANY_NAME', 'SV Royal Hotel');
define('COMPANY_EMAIL', 'billing@svroyal.com');
define('COMPANY_PHONE', '+91-XXXXXXXXXX');
define('COMPANY_ADDRESS', 'Your Hotel Address, City, State, PIN');

// Payment success/failure URLs - Update these for your domain
define('PAYMENT_SUCCESS_URL', 'https://yourdomain.com/payment/success');
define('PAYMENT_FAILURE_URL', 'https://yourdomain.com/payment/failure');

// Razorpay API endpoints
if (RAZORPAY_ENVIRONMENT === 'test') {
    define('RAZORPAY_API_URL', 'https://api.razorpay.com/v1');
    define('RAZORPAY_DASHBOARD_URL', 'https://dashboard.razorpay.com/');
} else {
    define('RAZORPAY_API_URL', 'https://api.razorpay.com/v1');
    define('RAZORPAY_DASHBOARD_URL', 'https://dashboard.razorpay.com/');
}

// Payment timeout (in seconds)
define('PAYMENT_TIMEOUT', 1800); // 30 minutes

// Maximum payment amount (in INR)
define('MAX_PAYMENT_AMOUNT', 100000); // 1 Lakh INR

// Minimum payment amount (in INR)
define('MIN_PAYMENT_AMOUNT', 100); // 100 INR

// Helper function to get Razorpay instance
function getRazorpayInstance() {
    require_once __DIR__ . '/../vendor/autoload.php';
    
    try {
        $api = new \Razorpay\Api\Api(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);
        return $api;
    } catch (Exception $e) {
        error_log("Failed to create Razorpay instance: " . $e->getMessage());
        return null;
    }
}

// Helper function to verify payment signature
function verifyPaymentSignature($paymentId, $orderId, $signature) {
    try {
        $api = getRazorpayInstance();
        if (!$api) {
            return false;
        }
        
        $attributes = array(
            'razorpay_order_id' => $orderId,
            'razorpay_payment_id' => $paymentId,
            'razorpay_signature' => $signature
        );
        
        $api->utility->verifyPaymentSignature($attributes);
        return true;
    } catch (Exception $e) {
        error_log("Payment signature verification failed: " . $e->getMessage());
        return false;
    }
}

// Helper function to format amount (Razorpay expects amount in smallest currency unit - paise for INR)
function formatAmountForRazorpay($amount) {
    return (int)($amount * 100); // Convert to paise
}

// Helper function to format amount from Razorpay (convert from paise to rupees)
function formatAmountFromRazorpay($amount) {
    return $amount / 100; // Convert from paise to rupees
}

// Helper function to validate payment amount
function validatePaymentAmount($amount) {
    if ($amount < MIN_PAYMENT_AMOUNT) {
        return ['valid' => false, 'message' => 'Payment amount is too low'];
    }
    if ($amount > MAX_PAYMENT_AMOUNT) {
        return ['valid' => false, 'message' => 'Payment amount exceeds maximum limit'];
    }
    return ['valid' => true, 'message' => 'Amount is valid'];
}

// Helper function to get environment status
function getRazorpayEnvironment() {
    return RAZORPAY_ENVIRONMENT;
}

// Helper function to check if in test mode
function isTestMode() {
    return RAZORPAY_ENVIRONMENT === 'test';
}

// Helper function to get dashboard URL
function getRazorpayDashboardUrl() {
    return RAZORPAY_DASHBOARD_URL;
}
?>
