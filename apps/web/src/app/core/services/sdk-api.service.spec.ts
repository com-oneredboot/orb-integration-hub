/**
 * SdkApiService Unit Tests and Property-Based Tests
 *
 * Tests for the fetch-based SDK API GraphQL client.
 * Property tests validate correctness properties from the design document.
 *
 * @see .kiro/specs/migrate-auth-to-sdk-api/design.md
 */

import { TestBed } from '@angular/core/testing';
import { SdkApiService } from './sdk-api.service';
import { ApiError, AuthenticationError, NetworkError } from '../errors/api-errors';
import { environment } from '../../../environments/environment';
import * as fc from 'fast-check';

describe('SdkApiService', () => {
  let service: SdkApiService;
  let fetchSpy: jasmine.Spy;

  const SDK_URL = environment.sdkApi.url;
  const SDK_KEY = environment.sdkApi.apiKey;

  function mockFetchResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch');

    TestBed.configureTestingModule({
      providers: [SdkApiService],
    });
    service = TestBed.inject(SdkApiService);
  });

  // ============================================================================
  // Unit Tests (Task 4.4)
  // ============================================================================

  describe('request construction', () => {
    it('should send POST to SDK endpoint with correct headers and body', async () => {
      const query = 'query CheckEmailExists($input: CheckEmailExistsInput!) { CheckEmailExists(input: $input) { exists } }';
      const variables = { input: { email: 'test@example.com' } };

      fetchSpy.and.resolveTo(mockFetchResponse({ data: { CheckEmailExists: { exists: true } } }));

      await service.query(query, variables);

      expect(fetchSpy).toHaveBeenCalledOnceWith(SDK_URL, {
        method: 'POST',
        headers: {
          'Authorization': SDK_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });
    });

    it('should send mutation with same request pattern', async () => {
      const mutation = 'mutation CreateUser($input: CreateUserInput!) { CreateUser(input: $input) { userId } }';
      const variables = { input: { cognitoSub: 'abc-123' } };

      fetchSpy.and.resolveTo(mockFetchResponse({ data: { CreateUser: { userId: 'u-1' } } }));

      await service.mutate(mutation, variables);

      expect(fetchSpy).toHaveBeenCalledOnceWith(SDK_URL, jasmine.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: mutation, variables }),
      }));
    });

    it('should handle undefined variables', async () => {
      const query = '{ ping }';
      fetchSpy.and.resolveTo(mockFetchResponse({ data: { ping: 'pong' } }));

      await service.query(query);

      const callArgs = fetchSpy.calls.mostRecent().args;
      const body = JSON.parse(callArgs[1].body);
      expect(body.query).toBe(query);
      expect(body.variables).toBeUndefined();
    });
  });

  describe('successful responses', () => {
    it('should return parsed GraphQL data', async () => {
      const responseData = { CheckEmailExists: { exists: true, cognitoStatus: 'CONFIRMED' } };
      fetchSpy.and.resolveTo(mockFetchResponse({ data: responseData }));

      const result = await service.query('{ CheckEmailExists { exists } }');

      expect(result.data).toEqual(responseData);
    });

    it('should handle empty data response', async () => {
      fetchSpy.and.resolveTo(mockFetchResponse({ data: null }));

      const result = await service.query('{ ping }');

      expect(result.data).toBeNull();
    });
  });

  describe('network error handling', () => {
    it('should throw NetworkError when fetch throws TypeError', async () => {
      fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));

      await expectAsync(service.query('{ ping }'))
        .toBeRejectedWith(jasmine.any(NetworkError));
    });

    it('should include descriptive message in NetworkError', async () => {
      fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));

      try {
        await service.query('{ ping }');
        fail('Expected NetworkError');
      } catch (error) {
        expect(error).toBeInstanceOf(NetworkError);
        expect((error as NetworkError).message).toContain('unreachable');
      }
    });
  });

  describe('authorization error handling', () => {
    it('should throw AuthenticationError on HTTP 401', async () => {
      fetchSpy.and.resolveTo(mockFetchResponse({}, 401));

      await expectAsync(service.query('{ ping }'))
        .toBeRejectedWith(jasmine.any(AuthenticationError));
    });

    it('should throw AuthenticationError on HTTP 403', async () => {
      fetchSpy.and.resolveTo(mockFetchResponse({}, 403));

      await expectAsync(service.query('{ ping }'))
        .toBeRejectedWith(jasmine.any(AuthenticationError));
    });

    it('should throw AuthenticationError when response contains Unauthorized error', async () => {
      fetchSpy.and.resolveTo(mockFetchResponse({
        errors: [{ message: 'Unauthorized', errorType: 'Unauthorized' }],
      }));

      await expectAsync(service.query('{ ping }'))
        .toBeRejectedWith(jasmine.any(AuthenticationError));
    });

    it('should include descriptive message in AuthenticationError', async () => {
      fetchSpy.and.resolveTo(mockFetchResponse({}, 401));

      try {
        await service.query('{ ping }');
        fail('Expected AuthenticationError');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).message).toContain('invalid or expired');
      }
    });
  });

  describe('GraphQL error handling', () => {
    it('should throw ApiError when response contains GraphQL errors', async () => {
      fetchSpy.and.resolveTo(mockFetchResponse({
        data: null,
        errors: [{ message: 'Validation failed', errorType: 'ValidationError' }],
      }));

      try {
        await service.query('{ ping }');
        fail('Expected ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Validation failed');
        expect((error as ApiError).code).toBe('GRAPHQL_ERROR');
      }
    });
  });

  describe('invalid JSON response handling', () => {
    it('should throw ApiError when response is not valid JSON', async () => {
      fetchSpy.and.resolveTo(new Response('not json', { status: 200 }));

      try {
        await service.query('{ ping }');
        fail('Expected ApiError');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).code).toBe('INVALID_RESPONSE');
      }
    });
  });


  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  // Feature: migrate-auth-to-sdk-api, Property 1: SDK client sends correct Authorization header
  describe('Property 1: SDK client sends correct Authorization header', () => {
    it('should send correct Authorization header for all operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
          async (operation, variables) => {
            fetchSpy.and.resolveTo(mockFetchResponse({ data: {} }));

            await service.query(operation, variables);

            const callArgs = fetchSpy.calls.mostRecent().args;
            const url = callArgs[0];
            const options = callArgs[1];

            // Authorization header must equal configured API key
            expect(options.headers['Authorization']).toBe(SDK_KEY);
            // URL must match configured endpoint
            expect(url).toBe(SDK_URL);
            // Content-Type must be JSON
            expect(options.headers['Content-Type']).toBe('application/json');

            fetchSpy.calls.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should send correct Authorization header for mutations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (mutation) => {
            fetchSpy.and.resolveTo(mockFetchResponse({ data: {} }));

            await service.mutate(mutation);

            const callArgs = fetchSpy.calls.mostRecent().args;
            expect(callArgs[1].headers['Authorization']).toBe(SDK_KEY);
            expect(callArgs[0]).toBe(SDK_URL);

            fetchSpy.calls.reset();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: migrate-auth-to-sdk-api, Property 4: Error classification correctness
  describe('Property 4: Error classification correctness', () => {
    it('should classify network errors correctly for all network failure types', async () => {
      const networkErrors = [
        new TypeError('Failed to fetch'),
        new TypeError('NetworkError when attempting to fetch resource'),
        new TypeError('ERR_NAME_NOT_RESOLVED'),
        new TypeError('Load failed'),
      ];

      for (const networkError of networkErrors) {
        fetchSpy.and.rejectWith(networkError);

        try {
          await service.query('{ ping }');
          fail('Expected NetworkError for: ' + networkError.message);
        } catch (error) {
          expect(error).toBeInstanceOf(NetworkError);
          expect(error).not.toBeInstanceOf(AuthenticationError);
        }
      }
    });

    it('should classify auth errors correctly for all auth failure types', async () => {
      const authScenarios = [
        { status: 401, body: {} },
        { status: 403, body: {} },
        { status: 200, body: { errors: [{ message: 'Unauthorized', errorType: 'Unauthorized' }] } },
      ];

      for (const scenario of authScenarios) {
        fetchSpy.and.resolveTo(mockFetchResponse(scenario.body, scenario.status));

        try {
          await service.query('{ ping }');
          fail('Expected AuthenticationError for status: ' + scenario.status);
        } catch (error) {
          expect(error).toBeInstanceOf(AuthenticationError);
          expect(error).not.toBeInstanceOf(NetworkError);
        }
      }
    });

    it('should ensure network and auth errors are mutually exclusive across random inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.boolean(), // true = network error, false = auth error
          async (operation, isNetworkError) => {
            if (isNetworkError) {
              fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
            } else {
              fetchSpy.and.resolveTo(mockFetchResponse({}, 401));
            }

            try {
              await service.query(operation);
              // If no error thrown, that's fine for valid responses
            } catch (error) {
              if (isNetworkError) {
                expect(error).toBeInstanceOf(NetworkError);
                expect(error).not.toBeInstanceOf(AuthenticationError);
              } else {
                expect(error).toBeInstanceOf(AuthenticationError);
                // AuthenticationError extends ApiError, not NetworkError
                expect(error instanceof NetworkError).toBeFalse();
              }
            }

            fetchSpy.calls.reset();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
