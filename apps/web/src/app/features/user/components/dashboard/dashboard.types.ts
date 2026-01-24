// file: apps/web/src/app/features/user/components/dashboard/dashboard.types.ts
// author: Kiro
// date: 2026-01-23
// description: Types and interfaces for dashboard CTA hub

/**
 * Category of CTA card determining display context
 * - health: Account setup/verification items (shown to all users)
 * - benefit: Upgrade promotion cards (shown to USER role only)
 * - action: Next-step action cards (shown to CUSTOMER role only)
 */
export type CtaCardCategory = 'health' | 'benefit' | 'action';

/**
 * Call-to-action card displayed on the dashboard
 */
export interface CtaCard {
  /** Unique identifier for the card */
  id: string;
  /** FontAwesome icon name */
  icon: string;
  /** Card title */
  title: string;
  /** Brief description of the benefit or next step */
  description: string;
  /** Text for the action button */
  actionLabel: string;
  /** Route to navigate to on action (optional if actionHandler provided) */
  actionRoute?: string;
  /** Query params for the route (optional) */
  actionQueryParams?: Record<string, string>;
  /** Custom action handler (optional if actionRoute provided) */
  actionHandler?: () => void;
  /** Priority for ordering (lower = higher priority, displayed first) */
  priority: number;
  /** Category of the card */
  category: CtaCardCategory;
}

/**
 * Side navigation item for quick actions
 */
export interface SideNavItem {
  /** Unique identifier */
  id: string;
  /** FontAwesome icon name */
  icon: string;
  /** Tooltip text shown on hover */
  tooltip: string;
  /** Route to navigate to (optional if action provided) */
  route?: string;
  /** Custom action handler (optional if route provided) */
  action?: () => void;
  /** Whether the item is disabled */
  disabled?: boolean;
}
