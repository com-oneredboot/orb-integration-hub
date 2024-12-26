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
import {CognitoService} from "../../../core/services/cognito.service";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkEmail),
      tap(action => console.debug('Check email effect started:', action.email)),
      switchMap(({ email }) =>
        from(this.userService.userExists({ email } as UserQueryInput)).pipe(
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
        const timestamp = new Date().toISOString();
        const input: UserCreateInput = {
          id: uuidv4(),
          cognito_id: cognito_id,
          groups: [UserGroup.USER],
          status: UserStatus.PENDING,
          email,
          created_at: timestamp
        };

        return from(this.userService.createUser(input, password)).pipe(
          map(response => {
            if (response.userQueryById?.status_code === 200) {
              // set the new user
              this.userService.setCurrentUser(response.userQueryById.user);
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
        from(this.userService.verifyEmail(input, code)).pipe(
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
    private cognitoService: CognitoService
  ) {}
}
