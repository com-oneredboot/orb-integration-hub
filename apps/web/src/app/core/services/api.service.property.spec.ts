/**
 * ApiService Property-Based Tests
 *
 * Property tests for error type mapping using fast-check.
 * These tests verify that error classification is consistent across all inputs.
 *
 * **Feature: graphql-service-cleanup, Property 2: Error Response Handling**
 * **Validates: Requirements 1.4, 2.4, 6.1, 6.2, 6.3, 6.4**
 *
 * @see .kiro/specs/graphql-service-cleanup/design.md
 */

import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
import * as fc from 'fast-check';
import { ApiService } from './api.service';
import {
  ApiError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
} from '../errors/api-errors';
import { GraphQLError } from '../types/graphql.types';

// Concrete implementation for testing
@Injectable()
class TestApiService extends ApiService {
  public testHandleGraphQLError(error: GraphQLError) {
    return this.handleGraphQLError(error);
  }
}

describe('ApiService Property Tests', () => {
  let service: TestApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestApiService],
    });
    service = TestBed.inject(TestApiService);
  });

  /**
   * Property 2: Error Response Handling
   *
   * *For any* GraphQL error response, the service SHALL throw an ApiError subclass where:
   * - Authentication errors throw AuthenticationError
   * - Network errors throw NetworkError
   * - Not found errors throw NotFoundError
   * - Other errors throw ApiError with the original message
   *
   * **Validates: Requirements 1.4, 2.4, 6.1, 6.2, 6.3, 6.4**
   */
  describe('Property 2: Error Response Handling', () => {
    // Arbitraries for generating test data
    const authErrorTypes = fc.constantFrom(
      'Unauthorized',
      'UnauthorizedException'
    );

    const authErrorMessages = fc.constantFrom(
      'Not Authorized',
      'Unauthorized',
      'Not Authorized to access this resource',
      'Unauthorized access attempt'
    );

    const networkErrorTypes = fc.constantFrom(
      'NetworkError',
      'ConnectionError',
      'TimeoutError',
      'Network',
      'Connection',
      'Timeout'
    );

    const notFoundErrorTypes = fc.constantFrom('NotFoundError', 'NotFound');

    const notFoundMessages = fc.constantFrom(
      'not found',
      'does not exist',
      'Resource not found',
      'Item does not exist'
    );

    const genericErrorTypes = fc.string({ minLength: 1, maxLength: 50 }).filter(
      (s) =>
        !s.includes('Unauthorized') &&
        !s.includes('Network') &&
        !s.includes('Connection') &&
        !s.includes('Timeout') &&
        !s.includes('NotFound')
    );

    const genericMessages = fc.string({ minLength: 1, maxLength: 200 }).filter(
      (s) =>
        !s.includes('Not Authorized') &&
        !s.includes('Unauthorized') &&
        !s.includes('not found') &&
        !s.includes('does not exist')
    );

    const pathArbitrary = fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
    );

    it('should always return an ApiError instance for any GraphQL error', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string(),
            errorType: fc.option(fc.string()),
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType ?? undefined,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            expect(result).toBeInstanceOf(ApiError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return AuthenticationError for any error with auth-related errorType', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1 }),
            errorType: authErrorTypes,
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            expect(result).toBeInstanceOf(AuthenticationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return AuthenticationError for any error with auth-related message', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: authErrorMessages,
            errorType: genericErrorTypes,
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            expect(result).toBeInstanceOf(AuthenticationError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return NetworkError for any error with network-related errorType', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1 }),
            errorType: networkErrorTypes,
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            expect(result).toBeInstanceOf(NetworkError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return NotFoundError for any error with not-found errorType', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1 }),
            errorType: notFoundErrorTypes,
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            expect(result).toBeInstanceOf(NotFoundError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return NotFoundError for any error with not-found message pattern', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: notFoundMessages,
            errorType: genericErrorTypes,
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            expect(result).toBeInstanceOf(NotFoundError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return generic ApiError for errors without special patterns', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: genericMessages,
            errorType: genericErrorTypes,
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            // Should be ApiError but NOT a subclass
            expect(result).toBeInstanceOf(ApiError);
            expect(result).not.toBeInstanceOf(AuthenticationError);
            expect(result).not.toBeInstanceOf(NetworkError);
            expect(result).not.toBeInstanceOf(NotFoundError);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve the original error message in all cases', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: fc.string({ minLength: 1, maxLength: 200 }),
            errorType: fc.option(fc.string()),
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              errorType: errorInput.errorType ?? undefined,
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            // Message should be preserved (or default if empty)
            if (errorInput.message) {
              expect(result.message).toBe(errorInput.message);
            } else {
              expect(result.message).toBe('Unknown GraphQL error');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use UNKNOWN code when errorType is missing', () => {
      fc.assert(
        fc.property(
          fc.record({
            message: genericMessages,
            path: pathArbitrary,
          }),
          (errorInput) => {
            const error: GraphQLError = {
              message: errorInput.message,
              // No errorType
              path: errorInput.path ?? undefined,
            };

            const result = service.testHandleGraphQLError(error);

            expect(result.code).toBe('UNKNOWN');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
