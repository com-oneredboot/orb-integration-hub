# DataGridComponent

A reusable, full-featured data grid component for displaying tabular data with server-side pagination, sorting, and filtering.

## Features

- Server-side pagination with configurable page sizes
- Single-column sorting with visual indicators
- Text and dropdown filters with debounce
- Row selection support
- Custom cell and header templates
- Responsive design with mobile support
- Full accessibility (ARIA labels, keyboard navigation)
- OnPush change detection for performance

## Usage

```typescript
import { DataGridComponent, ColumnDefinition, PageState } from '@shared/components/data-grid';

@Component({
  imports: [DataGridComponent],
  template: `
    <app-data-grid
      [columns]="columns"
      [data]="data"
      [pageState]="pageState"
      [sortState]="sortState"
      [filterState]="filterState"
      [loading]="loading"
      (pageChange)="onPageChange($event)"
      (sortChange)="onSortChange($event)"
      (filterChange)="onFilterChange($event)"
      (resetGrid)="onReset($event)"
      (rowClick)="onRowClick($event)">
    </app-data-grid>
  `
})
export class MyListComponent {
  columns: ColumnDefinition<MyData>[] = [
    { field: 'id', header: 'ID', sortable: true },
    { field: 'name', header: 'Name', sortable: true, filterable: true },
    { field: 'status', header: 'Status', filterable: true, filterType: 'select', filterOptions: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ]},
    { field: 'email', header: 'Email', hideOnMobile: true }
  ];

  data: MyData[] = [];
  pageState: PageState = { currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
  sortState: SortState | null = null;
  filterState: FilterState = {};
  loading = false;

  onPageChange(event: PageChangeEvent) {
    // Fetch data with new page/pageSize
  }

  onSortChange(event: SortChangeEvent) {
    // Fetch data with new sort
  }

  onFilterChange(event: FilterChangeEvent) {
    // Fetch data with new filters
  }
}
```

## API

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `columns` | `ColumnDefinition<T>[]` | `[]` | Column configuration array |
| `data` | `T[]` | `[]` | Data rows to display |
| `pageState` | `PageState` | Default state | Pagination state |
| `sortState` | `SortState \| null` | `null` | Current sort configuration |
| `filterState` | `FilterState` | `{}` | Current filter values |
| `loading` | `boolean` | `false` | Show loading indicator |
| `emptyMessage` | `string` | `'No data available'` | Message when no data |
| `trackByField` | `keyof T \| null` | `null` | Field for trackBy optimization |
| `showFilters` | `boolean` | `true` | Show filter section |
| `showPagination` | `boolean` | `true` | Show pagination controls |
| `showReset` | `boolean` | `true` | Show reset button |
| `selectable` | `boolean` | `false` | Enable row selection |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `pageChange` | `PageChangeEvent` | Emitted when page or page size changes |
| `sortChange` | `SortChangeEvent` | Emitted when sort changes |
| `filterChange` | `FilterChangeEvent` | Emitted when filters change (debounced) |
| `resetGrid` | `GridResetEvent` | Emitted when reset button clicked |
| `rowClick` | `T` | Emitted when row is clicked |
| `rowSelect` | `T[]` | Emitted when row selection changes |

### Column Definition

```typescript
interface ColumnDefinition<T> {
  field: keyof T | string;        // Property name in data object
  header: string;                  // Display header text
  sortable?: boolean;              // Enable sorting (default: false)
  filterable?: boolean;            // Include in filters (default: false)
  filterType?: 'text' | 'select';  // Filter input type
  filterOptions?: SelectOption[];  // Options for select filter
  width?: string;                  // CSS width (e.g., '150px', '20%')
  minWidth?: string;               // CSS min-width
  align?: 'left' | 'center' | 'right';
  cellTemplate?: TemplateRef;      // Custom cell template
  headerTemplate?: TemplateRef;    // Custom header template
  hideOnMobile?: boolean;          // Hide column below 768px
}
```

## Custom Templates

### Cell Template

```html
<app-data-grid [columns]="columns" [data]="data">
  <ng-template #statusCell let-row let-value="value">
    <span [class]="'status-badge status-badge--' + value">
      {{ value }}
    </span>
  </ng-template>
</app-data-grid>
```

```typescript
@ViewChild('statusCell') statusCell!: TemplateRef<any>;

ngAfterViewInit() {
  this.columns = [
    // ...
    { field: 'status', header: 'Status', cellTemplate: this.statusCell }
  ];
}
```

### Template Context

Cell templates receive:
- `$implicit` / `row`: The row data object
- `column`: The column definition
- `value`: The cell value
- `rowIndex`: Row index

## Integration with NgRx

```typescript
// In your component
data$ = this.store.select(selectData);
pageState$ = this.store.select(selectPageState);
sortState$ = this.store.select(selectSortState);
filterState$ = this.store.select(selectFilterState);
loading$ = this.store.select(selectLoading);

onPageChange(event: PageChangeEvent) {
  this.store.dispatch(loadData({ page: event.page, pageSize: event.pageSize }));
}

onSortChange(event: SortChangeEvent) {
  this.store.dispatch(setSort({ sort: event }));
}

onFilterChange(event: FilterChangeEvent) {
  this.store.dispatch(setFilters({ filters: event.filters }));
}

onReset() {
  this.store.dispatch(resetGrid());
}
```

## Accessibility

- Uses semantic table HTML (`<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`)
- `role="grid"` on table element
- `aria-sort` on sortable column headers
- `aria-busy` during loading
- `aria-live` region for announcements
- Keyboard navigation (Tab, Enter, Space, Arrow keys)
- Focus management on data updates
