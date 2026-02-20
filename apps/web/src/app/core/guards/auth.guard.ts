// file: apps/web/src/app/guards/auth.guard.ts
// author: Corey Dale Peters
// date: 2024-12-31
// description: This guard is used to protect routes that require authentication or group membership

import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate } from '@angular/router';
import { CognitoService } from '../services/cognito.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private cognitoService: CognitoService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {

    const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
    
    console.debug('AuthGuard::canActivate', {
      route: route.routeConfig?.path,
      isAuthenticated,
      routeData: route.data,
      url: state.url
    });

    // If authentication fails, try to clean up any stale tokens
    if (!isAuthenticated && await this.cognitoService.checkHasTokens()) {
      console.debug('AuthGuard: Found stale tokens, signing out user');
      await this.cognitoService.signOut();
    }

    // Check if this route requires authentication
    const requiresAuth = route.data?.['requiresAuth'];
    
    // If this is a protected route and user is not authenticated
    if (requiresAuth === true && !isAuthenticated) {
      console.debug('AuthGuard: Redirecting to /authenticate - user not authenticated');
      await this.router.navigate(['/authenticate']);
      return false;
    }

    // If this is an auth route and user is already authenticated
    if (requiresAuth === false && isAuthenticated) {
      console.debug('AuthGuard: User already authenticated, redirecting to dashboard');
      await this.router.navigate(['/dashboard']);
      return false;
    }

    // If this is a protected route and user is authenticated, check group membership
    if (requiresAuth === true && isAuthenticated) {
      const profile = await this.cognitoService.getCognitoProfile();
      const requiredGroup = route.data?.['group'];
      const requiresCustomer = route.data?.['requiresCustomer'];

      // Check specific group requirement
      if (requiredGroup && !profile?.groups?.includes(requiredGroup)) {
        console.debug('AuthGuard: User does not have required group', { requiredGroup, userGroups: profile?.groups });
        // Redirect to dashboard as default
        await this.router.navigate(['/dashboard']);
        return false;
      }

      // Check customer group requirement
      if (requiresCustomer === true && !profile?.groups?.includes('CUSTOMER')) {
        console.debug('AuthGuard: User does not have CUSTOMER group', { userGroups: profile?.groups });
        // Redirect to dashboard as default
        await this.router.navigate(['/dashboard']);
        return false;
      }
    }

    return true;
  }
}
