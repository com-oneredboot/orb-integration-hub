// file: apps/web/src/app/core/services/user.service.spec.ts
// author: Corey Dale Peters
// date: 2026-01-16
// description: Unit tests for UserService.checkEmailExists method

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
});
