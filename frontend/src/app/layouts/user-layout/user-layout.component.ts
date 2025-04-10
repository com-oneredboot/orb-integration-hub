// file: frontend/src/app/layouts/user-layout/user-layout.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript component for user pages

import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CognitoService } from '../../core/services/cognito.service';

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.scss'],
  standalone: true,
  imports: [RouterModule, CommonModule]
})
export class UserLayoutComponent {
  isAuthenticated$ = this.authService.isAuthenticated$();

  constructor(
    private authService: CognitoService,
    private router: Router
  ) {}

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
      await this.router.navigate(['/platform']);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
} 