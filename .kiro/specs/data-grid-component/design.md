# Design Document: Data Grid Component

## Overview

A reusable, full-featured data grid component for displaying tabular data across the application. The grid supports server-side pagination, sorting, and filtering with a consistent, responsive user experience. It will be used by Organizations, Applications, Users, Groups, and any other list views.

## Architecture

### Component Structure

```
DataGridComponent (shared)
├── DataGridHeaderComponent
│   ├── Column headers with sort indicators
│   └── Filter row (optional)
├── DataGridBodyComponent
│   ├── Data rows with alternating colors
│   └── Loading/Empty states
├── DataGridPaginationComponent
│   ├── Page size selector
│   ├── Page navigation (first, prev, numbers, next, last)
│   └── Item count display
└── DataGridToolbarComponent
    ├── Filter section (collapsible)
    └── Reset button
```

### Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Parent Component│────▶│   DataGridComponent│────▶│  Server/Store   │
│  (Organizations) │     │   (emits events)  │     │  (fetches data) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                        │
        │   [columns]            │   (pageChange)         │
        │   [data]               │   (sortChange)         │
        │   [pageState]          │   (filterChange)       │
        │   [sortState]          │   (resetGrid)          │
        │   [filterState]        │                        │
        │   [loading]            │                        │
        └────────────────────────┴────────────────────────┘
```

## Components and Interfaces

### Column Definition Interface

```typescript
interface ColumnDefinition<T = unknown> {
  field: keyof T | string;        // Property name in data object
  header: string;                  // Display header text
  sortable?: boolean;              // Enable sorting (default: false)
  filterable?: boolean;            // Include in filters (default: false)
  filterType?: 'text' | 'select';  // Filter input type
  filterOptions?: SelectOption[];  // Options for select filter
  width?: string;                  // CSS width (e.g., '150px', '20%')
  minWidth?: string;               // CSS min-width
  align?: 'left' | 'center' | 'right';
  cellTemplate?: TemplateRef<unknown>; // Custom cell template
  headerTemplate?: TemplateRef<unknown>; // Custom header template
  hideOnMobile?: boolean;          // Hide column on mobile
}

interface SelectOption {
  value: string;
  label: string;
}
```

### Page State Interface

```typescript
interface PageState {
  currentPage: number;    // 1-based page number
  pageSize: number;       // Items per page
  totalItems: number;     // Total items in dataset
  totalPages: number;     // Calculated total pages
}

