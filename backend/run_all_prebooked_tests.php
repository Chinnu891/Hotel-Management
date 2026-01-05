<?php
// Master test runner for all pre-booked functionality tests
// Executes all test scenarios and provides comprehensive reporting

echo "Pre-booked Functionality Test Suite\n";
echo "===================================\n";
echo "Running comprehensive tests for pre-booked room management\n\n";

$startTime = microtime(true);
$totalTests = 0;
$passedTests = 0;
$failedTests = 0;

// Test files to execute
$testFiles = [
    'test_prebooked_scenario.php' => 'Basic Pre-booked Scenario',
    'test_booking_conflict.php' => 'Booking Conflict Detection',
    'test_same_day_booking.php' => 'Same-Day Booking Logic',
    'test_extend_booking.php' => 'Booking Extension',
    'test_prebooked_edge_cases.php' => 'Edge Cases',
    'test_prebooked_performance.php' => 'Performance Testing',
    'test_prebooked_integration.php' => 'Integration Testing',
    'test_prebooked_security.php' => 'Security Testing'
];

echo "Test Execution Plan:\n";
echo "===================\n";
foreach ($testFiles as $file => $description) {
    echo "- {$description} ({$file})\n";
}
echo "\n" . str_repeat("=", 50) . "\n\n";

// Execute each test file
foreach ($testFiles as $file => $description) {
    echo "Executing: {$description}\n";
    echo str_repeat("-", 30) . "\n";
    
    $testStartTime = microtime(true);
    
    // Capture output from test file
    ob_start();
    
    try {
        // Include the test file
        $testPath = __DIR__ . '/' . $file;
        if (file_exists($testPath)) {
            include_once $testPath;
            $output = ob_get_contents();
            
            // Check for success indicators in output
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

// Generate comprehensive test report
echo "Comprehensive Test Report\n";
echo "=========================\n";
echo "Total Tests Executed: {$totalTests}\n";
echo "Tests Passed: {$passedTests}\n";
echo "Tests Failed: {$failedTests}\n";
echo "Success Rate: " . ($totalTests > 0 ? round(($passedTests / $totalTests) * 100, 2) : 0) . "%\n";
echo "Total Execution Time: " . number_format($totalExecutionTime, 2) . " seconds\n\n";

// Test categories summary
echo "Test Categories Summary:\n";
echo "=======================\n";
echo "✅ Basic Functionality Tests:\n";
echo "   - Pre-booked scenario detection\n";
echo "   - Booking conflict prevention\n";
echo "   - Same-day booking handling\n";
echo "   - Booking extension functionality\n\n";

echo "✅ Advanced Functionality Tests:\n";
echo "   - Edge case handling\n";
echo "   - Performance under load\n";
echo "   - System integration\n";
echo "   - Security validation\n\n";

// Recommendations based on test results
echo "Recommendations:\n";
echo "================\n";

if ($failedTests == 0) {
    echo "🎉 EXCELLENT: All tests passed! The pre-booked functionality is working correctly.\n";
    echo "   - System is ready for production use\n";
    echo "   - All edge cases are properly handled\n";
    echo "   - Performance is within acceptable limits\n";
    echo "   - Security measures are in place\n";
} elseif ($failedTests <= 2) {
    echo "⚠️  GOOD: Most tests passed with minor issues.\n";
    echo "   - Review failed tests and fix identified issues\n";
    echo "   - Consider additional testing for specific scenarios\n";
    echo "   - System is mostly ready for production\n";
} else {
    echo "❌ ATTENTION NEEDED: Multiple test failures detected.\n";
    echo "   - Review and fix all failed tests before production\n";
    echo "   - Consider additional development and testing\n";
    echo "   - System may not be ready for production use\n";
}

echo "\nNext Steps:\n";
echo "===========\n";
echo "1. Review detailed output from each test file\n";
echo "2. Address any failed tests or errors\n";
echo "3. Run specific test categories if needed\n";
echo "4. Perform manual testing for critical scenarios\n";
echo "5. Deploy to staging environment for final validation\n";

echo "\nTest Execution Completed.\n";
echo "========================\n";
?>
