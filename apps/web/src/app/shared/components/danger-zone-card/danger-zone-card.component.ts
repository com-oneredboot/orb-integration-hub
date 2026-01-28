/**
 * Danger Zone Card Component
 *
 * Reusable component for displaying dangerous/destructive actions
 * in a consistent, visually distinct card format.
 *
 * @example
 * <app-danger-zone-card
 *   title="Delete Application"
 *   description="Permanently delete this application and all associated data."
 *   buttonText="Delete Application"
 *   [isLoading]="isDeleting$ | async"
 *   (action)="onDelete()">
 * </app-danger-zone-card>
 */

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
  selector: 'app-danger-zone-card',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  template: `
    <div class="orb-card orb-card--danger">
      <div class="orb-card__header">
        <h2 class="orb-card__title orb-card__title--danger">
          <fa-icon icon="exclamation-triangle" class="orb-card__icon"></fa-icon>
          Danger Zone
        </h2>
      </div>
      <div class="orb-card__content orb-card__content--padded">
        <p class="danger-zone__warning">
          These actions are permanent and cannot be undone. Please proceed with caution.
        </p>
        
        <div class="danger-zone__actions">
          <div class="danger-zone__action">
            <div class="danger-zone__action-info">
              <h4 class="danger-zone__action-title">{{ title }}</h4>
              <p class="danger-zone__action-desc">{{ description }}</p>
            </div>
            <button
              class="orb-btn orb-btn--danger"
              (click)="onActionClick()"
              [disabled]="!!isLoading || !!disabled">
              <fa-icon icon="spinner" animation="spin" *ngIf="isLoading"></fa-icon>
              <fa-icon [icon]="buttonIcon" *ngIf="!isLoading"></fa-icon>
              {{ buttonText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use '../../../../styles/variables' as v;

    .danger-zone {
      &__warning {
        color: v.$text-secondary;
        margin: 0 0 v.$spacing-lg;
        font-size: v.$font-size-sm;
      }

      &__actions {
        display: flex;
        flex-direction: column;
        gap: v.$spacing-lg;
      }

      &__action {
        display: flex;
        flex-direction: column;
        gap: v.$spacing-md;
        padding: v.$spacing-lg;
        border: 1px solid v.$border-color;
        border-radius: v.$border-radius;
        background: v.$white;
      }

      &__action-info {
        flex: 1;
      }

      &__action-title {
        font-size: v.$font-size-base;
        font-weight: v.$font-weight-semibold;
        color: v.$text-primary;
        margin: 0 0 v.$spacing-xs;
      }

      &__action-desc {
        font-size: v.$font-size-sm;
        color: v.$text-secondary;
        margin: 0;
        line-height: 1.4;
      }
    }

    // Responsive
    @media (max-width: 768px) {
      .danger-zone__action {
        text-align: center;
      }
    }
  `]
})
export class DangerZoneCardComponent {
  /** Title of the dangerous action */
  @Input() title = 'Delete';

  /** Description explaining the consequences */
  @Input() description = 'This action cannot be undone.';

  /** Text for the action button */
  @Input() buttonText = 'Delete';

  /** Icon for the action button */
  @Input() buttonIcon = 'trash';

  /** Whether the action is currently in progress */
  @Input() isLoading: boolean | null = false;

  /** Whether the button should be disabled */
  @Input() disabled: boolean | null = false;

  /** Emitted when the action button is clicked */
  @Output() action = new EventEmitter<void>();

  onActionClick(): void {
    this.action.emit();
  }
}