const DEFAULT_PAGE_STATE: PageState = {
  currentPage: 1,
  pageSize: 10,
  totalItems: 0,
  totalPages: 0
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
```

### Sort State Interface

```typescript
interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

type SortDirection = 'asc' | 'desc' | null;
```

### Filter State Interface

```typescript
interface FilterState {
  [field: string]: string | string[] | null;
}
```

### Grid Events Interface

```typescript
interface PageChangeEvent {
  page: number;
  pageSize: number;
}

interface SortChangeEvent {
  field: string;
  direction: SortDirection;
}

interface FilterChangeEvent {
  filters: FilterState;
}

interface GridResetEvent {
  timestamp: number;
}
```

### DataGridComponent

```typescript
@Component({
  selector: 'app-data-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class DataGridComponent<T> {
  // Inputs
  @Input() columns: ColumnDefinition<T>[] = [];
  @Input() data: T[] = [];
  @Input() pageState: PageState = DEFAULT_PAGE_STATE;
  @Input() sortState: SortState | null = null;
  @Input() filterState: FilterState = {};
  @Input() loading = false;
  @Input() emptyMessage = 'No data available';
  @Input() trackByField: keyof T | null = null;

  // Outputs
  @Output() pageChange = new EventEmitter<PageChangeEvent>();
  @Output() sortChange = new EventEmitter<SortChangeEvent>();
  @Output() filterChange = new EventEmitter<FilterChangeEvent>();
  @Output() resetGrid = new EventEmitter<GridResetEvent>();
  @Output() rowClick = new EventEmitter<T>();
  @Output() rowSelect = new EventEmitter<T[]>();
}
```

## Data Models

### Grid State Management

The grid is a "dumb" component - it displays data and emits events but does not manage state internally. The parent component is responsible for:

1. Fetching data from the server based on page/sort/filter state
2. Passing data and state to the grid
3. Handling grid events and updating state accordingly

### Event Flow Example

```
User clicks page 2
    ↓
Grid emits pageChange({ page: 2, pageSize: 10 })
    ↓
Parent handles event, dispatches action to store
    ↓
Store effect calls API with page=2
    ↓
API returns data, store updates state
    ↓
Parent passes new data and pageState to grid
    ↓
Grid re-renders with new data
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Column Rendering Consistency

*For any* array of Column_Definition objects passed to the grid, the grid SHALL render exactly that number of columns with headers matching the `header` property of each definition.

**Validates: Requirements 1.1**

### Property 2: Sortable Column Indicators

*For any* Column_Definition with `sortable: true`, the grid SHALL display a sort indicator in that column's header, and *for any* Column_Definition with `sortable: false` or undefined, no sort indicator SHALL be displayed.

**Validates: Requirements 1.2**

### Property 3: Page Change Event Correctness

*For any* page number click within valid range (1 to totalPages), the grid SHALL emit a pageChange event containing exactly that page number and the current pageSize.

**Validates: Requirements 3.2**

### Property 4: Page Size Change Resets to Page 1

*For any* page size change, the grid SHALL emit a pageChange event with page=1 and the new pageSize value.

**Validates: Requirements 3.5**

### Property 5: Pagination Button Disabled States

*For any* PageState where currentPage equals 1, the previous and first buttons SHALL be disabled. *For any* PageState where currentPage equals totalPages, the next and last buttons SHALL be disabled.

**Validates: Requirements 3.7, 3.8**

### Property 6: Sort State Cycling

*For any* sortable column, clicking it SHALL cycle through states: unsorted → ascending → descending → unsorted. The emitted sortChange event SHALL reflect the new state.

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 7: Single Column Sort Constraint

*For any* sort operation, only one column SHALL have an active sort state at a time. Sorting a new column SHALL clear the previous column's sort.

**Validates: Requirements 4.6**

### Property 8: Filter Change Debounce

*For any* sequence of rapid filter input changes within the debounce period (300ms), the grid SHALL emit only one filterChange event after the debounce period completes.

**Validates: Requirements 5.2, 9.3**

### Property 9: Active Filter Indicators

*For any* FilterState with at least one non-empty filter value, the grid SHALL display active filter indicators. *For any* empty FilterState, no indicators SHALL be displayed.

**Validates: Requirements 5.5**

### Property 10: Reset Clears All State

*For any* grid state (filters, sort, page), clicking Reset SHALL emit a resetGrid event and the parent should clear all filters, clear sorting, and return to page 1.

**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

### Property 11: Page Info Display Accuracy

*For any* PageState, the displayed page information SHALL accurately show: current page number, total pages, and total items count.

**Validates: Requirements 3.3**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid page number | Clamp to valid range (1 to totalPages) |
| Empty data array | Display empty state message |
| Loading state | Display loading indicator, disable interactions |
| Invalid column field | Skip column, log warning in dev mode |
| Filter error | Clear problematic filter, emit error event |

## Testing Strategy

### Unit Tests

- DataGridComponent: Test input/output bindings, event emissions
- DataGridPaginationComponent: Test page calculations, button states
- DataGridHeaderComponent: Test sort indicator display, click handling
- Column rendering with various configurations
- Empty and loading states

### Property-Based Tests

- Property 1: Generate random column arrays, verify column count matches
- Property 3: Generate random valid page numbers, verify event payload
- Property 5: Generate random page states, verify button disabled states
- Property 6: Generate sort click sequences, verify state cycling
- Property 8: Generate rapid filter inputs, verify single debounced emission
- Property 10: Generate random grid states, verify reset clears all

### Integration Tests

- Full grid render with mock data
- Pagination flow with parent component
- Sort and filter interactions
- Responsive behavior at different breakpoints
