/**
 * User Page Component
 *
 * Standard page wrapper for all pages rendered within user-layout.
 * Provides consistent structure: Hero → Content Section → Breadcrumbs → Tabs → Content.
 * Enforces standard dimensions (max-width: 1400px) and spacing.
 *
 * Usage:
 * ```typescript
 * <app-user-page
 *   [heroTitle]="'Organizations'"
 *   [heroSubtitle]="'Manage your business entities'"
 *   [breadcrumbItems]="breadcrumbItems"
 *   [tabs]="tabs"
 *   [activeTabId]="activeTab"
 *   (tabChange)="onTabChange($event)">
 *   
 *   <!-- Your page content here -->
 *   <div class="orb-card">...</div>
 *   
 * </app-user-page>
 * ```
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroSplitComponent } from '../../../shared/components/hero-split/hero-split.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../shared/components/breadcrumb/breadcrumb.component';
import { TabNavigationComponent } from '../../../shared/components/tab-navigation/tab-navigation.component';
import { TabConfig } from '../../../shared/models/tab-config.model';

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [
    CommonModule,
    HeroSplitComponent,
    BreadcrumbComponent,
    TabNavigationComponent
  ],
  templateUrl: './user-page.component.html',
  styleUrls: ['./user-page.component.scss']
})
export class UserPageComponent {
  /**
   * Whether to show the hero section
   * Default: true
   */
  @Input() showHero = true;

  /**
   * Logo image source for hero section
   * Default: 'assets/orb-logo.jpg'
   */
  @Input() heroLogo = 'assets/orb-logo.jpg';

  /**
   * Logo alt text for hero section
   * Default: 'Orb Integration Hub Logo'
   */
  @Input() heroLogoAlt = 'Orb Integration Hub Logo';

  /**
   * Main title for hero section
   * Required if showHero is true
   */
  @Input() heroTitle = '';

  /**
   * Subtitle/description for hero section
   * Optional
   */
  @Input() heroSubtitle = '';

  /**
   * Breadcrumb items for navigation
   * Required - should always have at least one item
   */
  @Input() breadcrumbItems: BreadcrumbItem[] = [];

  /**
   * Tab configuration for tab navigation
   * Optional - only shown if tabs are provided
   */
  @Input() tabs: TabConfig[] = [];

  /**
   * Currently active tab ID
   * Required if tabs are provided
   */
  @Input() activeTabId = '';

  /**
   * Event emitted when tab is changed
   * Emits the new tab ID
   */
  @Output() tabChange = new EventEmitter<string>();

  /**
   * Handle tab change event
   */
  onTabChange(tabId: string): void {
    this.tabChange.emit(tabId);
  }
}
