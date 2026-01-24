// file: apps/web/src/app/features/user/components/dashboard/dashboard-side-nav/dashboard-side-nav.component.ts
// author: Kiro
// date: 2026-01-23
// description: Icon-only side navigation component for dashboard quick actions

import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SideNavItem } from '../dashboard.types';

/**
 * Dashboard side navigation component displays a vertical bar of icon buttons
 * for quick access to common actions. Only visible on the dashboard page.
 */
@Component({
  selector: 'app-dashboard-side-nav',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './dashboard-side-nav.component.html',
  styleUrls: ['./dashboard-side-nav.component.scss']
})
export class DashboardSideNavComponent {
  /** Emitted when a navigation item is clicked */
  @Output() itemClicked = new EventEmitter<SideNavItem>();

  /** Navigation items to display */
  navItems: SideNavItem[] = [
    {
      id: 'profile',
      icon: 'user',
      tooltip: 'Edit Profile',
      route: '/profile'
    },
    {
      id: 'security',
      icon: 'shield-alt',
      tooltip: 'Security Settings',
      route: '/authenticate'
    },
    {
      id: 'payment',
      icon: 'credit-card',
      tooltip: 'Payment Methods',
      route: '/payment', // Placeholder
      disabled: true
    },
    {
      id: 'integrations',
      icon: 'plug',
      tooltip: 'Integrations',
      route: '/integrations', // Placeholder
      disabled: true
    }
  ];

  /** Currently hovered item for tooltip display */
  hoveredItemId: string | null = null;

  constructor(private router: Router) {}

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
