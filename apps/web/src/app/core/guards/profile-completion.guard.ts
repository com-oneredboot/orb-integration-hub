// file: apps/web/src/app/features/user/guards/profile-completion.guard.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Guard to check if profile completion is required

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';

import { UserState } from '../../features/user/store/user.state';
import { selectCurrentUser, selectIsAuthenticated } from '../../features/user/store/user.selectors';
import { UserActions } from '../../features/user/store/user.actions';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileCompletionGuard implements CanActivate {
  constructor(
    private store: Store<{ user: UserState }>,
    private router: Router,
    private userService: UserService
  ) {}

  canActivate(): Observable<boolean> {
    // First check if the user is authenticated
    return this.store.select(selectIsAuthenticated).pipe(
      take(1),
      switchMap(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/authenticate']);
          return of(false);
        }
        
        // User is authenticated, now check if profile is complete
        return this.store.select(selectCurrentUser).pipe(
          take(1),
          map(user => {
            if (!user) {
              this.router.navigate(['/authenticate']);
              return false;
            }
            
            // TODO: Add profile completion check action if needed
            // this.store.dispatch(AuthActions.redirectToProfile());
            
            // Check if the user profile is valid using the service
            const isValid = this.userService.isUserValid(user);
            
            if (isValid) {
              // If profile is already valid, redirect to dashboard
              this.router.navigate(['/dashboard']);
              return false;
            }
            
            // Profile is not valid, allow access to the profile completion page
            return true;
          }),
          catchError(() => {
            this.router.navigate(['/authenticate']);
            return of(false);
          })
        );
      })
    );
  }
} 