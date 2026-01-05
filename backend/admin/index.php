<?php
// Admin Section Index
// Redirect to dashboard or show admin login

session_start();

// Check if admin is logged in
if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    // Redirect to dashboard
    header("Location: dashboard.php");
    exit();
} else {
    // Show admin login page or redirect to main login
    header("Location: ../../login.html");
    exit();
}
?>
