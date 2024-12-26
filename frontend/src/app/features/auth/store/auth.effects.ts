// file: frontend/src/app/core/models/user.model.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { from, of } from "rxjs";
import { v4 as uuidv4 } from 'uuid';

// Application Imports
import { UserService } from "../../../core/services/user.service";
import { UserCreateInput, UserGroup, UserQueryInput, UserStatus } from "../../../core/models/user.model";
import { AuthActions, checkEmail, checkEmailFailure, checkEmailSuccess } from "./auth.actions";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkEmail),
      switchMap(({ email }) =>
        from(this.userService.userExists({ email } as UserQueryInput)).pipe(
          map((exists: boolean | undefined) => {
            if (exists === undefined) {
              return checkEmailFailure({
                error: 'Unable to verify email status. Please try again.'
              });
            }
            return checkEmailSuccess({ userExists: exists });
          }),
          catchError((error: Error) => {
            return of(checkEmailFailure({
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

  constructor(
    private actions$: Actions,
    private userService: UserService,
  ) {}
}
