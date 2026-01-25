/**
 * ApiService Unit Tests
 *
 * Tests for the v0.19.0 response envelope handling methods.
 * Uses a concrete test implementation since ApiService is abstract.
 *
 * @see .kiro/specs/graphql-service-cleanup/design.md
 * _Requirements: 5.1, 5.2, 5.3_
 */

import { TestBed } from '@angular/core/testing';
import { Injectable } from '@angular/core';
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
  // Expose protected methods for testing
  public testExecuteMutation<T>(
    mutation: string,
    variables: Record<string, unknown>,
    authMode: 'userPool' | 'apiKey' = 'userPool'
  ) {
    return this.executeMutation<T>(mutation, variables, authMode);
  }

  public testExecuteGetQuery<T>(
    query: string,
    variables: Record<string, unknown>,
    authMode: 'userPool' | 'apiKey' = 'userPool'
  ) {
    return this.executeGetQuery<T>(query, variables, authMode);
  }

  public testExecuteListQuery<T>(
    query: string,
    variables: Record<string, unknown>,
    authMode: 'userPool' | 'apiKey' = 'userPool'
  ) {
    return this.executeListQuery<T>(query, variables, authMode);
  }

  public testHandleGraphQLError(error: GraphQLError) {
    return this.handleGraphQLError(error);
  }
}

describe('ApiService', () => {
  let service: TestApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TestApiService],
    });
    service = TestBed.inject(TestApiService);
  });

  describe('handleGraphQLError', () => {
    it('should return AuthenticationError for Unauthorized error type', () => {
      const error: GraphQLError = {
        message: 'User is not authorized',
        errorType: 'UnauthorizedException',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(AuthenticationError);
      expect(result.message).toBe('User is not authorized');
    });

    it('should return AuthenticationError for "Not Authorized" message', () => {
      const error: GraphQLError = {
        message: 'Not Authorized to access this resource',
        errorType: 'AccessDenied',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(AuthenticationError);
    });

    it('should return AuthenticationError for "Unauthorized" in message', () => {
      const error: GraphQLError = {
        message: 'Unauthorized access attempt',
        errorType: 'Error',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(AuthenticationError);
    });

    it('should return NetworkError for Network error type', () => {
      const error: GraphQLError = {
        message: 'Network request failed',
        errorType: 'NetworkError',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(NetworkError);
      expect(result.message).toBe('Network request failed');
    });

    it('should return NetworkError for Connection error type', () => {
      const error: GraphQLError = {
        message: 'Connection refused',
        errorType: 'ConnectionError',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(NetworkError);
    });

    it('should return NetworkError for Timeout error type', () => {
      const error: GraphQLError = {
        message: 'Request timed out',
        errorType: 'TimeoutError',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(NetworkError);
    });

    it('should return NotFoundError for NotFound error type', () => {
      const error: GraphQLError = {
        message: 'Resource not found',
        errorType: 'NotFoundError',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('Resource not found');
    });

    it('should return NotFoundError for "not found" in message', () => {
      const error: GraphQLError = {
        message: 'The requested item was not found',
        errorType: 'Error',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(NotFoundError);
    });

    it('should return NotFoundError for "does not exist" in message', () => {
      const error: GraphQLError = {
        message: 'Organization does not exist',
        errorType: 'Error',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(NotFoundError);
    });

    it('should return generic ApiError for unknown error types', () => {
      const error: GraphQLError = {
        message: 'Something went wrong',
        errorType: 'InternalError',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result).toBeInstanceOf(ApiError);
      expect(result).not.toBeInstanceOf(AuthenticationError);
      expect(result).not.toBeInstanceOf(NetworkError);
      expect(result).not.toBeInstanceOf(NotFoundError);
      expect(result.message).toBe('Something went wrong');
      expect(result.code).toBe('InternalError');
    });

    it('should use "Unknown GraphQL error" for missing message', () => {
      const error: GraphQLError = {
        message: '',
        errorType: 'Error',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result.message).toBe('Unknown GraphQL error');
    });

    it('should use "UNKNOWN" for missing error type', () => {
      const error: GraphQLError = {
        message: 'Some error',
      };

      const result = service.testHandleGraphQLError(error);

      expect(result.code).toBe('UNKNOWN');
    });

    it('should preserve path information in error details', () => {
      const error: GraphQLError = {
        message: 'Field error',
        errorType: 'ValidationError',
        path: ['mutation', 'createOrganization', 'name'],
      };

      const result = service.testHandleGraphQLError(error);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.details as any)?.path).toEqual(['mutation', 'createOrganization', 'name']);
    });
  });

  describe('error type mapping consistency', () => {
    const authErrorTypes = [
      'Unauthorized',
      'UnauthorizedException',
    ];

    authErrorTypes.forEach((errorType) => {
      it(`should map "${errorType}" to AuthenticationError`, () => {
        const error: GraphQLError = {
          message: 'Auth error',
          errorType,
        };

        const result = service.testHandleGraphQLError(error);

        expect(result).toBeInstanceOf(AuthenticationError);
      });
    });

    const networkErrorTypes = ['NetworkError', 'ConnectionError', 'TimeoutError'];

    networkErrorTypes.forEach((errorType) => {
      it(`should map "${errorType}" to NetworkError`, () => {
        const error: GraphQLError = {
          message: 'Network error',
          errorType,
        };

        const result = service.testHandleGraphQLError(error);

        expect(result).toBeInstanceOf(NetworkError);
      });
    });

    const notFoundPatterns = [
      { message: 'Resource not found', errorType: 'Error' },
      { message: 'Item does not exist', errorType: 'Error' },
      { message: 'Error', errorType: 'NotFoundError' },
    ];

    notFoundPatterns.forEach(({ message, errorType }) => {
      it(`should map message="${message}" errorType="${errorType}" to NotFoundError`, () => {
        const error: GraphQLError = { message, errorType };

        const result = service.testHandleGraphQLError(error);

        expect(result).toBeInstanceOf(NotFoundError);
      });
    });
  });
});
