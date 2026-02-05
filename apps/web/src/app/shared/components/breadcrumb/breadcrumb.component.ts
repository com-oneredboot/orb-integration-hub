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

  /** FontAwesome icon for separator */
  protected readonly faChevronRight = faChevronRight;
}
