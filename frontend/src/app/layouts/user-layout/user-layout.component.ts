// file: frontend/src/app/layouts/user-layout/user-layout.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript component for user pages

import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { CognitoService } from '../../core/services/cognito.service';
<<<<<<< HEAD
import { UserActions } from '../../features/user/store/user.actions';
import { selectIsAuthenticated, selectCurrentUser } from '../../features/user/store/user.selectors';
import { map } from 'rxjs/operators';
=======
import { AuthActions } from '../../features/user/components/auth-flow/store/auth.actions';
import { selectIsAuthenticated } from '../../features/user/components/auth-flow/store/auth.selectors';
>>>>>>> main

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.scss'],
  standalone: true,
  imports: [RouterModule, CommonModule]
})
export class UserLayoutComponent implements OnInit {
  isAuthenticated$ = this.store.select(selectIsAuthenticated);
<<<<<<< HEAD
  isCustomerUser$ = this.store.select(selectCurrentUser).pipe(
    map(user => user?.groups?.includes('CUSTOMER') || false)
  );
=======
>>>>>>> main

  constructor(
    private authService: CognitoService,
    private router: Router,
    private store: Store
  ) {}

  ngOnInit(): void {
    // Dispatch refresh session to ensure user data is loaded
<<<<<<< HEAD
    this.store.dispatch(UserActions.refreshSession());
=======
    this.store.dispatch(AuthActions.refreshSession());
>>>>>>> main
  }

  signOut(): void {
    // Use NgRx action - navigation will be handled by the effect
<<<<<<< HEAD
    this.store.dispatch(UserActions.signout());
=======
    this.store.dispatch(AuthActions.signout());
>>>>>>> main
  }
} 