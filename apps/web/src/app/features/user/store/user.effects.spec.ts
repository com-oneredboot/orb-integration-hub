// file: apps/web/src/app/features/user/store/user.effects.spec.ts
// author: Corey Dale Peters
// date: 2026-01-16
// description: Unit tests for UserEffects.checkEmail$ effect

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { Router } from '@angular/router';

import { UserEffects } from './user.effects';
import { UserActions } from './user.actions';
import { UserService } from '../../../core/services/user.service';
import { CognitoService } from '../../../core/services/cognito.service';

describe('UserEffects', () => {
  let actions$: Observable<unknown>;
  let effects: UserEffects;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let cognitoServiceSpy: jasmine.SpyObj<CognitoService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let store: MockStore;

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
    store = TestBed.inject(MockStore);
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
});
