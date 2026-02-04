// file: apps/web/src/app/features/user/store/user.effects.property.spec.ts
// author: Corey Dale Peters
// date: 2026-01-16
// description: Property-based tests for UserEffects auth flow state transitions
// **Feature: smart-recovery-auth-flow, Property: Auth flow state transition correctness**
// **Validates: Smart check routing based on Cognito and DynamoDB state**

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import * as fc from 'fast-check';

import { UserEffects } from './user.effects';
import { UserActions } from './user.actions';
import { UserService } from '../../../core/services/user.service';
import { CognitoService } from '../../../core/services/cognito.service';
import { RecoveryService } from '../../../core/services/recovery.service';
import { AuthProgressStorageService } from '../../../core/services/auth-progress-storage.service';
import { AuthStep } from '../../../core/enums/AuthStepEnum';
import { RecoveryAction } from '../../../core/enums/RecoveryActionEnum';
import { CognitoUserStatus } from '../../../core/enums/CognitoUserStatusEnum';
import { SmartCheckResult } from '../../../core/models/RecoveryModel';

describe('UserEffects Property Tests', () => {
  let actions$: Observable<unknown>;
  let effects: UserEffects;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let cognitoServiceSpy: jasmine.SpyObj<CognitoService>;
  let recoveryServiceSpy: jasmine.SpyObj<RecoveryService>;
  let authProgressStorageSpy: jasmine.SpyObj<AuthProgressStorageService>;
  let routerSpy: jasmine.SpyObj<Router>;

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
  });

  describe('Property: Smart check routes to correct auth step based on user state', () => {
    /**
     * Property: For any smartCheck response, the effect SHALL route to the
     * appropriate auth step based on the recovery service's state analysis.
     * 
     * **Validates: Smart Recovery Auth Flow state transitions**
     */
    it('should dispatch smartCheckSuccess with PASSWORD_SETUP for new users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            // Setup: Recovery service returns NEW_USER state
            const mockResult: SmartCheckResult = {
              cognitoStatus: null,
              cognitoSub: null,
              dynamoExists: false,
              recoveryAction: RecoveryAction.NewSignup,
              nextStep: AuthStep.PasswordSetup,
              userMessage: "Let's create your account",
              debugInfo: {
                checkTimestamp: new Date(),
                cognitoCheckMs: 10,
                dynamoCheckMs: 10
              }
            };
            recoveryServiceSpy.smartCheck.and.returnValue(Promise.resolve(mockResult));
            authProgressStorageSpy.save.and.stub();

            actions$ = of(UserActions.smartCheck({ email }));

            const action = await firstValueFrom(effects.smartCheck$);
            
            // Verify: New users should go to PASSWORD_SETUP
            expect(action).toEqual(UserActions.smartCheckSuccess({ result: mockResult }));
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should dispatch smartCheckSuccess with PASSWORD_VERIFY for existing users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            // Setup: Recovery service returns existing user state
            const mockResult: SmartCheckResult = {
              cognitoStatus: CognitoUserStatus.Confirmed,
              cognitoSub: 'test-sub-123',
              dynamoExists: true,
              recoveryAction: RecoveryAction.Login,
              nextStep: AuthStep.PasswordVerify,
              userMessage: 'Welcome back!',
              debugInfo: {
                checkTimestamp: new Date(),
                cognitoCheckMs: 10,
                dynamoCheckMs: 10
              }
            };
            recoveryServiceSpy.smartCheck.and.returnValue(Promise.resolve(mockResult));
            authProgressStorageSpy.save.and.stub();

            actions$ = of(UserActions.smartCheck({ email }));

            const action = await firstValueFrom(effects.smartCheck$);
            
            // Verify: Existing users should go to PASSWORD_VERIFY
            expect(action).toEqual(UserActions.smartCheckSuccess({ result: mockResult }));
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should dispatch smartCheckSuccess with EMAIL_VERIFY for unconfirmed Cognito users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            // Setup: Recovery service returns unconfirmed user state
            const mockResult: SmartCheckResult = {
              cognitoStatus: CognitoUserStatus.Unconfirmed,
              cognitoSub: 'test-sub-456',
              dynamoExists: false,
              recoveryAction: RecoveryAction.ResendVerification,
              nextStep: AuthStep.EmailVerify,
              userMessage: "We've sent a new verification code to your email.",
              debugInfo: {
                checkTimestamp: new Date(),
                cognitoCheckMs: 10,
                dynamoCheckMs: 10
              }
            };
            recoveryServiceSpy.smartCheck.and.returnValue(Promise.resolve(mockResult));
            // Mock resendVerificationCode since it's called for RESEND_VERIFICATION action
            recoveryServiceSpy.resendVerificationCode.and.returnValue(Promise.resolve());
            authProgressStorageSpy.save.and.stub();

            actions$ = of(UserActions.smartCheck({ email }));

            const action = await firstValueFrom(effects.smartCheck$);
            
            // Verify: Unconfirmed users should go to EMAIL_VERIFY with resend action
            expect(action).toEqual(UserActions.smartCheckSuccess({ result: mockResult }));
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
