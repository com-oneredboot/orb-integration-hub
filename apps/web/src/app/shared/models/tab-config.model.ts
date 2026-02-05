// file: apps/web/src/app/shared/models/tab-config.model.ts
// author: Kiro AI Assistant
// date: 2025-01-27
// description: Configuration interface for tab navigation component

/**
 * Configuration for a single tab in the tab navigation component.
 */
export interface TabConfig {
  /**
   * Unique identifier for the tab.
   * Used to track active state and emit selection events.
   */
  id: string;

  /**
   * Display label for the tab.
   */
  label: string;

  /**
   * Optional icon class to display before the label.
   * Example: 'fas fa-home', 'fas fa-shield-alt'
   */
  icon?: string;

  /**
   * Optional badge value to display after the label.
   * Can be a number (e.g., count) or string (e.g., 'NEW').
   */
  badge?: number | string;
}
