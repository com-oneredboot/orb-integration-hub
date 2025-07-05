/**
 * Jest configuration for integration tests
 */

module.exports = {
  preset: 'jest-preset-angular',
  roots: ['<rootDir>/frontend/integration-tests'],
  testMatch: [
    '<rootDir>/frontend/integration-tests/**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/polyfills.ts',
    '!src/**/*.module.ts',
    '!src/**/environment*.ts'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['html', 'text-summary', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/integration-tests/setup.ts'],
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/app/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
    '^@features/(.*)$': '<rootDir>/src/app/features/$1'
  },
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true,
  bail: 1,
  forceExit: true,
  detectOpenHandles: true,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$'
    }
  },
  modulePathIgnorePatterns: [
    '<rootDir>/dist/',
    '<rootDir>/node_modules/',
    '<rootDir>/cypress/'
  ],
  testResultsProcessor: 'jest-sonar-reporter',
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/integration',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }]
  ]
};