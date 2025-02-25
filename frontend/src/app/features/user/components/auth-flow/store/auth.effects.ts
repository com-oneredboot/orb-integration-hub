// file: frontend/src/app/features/user/components/auth-flow/store/auth.effects.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { from, of } from "rxjs";

// Application Imports
import { UserService } from "../../../../../core/services/user.service";
import { UserQueryInput } from "../../../../../core/models/user.model";
import { AuthActions } from "./auth.actions";
import { CognitoService } from "../../../../../core/services/cognito.service";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkEmail),
      tap(action => console.debug('Effect [CheckEmail]: Starting', action)),
      switchMap(({ email }) => {
        console.debug('Effect [CheckEmail]: Making service call');
        return from(this.userService.userExists({ email } as UserQueryInput)).pipe(
          tap(result => console.debug('Effect [CheckEmail]: Service returned', result)),
          map((exists: boolean) => {
            console.debug('Effect [CheckEmail]: Success, user exists:', exists);
            return AuthActions.checkEmailSuccess({ userExists: exists });
          }),
          catchError((error: Error) => {
            console.error('Effect [CheckEmail]: Error caught', error);
            return of(AuthActions.checkEmailFailure({
              error: error.message || 'An error occurred while checking email'
            }));
          }),
          tap(resultAction => console.debug('Effect [CheckEmail]: Emitting action', resultAction))
        );
      }),
      catchError(error => {
        console.error('Effect [CheckEmail]: Outer error caught', error);
        return of(AuthActions.checkEmailFailure({
          error: 'An unexpected error occurred'
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
            if (response.userQueryById?.status_code === 200) {
              return AuthActions.createUserSuccess();
            }
            return AuthActions.createUserFailure({
              error: response.userQueryById?.message || 'Failed to create user'
            });
          }),
          catchError(error => of(AuthActions.createUserFailure({
            error: error instanceof Error ? error.message : 'Failed to create user'
          })))
        );
      })
    )
  );

  verifyEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyEmail),
      switchMap(({ input, code }) =>
        from(this.userService.emailVerify(input, code)).pipe(
          map(response => {
            if (response) {
              return AuthActions.verifyEmailSuccess();
            }
            return AuthActions.verifyEmailFailure({
              error: 'Failed to verify email'
            });
          })
        )
      )
    )
  );

  verifyCognitoPassword = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyCognitoPassword),
      switchMap(({ email, password }) =>
        from(this.userService.userSignIn( email, password )).pipe(
          map(response => {

            console.debug('verifyCognitoPassword response:', response);

            // error state
            if (response.status_code !== 200) {
              return AuthActions.verifyCognitoPasswordFailure({
                error: response?.message || 'Failed to verify email and password'
              });
            }

            return AuthActions.verifyCognitoPasswordSuccess({
              needsMFA: response.needsMFA,
              needsMFASetup: response.needsMFASetup,
              message: 'Successfully verified email and password',
              mfaSetupDetails: response.mfaSetupDetails
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
            if (response.status_code === 200) {
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
            if (response.status_code === 200) {
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
        // First clear local storage to ensure test user data is removed
        localStorage.removeItem('auth');
        
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

  constructor(
    private actions$: Actions,
    private userService: UserService,
    private cognitoService: CognitoService
  ) {}
}
