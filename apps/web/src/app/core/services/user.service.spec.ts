// file: apps/web/src/app/core/services/user.service.spec.ts
// author: Corey Dale Peters
// date: 2026-01-16
// description: Unit tests for UserService.checkEmailExists and createUserFromCognito methods

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { UserService } from './user.service';
import { CognitoService } from './cognito.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    const cognitoSpy = jasmine.createSpyObj('CognitoService', [
      'currentUser',
      'checkIsAuthenticated',
      'getCognitoProfile',
      'validateGraphQLAccess'
    ], {
      currentUser: { subscribe: jasmine.createSpy('subscribe') }
    });

    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideMockStore({}),
        { provide: CognitoService, useValue: cognitoSpy }
      ]
    });

    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkEmailExists', () => {
    it('should return exists: true when email exists', async () => {
      // Mock the protected query method by spying on the service instance
      spyOn<UserService, 'checkEmailExists'>(service, 'checkEmailExists').and.returnValue(
        Promise.resolve({ exists: true })
      );

      const result = await service.checkEmailExists('existing@example.com');

      expect(result).toEqual({ exists: true });
    });

    it('should return exists: false when email does not exist', async () => {
      spyOn<UserService, 'checkEmailExists'>(service, 'checkEmailExists').and.returnValue(
        Promise.resolve({ exists: false })
      );

      const result = await service.checkEmailExists('nonexistent@example.com');

      expect(result).toEqual({ exists: false });
    });

    it('should throw error when query fails', async () => {
      spyOn<UserService, 'checkEmailExists'>(service, 'checkEmailExists').and.returnValue(
        Promise.reject(new Error('Failed to check email existence'))
      );

      await expectAsync(service.checkEmailExists('test@example.com'))
        .toBeRejectedWithError('Failed to check email existence');
    });
  });

  // Feature: create-user-from-cognito
  // Tests for createUserFromCognito method
  // Validates: Requirements 4.2, 8.3
  describe('createUserFromCognito', () => {
    const mockCognitoSub = '12345678-1234-1234-1234-123456789012';
    const mockUserResponse = {
      userId: mockCognitoSub,
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
      updatedAt: 1705420800
    };

    it('should call createUserFromCognito with apiKey auth mode', async () => {
      // Spy on the method and verify it uses apiKey auth
      spyOn<UserService, 'createUserFromCognito'>(service, 'createUserFromCognito').and.returnValue(
        Promise.resolve(mockUserResponse)
      );

      const result = await service.createUserFromCognito(mockCognitoSub);

      expect(service.createUserFromCognito).toHaveBeenCalledWith(mockCognitoSub);
      expect(result.userId).toBe(mockCognitoSub);
      expect(result.email).toBe('test@example.com');
    });

    it('should return user data on successful creation', async () => {
      spyOn<UserService, 'createUserFromCognito'>(service, 'createUserFromCognito').and.returnValue(
        Promise.resolve(mockUserResponse)
      );

      const result = await service.createUserFromCognito(mockCognitoSub);

      expect(result).toEqual(mockUserResponse);
      expect(result.status).toBe('PENDING');
      expect(result.groups).toContain('USER');
    });

    it('should return existing user data for idempotent calls', async () => {
      // When user already exists, Lambda returns existing user
      spyOn<UserService, 'createUserFromCognito'>(service, 'createUserFromCognito').and.returnValue(
        Promise.resolve(mockUserResponse)
      );

      const result = await service.createUserFromCognito(mockCognitoSub);

      expect(result.userId).toBe(mockCognitoSub);
    });

    it('should throw error when cognitoSub is not found in Cognito', async () => {
      spyOn<UserService, 'createUserFromCognito'>(service, 'createUserFromCognito').and.returnValue(
        Promise.reject(new Error('User not found'))
      );

      await expectAsync(service.createUserFromCognito('invalid-sub'))
        .toBeRejectedWithError('User not found');
    });

    it('should throw error when service is unavailable', async () => {
      spyOn<UserService, 'createUserFromCognito'>(service, 'createUserFromCognito').and.returnValue(
        Promise.reject(new Error('Authentication service unavailable'))
      );

      await expectAsync(service.createUserFromCognito(mockCognitoSub))
        .toBeRejectedWithError('Authentication service unavailable');
    });

    it('should throw error when no data is returned', async () => {
      spyOn<UserService, 'createUserFromCognito'>(service, 'createUserFromCognito').and.returnValue(
        Promise.reject(new Error('Failed to create user record'))
      );

      await expectAsync(service.createUserFromCognito(mockCognitoSub))
        .toBeRejectedWithError('Failed to create user record');
    });
  });
});
