// file: apps/web/src/app/features/user/store/user.effects.property.spec.ts
// author: Corey Dale Peters
// date: 2026-01-16
// description: Property-based tests for UserEffects auth flow state transitions
// **Feature: check-email-exists, Property 3: Auth flow state transition correctness**
// **Validates: Requirements 3.2, 3.3**

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

describe('UserEffects Property Tests', () => {
  let actions$: Observable<unknown>;
  let effects: UserEffects;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let cognitoServiceSpy: jasmine.SpyObj<CognitoService>;
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

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        UserEffects,
        provideMockActions(() => actions$),
        provideMockStore({}),
        { provide: UserService, useValue: userServiceSpy },
        { provide: CognitoService, useValue: cognitoServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    effects = TestBed.inject(UserEffects);
  });

  describe('Property 3: Auth flow state transition correctness', () => {
    /**
     * Property: For any CheckEmailExists response, the Auth_Flow_Component SHALL
     * transition to the password entry step when exists: true, and to the
     * registration flow when exists: false.
     * 
     * **Validates: Requirements 3.2, 3.3**
     */
    it('should dispatch checkEmailSuccess when exists is true for any valid email', async () => {
      // Run 100 iterations with random valid emails
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            // Setup: checkEmailExists returns exists: true
            userServiceSpy.checkEmailExists.and.returnValue(
              Promise.resolve({ exists: true })
            );

            actions$ = of(UserActions.checkEmail({ email }));

            const action = await firstValueFrom(effects.checkEmail$);
            
            // Verify: When exists is true, checkEmailSuccess is dispatched
            expect(action).toEqual(UserActions.checkEmailSuccess({ userExists: true }));
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should dispatch checkEmailUserNotFound when exists is false for any valid email', async () => {
      // Run 100 iterations with random valid emails
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          async (email) => {
            // Setup: checkEmailExists returns exists: false
            userServiceSpy.checkEmailExists.and.returnValue(
              Promise.resolve({ exists: false })
            );

            actions$ = of(UserActions.checkEmail({ email }));

            const action = await firstValueFrom(effects.checkEmail$);
            
            // Verify: When exists is false, checkEmailUserNotFound is dispatched
            expect(action).toEqual(UserActions.checkEmailUserNotFound());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly map any boolean exists value to the appropriate action', async () => {
      // Run 100 iterations with random boolean values
      await fc.assert(
        fc.asyncProperty(
          fc.emailAddress(),
          fc.boolean(),
          async (email, exists) => {
            // Setup: checkEmailExists returns the random boolean
            userServiceSpy.checkEmailExists.and.returnValue(
              Promise.resolve({ exists })
            );

            actions$ = of(UserActions.checkEmail({ email }));

            const action = await firstValueFrom(effects.checkEmail$);
            
            if (exists) {
              // When exists is true, should dispatch checkEmailSuccess
              expect(action).toEqual(UserActions.checkEmailSuccess({ userExists: true }));
            } else {
              // When exists is false, should dispatch checkEmailUserNotFound
              expect(action).toEqual(UserActions.checkEmailUserNotFound());
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
