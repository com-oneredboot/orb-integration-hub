// file: frontend/src/app/guards/auth.guard.ts
// author: Corey Dale Peters
// date: 2024-12-31
// description: This guard is used to protect routes that require authentication or group membership

import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { CognitoService } from '../services/cognito.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(
    private cognitoService: CognitoService,
    private router: Router
  ) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {

    const isAuthenticated = await this.cognitoService.checkIsAuthenticated();

    // If this is an auth route and user is authenticated
    if (route.children[0]?.data?.['requiresAuth'] === false && isAuthenticated) {
      const profile = await this.cognitoService.getCognitoProfile();
      if (profile?.groups?.length > 0) {
        // Redirect to the first group's route
        const firstGroup = profile.groups[0].toLowerCase();
        await this.router.navigate([`/${firstGroup}`]);
        return false;
      }
    }

    // If this is a protected route and user is not authenticated
    if (route.children[0]?.data?.['requiresAuth'] === true && !isAuthenticated) {
      await this.router.navigate(['/authenticate']);
      return false;
    }

    // If this is a protected route, check group membership
    if (route.children[0]?.data?.['requiresAuth'] === true && isAuthenticated) {
      const profile = await this.cognitoService.getCognitoProfile();
      const requiredGroup = route.children[0].data['group'];

      if (!profile?.groups?.includes(requiredGroup)) {
        // Redirect to the first available group's route
        if (profile?.groups?.length > 0) {
          const firstGroup = profile.groups[0].toLowerCase();
          await this.router.navigate([`/${firstGroup}`]);
        } else {
          await this.router.navigate(['/auth']);
        }
        return false;
      }
    }

    return true;
  }
}
