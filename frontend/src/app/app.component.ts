// src/app/app.component.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'OneRedBoot Integration Hub';
  currentYear: number = new Date().getFullYear();
  isAuthenticated$ = this.authService.isAuthenticated$();

  constructor(
    private authService: AuthService,
    public router: Router  // Make router public to use in template
  ) {}

  async onSignOut(): Promise<void> {
    try {
      await this.authService.logoutUser();
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}
