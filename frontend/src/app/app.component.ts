// file: frontend/src/app/app.component.ts
// author: Corey Dale Peters
// date: 2024-12-04
// description: Main application component

import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { CognitoService } from './core/services/cognito.service';

declare global {
  interface Window {
    cognitoService: CognitoService;
  }
}

@Component({
    selector: 'app-root',
    template: '<router-outlet></router-outlet>',
    standalone: true,
    imports: [RouterOutlet]
})
export class AppComponent implements OnInit {
  constructor(
    private cognitoService: CognitoService,
    private router: Router
  ) {}

  async ngOnInit() {
    // Make CognitoService globally accessible for debugging
    if (typeof window !== 'undefined') {
      window.cognitoService = this.cognitoService;
      console.debug('🔧 CognitoService is available globally as window.cognitoService');
      console.debug('🔧 To debug user status, run: window.cognitoService.debugUserStatus()');
    }

    // Initialize authentication state on app startup
    try {
      console.debug('🚀 Initializing authentication state...');
      const isAuthenticated = await this.cognitoService.checkIsAuthenticated();
      
      if (isAuthenticated) {
        console.debug('✅ User is authenticated on app startup');
        
        // If user is on authenticate page but is already authenticated, redirect to dashboard
        const currentUrl = this.router.url;
        if (currentUrl === '/authenticate' || currentUrl === '/') {
          console.debug('🔄 Redirecting authenticated user to dashboard');
          await this.router.navigate(['/dashboard']);
        }
      } else {
        console.debug('❌ User is not authenticated on app startup');
        
        // Clean up any stale tokens
        const hasStaleTokens = await this.cognitoService.checkHasTokens();
        if (hasStaleTokens) {
          console.debug('🧹 Cleaning up stale authentication tokens');
          await this.cognitoService.signOut();
        }
      }
    } catch (error) {
      console.error('⚠️ Error during authentication initialization:', error);
      
      // If there's an error, try to clean up authentication state
      try {
        await this.cognitoService.signOut();
      } catch (signOutError) {
        console.error('❌ Error during cleanup sign out:', signOutError);
      }
    }
  }
}
