// file: apps/web/src/app/features/user/components/dashboard/dashboard.component.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Dashboard component for authenticated users - CTA Hub redesign

import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IUsers } from '../../../../core/models/UsersModel';
import * as fromUser from '../../store/user.selectors';
import { UserService } from '../../../../core/services/user.service';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { RouterModule } from '@angular/router';
import { DebugPanelComponent, DebugContext } from '../../../../shared/components/debug/debug-panel.component';
import { DebugLogService, DebugLogEntry } from '../../../../core/services/debug-log.service';
import { CtaCard, SideNavItem } from './dashboard.types';
import { DashboardCtaService } from '../../services/dashboard-cta.service';
import { CtaCardComponent } from './cta-card/cta-card.component';
import { DashboardSideNavComponent } from './dashboard-side-nav/dashboard-side-nav.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    RouterModule,
    DebugPanelComponent,
    CtaCardComponent,
    DashboardSideNavComponent
  ]
})
export class DashboardComponent implements OnInit {
  currentUser$: Observable<IUsers | null>;
  debugMode$: Observable<boolean>;
  isLoading$: Observable<boolean>;
  isNotLoading$: Observable<boolean>;
  debugLogs$: Observable<DebugLogEntry[]>;
  ctaCards$: Observable<CtaCard[]>;

  // Current user snapshot for debug context
  private currentUserSnapshot: IUsers | null = null;

  constructor(
    private store: Store,
    private userService: UserService,
    private debugLogService: DebugLogService,
    private ctaService: DashboardCtaService
  ) {
    this.currentUser$ = this.store.select(fromUser.selectCurrentUser);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);
    this.isLoading$ = this.store.select(fromUser.selectIsLoading);
    this.isNotLoading$ = this.isLoading$.pipe(map(loading => !loading));
    this.debugLogs$ = this.debugLogService.logs$;
    
    // Derive CTA cards from current user
    this.ctaCards$ = this.currentUser$.pipe(
      map(user => this.ctaService.getCtaCards(user))
    );

    // Keep a snapshot of current user for debug context
    this.currentUser$.subscribe(user => this.currentUserSnapshot = user);
  }

  /**
   * Debug context getter for shared DebugPanelComponent
   */
  get debugContext(): DebugContext {
    const user = this.currentUserSnapshot;
    const cards = this.ctaService.getCtaCards(user);
    return {
      page: 'Dashboard',
      email: user?.email,
      userExists: !!user,
      emailVerified: user?.emailVerified,
      phoneVerified: user?.phoneVerified,
      mfaEnabled: user?.mfaEnabled,
      status: user?.status,
      storeState: {
        hasValidName: user ? this.hasValidName(user) : false,
        isCustomerUser: user ? this.isCustomerUser(user) : false,
        ctaCardCount: cards.length,
        healthCardCount: cards.filter(c => c.category === 'health').length,
        benefitCardCount: cards.filter(c => c.category === 'benefit').length,
        actionCardCount: cards.filter(c => c.category === 'action').length
      }
    };
  }

  /**
   * Public method to check if a user is valid
   * @param user The user to check
   * @returns True if the user has all required attributes, false otherwise
   */
  public isUserValid(user: IUsers | null): boolean {
    return this.userService.isUserValid(user);
  }

  ngOnInit(): void {
    // Lifecycle hook - initialization handled by store selectors in constructor
    void 0; // Intentionally empty - initialization handled in constructor
  }

  /**
   * Format date string for display
   * @param dateValue The date value (string or Date)
   * @returns Formatted date
   */
  formatDate(dateValue: string | Date): string {
    if (!dateValue) return 'Not available';
    
    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }

  /**
   * Check if user has valid first and last name
   * @param user The user object
   * @returns true if both first and last name are present
   */
  hasValidName(user: IUsers | null): boolean {
    return !!(user?.firstName?.trim() && user?.lastName?.trim());
  }

  /**
   * Check if user is a CUSTOMER user (should see organizations features)
   * @param user The user object
   * @returns true if user has CUSTOMER group membership
   */
  isCustomerUser(user: IUsers | null): boolean {
    return user?.groups?.includes('CUSTOMER') || false;
  }

  /**
   * Get status class for header badge styling
   * @param status The user status (UserStatus enum value)
   * @returns CSS class name for status
   */
  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'active';
      case 'PENDING':
        return 'pending';
      case 'INACTIVE':
      case 'REJECTED':
      case 'DELETED':
        return 'suspended';
      case 'UNKNOWN':
      default:
        return 'unknown';
    }
  }

  /**
   * Get status icon for header badge
   * @param status The user status (UserStatus enum value)
   * @returns Font Awesome icon name
   */
  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'check-circle';
      case 'PENDING':
        return 'clock';
      case 'INACTIVE':
      case 'REJECTED':
      case 'DELETED':
        return 'ban';
      case 'UNKNOWN':
      default:
        return 'question-circle';
    }
  }

  /**
   * Get status label for header badge
   * @param status The user status (UserStatus enum value)
   * @returns Human readable status label
   */
  getStatusLabel(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
        return 'Account Active';
      case 'PENDING':
        return 'Account Pending';
      case 'INACTIVE':
        return 'Account Inactive';
      case 'REJECTED':
        return 'Account Rejected';
      case 'DELETED':
        return 'Account Deleted';
      case 'UNKNOWN':
      default:
        return 'Account Status Unknown';
    }
  }

  /**
   * Handle CTA card action triggered
   * @param card The CTA card that was clicked
   */
  onCtaCardAction(card: CtaCard): void {
    console.log('[Dashboard] CTA card action:', card.id, card.title);
  }

  /**
   * Handle side navigation item clicked
   * @param item The side nav item that was clicked
   */
  onSideNavItemClicked(item: SideNavItem): void {
    console.log('[Dashboard] Side nav item clicked:', item.id, item.tooltip);
  }

  /**
   * Track CTA cards by ID for ngFor
   */
  trackByCardId(_index: number, card: CtaCard): string {
    return card.id;
  }
}
