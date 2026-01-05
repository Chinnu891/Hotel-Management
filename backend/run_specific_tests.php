<?php
// Script to run specific test categories
// Usage: php run_specific_tests.php [category]

$categories = [
    'basic' => [
        'test_prebooked_scenario.php' => 'Basic Pre-booked Scenario',
        'test_booking_conflict.php' => 'Booking Conflict Detection',
        'test_same_day_booking.php' => 'Same-Day Booking Logic',
        'test_extend_booking.php' => 'Booking Extension'
    ],
    'edge' => [
        'test_prebooked_edge_cases.php' => 'Edge Cases'
    ],
    'performance' => [
        'test_prebooked_performance.php' => 'Performance Testing'
    ],
    'integration' => [
        'test_prebooked_integration.php' => 'Integration Testing'
    ],
    'security' => [
        'test_prebooked_security.php' => 'Security Testing'
    ],
    'all' => [
        'test_prebooked_scenario.php' => 'Basic Pre-booked Scenario',
        'test_booking_conflict.php' => 'Booking Conflict Detection',
        'test_same_day_booking.php' => 'Same-Day Booking Logic',
        'test_extend_booking.php' => 'Booking Extension',
        'test_prebooked_edge_cases.php' => 'Edge Cases',
        'test_prebooked_performance.php' => 'Performance Testing',
        'test_prebooked_integration.php' => 'Integration Testing',
        'test_prebooked_security.php' => 'Security Testing'
    ]
];

// Get category from command line argument
$category = $argv[1] ?? 'all';

if (!isset($categories[$category])) {
    echo "Available categories:\n";
    foreach (array_keys($categories) as $cat) {
        echo "- $cat\n";
    }
    echo "\nUsage: php run_specific_tests.php [category]\n";
    echo "Example: php run_specific_tests.php basic\n";
    exit;
}

echo "Running {$category} tests...\n";
echo str_repeat("=", 50) . "\n\n";

$startTime = microtime(true);
$totalTests = 0;
$passedTests = 0;
$failedTests = 0;

foreach ($categories[$category] as $file => $description) {
    echo "Executing: {$description}\n";
    echo str_repeat("-", 30) . "\n";
    
    $testStartTime = microtime(true);
    
    ob_start();
    
    try {
        $testPath = __DIR__ . '/' . $file;
        if (file_exists($testPath)) {
            include_once $testPath;
            $output = ob_get_contents();
            
            $successCount = substr_count($output, '✅ SUCCESS');
            $failureCount = substr_count($output, '❌ FAILURE');
            $errorCount = substr_count($output, '❌ ERROR');
            
            $totalTests += $successCount + $failureCount + $errorCount;
            $passedTests += $successCount;
            $failedTests += $failureCount + $errorCount;
            
            $testEndTime = microtime(true);
            $testExecutionTime = $testEndTime - $testStartTime;
            
            echo "Test completed in " . number_format($testExecutionTime, 2) . " seconds\n";
            echo "Results: {$successCount} passed, " . ($failureCount + $errorCount) . " failed\n";
            
        } else {
            echo "❌ Test file not found: {$file}\n";
            $failedTests++;
        }
        
    } catch (Exception $e) {
        echo "❌ Test execution failed: " . $e->getMessage() . "\n";
        $failedTests++;
    }
    
    ob_end_clean();
    echo "\n" . str_repeat("=", 50) . "\n\n";
}

$endTime = microtime(true);
$totalExecutionTime = $endTime - $startTime;

echo "Test Summary for {$category}:\n";
echo "============================\n";
echo "Total Tests: {$totalTests}\n";
echo "Passed: {$passedTests}\n";
echo "Failed: {$failedTests}\n";
echo "Success Rate: " . ($totalTests > 0 ? round(($passedTests / $totalTests) * 100, 2) : 0) . "%\n";
echo "Execution Time: " . number_format($totalExecutionTime, 2) . " seconds\n";

if ($failedTests == 0) {
    echo "\n🎉 All tests passed!\n";
} else {
    echo "\n⚠️  Some tests failed. Review the output above.\n";
}
?>
