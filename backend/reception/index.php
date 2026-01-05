<?php
// Reception Section Index
// Redirect to reception dashboard

session_start();

// Check if reception is logged in
if (isset($_SESSION['reception_logged_in']) && $_SESSION['reception_logged_in'] === true) {
    // Redirect to reception dashboard
    header("Location: dashboard_stats.php");
    exit();
} else {
    // Show reception login page or redirect to main login
    header("Location: ../../login.html");
    exit();
}
?>
