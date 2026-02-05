/**
 * Hero Split Component
 *
 * Reusable component for displaying a split hero section with logo on left and content on right.
 * Uses the exact dimensions from the platform page as the gold standard for all pages.
 *
 * Dimensions (Platform Gold Standard):
 * - Container: max-width 1400px
 * - Padding: 48px top/bottom (var(--spacing-2xl))
 * - Title: 30px (var(--font-size-3xl)) - reduced for better single-line fit
 * - Gap: 50px between logo and content
 *
 * Content Structure:
 * - Title (required via @Input)
 * - Subtitle (optional via @Input)
 * - Custom content slot (optional, unnamed ng-content)
 * - Buttons slot (optional, select="[buttons]")
 *
 * Usage:
 * <app-hero-split
 *   [logoSrc]="'assets/orb-logo.jpg'"
 *   [logoAlt]="'Orb Integration Hub Logo'"
 *   [title]="'Orb Integration Hub'"
 *   [subtitle]="'A comprehensive solution for payment processing...'">
 *   
 *   <!-- Optional: Custom content (badges, status, etc.) -->
 *   <div class="custom-content">
 *     <app-status-badge [status]="status"></app-status-badge>
 *   </div>
 *   
 *   <!-- Optional: Call-to-action buttons -->
 *   <div buttons class="hero-buttons">
 *     <button class="orb-btn orb-btn--primary">Get Started</button>
 *     <button class="orb-btn orb-btn--secondary">Learn More</button>
 *   </div>
 * </app-hero-split>
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-hero-split',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero-split.component.html',
  styleUrls: ['./hero-split.component.scss']
})
export class HeroSplitComponent {
  /**
   * Path to the logo image
   */
  @Input() logoSrc = 'assets/orb-logo.jpg';

  /**
   * Alt text for the logo image
   */
  @Input() logoAlt = 'Orb Integration Hub Logo';

  /**
   * Main title text
   */
  @Input() title = 'Orb Integration Hub';

  /**
   * Subtitle/description text
   */
  @Input() subtitle = '';
}
