/**
 * Jest setup for integration tests
 */

import 'jest-preset-angular/setup-jest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
Object.assign(global, { TextDecoder, TextEncoder });

// Mock performance API for Node.js environment
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }
});

// Mock localStorage for Node.js environment
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(global, 'localStorage', {
  value: mockStorage
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockStorage
});

// Mock window object for Angular components
Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockStorage,
    sessionStorage: mockStorage,
    location: {
      href: 'http://localhost:4200',
      origin: 'http://localhost:4200'
    }
  }
});

// Mock CSS object for Angular animations
Object.defineProperty(global, 'CSS', {
  value: {
    supports: jest.fn().mockReturnValue(false)
  }
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Setup console to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Filter out Angular warnings we don't care about in tests
  if (
    args[0]?.includes?.('NG0') ||
    args[0]?.includes?.('ExpressionChangedAfterItHasBeenCheckedError')
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  // Filter out warnings we don't care about in tests
  if (
    args[0]?.includes?.('deprecat') ||
    args[0]?.includes?.('warn')
  ) {
    return;
  }
  // Redact sensitive data from logs
  const sanitizedArgs = args.map(arg => 
    typeof arg === 'string' && arg.includes('password_verify') ? arg.replace(/password_verify/g, '***') : arg
  );
  originalConsoleWarn(...sanitizedArgs);
};

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test configuration
beforeAll(() => {
  // Setup test environment variables
  process.env.TEST_ENVIRONMENT = 'integration';
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});