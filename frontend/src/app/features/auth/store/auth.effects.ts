// file: frontend/src/app/core/models/user.model.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, tap } from 'rxjs/operators';
import {catchError, switchMap} from "rxjs/operators";
import { checkEmail, checkEmailSuccess, checkEmailFailure} from "./auth.actions";
import {from, of} from "rxjs";

// Application Imports
import {UserService} from "../../../core/services/user.service";
import {UserQueryInput} from "../../../core/models/user.model";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkEmail),
      tap(action => console.log('1. Check email effect started:', action.email)),
      switchMap(({ email }) =>
        from(this.userService.doesUserExist({ email } as UserQueryInput)).pipe(
          tap(exists => console.log('2. User exists check result:', exists)),
          map((exists: boolean | undefined) => {
            console.log('3. Mapping exists result to action:', exists);
            if (exists === undefined) {
              console.log('4a. Undefined result - returning failure');
              return checkEmailFailure({
                error: 'Unable to verify email status. Please try again.'
              });
            }
            console.log('4b. Valid result - returning success with exists:', exists);
            return checkEmailSuccess({ userExists: exists });
          }),
          tap(action => console.log('5. Resulting action:', action.type)),
          catchError((error: Error) => {
            console.log('Error in checkEmail effect:', error);
            return of(checkEmailFailure({
              error: error.message || 'An error occurred while checking email'
            }));
          })
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private userService: UserService
  ) {}
}
