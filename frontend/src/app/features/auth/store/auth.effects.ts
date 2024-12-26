// file: frontend/src/app/core/models/user.model.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {from, of} from "rxjs";

// Application Imports
import {UserService} from "../../../core/services/user.service";
import {UserCreateInput, UserGroup, UserQueryInput, UserStatus} from "../../../core/models/user.model";
import {AuthActions, checkEmail, checkEmailFailure, checkEmailSuccess,} from "./auth.actions";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkEmail),
      tap(action => console.debug('Check email effect started:', action.email)),
      switchMap(({ email }) =>
        from(this.userService.doesUserExist({ email } as UserQueryInput)).pipe(
          tap(exists => console.debug('2. User exists check result:', exists)),
          map((exists: boolean | undefined) => {
            console.debug('3. Mapping exists result to action:', exists);
            if (exists === undefined) {
              console.debug('4a. Undefined result - returning failure');
              return checkEmailFailure({
                error: 'Unable to verify email status. Please try again.'
              });
            }
            console.debug('4b. Valid result - returning success with exists:', exists);
            return checkEmailSuccess({ userExists: exists });
          }),
          tap(action => console.debug('5. Resulting action:', action.type)),
          catchError((error: Error) => {
            console.debug('Error in checkEmail effect:', error);
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
      switchMap(({ cognito_id, email, password }) => {
        // create the user
        const input: UserCreateInput = {
          cognito_id: cognito_id,
          groups: [UserGroup.USER],
          status: UserStatus.PENDING,
          email,
        };

        return from(this.userService.createUser(input, password)).pipe(
          map(response => {
            if (response.getUserById?.status_code === 200) {
              return AuthActions.createUserSuccess();
            }
            return AuthActions.createUserFailure({
              error: response.getUserById?.message || 'Failed to create user'
            });
          }),
          catchError(error => of(AuthActions.createUserFailure({
            error: error instanceof Error ? error.message : 'Failed to create user'
          })))
        );
      })
    )
  );

  constructor(
    private actions$: Actions,
    private userService: UserService
  ) {}
}
