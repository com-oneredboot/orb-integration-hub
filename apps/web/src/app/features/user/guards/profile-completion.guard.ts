// file: apps/web/src/app/features/user/guards/profile-completion.guard.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Guard to check if profile completion is required

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';

import { AuthState } from '../components/auth-flow/store/auth.state';
import { selectCurrentUser, selectIsAuthenticated } from '../components/auth-flow/store/auth.selectors';
import { checkProfileCompletion } from '../components/auth-flow/store/auth.actions';
import { UserService } from '../../../core/services/user.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileCompletionGuard implements CanActivate {
  constructor(
    private store: Store<{ auth: AuthState }>,
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
            
            // Dispatch profile completion check action
            this.store.dispatch(checkProfileCompletion());
            
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