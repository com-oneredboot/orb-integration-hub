// file: frontend/src/app/core/models/user.model.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { from, of } from "rxjs";

// Application Imports
import { UserService } from "../../../core/services/user.service";
import { UserQueryInput } from "../../../core/models/user.model";
import { AuthActions } from "./auth.actions";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkEmail),
      switchMap(({ email }) =>
        from(this.userService.userExists({ email } as UserQueryInput)).pipe(
          map((exists: boolean | undefined) => {
            if (exists === undefined) {
              return AuthActions.checkEmailFailure({
                error: 'Unable to verify email status. Please try again.'
              });
            }
            return AuthActions.checkEmailSuccess({ userExists: exists });
          }),
          catchError((error: Error) => {
            return of(AuthActions.checkEmailFailure({
              error: error.message || 'An error occurred while checking email'
            }));
          })
        )
      )
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

  constructor(
    private actions$: Actions,
    private userService: UserService
  ) {}
}
