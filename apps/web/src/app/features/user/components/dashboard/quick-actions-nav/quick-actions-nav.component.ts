// file: apps/web/src/app/features/user/components/dashboard/quick-actions-nav/quick-actions-nav.component.ts
// author: Kiro
// date: 2026-01-23
// description: Icon-only side navigation component for quick actions (Organizations, Applications, Groups, Users)

import { Component, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { SideNavItem } from '../dashboard.types';

/**
 * Quick actions navigation component displays a vertical bar of icon buttons
 * for quick access to Organizations, Applications, Groups, and Users.
 * Shows active state when on the corresponding page.
 */
@Component({
  selector: 'app-quick-actions-nav',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './quick-actions-nav.component.html',
  styleUrls: ['./quick-actions-nav.component.scss']
})
export class QuickActionsNavComponent implements OnInit, OnDestroy {
  /** Emitted when a navigation item is clicked */
  @Output() itemClicked = new EventEmitter<SideNavItem>();

  /** Navigation items to display */
  navItems: SideNavItem[] = [
    {
      id: 'organizations',
      icon: 'building',
      tooltip: 'Organizations',
      route: '/customers/organizations'
    },
    {
      id: 'applications',
      icon: 'rocket',
      tooltip: 'Applications',
      route: '/customers/applications'
    },
    {
      id: 'groups',
      icon: 'users',
      tooltip: 'Groups',
      route: '/customers/groups'
    },
    {
      id: 'users',
      icon: 'user',
      tooltip: 'Users',
      route: '/customers/users'
    }
  ];

  /** Currently hovered item for tooltip display */
  hoveredItemId: string | null = null;

  /** Current active route for highlighting */
  currentRoute = '';

  /** Cleanup subject */
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Set initial route
    this.currentRoute = this.router.url;

    // Listen for route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if a nav item is currently active
   */
  isActive(item: SideNavItem): boolean {
    if (!item.route) return false;
    return this.currentRoute.startsWith(item.route);
  }

  /**
   * Handle navigation item click
   */
  onItemClick(item: SideNavItem): void {
    if (item.disabled) {
      return;
    }

    this.itemClicked.emit(item);

    if (item.action) {
      item.action();
    } else if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  /**
   * Handle keyboard activation
   */
  onKeydown(event: KeyboardEvent, item: SideNavItem): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onItemClick(item);
    }
  }

  /**
   * Show tooltip on mouse enter
   */
  onMouseEnter(item: SideNavItem): void {
    this.hoveredItemId = item.id;
  }

  /**
   * Hide tooltip on mouse leave
   */
  onMouseLeave(): void {
    this.hoveredItemId = null;
  }

  /**
   * Check if tooltip should be visible for an item
   */
  isTooltipVisible(item: SideNavItem): boolean {
    return this.hoveredItemId === item.id;
  }

  /**
   * Track items by ID for ngFor
   */
  trackByItemId(_index: number, item: SideNavItem): string {
    return item.id;
  }
}
