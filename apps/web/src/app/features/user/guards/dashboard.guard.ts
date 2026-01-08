// file: apps/web/src/app/features/user/guards/dashboard.guard.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: Guard to check if user can access the dashboard

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { map, take, catchError, switchMap } from 'rxjs/operators';

import { AuthState } from '../components/auth-flow/store/auth.state';
import { selectCurrentUser, selectIsAuthenticated } from '../components/auth-flow/store/auth.selectors';
import { AuthActions } from '../components/auth-flow/store/auth.actions';
import { UserService } from '../../../core/services/user.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardGuard implements CanActivate {
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
            console.debug('DashboardGuard: Current user from store:', user);
            
            if (!user) {
              // User is authenticated but no user data in store - refresh session
              console.debug('DashboardGuard: No user data, dispatching refreshSession');
              this.store.dispatch(AuthActions.refreshSession());
              // Allow navigation to continue, the layout will handle loading user data
              return true;
            }
            
            // Check if the user profile is valid using the service
            const isValid = this.userService.isUserValid(user);
            console.debug('DashboardGuard: User validity check:', isValid);
            
            if (!isValid) {
              this.router.navigate(['/profile-completion']);
              return false;
            }
            
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