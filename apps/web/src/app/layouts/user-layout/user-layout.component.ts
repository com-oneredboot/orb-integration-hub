// file: apps/web/src/app/layouts/user-layout/user-layout.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript component for user pages

import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { CognitoService } from '../../core/services/cognito.service';
import { UserActions } from '../../features/user/store/user.actions';
import { selectIsAuthenticated, selectCurrentUser } from '../../features/user/store/user.selectors';
import { map } from 'rxjs/operators';
import { QuickActionsNavComponent } from '../../features/user/components/dashboard/quick-actions-nav/quick-actions-nav.component';
import { SideNavItem } from '../../features/user/components/dashboard/dashboard.types';

@Component({
  selector: 'app-user-layout',
  templateUrl: './user-layout.component.html',
  styleUrls: ['./user-layout.component.scss'],
  standalone: true,
  imports: [RouterModule, CommonModule, QuickActionsNavComponent]
})
export class UserLayoutComponent implements OnInit {
  isAuthenticated$ = this.store.select(selectIsAuthenticated);
  isCustomerUser$ = this.store.select(selectCurrentUser).pipe(
    map(user => user?.groups?.includes('CUSTOMER') || false)
  );

  constructor(
    private authService: CognitoService,
    private router: Router,
    private store: Store
  ) {}

  ngOnInit(): void {
    // Dispatch refresh session to ensure user data is loaded
    this.store.dispatch(UserActions.refreshSession());
  }

  signOut(): void {
    // Use NgRx action - navigation will be handled by the effect
    this.store.dispatch(UserActions.signout());
  }

  /**
   * Handle side navigation item clicked
   */
  onSideNavItemClicked(item: SideNavItem): void {
    console.log('[UserLayout] Side nav item clicked:', item.id, item.tooltip);
  }
} 