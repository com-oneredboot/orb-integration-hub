// file: frontend/src/app/layouts/user-layout/user-layout.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript component for user pages

import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { CognitoService } from '../../core/services/cognito.service';
import { AuthActions } from '../../features/user/components/auth-flow/store/auth.actions';
import { selectIsAuthenticated } from '../../features/user/components/auth-flow/store/auth.selectors';

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.scss'],
  standalone: true,
  imports: [RouterModule, CommonModule]
})
export class UserLayoutComponent implements OnInit {
  isAuthenticated$ = this.store.select(selectIsAuthenticated);

  constructor(
    private authService: CognitoService,
    private router: Router,
    private store: Store
  ) {}

  ngOnInit(): void {
    // Dispatch refresh session to ensure user data is loaded
    this.store.dispatch(AuthActions.refreshSession());
  }

  signOut(): void {
    // Use NgRx action - navigation will be handled by the effect
    this.store.dispatch(AuthActions.signout());
  }
} 