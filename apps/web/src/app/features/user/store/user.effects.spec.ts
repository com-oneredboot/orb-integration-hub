// file: apps/web/src/app/features/user/store/user.effects.spec.ts
// author: Corey Dale Peters
// date: 2026-01-16
// description: Unit tests for UserEffects - Smart Recovery Flow

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';

import { UserEffects } from './user.effects';
import { UserActions } from './user.actions';
import { UserService } from '../../../core/services/user.service';
import { CognitoService } from '../../../core/services/cognito.service';
import { RecoveryService } from '../../../core/services/recovery.service';
import { AuthProgressStorageService } from '../../../core/services/auth-progress-storage.service';
import { AUTH_MESSAGES } from '../../../core/models/RecoveryModel';
import { AuthStep } from '../../../core/enums/AuthStepEnum';
import { RecoveryAction } from '../../../core/enums/RecoveryActionEnum';
import { CognitoUserStatus } from '../../../core/enums/CognitoUserStatusEnum';
import { UsersCreateInput, Users } from '../../../core/models/UsersModel';
import { UserStatus } from '../../../core/enums/UserStatusEnum';

describe('UserEffects', () => {
  let actions$: Observable<unknown>;
  let effects: UserEffects;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let cognitoServiceSpy: jasmine.SpyObj<CognitoService>;
  let recoveryServiceSpy: jasmine.SpyObj<RecoveryService>;
  let authProgressStorageSpy: jasmine.SpyObj<AuthProgressStorageService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let _store: MockStore;

  beforeEach(() => {
    userServiceSpy = jasmine.createSpyObj('UserService', [
      'checkEmailExists',
      'userExists',
      'userCreate',
      'userUpdate',
      'userSignIn',
      'emailVerify',
      'mfaVerify',
      'checkCognitoEmailVerification',
      'checkCognitoMFAStatus',
      'sendSMSVerificationCode',
      'verifySMSCode',
      'updateUserTimestamp',
      'createUserFromCognito',
      'userQueryByEmail'
    ]);

    cognitoServiceSpy = jasmine.createSpyObj('CognitoService', [
      'signOut',
      'setupMFA',
      'getCognitoProfile'
    ]);

    recoveryServiceSpy = jasmine.createSpyObj('RecoveryService', [
      'smartCheck',
      'resendVerificationCode'
    ]);

    authProgressStorageSpy = jasmine.createSpyObj('AuthProgressStorageService', [
      'save',
      'get',
      'clear',
      'isValid'
    ]);

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        UserEffects,
        provideMockActions(() => actions$),
        provideMockStore({}),
        { provide: UserService, useValue: userServiceSpy },
        { provide: CognitoService, useValue: cognitoServiceSpy },
        { provide: RecoveryService, useValue: recoveryServiceSpy },
        { provide: AuthProgressStorageService, useValue: authProgressStorageSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    effects = TestBed.inject(UserEffects);
    _store = TestBed.inject(MockStore);
  });

  // ===== SMART RECOVERY INTEGRATION TESTS =====
  
  describe('smartCheck$', () => {
    it('should dispatch smartCheckSuccess for orphaned Cognito user', (done) => {
      const email = 'orphaned@example.com';
      const mockResult = {
        cognitoStatus: CognitoUserStatus.Unconfirmed,
        cognitoSub: 'test-sub-123',
        dynamoExists: false,
        recoveryAction: RecoveryAction.ResendVerification,
        nextStep: AuthStep.EmailVerify,
        userMessage: AUTH_MESSAGES.NEW_CODE_SENT,
        debugInfo: {
          checkTimestamp: new Date(),
          cognitoCheckMs: 50,
          dynamoCheckMs: 30
        }
      };

      recoveryServiceSpy.smartCheck.and.returnValue(Promise.resolve(mockResult));
      recoveryServiceSpy.resendVerificationCode.and.returnValue(Promise.resolve());

      actions$ = of(UserActions.smartCheck({ email }));

      effects.smartCheck$.subscribe(action => {
        expect(action).toEqual(UserActions.smartCheckSuccess({ result: mockResult }));
        expect(recoveryServiceSpy.smartCheck).toHaveBeenCalledWith(email);
        expect(authProgressStorageSpy.save).toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch smartCheckSuccess for complete user (login flow)', (done) => {
      const email = 'complete@example.com';
      const mockResult = {
        cognitoStatus: CognitoUserStatus.Confirmed,
        cognitoSub: 'test-sub-456',
        dynamoExists: true,
        recoveryAction: RecoveryAction.Login,
        nextStep: AuthStep.PasswordVerify,
        userMessage: AUTH_MESSAGES.LOGIN,
        debugInfo: {
          checkTimestamp: new Date(),
          cognitoCheckMs: 40,
          dynamoCheckMs: 25
        }
      };

      recoveryServiceSpy.smartCheck.and.returnValue(Promise.resolve(mockResult));

      actions$ = of(UserActions.smartCheck({ email }));

      effects.smartCheck$.subscribe(action => {
        expect(action).toEqual(UserActions.smartCheckSuccess({ result: mockResult }));
        expect(recoveryServiceSpy.smartCheck).toHaveBeenCalledWith(email);
        done();
      });
    });

    it('should dispatch smartCheckSuccess for fresh signup', (done) => {
      const email = 'newuser@example.com';
      const mockResult = {
        cognitoStatus: null,
        cognitoSub: null,
        dynamoExists: false,
        recoveryAction: RecoveryAction.NewSignup,
        nextStep: AuthStep.PasswordSetup,
        userMessage: AUTH_MESSAGES.NEW_SIGNUP,
        debugInfo: {
          checkTimestamp: new Date(),
          cognitoCheckMs: 35,
          dynamoCheckMs: 20
        }
      };

      recoveryServiceSpy.smartCheck.and.returnValue(Promise.resolve(mockResult));

      actions$ = of(UserActions.smartCheck({ email }));

      effects.smartCheck$.subscribe(action => {
        expect(action).toEqual(UserActions.smartCheckSuccess({ result: mockResult }));
        done();
      });
    });

    it('should dispatch smartCheckFailure on network error', (done) => {
      const email = 'test@example.com';
      recoveryServiceSpy.smartCheck.and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      actions$ = of(UserActions.smartCheck({ email }));

      effects.smartCheck$.subscribe(action => {
        expect(action.type).toBe('[User] Smart Check Failure');
        done();
      });
    });
  });

  describe('resumeFromStorage$', () => {
    it('should dispatch resumeFromStorageSuccess when valid progress exists', (done) => {
      const mockProgress = {
        email: 'saved@example.com',
        step: AuthStep.EmailVerify,
        timestamp: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      authProgressStorageSpy.get.and.returnValue(mockProgress);
      authProgressStorageSpy.isValid.and.returnValue(true);

      actions$ = of(UserActions.resumeFromStorage());

      effects.resumeFromStorage$.subscribe(action => {
        expect(action).toEqual(UserActions.resumeFromStorageSuccess({
          email: mockProgress.email,
          step: mockProgress.step
        }));
        done();
      });
    });

    it('should dispatch resumeFromStorageNotFound when no progress exists', (done) => {
      authProgressStorageSpy.get.and.returnValue(null);

      actions$ = of(UserActions.resumeFromStorage());

      effects.resumeFromStorage$.subscribe(action => {
        expect(action).toEqual(UserActions.resumeFromStorageNotFound());
        done();
      });
    });

    it('should dispatch resumeFromStorageNotFound when progress is expired', (done) => {
      const expiredProgress = {
        email: 'expired@example.com',
        step: AuthStep.EmailVerify,
        timestamp: Date.now() - 100000,
        expiresAt: Date.now() - 1000
      };

      authProgressStorageSpy.get.and.returnValue(expiredProgress);
      authProgressStorageSpy.isValid.and.returnValue(false);

      actions$ = of(UserActions.resumeFromStorage());

      effects.resumeFromStorage$.subscribe(action => {
        expect(action).toEqual(UserActions.resumeFromStorageNotFound());
        done();
      });
    });
  });

  describe('createUser$ with UsernameExistsException', () => {
    it('should trigger smartCheck when UsernameExistsException occurs', (done) => {
      const input: UsersCreateInput = {
        userId: 'test-user-id',
        cognitoId: 'test-cognito-id',
        cognitoSub: 'test-cognito-sub',
        email: 'existing@example.com',
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.Pending,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const password = 'TestPassword123!';

      userServiceSpy.userCreate.and.returnValue(
        Promise.reject(new Error('UsernameExistsException: User already exists'))
      );

      actions$ = of(UserActions.createUser({ input, password }));

      effects.createUser$.subscribe(action => {
        expect(action).toEqual(UserActions.smartCheck({ email: input.email }));
        done();
      });
    });
  });

  // Feature: create-user-from-cognito
  // Tests for createUserFromCognito$ effect
  // Validates: Requirements 4.1, 4.3, 8.3
  describe('createUserFromCognito$', () => {
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

    it('should dispatch createUserFromCognitoSuccess on successful user creation', (done) => {
      userServiceSpy.createUserFromCognito.and.returnValue(Promise.resolve(mockUserResponse));

      actions$ = of(UserActions.createUserFromCognito({ cognitoSub: mockCognitoSub }));

      effects.createUserFromCognito$.subscribe(action => {
        expect(action.type).toBe('[User] Create User From Cognito Success');
        expect(userServiceSpy.createUserFromCognito).toHaveBeenCalledWith(mockCognitoSub);
        done();
      });
    });

    it('should dispatch createUserFromCognitoFailure on error', (done) => {
      userServiceSpy.createUserFromCognito.and.returnValue(
        Promise.reject(new Error('User not found'))
      );

      actions$ = of(UserActions.createUserFromCognito({ cognitoSub: mockCognitoSub }));

      effects.createUserFromCognito$.subscribe(action => {
        expect(action.type).toBe('[User] Create User From Cognito Failure');
        done();
      });
    });

    it('should convert response to Users object with correct fields', (done) => {
      userServiceSpy.createUserFromCognito.and.returnValue(Promise.resolve(mockUserResponse));

      actions$ = of(UserActions.createUserFromCognito({ cognitoSub: mockCognitoSub }));

      effects.createUserFromCognito$.subscribe(action => {
        if (action.type === '[User] Create User From Cognito Success') {
          const successAction = action as ReturnType<typeof UserActions.createUserFromCognitoSuccess>;
          expect(successAction.user.userId).toBe(mockCognitoSub);
          expect(successAction.user.email).toBe('test@example.com');
          expect(successAction.user.status).toBe('PENDING');
        }
        done();
      });
    });
  });

  // Feature: create-user-from-cognito
  // Tests for handleCreateUserFromCognitoSuccess$ effect
  // Validates: Requirements 4.3, 8.3
  describe('handleCreateUserFromCognitoSuccess$', () => {
    it('should dispatch authFlowComplete after createUserFromCognitoSuccess', (done) => {
      const mockUser = new Users({
        userId: '12345678-1234-1234-1234-123456789012',
        cognitoId: '12345678-1234-1234-1234-123456789012',
        cognitoSub: '12345678-1234-1234-1234-123456789012',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.Pending,
        emailVerified: true,
        phoneVerified: false,
        mfaEnabled: true,
        mfaSetupComplete: true,
        groups: ['USER'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      actions$ = of(UserActions.createUserFromCognitoSuccess({ user: mockUser }));

      effects.handleCreateUserFromCognitoSuccess$.subscribe(action => {
        expect(action).toEqual(UserActions.authFlowComplete({ user: mockUser }));
        done();
      });
    });
  });
});
