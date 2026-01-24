// file: apps/web/src/app/features/user/components/dashboard/cta-card/cta-card.component.ts
// author: Kiro
// date: 2026-01-23
// description: CTA Card component for dashboard call-to-action items

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CtaCard } from '../dashboard.types';

/**
 * CTA Card component displays a call-to-action card with icon, title,
 * description, and action button. Used on the dashboard to guide users
 * through their journey.
 */
@Component({
  selector: 'app-cta-card',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './cta-card.component.html',
  styleUrls: ['./cta-card.component.scss']
})
export class CtaCardComponent {
  /** The CTA card data to display */
  @Input() card!: CtaCard;

  /** Emitted when the card action is triggered */
  @Output() actionTriggered = new EventEmitter<CtaCard>();

  constructor(private router: Router) {}

  /**
   * Handle the action button click.
   * Navigates to the route or executes the custom handler.
   */
  onActionClick(): void {
    this.actionTriggered.emit(this.card);

    if (this.card.actionHandler) {
      this.card.actionHandler();
    } else if (this.card.actionRoute) {
      if (this.card.actionQueryParams) {
        this.router.navigate([this.card.actionRoute], { 
          queryParams: this.card.actionQueryParams 
        });
      } else {
        this.router.navigate([this.card.actionRoute]);
      }
    }
  }

  /**
   * Handle keyboard activation (Enter/Space)
   */
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onActionClick();
    }
  }

  /**
   * Get the CSS class for the card based on category
   */
  getCategoryClass(): string {
    return `orb-cta-card--${this.card.category}`;
  }
}
