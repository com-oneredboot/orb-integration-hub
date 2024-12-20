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
      tap(action => console.log('Check email effect:', action.email)),
      switchMap(({ email }) =>
        from(this.userService.doesUserExist({ email } as UserQueryInput)).pipe(
          map((exists: boolean | undefined) => {
            if (exists === undefined) {
              // If we get undefined, treat it as an error case
              return checkEmailFailure({
                error: 'Unable to verify email status. Please try again.'
              });
            }
            return checkEmailSuccess({ exists });
          }),
          catchError((error: Error) => of(checkEmailFailure({
            error: error.message || 'An error occurred while checking email'
          })))
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private userService: UserService
  ) {}
}
