/**
 * Error types for the Orb SDK.
 *
 * All errors extend OrbError and include:
 * - Error code matching orb-integration-hub error registry
 * - Human-readable message
 * - Recovery suggestion when applicable
 * - Whether the error is recoverable
 *
 * @module errors
 */

/**
 * Error codes matching the orb-integration-hub error registry.
 */
export enum ErrorCode {
  // Authentication errors (1xxx)
  INVALID_CREDENTIALS = 'AUTH_1001',
  USER_NOT_FOUND = 'AUTH_1002',
  USER_NOT_CONFIRMED = 'AUTH_1003',
  PASSWORD_RESET_REQUIRED = 'AUTH_1004',
  MFA_REQUIRED = 'AUTH_1005',
  MFA_SETUP_REQUIRED = 'AUTH_1006',
  INVALID_MFA_CODE = 'AUTH_1007',
  SESSION_EXPIRED = 'AUTH_1008',
  TOKEN_REFRESH_FAILED = 'AUTH_1009',
  EMAIL_ALREADY_EXISTS = 'AUTH_1010',
  INVALID_PASSWORD = 'AUTH_1011',
  INVALID_VERIFICATION_CODE = 'AUTH_1012',
  CODE_EXPIRED = 'AUTH_1013',
  RATE_LIMIT_EXCEEDED = 'AUTH_1014',

  // Authorization errors (2xxx)
  PERMISSION_DENIED = 'AUTHZ_2001',
  INSUFFICIENT_ROLE = 'AUTHZ_2002',
  RESOURCE_NOT_FOUND = 'AUTHZ_2003',
  ORGANIZATION_ACCESS_DENIED = 'AUTHZ_2004',

  // Validation errors (3xxx)
  INVALID_INPUT = 'VAL_3001',
  MISSING_REQUIRED_FIELD = 'VAL_3002',
  INVALID_EMAIL_FORMAT = 'VAL_3003',
  INVALID_PHONE_FORMAT = 'VAL_3004',
  PASSWORD_TOO_WEAK = 'VAL_3005',

  // Network errors (4xxx)
  NETWORK_ERROR = 'NET_4001',
  TIMEOUT = 'NET_4002',
  CONNECTION_REFUSED = 'NET_4003',

  // Service errors (5xxx)
  SERVICE_UNAVAILABLE = 'SVC_5001',
  INTERNAL_ERROR = 'SVC_5002',
  CONFIGURATION_ERROR = 'SVC_5003',
}

/**
 * Base error class for all Orb SDK errors.
 *
 * @example
 * ```typescript
 * try {
 *   await client.signIn(email, password);
 * } catch (error) {
 *   if (error instanceof OrbError) {
 *     console.log(error.code, error.message, error.suggestion);
 *   }
 * }
 * ```
 */
export class OrbError extends Error {
  /** Error code from the error registry */
  public readonly code: ErrorCode | string;

  /** Whether this error can be recovered from */
  public readonly recoverable: boolean;

  /** Suggestion for how to recover from this error */
  public readonly suggestion?: string;

  /** Original error that caused this error */
  public readonly cause?: Error;

  constructor(
    message: string,
    code: ErrorCode | string,
    options?: {
      recoverable?: boolean;
      suggestion?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'OrbError';
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
    this.suggestion = options?.suggestion;
    this.cause = options?.cause;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace !== undefined) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for logging/serialization.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoverable: this.recoverable,
      suggestion: this.suggestion,
    };
  }
}

/**
 * Authentication error - thrown when authentication fails.
 *
 * @example
 * ```typescript
 * if (error instanceof AuthenticationError) {
 *   if (error.code === ErrorCode.MFA_REQUIRED) {
 *     // Show MFA input
 *   }
 * }
 * ```
 */
export class AuthenticationError extends OrbError {
  constructor(
    message: string,
    code: ErrorCode | string = ErrorCode.INVALID_CREDENTIALS,
    options?: {
      recoverable?: boolean;
      suggestion?: string;
      cause?: Error;
    }
  ) {
    super(message, code, options);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error - thrown when user lacks permission.
 *
 * @example
 * ```typescript
 * if (error instanceof AuthorizationError) {
 *   console.log('Access denied:', error.message);
 * }
 * ```
 */
export class AuthorizationError extends OrbError {
  constructor(
    message: string,
    code: ErrorCode | string = ErrorCode.PERMISSION_DENIED,
    options?: {
      recoverable?: boolean;
      suggestion?: string;
      cause?: Error;
    }
  ) {
    super(message, code, options);
    this.name = 'AuthorizationError';
  }
}

/**
 * Validation error - thrown when input validation fails.
 *
 * @example
 * ```typescript
 * if (error instanceof ValidationError) {
 *   console.log('Invalid input:', error.message);
 * }
 * ```
 */
export class ValidationError extends OrbError {
  /** Field that failed validation */
  public readonly field?: string;

  constructor(
    message: string,
    code: ErrorCode | string = ErrorCode.INVALID_INPUT,
    options?: {
      recoverable?: boolean;
      suggestion?: string;
      cause?: Error;
      field?: string;
    }
  ) {
    super(message, code, {
      recoverable: options?.recoverable ?? true,
      suggestion: options?.suggestion,
      cause: options?.cause,
    });
    this.name = 'ValidationError';
    this.field = options?.field;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

/**
 * Network error - thrown when network operations fail.
 *
 * @example
 * ```typescript
 * if (error instanceof NetworkError) {
 *   // Retry the operation
 * }
 * ```
 */
export class NetworkError extends OrbError {
  /** HTTP status code if available */
  public readonly statusCode?: number;

  constructor(
    message: string,
    code: ErrorCode | string = ErrorCode.NETWORK_ERROR,
    options?: {
      recoverable?: boolean;
      suggestion?: string;
      cause?: Error;
      statusCode?: number;
    }
  ) {
    super(message, code, {
      recoverable: options?.recoverable ?? true,
      suggestion:
        options?.suggestion ?? 'Check your network connection and try again.',
      cause: options?.cause,
    });
    this.name = 'NetworkError';
    this.statusCode = options?.statusCode;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
    };
  }
}

/**
 * Service unavailable error - thrown when the service is temporarily unavailable.
 *
 * @example
 * ```typescript
 * if (error instanceof ServiceUnavailableError) {
 *   // Show maintenance message
 * }
 * ```
 */
export class ServiceUnavailableError extends OrbError {
  /** Suggested retry delay in milliseconds */
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Service temporarily unavailable',
    options?: {
      suggestion?: string;
      cause?: Error;
      retryAfter?: number;
    }
  ) {
    super(message, ErrorCode.SERVICE_UNAVAILABLE, {
      recoverable: true,
      suggestion:
        options?.suggestion ?? 'The service is temporarily unavailable. Please try again later.',
      cause: options?.cause,
    });
    this.name = 'ServiceUnavailableError';
    this.retryAfter = options?.retryAfter;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Type guard to check if an error is an OrbError.
 */
export function isOrbError(error: unknown): error is OrbError {
  return error instanceof OrbError;
}

/**
 * Type guard to check if an error is an AuthenticationError.
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is an AuthorizationError.
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * Type guard to check if an error is a ValidationError.
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a NetworkError.
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}
