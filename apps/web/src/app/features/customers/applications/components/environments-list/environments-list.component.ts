/**
 * Environments List Component
 *
 * Displays a list of environments for an application using the shared DataGridComponent.
 * Supports filtering, sorting, and navigation to environment detail pages.
 * Uses NgRx store as single source of truth.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 1.1, 2.1, 2.2, 2.3_
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import {
  DataGridComponent,
  ColumnDefinition,
  PageState,
  SortState,
  FilterState,
  PageChangeEvent,
  SortChangeEvent,
  FilterChangeEvent,
  DEFAULT_PAGE_STATE,
} from '../../../../../shared/components/data-grid';

import { EnvironmentsActions } from '../../store/environments/environments.actions';
import * as fromEnvironments from '../../store/environments/environments.selectors';
import { EnvironmentTableRow, EnvironmentStatus } from '../../store/environments/environments.state';

@Component({
  selector: 'app-environments-list',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    DataGridComponent,
  ],
  templateUrl: './environments-list.component.html',
  styleUrls: ['./environments-list.component.scss'],
})
export class EnvironmentsListComponent implements OnInit, OnDestroy {
  @Input() applicationId: string | null = null;
  @Input() organizationId: string | null = null;

  // Template references for custom cells
  @ViewChild('environmentCell', { static: true }) environmentCell!: TemplateRef<unknown>;
  @ViewChild('statusCell', { static: true }) statusCell!: TemplateRef<unknown>;
  @ViewChild('apiKeyCell', { static: true }) apiKeyCell!: TemplateRef<unknown>;
  @ViewChild('originsCell', { static: true }) originsCell!: TemplateRef<unknown>;
  @ViewChild('webhookCell', { static: true }) webhookCell!: TemplateRef<unknown>;
  @ViewChild('lastActivityCell', { static: true }) lastActivityCell!: TemplateRef<unknown>;

  // Store selectors
  environmentRows$: Observable<EnvironmentTableRow[]>;
  filteredEnvironmentRows$: Observable<EnvironmentTableRow[]>;
  isLoading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Grid configuration
  columns: ColumnDefinition<EnvironmentTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  sortState: SortState | null = null;
  filterState: FilterState = {};

  private destroy$ = new Subject<void>();

  // Environment icon mapping
  readonly environmentIcons: Record<string, string> = {
    PRODUCTION: 'server',
    Staging: 'code-branch',
    STAGING: 'code-branch',
    Development: 'laptop-code',
    DEVELOPMENT: 'laptop-code',
    Test: 'flask',
    TEST: 'flask',
    Preview: 'eye',
    PREVIEW: 'eye',
  };

  constructor(
    private router: Router,
    private store: Store
  ) {
    // Initialize store selectors
    this.environmentRows$ = this.store.select(fromEnvironments.selectEnvironmentRows);
    this.filteredEnvironmentRows$ = this.store.select(
      fromEnvironments.selectFilteredEnvironmentRows
    );
    this.isLoading$ = this.store.select(fromEnvironments.selectIsLoading);
    this.error$ = this.store.select(fromEnvironments.selectError);

    // Update page state when data changes
    this.filteredEnvironmentRows$
      .pipe(
        takeUntil(this.destroy$),
        map((rows) => rows.length)
      )
      .subscribe((totalItems) => {
        this.pageState = {
          ...this.pageState,
          totalItems,
          totalPages: Math.ceil(totalItems / this.pageState.pageSize),
        };
      });
  }

  ngOnInit(): void {
    // Initialize columns with templates
    this.initializeColumns();

    // Load environments if applicationId is provided
    if (this.applicationId) {
      this.store.dispatch(
        EnvironmentsActions.setApplicationContext({
          applicationId: this.applicationId,
          organizationId: this.organizationId || '',
        })
      );
      this.store.dispatch(
        EnvironmentsActions.loadEnvironments({ applicationId: this.applicationId })
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeColumns(): void {
    this.columns = [
      {
        field: 'environmentLabel',
        header: 'Environment',
        sortable: true,
        filterable: true,
        cellTemplate: this.environmentCell,
        width: '18%',
      },
      {
        field: 'status',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'Active', label: 'Active' },
          { value: 'Not Configured', label: 'Not Configured' },
          { value: 'Revoked', label: 'Revoked' },
          { value: 'Expired', label: 'Expired' },
        ],
        cellTemplate: this.statusCell,
        width: '14%',
      },
      {
        field: 'keyPrefix',
        header: 'API Key',
        sortable: false,
        cellTemplate: this.apiKeyCell,
        width: '14%',
      },
      {
        field: 'rateLimitDisplay',
        header: 'Rate Limit',
        sortable: true,
        width: '12%',
      },
      {
        field: 'originsCount',
        header: 'Origins',
        sortable: true,
        cellTemplate: this.originsCell,
        width: '10%',
      },
      {
        field: 'webhookStatus',
        header: 'Webhooks',
        sortable: true,
        cellTemplate: this.webhookCell,
        width: '12%',
        hideOnMobile: true,
      },
      {
        field: 'lastActivity',
        header: 'Last Activity',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '15%',
        hideOnMobile: true,
      },
    ];
  }

  // Grid event handlers
  onPageChange(event: PageChangeEvent): void {
    this.pageState = {
      ...this.pageState,
      currentPage: event.page,
      pageSize: event.pageSize,
      totalPages: Math.ceil(this.pageState.totalItems / event.pageSize),
    };
  }

  onSortChange(event: SortChangeEvent): void {
    if (event.direction) {
      this.sortState = { field: event.field, direction: event.direction };
    } else {
      this.sortState = null;
    }
  }

  onFilterChange(event: FilterChangeEvent): void {
    this.filterState = event.filters;

    // Dispatch filter actions to store
    const searchTerm = (event.filters['environmentLabel'] as string) || '';
    const statusFilter = (event.filters['status'] as string) || '';

    this.store.dispatch(EnvironmentsActions.setSearchTerm({ searchTerm }));
    this.store.dispatch(EnvironmentsActions.setStatusFilter({ statusFilter }));
  }

  onResetGrid(): void {
    this.pageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.sortState = null;
    this.filterState = {};

    // Clear store filters
    this.store.dispatch(EnvironmentsActions.setSearchTerm({ searchTerm: '' }));
    this.store.dispatch(EnvironmentsActions.setStatusFilter({ statusFilter: '' }));
  }

  onRowClick(row: EnvironmentTableRow): void {
    // Navigate to environment detail page
    if (this.applicationId) {
      this.router.navigate([
        '/customers/applications',
        this.applicationId,
        'environments',
        row.config.environment,
      ]);
    }
  }

  onCreateEnvironment(): void {
    // Navigate to create environment page
    // For environments, we navigate to a selection page or modal
    // since environments are predefined (Production, Staging, Development, Test, Preview)
    if (this.applicationId) {
      this.router.navigate([
        '/customers/applications',
        this.applicationId,
        'environments',
        'new',
      ]);
    }
  }

  // Helper methods
  getEnvironmentIcon(environment: string): string {
    return this.environmentIcons[environment] || this.environmentIcons[environment.toUpperCase()] || 'cog';
  }

  getEnvironmentClass(environment: string): string {
    return environment.toLowerCase().replace('_', '-');
  }

  getStatusBadgeType(status: EnvironmentStatus): string {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Not Configured':
        return 'warning';
      case 'Revoked':
      case 'Expired':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  getWebhookClass(status: 'Enabled' | 'Disabled'): string {
    return status === 'Enabled' ? 'enabled' : 'disabled';
  }
}
