// file: frontend/src/app/layouts/app-layout/app-layout.component.ts
// author: Corey Dale Peters
// date: 2024-12-04
// description: Angular component

import { Component } from '@angular/core';
import {CognitoService} from "../../core/services/cognito.service";
import {Router} from "@angular/router";

@Component({
    selector: 'app-home-layout',
    templateUrl: './app-layout.component.html',
    styleUrls: ['./app-layout.component.scss'],
    standalone: false
})
export class AppLayoutComponent {
  title = 'OneRedBoot Integration Hub';
  currentYear: number = new Date().getFullYear();
  isAuthenticated$ = this.authService.isAuthenticated$();

  constructor(
    private authService: CognitoService,
    public router: Router  // Make router public to use in template
  ) {}

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      await this.router.navigate(['/home']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
}
