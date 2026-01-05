// Frontend Test Runner for Pre-booked Functionality
// Executes all frontend tests and provides comprehensive reporting

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class FrontendTestRunner {
  constructor() {
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
    this.testCategories = {
      'Pre-booked Scenario Detection': [],
      'Booking Conflict Prevention': [],
      'Same-Day Booking Logic': [],
      'Edge Cases': [],
      'Performance Testing': [],
      'User Experience': [],
      'Accessibility': [],
      'Integration Testing': []
    };
  }

  async runAllTests() {
    console.log('🚀 Frontend Pre-booked Functionality Test Suite');
    console.log('==============================================\n');

    const startTime = Date.now();

    try {
      // Run Jest tests
      const testCommand = 'npm test -- --testPathPattern=test_prebooked_frontend --verbose --json';
      const result = execSync(testCommand, { 
        cwd: path.join(__dirname, '../../'),
        encoding: 'utf8',
        timeout: 60000 // 60 seconds timeout
      });

      this.parseTestResults(result);
      this.generateReport();

    } catch (error) {
      console.error('❌ Error running tests:', error.message);
      this.testResults.failed++;
    }

    this.testResults.duration = Date.now() - startTime;
    this.printSummary();
  }

  parseTestResults(result) {
    try {
      const lines = result.split('\n');
      let currentTest = null;

      for (const line of lines) {
        if (line.includes('PASS')) {
          this.testResults.passed++;
          this.testResults.total++;
        } else if (line.includes('FAIL')) {
          this.testResults.failed++;
          this.testResults.total++;
        } else if (line.includes('SKIP')) {
          this.testResults.skipped++;
          this.testResults.total++;
        }

        // Parse test categories
        if (line.includes('Test Case 1:')) {
          currentTest = 'Pre-booked Scenario Detection';
        } else if (line.includes('Test Case 2:')) {
          currentTest = 'Booking Conflict Prevention';
        } else if (line.includes('Test Case 3:')) {
          currentTest = 'Same-Day Booking Logic';
        } else if (line.includes('Test Case 4:')) {
          currentTest = 'Edge Cases';
        } else if (line.includes('Test Case 5:')) {
          currentTest = 'Performance Testing';
        } else if (line.includes('Test Case 6:')) {
          currentTest = 'User Experience';
        } else if (line.includes('Test Case 7:')) {
          currentTest = 'Accessibility';
        } else if (line.includes('Test Case 8:')) {
          currentTest = 'Integration Testing';
        }

        if (currentTest && line.includes('PASS')) {
          this.testCategories[currentTest].push('PASS');
        } else if (currentTest && line.includes('FAIL')) {
          this.testCategories[currentTest].push('FAIL');
        }
      }
    } catch (error) {
      console.error('Error parsing test results:', error);
    }
  }

  generateReport() {
    console.log('\n📊 Test Categories Results');
    console.log('==========================\n');

    for (const [category, results] of Object.entries(this.testCategories)) {
      const passed = results.filter(r => r === 'PASS').length;
      const failed = results.filter(r => r === 'FAIL').length;
      const total = results.length;
      const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

      console.log(`${category}:`);
      console.log(`  ✅ Passed: ${passed}`);
      console.log(`  ❌ Failed: ${failed}`);
      console.log(`  📊 Success Rate: ${successRate}%\n`);
    }
  }

  printSummary() {
    const successRate = this.testResults.total > 0 
      ? ((this.testResults.passed / this.testResults.total) * 100).toFixed(1) 
      : 0;

    console.log('\n🎯 Test Execution Summary');
    console.log('=========================');
    console.log(`Total Tests: ${this.testResults.total}`);
    console.log(`Passed: ${this.testResults.passed}`);
    console.log(`Failed: ${this.testResults.failed}`);
    console.log(`Skipped: ${this.testResults.skipped}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${(this.testResults.duration / 1000).toFixed(2)}s\n`);

    if (successRate >= 90) {
      console.log('🎉 Excellent! All tests are passing.');
    } else if (successRate >= 80) {
      console.log('✅ Good! Most tests are passing.');
    } else if (successRate >= 70) {
      console.log('⚠️  Warning: Some tests are failing.');
    } else {
      console.log('❌ Critical: Many tests are failing.');
    }

    console.log('\n📋 Recommendations:');
    if (this.testResults.failed > 0) {
      console.log('1. Review failed tests and fix issues');
      console.log('2. Check component implementations');
      console.log('3. Verify API integrations');
      console.log('4. Test user interactions manually');
    } else {
      console.log('1. All tests passing - ready for production');
      console.log('2. Consider adding more edge case tests');
      console.log('3. Monitor performance in production');
    }

    console.log('\n🏁 Test execution completed.');
  }

  async runSpecificCategory(category) {
    console.log(`🎯 Running ${category} Tests`);
    console.log('==========================\n');

    const testPattern = this.getTestPatternForCategory(category);
    const testCommand = `npm test -- --testPathPattern=test_prebooked_frontend --testNamePattern="${testPattern}" --verbose`;

    try {
      const result = execSync(testCommand, { 
        cwd: path.join(__dirname, '../../'),
        encoding: 'utf8',
        timeout: 30000
      });

      console.log(result);
    } catch (error) {
      console.error('❌ Error running category tests:', error.message);
    }
  }

  getTestPatternForCategory(category) {
    const patterns = {
      'Pre-booked Scenario Detection': 'Test Case 1',
      'Booking Conflict Prevention': 'Test Case 2',
      'Same-Day Booking Logic': 'Test Case 3',
      'Edge Cases': 'Test Case 4',
      'Performance Testing': 'Test Case 5',
      'User Experience': 'Test Case 6',
      'Accessibility': 'Test Case 7',
      'Integration Testing': 'Test Case 8'
    };

    return patterns[category] || category;
  }
}

// CLI interface
if (require.main === module) {
  const runner = new FrontendTestRunner();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    runner.runAllTests();
  } else if (args[0] === '--category' && args[1]) {
    runner.runSpecificCategory(args[1]);
  } else if (args[0] === '--help') {
    console.log('Frontend Test Runner Usage:');
    console.log('  node run_frontend_tests.js                    # Run all tests');
    console.log('  node run_frontend_tests.js --category "Edge Cases"  # Run specific category');
    console.log('  node run_frontend_tests.js --help             # Show this help');
    console.log('\nAvailable Categories:');
    console.log('  - Pre-booked Scenario Detection');
    console.log('  - Booking Conflict Prevention');
    console.log('  - Same-Day Booking Logic');
    console.log('  - Edge Cases');
    console.log('  - Performance Testing');
    console.log('  - User Experience');
    console.log('  - Accessibility');
    console.log('  - Integration Testing');
  } else {
    console.log('Invalid arguments. Use --help for usage information.');
  }
}

module.exports = FrontendTestRunner;
