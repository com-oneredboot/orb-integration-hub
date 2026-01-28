/**
 * API Keys List Component
 *
 * Displays a list of API keys for an application using the shared DataGridComponent.
 * Supports filtering, sorting, and key management operations (generate, rotate, revoke).
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.1, 9.5_
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
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

import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import {
  selectFilteredApiKeyRows,
  selectIsLoading,
  selectIsGenerating,
  selectIsRotating,
  selectIsRevoking,
  selectError,
  selectGeneratedKey,
} from '../../store/api-keys/api-keys.selectors';
import { ApiKeyTableRow, GeneratedKeyResult } from '../../store/api-keys/api-keys.state';

@Component({
  selector: 'app-api-keys-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DataGridComponent,
  ],
  templateUrl: './api-keys-list.component.html',
  styleUrls: ['./api-keys-list.component.scss'],
})
export class ApiKeysListComponent implements OnInit, OnDestroy {
  @Input() applicationId!: string;
  @Input() organizationId!: string;
  @Output() keySelected = new EventEmitter<IApplicationApiKeys>();
  @Output() generateKey = new EventEmitter<Environment>();
  @Output() rotateKey = new EventEmitter<IApplicationApiKeys>();
  @Output() revokeKey = new EventEmitter<IApplicationApiKeys>();

  // Template references for custom cells
  @ViewChild('keyInfoCell', { static: true }) keyInfoCell!: TemplateRef<unknown>;
  @ViewChild('environmentCell', { static: true }) environmentCell!: TemplateRef<unknown>;
  @ViewChild('statusCell', { static: true }) statusCell!: TemplateRef<unknown>;
  @ViewChild('lastActivityCell', { static: true }) lastActivityCell!: TemplateRef<unknown>;
  @ViewChild('actionsCell', { static: true }) actionsCell!: TemplateRef<unknown>;

  // Store selectors
  filteredApiKeyRows$: Observable<ApiKeyTableRow[]>;
  isLoading$: Observable<boolean>;
  isGenerating$: Observable<boolean>;
  isRotating$: Observable<boolean>;
  isRevoking$: Observable<boolean>;
  error$: Observable<string | null>;
  generatedKey$: Observable<GeneratedKeyResult | null>;

  // Grid configuration
  columns: ColumnDefinition<ApiKeyTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  sortState: SortState | null = null;
  filterState: FilterState = {};

  // Dialog state
  showGenerateDialog = false;
  showGeneratedKeyDialog = false;
  selectedEnvironment: Environment = Environment.Development;
  keyCopied = false;

  // Available environments
  environments: Environment[] = [
    Environment.Production,
    Environment.Staging,
    Environment.Development,
    Environment.Test,
    Environment.Preview,
  ];

  // Environment labels
  environmentLabels: Record<Environment, string> = {
    [Environment.Unknown]: 'Unknown',
    [Environment.Production]: 'Production',
    [Environment.Staging]: 'Staging',
    [Environment.Development]: 'Development',
    [Environment.Test]: 'Test',
    [Environment.Preview]: 'Preview',
  };

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.filteredApiKeyRows$ = this.store.select(selectFilteredApiKeyRows);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isGenerating$ = this.store.select(selectIsGenerating);
    this.isRotating$ = this.store.select(selectIsRotating);
    this.isRevoking$ = this.store.select(selectIsRevoking);
    this.error$ = this.store.select(selectError);
    this.generatedKey$ = this.store.select(selectGeneratedKey);

    // Update page state when data changes
    this.filteredApiKeyRows$
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

    // Show generated key dialog when key is generated
    this.generatedKey$
      .pipe(takeUntil(this.destroy$))
      .subscribe((key) => {
        if (key) {
          this.showGenerateDialog = false;
          this.showGeneratedKeyDialog = true;
        }
      });
  }


  ngOnInit(): void {
    this.initializeColumns();

    if (this.applicationId && this.organizationId) {
      this.store.dispatch(
        ApiKeysActions.setApplicationContext({
          applicationId: this.applicationId,
          organizationId: this.organizationId,
        })
      );
      this.store.dispatch(ApiKeysActions.loadApiKeys({ applicationId: this.applicationId }));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeColumns(): void {
    this.columns = [
      {
        field: 'apiKey',
        header: 'API Key',
        sortable: true,
        filterable: true,
        cellTemplate: this.keyInfoCell,
        width: '30%',
      },
      {
        field: 'apiKey',
        header: 'Environment',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: this.environments.map((env) => ({
          value: env,
          label: this.environmentLabels[env],
        })),
        cellTemplate: this.environmentCell,
        width: '15%',
      },
      {
        field: 'apiKey',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'ROTATING', label: 'Rotating' },
          { value: 'REVOKED', label: 'Revoked' },
          { value: 'EXPIRED', label: 'Expired' },
        ],
        cellTemplate: this.statusCell,
        width: '15%',
      },
      {
        field: 'lastActivity',
        header: 'Last Activity',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '20%',
      },
      {
        field: 'actions',
        header: 'Actions',
        sortable: false,
        filterable: false,
        cellTemplate: this.actionsCell,
        width: '20%',
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

    const searchTerm = (event.filters['apiKey'] as string) || '';
    const statusFilter = (event.filters['status'] as string) || '';
    const environmentFilter = (event.filters['environment'] as string) || '';

    this.store.dispatch(ApiKeysActions.setSearchTerm({ searchTerm }));
    this.store.dispatch(ApiKeysActions.setStatusFilter({ statusFilter }));
    this.store.dispatch(ApiKeysActions.setEnvironmentFilter({ environmentFilter }));
  }

  onResetGrid(): void {
    this.pageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.sortState = null;
    this.filterState = {};

    this.store.dispatch(ApiKeysActions.setSearchTerm({ searchTerm: '' }));
    this.store.dispatch(ApiKeysActions.setStatusFilter({ statusFilter: '' }));
    this.store.dispatch(ApiKeysActions.setEnvironmentFilter({ environmentFilter: '' }));
  }

  onRowClick(row: ApiKeyTableRow): void {
    this.keySelected.emit(row.apiKey);
  }


  // Generate key handlers
  openGenerateDialog(): void {
    this.showGenerateDialog = true;
    this.selectedEnvironment = Environment.Development;
    this.store.dispatch(ApiKeysActions.clearGenerateError());
  }

  closeGenerateDialog(): void {
    this.showGenerateDialog = false;
  }

  onGenerateKey(): void {
    this.store.dispatch(
      ApiKeysActions.generateApiKey({
        applicationId: this.applicationId,
        organizationId: this.organizationId,
        environment: this.selectedEnvironment,
      })
    );
    this.generateKey.emit(this.selectedEnvironment);
  }

  // Generated key dialog handlers
  closeGeneratedKeyDialog(): void {
    this.showGeneratedKeyDialog = false;
    this.keyCopied = false;
    this.store.dispatch(ApiKeysActions.clearGeneratedKey());
  }

  async copyKeyToClipboard(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      this.keyCopied = true;
      setTimeout(() => (this.keyCopied = false), 3000);
    } catch (err) {
      console.error('Failed to copy key:', err);
    }
  }

  // Rotate key handler
  onRotateKey(row: ApiKeyTableRow): void {
    if (
      confirm(
        'Are you sure you want to rotate this API key? The old key will remain valid during the rotation period.'
      )
    ) {
      this.store.dispatch(
        ApiKeysActions.rotateApiKey({
          apiKeyId: row.apiKey.applicationApiKeyId,
          applicationId: this.applicationId,
          environment: row.apiKey.environment,
        })
      );
      this.rotateKey.emit(row.apiKey);
    }
  }

  // Revoke key handler
  onRevokeKey(row: ApiKeyTableRow): void {
    if (
      confirm(
        'Are you sure you want to revoke this API key? This action cannot be undone and the key will immediately stop working.'
      )
    ) {
      this.store.dispatch(
        ApiKeysActions.revokeApiKey({
          apiKeyId: row.apiKey.applicationApiKeyId,
          applicationId: this.applicationId,
          environment: row.apiKey.environment,
        })
      );
      this.revokeKey.emit(row.apiKey);
    }
  }

  // Helper methods
  getStatusClass(status: ApplicationApiKeyStatus): string {
    switch (status) {
      case ApplicationApiKeyStatus.Active:
        return 'active';
      case ApplicationApiKeyStatus.Rotating:
        return 'rotating';
      case ApplicationApiKeyStatus.Revoked:
        return 'revoked';
      case ApplicationApiKeyStatus.Expired:
        return 'expired';
      default:
        return 'unknown';
    }
  }

  getEnvironmentClass(environment: Environment): string {
    switch (environment) {
      case Environment.Production:
        return 'production';
      case Environment.Staging:
        return 'staging';
      case Environment.Development:
        return 'development';
      case Environment.Test:
        return 'test';
      case Environment.Preview:
        return 'preview';
      default:
        return 'unknown';
    }
  }

  canRotate(row: ApiKeyTableRow): boolean {
    return (
      row.apiKey.status === ApplicationApiKeyStatus.Active ||
      row.apiKey.status === ApplicationApiKeyStatus.Rotating
    );
  }

  canRevoke(row: ApiKeyTableRow): boolean {
    return (
      row.apiKey.status === ApplicationApiKeyStatus.Active ||
      row.apiKey.status === ApplicationApiKeyStatus.Rotating
    );
  }
}
