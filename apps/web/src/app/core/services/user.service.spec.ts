/**
 * UserService Unit Tests and Property-Based Tests
 *
 * Tests for checkEmailExists and createUserFromCognito methods
 * after migration to SdkApiService.
 *
 * @see .kiro/specs/migrate-auth-to-sdk-api/design.md
 */

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { UserService } from './user.service';
import { SdkApiService } from './sdk-api.service';
import { CognitoService } from './cognito.service';
import { NetworkError, AuthenticationError, ApiError } from '../errors/api-errors';
import * as fc from 'fast-check';

describe('UserService', () => {
  let service: UserService;
  let sdkApiSpy: jasmine.SpyObj<SdkApiService>;

  beforeEach(() => {
    const cognitoSpy = jasmine.createSpyObj('CognitoService', [
      'currentUser',
      'checkIsAuthenticated',
      'getCognitoProfile',
      'validateGraphQLAccess',
      'signIn',
      'signOut',
      'createCognitoUser',
      'emailVerify',
      'mfaVerify',
      'checkMFAPreferences',
      'getCurrentUserGroups',
    ], {
      currentUser: { subscribe: jasmine.createSpy('subscribe') }
    });

    sdkApiSpy = jasmine.createSpyObj('SdkApiService', ['query', 'mutate']);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideMockStore({}),
        { provide: CognitoService, useValue: cognitoSpy },
        { provide: SdkApiService, useValue: sdkApiSpy },
      ]
    });

    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });


  // ============================================================================
  // Task 6.4: Unit tests for UserService changes
  // ============================================================================

  describe('checkEmailExists', () => {
    it('should call SdkApiService.query (not ApiService)', async () => {
      sdkApiSpy.query.and.resolveTo({
        data: { CheckEmailExists: { email: 'test@example.com', exists: true, cognitoStatus: 'CONFIRMED', cognitoSub: 'sub-123' } },
      });

      await service.checkEmailExists('test@example.com');

      expect(sdkApiSpy.query).toHaveBeenCalledTimes(1);
    });

    it('should return correct shape when email exists', async () => {
      sdkApiSpy.query.and.resolveTo({
        data: { CheckEmailExists: { email: 'test@example.com', exists: true, cognitoStatus: 'CONFIRMED', cognitoSub: 'sub-123' } },
      });

      const result = await service.checkEmailExists('test@example.com');

      expect(result.exists).toBeTrue();
      expect(result.cognitoStatus).toBe('CONFIRMED');
      expect(result.cognitoSub).toBe('sub-123');
    });

    it('should return exists: false when email does not exist', async () => {
      sdkApiSpy.query.and.resolveTo({
        data: { CheckEmailExists: { email: 'new@example.com', exists: false, cognitoStatus: null, cognitoSub: null } },
      });

      const result = await service.checkEmailExists('new@example.com');

      expect(result.exists).toBeFalse();
      expect(result.cognitoStatus).toBeNull();
      expect(result.cognitoSub).toBeNull();
    });

    it('should wrap NetworkError with context message', async () => {
      sdkApiSpy.query.and.rejectWith(new NetworkError('SDK API is unreachable'));

      await expectAsync(service.checkEmailExists('test@example.com'))
        .toBeRejectedWithError('Failed to check email existence: SDK API is unreachable');
    });

    it('should wrap AuthenticationError with context message', async () => {
      sdkApiSpy.query.and.rejectWith(new AuthenticationError('SDK API key is invalid'));

      await expectAsync(service.checkEmailExists('test@example.com'))
        .toBeRejectedWithError('Failed to check email existence: API key is invalid or expired');
    });

    it('should throw generic error for unknown failures', async () => {
      sdkApiSpy.query.and.rejectWith(new ApiError('Something broke', 'UNKNOWN'));

      await expectAsync(service.checkEmailExists('test@example.com'))
        .toBeRejectedWithError('Failed to check email existence');
    });
  });

  describe('createUserFromCognito', () => {
    const mockResponse = {
      userId: 'u-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      status: 'PENDING',
      emailVerified: true,
      phoneVerified: false,
      mfaEnabled: true,
      mfaSetupComplete: true,
      groups: ['USER'],
      createdAt: 1705420800,
      updatedAt: 1705420800,
    };

    it('should call SdkApiService.mutate (not ApiService)', async () => {
      sdkApiSpy.mutate.and.resolveTo({
        data: { CreateUserFromCognito: mockResponse },
      });

      await service.createUserFromCognito('sub-123');

      expect(sdkApiSpy.mutate).toHaveBeenCalledTimes(1);
    });

    it('should return user data on success', async () => {
      sdkApiSpy.mutate.and.resolveTo({
        data: { CreateUserFromCognito: mockResponse },
      });

      const result = await service.createUserFromCognito('sub-123');

      expect(result.userId).toBe('u-123');
      expect(result.email).toBe('test@example.com');
      expect(result.status).toBe('PENDING');
      expect(result.groups).toContain('USER');
    });

    it('should throw when no data returned', async () => {
      sdkApiSpy.mutate.and.resolveTo({ data: { CreateUserFromCognito: null } });

      await expectAsync(service.createUserFromCognito('sub-123'))
        .toBeRejectedWithError('Failed to create user record');
    });

    it('should wrap NetworkError with context message', async () => {
      sdkApiSpy.mutate.and.rejectWith(new NetworkError('SDK API is unreachable'));

      await expectAsync(service.createUserFromCognito('sub-123'))
        .toBeRejectedWithError('Failed to create user from Cognito: SDK API is unreachable');
    });

    it('should wrap AuthenticationError with context message', async () => {
      sdkApiSpy.mutate.and.rejectWith(new AuthenticationError('SDK API key is invalid'));

      await expectAsync(service.createUserFromCognito('sub-123'))
        .toBeRejectedWithError('Failed to create user from Cognito: API key is invalid or expired');
    });
  });

  // ============================================================================
  // Property-Based Tests
  // ============================================================================

  // Feature: migrate-auth-to-sdk-api, Property 2: Pre-auth operations route through SDK client
  describe('Property 2: Pre-auth operations route through SDK client', () => {
    it('should route checkEmailExists through SdkApiService for all emails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            sdkApiSpy.query.and.resolveTo({
              data: { CheckEmailExists: { email, exists: false, cognitoStatus: null, cognitoSub: null } },
            });

            await service.checkEmailExists(email);

            // SdkApiService.query must be called exactly once
            expect(sdkApiSpy.query).toHaveBeenCalledTimes(1);

            sdkApiSpy.query.calls.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should route createUserFromCognito through SdkApiService for all cognitoSubs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (cognitoSub) => {
            sdkApiSpy.mutate.and.resolveTo({
              data: {
                CreateUserFromCognito: {
                  userId: cognitoSub,
                  email: 'test@example.com',
                  firstName: '',
                  lastName: '',
                  status: 'PENDING',
                  emailVerified: false,
                  phoneVerified: false,
                  mfaEnabled: false,
                  mfaSetupComplete: false,
                  groups: [],
                  createdAt: 0,
                  updatedAt: 0,
                },
              },
            });

            await service.createUserFromCognito(cognitoSub);

            // SdkApiService.mutate must be called exactly once
            expect(sdkApiSpy.mutate).toHaveBeenCalledTimes(1);

            sdkApiSpy.mutate.calls.reset();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: migrate-auth-to-sdk-api, Property 3: Response shape compatibility
  describe('Property 3: Response shape compatibility', () => {
    it('should preserve response shape for all valid CheckEmailExists responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            exists: fc.boolean(),
            cognitoStatus: fc.option(fc.constantFrom('CONFIRMED', 'UNCONFIRMED', 'FORCE_CHANGE_PASSWORD', 'RESET_REQUIRED'), { nil: null }),
            cognitoSub: fc.option(fc.uuid(), { nil: null }),
          }),
          async (responseData) => {
            sdkApiSpy.query.and.resolveTo({
              data: { CheckEmailExists: responseData },
            });

            const result = await service.checkEmailExists(responseData.email);

            // Shape must match: { exists, cognitoStatus, cognitoSub }
            expect(result.exists).toBe(responseData.exists);
            expect(result.cognitoStatus).toBe(responseData.cognitoStatus);
            expect(result.cognitoSub).toBe(responseData.cognitoSub);

            sdkApiSpy.query.calls.reset();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
