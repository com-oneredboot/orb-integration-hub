// file: frontend/src/app/core/models/errorRegistry.model.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Error registry system for tracking and identifying errors

/**
 * Error Registry Class
 * 
 * This class provides a centralized registry for application errors with unique codes.
 * Each error has a unique alphanumeric code, category, description, and potential solution.
 * 
 * Error Code Format: ORB-[Category]-[3-digit number]
 * Example: ORB-AUTH-001
 */
/**
 * Interface defining the structure of error information objects
 */
export interface ErrorInfo {
  readonly message: string;
  readonly description: string;
  readonly solution: string;
}

export type ErrorCode = 
  | 'ORB-AUTH-001' | 'ORB-AUTH-002' | 'ORB-AUTH-003' | 'ORB-AUTH-004' | 'ORB-AUTH-005'
  | 'ORB-API-001' | 'ORB-API-002' | 'ORB-API-003' | 'ORB-API-004'
  | 'ORB-DATA-001' | 'ORB-DATA-002'
  | 'ORB-SYS-001';

export class ErrorRegistry {
  // Error categories
  private static readonly CATEGORIES = {
    AUTH: 'AUTH',    // Authentication related errors
    API: 'API',      // API call related errors
    DATA: 'DATA',    // Data handling errors
    UI: 'UI',        // UI related errors
    SYS: 'SYS'       // System/general errors
  };

  // Error registry
  private static readonly ERRORS: Record<ErrorCode, ErrorInfo> = {
    // Authentication Errors (AUTH)
    'ORB-AUTH-001': {
      message: 'Invalid email format',
      description: 'The provided email address format is invalid',
      solution: 'Please enter a valid email address'
    },
    'ORB-AUTH-002': {
      message: 'Invalid credentials',
      description: 'The provided email and password combination is invalid',
      solution: 'Please check your email and password and try again'
    },
    'ORB-AUTH-003': {
      message: 'Email verification failed',
      description: 'Failed to verify email with provided code',
      solution: 'Please check the verification code and try again'
    },
    'ORB-AUTH-004': {
      message: 'User already exists',
      description: 'A user with this email already exists',
      solution: 'Please use a different email or try to sign in'
    },
    'ORB-AUTH-005': {
      message: 'User email check failed',
      description: 'Failed to check if user exists by email',
      solution: 'Please try again later'
    },

    // API Errors (API)
    'ORB-API-001': {
      message: 'GraphQL query error',
      description: 'An error occurred while executing a GraphQL query',
      solution: 'Please try again later'
    },
    'ORB-API-002': {
      message: 'GraphQL mutation error',
      description: 'An error occurred while executing a GraphQL mutation',
      solution: 'Please try again later'
    },
    'ORB-API-003': {
      message: 'Invalid input for GraphQL operation',
      description: 'The input provided for a GraphQL operation was invalid',
      solution: 'Please check the input parameters and try again'
    },
    'ORB-API-004': {
      message: 'Network error',
      description: 'A network error occurred while communicating with the API',
      solution: 'Please check your internet connection and try again'
    },

    // Data Errors (DATA)
    'ORB-DATA-001': {
      message: 'Invalid data format',
      description: 'The data format provided is invalid',
      solution: 'Please check the data format and try again'
    },
    'ORB-DATA-002': {
      message: 'Data not found',
      description: 'The requested data was not found',
      solution: 'Please check if the data exists and try again'
    },

    // System Errors (SYS)
    'ORB-SYS-001': {
      message: 'Unexpected error',
      description: 'An unexpected error occurred',
      solution: 'Please try again later'
    }
  };

  /**
   * Get an error by its code
   * @param code The error code
   * @returns The error object or undefined if not found
   */
  public static getError(code: string): ErrorInfo | undefined {
    return this.isValidErrorCode(code) ? this.ERRORS[code] : undefined;
  }

  /**
   * Check if a code is a valid error code
   * @param code The code to check
   * @returns True if the code is a valid error code
   */
  private static isValidErrorCode(code: string): code is ErrorCode {
    return code in this.ERRORS;
  }

  /**
   * Get a formatted error message with the code
   * @param code The error code
   * @param includeCode Whether to include the error code in the message
   * @returns The formatted error message
   */
  public static getErrorMessage(code: string, includeCode: boolean = true): string {
    const error = this.getError(code);
    if (!error) {
      return `Unknown error: ${code}`;
    }

    const message = error.message;
    return includeCode
      ? `[${code}] ${message}`
      : message;
  }

  /**
   * Create a full error object with code, message, and details
   * @param code The error code
   * @param additionalDetails Any additional details to include
   * @returns A full error object
   */
  public static createError(code: string, additionalDetails: Record<string, any> = {}): Record<string, any> {
    const error = this.getError(code);
    if (!error) {
      return {
        code,
        message: `Unknown error: ${code}`,
        description: 'An unknown error occurred',
        solution: 'Please try again later',
        ...additionalDetails
      };
    }

    return {
      code,
      message: error.message,
      description: error.description,
      solution: error.solution,
      ...additionalDetails
    };
  }

  /**
   * Log an error to the console with its code and details
   * @param code The error code
   * @param additionalDetails Any additional details to include
   */
  public static logError(code: string, additionalDetails: Record<string, any> = {}): void {
    const error = this.createError(code, additionalDetails);
    console.error(`[${code}] ${error['message']}`, error);
  }
}

/**
 * OrbitError class for typed error handling
 */
export class OrbitError extends Error {
  code: string;
  description: string;
  solution: string;
  details: Record<string, any>;

  constructor(errorCode: string, additionalDetails: Record<string, any> = {}) {
    const errorInfo = ErrorRegistry.getError(errorCode) || {
      message: `Unknown error: ${errorCode}`,
      description: 'An unknown error occurred',
      solution: 'Please try again later'
    };

    // Access properties safely by storing them in local variables
    const message = errorInfo.message;
    const description = errorInfo.description;
    const solution = errorInfo.solution;

    super(message);
    this.name = 'OrbitError';
    this.code = errorCode;
    this.description = description;
    this.solution = solution;
    this.details = additionalDetails;
  }
} 