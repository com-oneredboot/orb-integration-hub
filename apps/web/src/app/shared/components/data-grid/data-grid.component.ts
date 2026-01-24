// file: apps/web/src/app/shared/components/data-grid/data-grid.component.ts
// description: Reusable data grid component for displaying tabular data with pagination, sorting, and filtering

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  TrackByFunction,
  TemplateRef,
  ContentChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faSort,
  faSortUp,
  faSortDown,
  faSpinner,
  faInbox,
  faRotateLeft,
  faFilter,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

import {
  ColumnDefinition,
  PageState,
  SortState,
  FilterState,
  PageChangeEvent,
  SortChangeEvent,
  FilterChangeEvent,
  GridResetEvent,
  SortDirection,
  DEFAULT_PAGE_STATE,
  PAGE_SIZE_OPTIONS,
  CellTemplateContext
} from './data-grid.types';

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './data-grid.component.html',
  styleUrls: ['./data-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataGridComponent<T extends object> {
  // Icons
  protected readonly faSort = faSort;
  protected readonly faSortUp = faSortUp;
  protected readonly faSortDown = faSortDown;
  protected readonly faSpinner = faSpinner;
  protected readonly faInbox = faInbox;
  protected readonly faRotateLeft = faRotateLeft;
  protected readonly faFilter = faFilter;
  protected readonly faChevronLeft = faChevronLeft;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faAnglesLeft = faAnglesLeft;
  protected readonly faAnglesRight = faAnglesRight;
  protected readonly faTimes = faTimes;

  // Constants
  protected readonly PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;

  // Inputs
  @Input() columns: ColumnDefinition<T>[] = [];
  @Input() data: T[] = [];
  @Input() pageState: PageState = DEFAULT_PAGE_STATE;
  @Input() sortState: SortState | null = null;
  @Input() filterState: FilterState = {};
  @Input() loading = false;
  @Input() emptyMessage = 'No data available';
  @Input() trackByField: keyof T | null = null;
  @Input() showFilters = true;
  @Input() showPagination = true;
  @Input() showReset = true;
  @Input() selectable = false;

  // Outputs
  @Output() pageChange = new EventEmitter<PageChangeEvent>();
  @Output() sortChange = new EventEmitter<SortChangeEvent>();
  @Output() filterChange = new EventEmitter<FilterChangeEvent>();
  @Output() resetGrid = new EventEmitter<GridResetEvent>();
  @Output() rowClick = new EventEmitter<T>();
  @Output() rowSelect = new EventEmitter<T[]>();

  // Content projection for custom templates
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<unknown>;
  @ContentChild('loadingTemplate') loadingTemplate?: TemplateRef<unknown>;

  // Internal state
  protected selectedRows = new Set<T>();
  protected filtersExpanded = false;
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  protected localFilterState: FilterState = {};

  /**
   * TrackBy function for ngFor optimization
   */
  trackByRow: TrackByFunction<T> = (index: number, item: T): unknown => {
    if (this.trackByField) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (item as any)[this.trackByField];
      if (value !== undefined) {
        return value;
      }
    }
    return index;
  };

  /**
   * TrackBy function for columns
   */
  trackByColumn: TrackByFunction<ColumnDefinition<T>> = (
    index: number,
    column: ColumnDefinition<T>
  ): string => {
    return String(column.field);
  };

  /**
   * Get filter value for a field
   */
  getFilterValue(field: keyof T | string): string {
    const value = this.localFilterState[field as string];
    return value ? String(value) : '';
  }

  /**
   * Get cell value from row data
   */
  getCellValue(row: T, column: ColumnDefinition<T>): unknown {
    const field = column.field as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (row as any)[field];
  }

  /**
   * Get cell template context
   */
  getCellContext(row: T, column: ColumnDefinition<T>, rowIndex: number): CellTemplateContext<T> {
    return {
      $implicit: row,
      row,
      column,
      value: this.getCellValue(row, column),
      rowIndex
    };
  }

  /**
   * Get sort direction for a column
   */
  getSortDirection(column: ColumnDefinition<T>): SortDirection {
    if (!this.sortState || this.sortState.field !== column.field) {
      return null;
    }
    return this.sortState.direction;
  }

  /**
   * Handle column header click for sorting
   */
  onHeaderClick(column: ColumnDefinition<T>): void {
    if (!column.sortable) return;

    const currentDirection = this.getSortDirection(column);
    let newDirection: SortDirection;

    // Cycle: null -> asc -> desc -> null
    switch (currentDirection) {
      case null:
        newDirection = 'asc';
        break;
      case 'asc':
        newDirection = 'desc';
        break;
      case 'desc':
        newDirection = null;
        break;
    }

    this.sortChange.emit({
      field: String(column.field),
      direction: newDirection
    });
  }

  /**
   * Handle page navigation
   */
  onPageChange(page: number): void {
    if (page < 1 || page > this.pageState.totalPages) return;
    if (page === this.pageState.currentPage) return;

    this.pageChange.emit({
      page,
      pageSize: this.pageState.pageSize
    });
  }

  /**
   * Handle page size change
   */
  onPageSizeChange(pageSize: number): void {
    if (pageSize === this.pageState.pageSize) return;

    // Reset to page 1 when page size changes
    this.pageChange.emit({
      page: 1,
      pageSize
    });
  }

  /**
   * Handle filter input from event (template helper)
   */
  onFilterInputFromEvent(column: ColumnDefinition<T>, event: Event): void {
    const target = event.target as HTMLInputElement;
    this.onFilterInput(String(column.field), target.value);
  }

  /**
   * Handle select filter from event (template helper)
   */
  onSelectFilterFromEvent(column: ColumnDefinition<T>, event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.onSelectFilterChange(String(column.field), target.value);
  }

  /**
   * Handle filter input change with debounce
   */
  onFilterInput(field: string, value: string): void {
    this.localFilterState = {
      ...this.localFilterState,
      [field]: value || null
    };

    // Clear existing timer
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
    }

    // Debounce filter changes (300ms)
    this.filterDebounceTimer = setTimeout(() => {
      this.filterChange.emit({
        filters: { ...this.localFilterState }
      });
    }, 300);
  }

  /**
   * Handle select filter change (no debounce needed)
   */
  onSelectFilterChange(field: string, value: string): void {
    this.localFilterState = {
      ...this.localFilterState,
      [field]: value || null
    };

    this.filterChange.emit({
      filters: { ...this.localFilterState }
    });
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.localFilterState = {};
    this.filterChange.emit({ filters: {} });
  }

  /**
   * Reset grid to initial state
   */
  onReset(): void {
    this.localFilterState = {};
    this.selectedRows.clear();
    this.resetGrid.emit({ timestamp: Date.now() });
  }

  /**
   * Handle row click
   */
  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  /**
   * Toggle row selection
   */
  toggleRowSelection(row: T, event: Event): void {
    event.stopPropagation();
    
    if (this.selectedRows.has(row)) {
      this.selectedRows.delete(row);
    } else {
      this.selectedRows.add(row);
    }

    this.rowSelect.emit(Array.from(this.selectedRows));
  }

  /**
   * Check if row is selected
   */
  isRowSelected(row: T): boolean {
    return this.selectedRows.has(row);
  }

  /**
   * Toggle filter section visibility (mobile)
   */
  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
  }

  /**
   * Get filterable columns
   */
  get filterableColumns(): ColumnDefinition<T>[] {
    return this.columns.filter(col => col.filterable);
  }

  /**
   * Check if any filters are active
   */
  get hasActiveFilters(): boolean {
    return Object.values(this.filterState).some(v => v !== null && v !== '');
  }

  /**
   * Get active filter count
   */
  get activeFilterCount(): number {
    return Object.values(this.filterState).filter(v => v !== null && v !== '').length;
  }

  /**
   * Get visible columns (respecting hideOnMobile)
   */
  get visibleColumns(): ColumnDefinition<T>[] {
    // Note: Mobile detection should be done via CSS media queries
    // This returns all columns; hideOnMobile is handled in template/CSS
    return this.columns;
  }

  /**
   * Calculate page numbers to display
   */
  get pageNumbers(): number[] {
    const { currentPage, totalPages } = this.pageState;
    const maxVisible = 5;
    const pages: number[] = [];

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Adjust if at edges
      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      // Add ellipsis indicator (-1) if needed
      if (start > 2) {
        pages.push(-1); // Ellipsis
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }

  /**
   * Get display range text (e.g., "Showing 1-10 of 100")
   */
  get displayRange(): string {
    const { currentPage, pageSize, totalItems } = this.pageState;
    if (totalItems === 0) return 'No items';

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, totalItems);

    return `Showing ${start}-${end} of ${totalItems}`;
  }

  /**
   * Check if previous navigation is disabled
   */
  get isPrevDisabled(): boolean {
    return this.pageState.currentPage <= 1 || this.loading;
  }

  /**
   * Check if next navigation is disabled
   */
  get isNextDisabled(): boolean {
    return this.pageState.currentPage >= this.pageState.totalPages || this.loading;
  }
}
