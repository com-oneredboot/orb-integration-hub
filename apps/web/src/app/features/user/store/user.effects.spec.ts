// file: apps/web/src/app/features/user/store/user.effects.spec.ts
// author: Corey Dale Peters
// date: 2026-01-16
// description: Unit tests for UserEffects.checkEmail$ effect

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
import { RecoveryAction, CognitoUserStatus, AUTH_MESSAGES } from '../../../core/models/RecoveryModel';
import { AuthSteps } from './user.state';
import { UsersCreateInput } from '../../../core/models/UsersModel';
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
      'updateUserTimestamp'
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

  describe('checkEmail$', () => {
    it('should dispatch checkEmailSuccess when email exists', (done) => {
      const email = 'existing@example.com';
      userServiceSpy.checkEmailExists.and.returnValue(
        Promise.resolve({ exists: true })
      );

      actions$ = of(UserActions.checkEmail({ email }));

      effects.checkEmail$.subscribe(action => {
        expect(action).toEqual(UserActions.checkEmailSuccess({ userExists: true }));
        expect(userServiceSpy.checkEmailExists).toHaveBeenCalledWith(email);
        done();
      });
    });

    it('should dispatch checkEmailUserNotFound when email does not exist', (done) => {
      const email = 'nonexistent@example.com';
      userServiceSpy.checkEmailExists.and.returnValue(
        Promise.resolve({ exists: false })
      );

      actions$ = of(UserActions.checkEmail({ email }));

      effects.checkEmail$.subscribe(action => {
        expect(action).toEqual(UserActions.checkEmailUserNotFound());
        expect(userServiceSpy.checkEmailExists).toHaveBeenCalledWith(email);
        done();
      });
    });

    it('should dispatch checkEmailFailure on network error', (done) => {
      const email = 'test@example.com';
      userServiceSpy.checkEmailExists.and.returnValue(
        Promise.reject(new Error('NetworkError: Failed to fetch'))
      );

      actions$ = of(UserActions.checkEmail({ email }));

      effects.checkEmail$.subscribe(action => {
        expect(action.type).toBe('[User] Check Email Failure');
        done();
      });
    });

    it('should dispatch checkEmailFailure on general error', (done) => {
      const email = 'test@example.com';
      userServiceSpy.checkEmailExists.and.returnValue(
        Promise.reject(new Error('Failed to check email existence'))
      );

      actions$ = of(UserActions.checkEmail({ email }));

      effects.checkEmail$.subscribe(action => {
        expect(action.type).toBe('[User] Check Email Failure');
        done();
      });
    });
  });

  // ===== SMART RECOVERY INTEGRATION TESTS =====
  
  describe('smartCheck$', () => {
    it('should dispatch smartCheckSuccess for orphaned Cognito user', (done) => {
      const email = 'orphaned@example.com';
      const mockResult = {
        cognitoStatus: CognitoUserStatus.UNCONFIRMED,
        cognitoSub: 'test-sub-123',
        dynamoExists: false,
        recoveryAction: RecoveryAction.RESEND_VERIFICATION,
        nextStep: AuthSteps.EMAIL_VERIFY,
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
        cognitoStatus: CognitoUserStatus.CONFIRMED,
        cognitoSub: 'test-sub-456',
        dynamoExists: true,
        recoveryAction: RecoveryAction.LOGIN,
        nextStep: AuthSteps.PASSWORD_VERIFY,
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
        recoveryAction: RecoveryAction.NEW_SIGNUP,
        nextStep: AuthSteps.PASSWORD_SETUP,
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
        step: AuthSteps.EMAIL_VERIFY,
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
        step: AuthSteps.EMAIL_VERIFY,
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
});
