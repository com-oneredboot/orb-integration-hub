// file: apps/web/src/app/shared/components/data-grid/data-grid.types.ts
// description: Type definitions for the reusable data grid component

import { TemplateRef } from '@angular/core';

/**
 * Option for dropdown/select filters
 */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Column definition for configuring grid columns
 * @template T - The type of data row object
 */
export interface ColumnDefinition<T = unknown> {
  /** Property name in data object */
  field: keyof T | string;
  /** Display header text */
  header: string;
  /** Enable sorting (default: false) */
  sortable?: boolean;
  /** Include in filters (default: false) */
  filterable?: boolean;
  /** Filter input type */
  filterType?: 'text' | 'select';
  /** Options for select filter */
  filterOptions?: SelectOption[];
  /** CSS width (e.g., '150px', '20%') */
  width?: string;
  /** CSS min-width */
  minWidth?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom cell template */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cellTemplate?: TemplateRef<any>;
  /** Custom header template */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  headerTemplate?: TemplateRef<any>;
  /** Hide column on mobile (below 768px) */
  hideOnMobile?: boolean;
}

/**
 * Context provided to custom cell templates
 */
export interface CellTemplateContext<T = unknown> {
  /** The row data object */
  $implicit: T;
  /** The row data object (alias) */
  row: T;
  /** The column definition */
  column: ColumnDefinition<T>;
  /** The cell value */
  value: unknown;
  /** Row index */
  rowIndex: number;
}

/**
 * Context provided to custom header templates
 */
export interface HeaderTemplateContext<T = unknown> {
  /** The column definition */
  $implicit: ColumnDefinition<T>;
  /** The column definition (alias) */
  column: ColumnDefinition<T>;
  /** Current sort state for this column */
  sortDirection: SortDirection;
}

/**
 * Pagination state
 */
export interface PageState {
  /** 1-based page number */
  currentPage: number;
  /** Items per page */
  pageSize: number;
  /** Total items in dataset */
  totalItems: number;
  /** Calculated total pages */
  totalPages: number;
}

/**
 * Default pagination state
 */
export const DEFAULT_PAGE_STATE: PageState = {
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0
};

/**
 * Available page size options
 */
export const PAGE_SIZE_OPTIONS: number[] = [10, 25, 50, 100];

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * Sort state for a column
 */
export interface SortState {
  /** Field being sorted */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Filter state - map of field names to filter values
 */
export type FilterState = Record<string, string | string[] | null>;

/**
 * Event emitted when page changes
 */
export interface PageChangeEvent {
  /** New page number (1-based) */
  page: number;
  /** Current page size */
  pageSize: number;
}

/**
 * Event emitted when sort changes
 */
export interface SortChangeEvent {
  /** Field being sorted */
  field: string;
  /** New sort direction (null = unsorted) */
  direction: SortDirection;
}

/**
 * Event emitted when filters change
 */
export interface FilterChangeEvent {
  /** Current filter state */
  filters: FilterState;
}

/**
 * Event emitted when grid is reset
 */
export interface GridResetEvent {
  /** Timestamp of reset */
  timestamp: number;
}

/**
 * Event emitted when row is selected
 */
export interface RowSelectEvent<T = unknown> {
  /** Selected rows */
  selectedRows: T[];
  /** Whether selection was added or removed */
  action: 'select' | 'deselect';
}
