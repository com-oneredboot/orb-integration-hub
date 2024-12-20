import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, tap } from 'rxjs/operators';
import { AuthActions } from './auth.actions';

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkEmail),
      tap(action => console.log('Check email effect:', action.email)),
      map(({ email }) => {
        return AuthActions.checkEmailSuccess({ exists: false });
      })
    )
  );

  constructor(
    private actions$: Actions
  ) {}
}
