// file: apps/web/src/app/shared/components/breadcrumb/breadcrumb.component.ts
// author: Kiro AI Assistant
// date: 2025-01-27
// description: Shared breadcrumb navigation component for hierarchical navigation

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

/**
 * Represents a single item in the breadcrumb trail
 */
export interface BreadcrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** Route to navigate to when clicked (null for current page) */
  route: string | null;
  /** Flag indicating this is an ellipsis placeholder (non-interactive) */
  isEllipsis?: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, FontAwesomeModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent {
  /** Array of breadcrumb items to display */
  @Input() items: BreadcrumbItem[] = [];

  /** Threshold for truncation (default: 4) */
  @Input() truncationThreshold = 4;

  /** FontAwesome icon for separator */
  protected readonly faChevronRight = faChevronRight;

  /**
   * Computed property that returns truncated breadcrumb items if needed
   */
  get displayItems(): BreadcrumbItem[] {
    return this.truncateBreadcrumbs(this.items);
  }

  /**
   * Truncates breadcrumb items when count exceeds threshold
   * Pattern: [first, ellipsis, ...lastTwo]
   * 
   * @param items - Original breadcrumb items
   * @returns Truncated or original items based on threshold
   */
  private truncateBreadcrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
    if (!items || items.length < this.truncationThreshold) {
      return items || [];
    }

    const first = items[0];
    const lastTwo = items.slice(-2);
    const ellipsis: BreadcrumbItem = {
      label: '...',
      route: null,
      isEllipsis: true
    };

    return [first, ellipsis, ...lastTwo];
  }
}
