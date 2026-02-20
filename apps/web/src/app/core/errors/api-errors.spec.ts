/**
 * Unit tests for API Error Types
 *
 * Tests error class instantiation, inheritance, and type guards.
 * _Requirements: 5.1, 5.2, 6.1, 6.2, 6.3, 6.4_
 */

import {
  ApiError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  NotFoundError,
  isApiError,
  isAuthenticationError,
  isNetworkError,
  isValidationError,
  isNotFoundError,
} from './api-errors';

describe('ApiError', () => {
  it('should create an ApiError with message and code', () => {
    const error = new ApiError('Test error', 'TEST_CODE');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('ApiError');
    expect(error.details).toBeUndefined();
  });

  it('should create an ApiError with details', () => {
    const details = { field: 'email', reason: 'invalid' };
    const error = new ApiError('Validation failed', 'VALIDATION', details);

    expect(error.details).toEqual(details);
  });

  it('should be an instance of Error', () => {
    const error = new ApiError('Test', 'CODE');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it('should have a stack trace', () => {
    const error = new ApiError('Test', 'CODE');

    expect(error.stack).toBeDefined();
  });
});

describe('AuthenticationError', () => {
  it('should create an AuthenticationError with correct code', () => {
    const error = new AuthenticationError('Token expired');

    expect(error.message).toBe('Token expired');
    expect(error.code).toBe('AUTHENTICATION_ERROR');
    expect(error.name).toBe('AuthenticationError');
  });

  it('should be an instance of ApiError', () => {
    const error = new AuthenticationError('Unauthorized');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(AuthenticationError);
  });

  it('should accept optional details', () => {
    const details = { tokenType: 'access', expiredAt: '2024-01-01' };
    const error = new AuthenticationError('Token expired', details);

    expect(error.details).toEqual(details);
  });
});

describe('NetworkError', () => {
  it('should create a NetworkError with correct code', () => {
    const error = new NetworkError('Connection failed');

    expect(error.message).toBe('Connection failed');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.name).toBe('NetworkError');
  });

  it('should be an instance of ApiError', () => {
    const error = new NetworkError('Timeout');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(NetworkError);
  });
});

describe('ValidationError', () => {
  it('should create a ValidationError with correct code', () => {
    const error = new ValidationError('Invalid input');

    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.name).toBe('ValidationError');
  });

  it('should be an instance of ApiError', () => {
    const error = new ValidationError('Bad data');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(ValidationError);
  });
});

describe('NotFoundError', () => {
  it('should create a NotFoundError with correct code', () => {
    const error = new NotFoundError('Resource not found');

    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.name).toBe('NotFoundError');
  });

  it('should be an instance of ApiError', () => {
    const error = new NotFoundError('Missing');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(NotFoundError);
  });
});

describe('Type Guards', () => {
  describe('isApiError', () => {
    it('should return true for ApiError', () => {
      expect(isApiError(new ApiError('test', 'CODE'))).toBe(true);
    });

    it('should return true for ApiError subclasses', () => {
      expect(isApiError(new AuthenticationError('test'))).toBe(true);
      expect(isApiError(new NetworkError('test'))).toBe(true);
      expect(isApiError(new ValidationError('test'))).toBe(true);
      expect(isApiError(new NotFoundError('test'))).toBe(true);
    });

    it('should return false for regular Error', () => {
      expect(isApiError(new Error('test'))).toBe(false);
    });

    it('should return false for non-errors', () => {
      expect(isApiError('string')).toBe(false);
      expect(isApiError(null)).toBe(false);
      expect(isApiError(undefined)).toBe(false);
      expect(isApiError({ message: 'fake' })).toBe(false);
    });
  });

  describe('isAuthenticationError', () => {
    it('should return true for AuthenticationError', () => {
      expect(isAuthenticationError(new AuthenticationError('test'))).toBe(true);
    });

    it('should return false for other ApiError types', () => {
      expect(isAuthenticationError(new ApiError('test', 'CODE'))).toBe(false);
      expect(isAuthenticationError(new NetworkError('test'))).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should return true for NetworkError', () => {
      expect(isNetworkError(new NetworkError('test'))).toBe(true);
    });

    it('should return false for other ApiError types', () => {
      expect(isNetworkError(new ApiError('test', 'CODE'))).toBe(false);
      expect(isNetworkError(new AuthenticationError('test'))).toBe(false);
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError', () => {
      expect(isValidationError(new ValidationError('test'))).toBe(true);
    });

    it('should return false for other ApiError types', () => {
      expect(isValidationError(new ApiError('test', 'CODE'))).toBe(false);
    });
  });

  describe('isNotFoundError', () => {
    it('should return true for NotFoundError', () => {
      expect(isNotFoundError(new NotFoundError('test'))).toBe(true);
    });

    it('should return false for other ApiError types', () => {
      expect(isNotFoundError(new ApiError('test', 'CODE'))).toBe(false);
    });
  });
});
