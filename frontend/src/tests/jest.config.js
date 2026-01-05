// Jest configuration for Frontend Pre-booked Functionality Tests
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Test file patterns
  testMatch: [
    '**/test_prebooked_frontend.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup.js'
  ],
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.css$': '<rootDir>/src/tests/cssTransform.js'
  },
  
  // Mock files
  moduleFileExtensions: ['js', 'jsx', 'json'],
  
  // Coverage settings
  collectCoverageFrom: [
    'src/components/**/*.{js,jsx}',
    'src/utils/**/*.{js,jsx}',
    '!src/components/**/*.test.{js,jsx}',
    '!src/utils/**/*.test.{js,jsx}'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Restore mocks between tests
  restoreMocks: true,
  
  // Test results processor
  testResultsProcessor: '<rootDir>/src/tests/testResultsProcessor.js',
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'frontend-test-results.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ],
  
  // Global test setup
  globalSetup: '<rootDir>/src/tests/globalSetup.js',
  
  // Global test teardown
  globalTeardown: '<rootDir>/src/tests/globalTeardown.js',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Module path ignore patterns
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Snapshot serializers
  snapshotSerializers: [
    'enzyme-to-json/serializer'
  ],
  
  // Extra setup files
  setupFiles: [
    '<rootDir>/src/tests/setupFiles.js'
  ],
  
  // Test location
  testLocationInResults: true,
  
  // Update snapshots
  updateSnapshot: false,
  
  // Use real timers
  timers: 'real',
  
  // Maximum workers
  maxWorkers: '50%',
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Cache key
  cacheKey: 'prebooked-frontend-tests',
  
  // Force exit
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Run in band for debugging
  runInBand: false,
  
  // Show coverage
  collectCoverage: true,
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Coverage report
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/test-results/',
    '/build/',
    '/dist/'
  ]
};
