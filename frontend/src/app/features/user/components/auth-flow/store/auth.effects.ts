// file: frontend/src/app/features/user/components/auth-flow/store/auth.effects.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { from, of } from "rxjs";
import { Store } from '@ngrx/store';

// Application Imports
import { UserService } from "../../../../../core/services/user.service";
import { UsersQueryByEmail } from "../../../../../core/graphql/Users.graphql";
import { AuthActions } from "./auth.actions";
import * as fromAuth from "./auth.selectors";
import { CognitoService } from "../../../../../core/services/cognito.service";
import { getError } from "../../../../../core/models/ErrorRegistry.model";
import { UsersQueryByEmailInput } from "../../../../../core/models/Users.model";
import { IUsers } from "../../../../../core/models/Users.model";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkEmail),
      tap(action => console.debug('Effect [CheckEmail]: Starting', action)),
      switchMap(({ email }) => {
        console.debug('Effect [CheckEmail]: Making service call');
        const userInput: UsersQueryByEmailInput = { email: email };
        
        return from(this.userService.userExists(userInput)).pipe(
          tap(result => console.debug('Effect [CheckEmail]: Service returned', result)),
          map((result: IUsers | false | null) => {
            if (result === false) {
              // Backend/network error or unauthorized
              return AuthActions.checkEmailFailure({ error: 'User not found or not authorized.' });
            }
            if (!result) {
              // User not found (null)
              return AuthActions.checkEmailUserNotFound();
            }
            // User exists
            return AuthActions.checkEmailSuccess({ userExists: true });
          }),
          catchError((error: Error) => {
            // Use error registry to log and format error
            let message = error.message;
            if (
              message.includes('Unable to connect to the server') ||
              message.includes('ERR_NAME_NOT_RESOLVED') ||
              message.includes('NetworkError') ||
              message.includes('Failed to fetch') ||
              message.includes('network timeout') ||
              message.includes('Could not connect')
            ) {
              message = 'Unable to connect to the server. Please check your connection and try again.';
            }
            const errorCode = 'ORB-API-003'; // Invalid input for GraphQL operation
            const errorObj = getError(errorCode);
            return of(AuthActions.checkEmailFailure({
              error: errorObj ? errorObj.message : 'Unknown error'
            }));
          }),
          tap(resultAction => console.debug('Effect [CheckEmail]: Emitting action', resultAction))
        );
      }),
      catchError(error => {
        console.error('Effect [CheckEmail]: Outer error caught', error);
        const errorCode = 'ORB-SYS-001'; // Unexpected error
        const errorObj = getError(errorCode);
        return of(AuthActions.checkEmailFailure({
          error: errorObj ? errorObj.message : 'Unknown error'
        }));
      })
    )
  );

  createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.createUser),
      switchMap(({ input, password }) => {
        // create the user
        return from(this.userService.userCreate(input, password)).pipe(
          map(response => {
            if (response.statusCode === 200) {
              return AuthActions.createUserSuccess();
            }
            return AuthActions.createUserFailure({
              error: response.message || 'Failed to create user'
            });
          }),
          catchError(error => {
            // Use error registry to handle the error
            const errorCode = 'ORB-API-002'; // Default to GraphQL mutation error
            const errorObj = getError(errorCode);
            
            return of(AuthActions.createUserFailure({
              error: errorObj ? errorObj.message : 'Unknown error'
            }));
          })
        );
      })
    )
  );

  verifyEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyEmail),
      switchMap(({ input, code, email }) => {
        // First get the user by email to get their userId
        const emailInput: UsersQueryByEmailInput = { email: input.email };
        return from(this.userService.userExists(emailInput)).pipe(
          switchMap(user => {
            if (!user || typeof user === 'boolean') {
              return of(AuthActions.verifyEmailFailure({
                error: 'User not found'
              }));
            }
            // Now verify the email with the userId
            const userIdInput = { userId: user.userId };
            return from(this.userService.emailVerify(userIdInput, code, email)).pipe(
              map(response => {
                if (response) {
                  return AuthActions.verifyEmailSuccess();
                }
                return AuthActions.verifyEmailFailure({
                  error: 'Failed to verify email'
                });
              })
            );
          })
        );
      })
    )
  );

  verifyCognitoPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyCognitoPassword),
      switchMap(({ email, password }) =>
        from(this.userService.userSignIn( email, password )).pipe(
          map(response => {

            console.debug('verifyCognitoPassword response:', response);

            // error state
            if (response.statusCode !== 200) {
              return AuthActions.verifyCognitoPasswordFailure({
                error: response?.message || 'Failed to verify email and password'
              });
            }

            return AuthActions.verifyCognitoPasswordSuccess({
              needsMFA: response.data?.needsMFA,
              needsMFASetup: response.data?.needsMFASetup,
              message: 'Successfully verified email and password',
              mfaSetupDetails: response.data?.mfaSetupDetails
            });

          }),
          catchError(error => of(AuthActions.verifyCognitoPasswordFailure({
            error: error instanceof Error ? error.message : 'Failed to sign in'
          }))
        )
      )
    )
  ));

  setupMFA$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.needsMFASetup),
      switchMap(() =>
        from(this.userService.mfaSetup()).pipe(
          map(response => {
            if (response.statusCode === 200) {
              return AuthActions.needsMFASetupSuccess();
            }
            return AuthActions.needsMFASetupFailure({
              error: response.message || 'Failed to setup MFA'
            });
          }),
          catchError(error => of(AuthActions.needsMFASetupFailure({
            error: error instanceof Error ? error.message : 'Failed to setup MFA'
          }))
        )
      )
    )
  ));

  verifyMFA$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.needsMFA),
      switchMap(({ code }) =>
        from(this.userService.mfaVerify(code)).pipe(
          map(response => {
            if (response.statusCode === 200) {
              return AuthActions.needsMFASuccess();
            }
            return AuthActions.needsMFAFailure({
              error: response.message || 'Failed to verify MFA code'
            });
          }),
          catchError(error => of(AuthActions.needsMFAFailure({
            error: error instanceof Error ? error.message : 'Failed to verify MFA code'
          }))
        )
      )
    )
  ));

  // Add signout effect
  signout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signout),
      switchMap(() => {
        // Then attempt to sign out from Cognito service
        return from(this.cognitoService.signOut()).pipe(
          map(() => {
            console.debug('Signout successful, returning success action');
            return AuthActions.signoutSuccess();
          }),
          catchError(error => {
            console.error('Error during signout:', error);
            // Even on error, we return success to ensure state is reset
            return of(AuthActions.signoutSuccess());
          })
        );
      })
    )
  );

  // Check phone required
  checkPhoneRequired$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkPhoneRequired),
      tap(() => console.debug('Effect: Checking if phone setup is required')),
      switchMap(() => {
        return of(AuthActions.checkPhoneRequiredSuccess({ required: true }))
          .pipe(
            catchError(error => of(AuthActions.checkPhoneRequiredFailure({ 
              error: error instanceof Error ? error.message : 'Failed to check phone requirement'
            })))
          );
      })
    )
  );
  
  // Setup phone number
  setupPhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.setupPhone),
      tap(action => console.debug('Effect: Setting up phone', action)),
      switchMap(({ phoneNumber }) => {
        return from(this.userService.sendSMSVerificationCode(phoneNumber)).pipe(
          map(response => {
            if (response.statusCode === 200) {
              return AuthActions.setupPhoneSuccess({ 
                validationId: phoneNumber,
                expiresAt: Date.now() + 10 * 60 * 1000
              });
            }
            return AuthActions.setupPhoneFailure({
              error: response.message || 'Failed to send verification code'
            });
          }),
          catchError(error => of(AuthActions.setupPhoneFailure({ 
            error: error instanceof Error ? error.message : 'Failed to set up phone verification'
          })))
        );
      })
    )
  );
  
  // Verify phone number
  verifyPhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyPhone),
      tap(action => console.debug('Effect: Verifying phone code', action)),
      withLatestFrom(this.store.select(fromAuth.selectPhoneValidationId)),
      switchMap(([{ code }, phoneNumber]) => {
        if (!phoneNumber) {
          return of(AuthActions.verifyPhoneFailure({ 
            error: 'No phone number found for verification'
          }));
        }
        
        return from(this.userService.verifySMSCode(phoneNumber, code)).pipe(
          map(isValid => {
            if (isValid) {
              return AuthActions.verifyPhoneSuccess();
            }
            return AuthActions.verifyPhoneFailure({
              error: 'Invalid verification code'
            });
          }),
          catchError(error => of(AuthActions.verifyPhoneFailure({ 
            error: error instanceof Error ? error.message : 'Failed to verify phone code'
          })))
        );
      })
    )
  );

  constructor(
    private actions$: Actions,
    private userService: UserService,
    private cognitoService: CognitoService,
    private store: Store
  ) {}
}

