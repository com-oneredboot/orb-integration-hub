/**
 * Application Detail Page Component
 *
 * Standalone page for viewing/editing a single application.
 * Handles both PENDING (create) and ACTIVE (edit) modes based on application status.
 * Uses the create-on-click pattern with NgRx store as single source of truth.
 * Includes tabbed interface for Overview, Groups, Security, and Danger Zone.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 9.1_
 */

import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Actions, ofType } from '@ngrx/effects';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, map, filter, take } from 'rxjs/operators';

import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { IApplicationGroups } from '../../../../../core/models/ApplicationGroupsModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { DebugPanelComponent, DebugContext } from '../../../../../shared/components/debug/debug-panel.component';
import { DebugLogEntry } from '../../../../../core/services/debug-log.service';

// Child components
import { GroupsListComponent } from '../groups-list/groups-list.component';
import { DangerZoneCardComponent } from '../../../../../shared/components/danger-zone-card/danger-zone-card.component';

// Data Grid
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

// Validation utilities
import { validateApplicationApiKeys, formatMissingEnvironments } from '../../utils/api-key-validation';

// Store imports
import { ApplicationsActions } from '../../store/applications.actions';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import * as fromUser from '../../../../user/store/user.selectors';
import * as fromApiKeys from '../../store/api-keys/api-keys.selectors';
import * as fromEnvironmentConfig from '../../store/environment-config/environment-config.selectors';
import { OrganizationsActions } from '../../../organizations/store/organizations.actions';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import { EnvironmentConfigActions } from '../../store/environment-config/environment-config.actions';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { GeneratedKeyResult } from '../../store/api-keys/api-keys.state';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';

/**
 * Get activity text for an API key based on its status and timestamps.
 *
 * @param apiKey - The API key to get activity text for (null if no key)
 * @returns Human-readable activity text
 *
 * @see .kiro/specs/api-key-lifecycle-management/design.md
 * _Requirements: 2.7, 4.5, 5.4_
 */
export function getActivityText(apiKey: IApplicationApiKeys | null): string {
  if (!apiKey) {
    return 'No API key configured';
  }

  switch (apiKey.status) {
    case ApplicationApiKeyStatus.Revoked:
      if (apiKey.revokedAt) {
        const revokedDate = apiKey.revokedAt instanceof Date
          ? apiKey.revokedAt
          : new Date(typeof apiKey.revokedAt === 'number' ? apiKey.revokedAt * 1000 : apiKey.revokedAt);
        return `Revoked on ${revokedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return 'Revoked';

    case ApplicationApiKeyStatus.Expired:
      if (apiKey.expiresAt) {
        const expiredDate = apiKey.expiresAt instanceof Date
          ? apiKey.expiresAt
          : new Date(typeof apiKey.expiresAt === 'number' ? apiKey.expiresAt * 1000 : apiKey.expiresAt);
        return `Expired on ${expiredDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
      return 'Expired';

    case ApplicationApiKeyStatus.Rotating:
      if (apiKey.expiresAt) {
        const expiresAt = apiKey.expiresAt instanceof Date
          ? apiKey.expiresAt
          : new Date(typeof apiKey.expiresAt === 'number' ? apiKey.expiresAt * 1000 : apiKey.expiresAt);
        const now = new Date();
        const diffMs = expiresAt.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          return 'Expires today';
        } else if (diffDays === 1) {
          return 'Expires in 1 day';
        } else {
          return `Expires in ${diffDays} days`;
        }
      }
      return 'Rotating';

    case ApplicationApiKeyStatus.Active:
    default:
      if (apiKey.lastUsedAt) {
        const lastUsed = apiKey.lastUsedAt instanceof Date
          ? apiKey.lastUsedAt
          : new Date(typeof apiKey.lastUsedAt === 'number' ? apiKey.lastUsedAt * 1000 : apiKey.lastUsedAt);
        const now = new Date();
        const diffMs = now.getTime() - lastUsed.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
          return 'Last used just now';
        } else if (diffMins < 60) {
          return `Last used ${diffMins} min ago`;
        } else if (diffHours < 24) {
          return `Last used ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
          return `Last used ${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
          return `Last used ${lastUsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
      }
      return 'Never used';
  }
}

/**
 * Interface for environment-based API key row display
 */
export interface EnvironmentKeyRow {
  environment: string;
  environmentLabel: string;
  apiKey: IApplicationApiKeys | null;
  hasKey: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  canRevoke: boolean;
  canGenerate: boolean;
  canRotate: boolean;
}

/**
 * Interface for environment row display in Environments tab DataGrid
 */
export interface EnvironmentRow {
  environment: string;
  environmentLabel: string;
  apiKeyStatus: 'Active' | 'Rotating' | 'Revoked' | 'Expired' | 'Not Configured';
  apiKeyPrefix: string | null;
  apiKeyType: string | null;
  formattedKeyPrefix: string;
  rateLimitDisplay: string;
  webhookStatus: 'Enabled' | 'Disabled' | 'Not Configured';
  lastUpdated: string;
}

/**
 * Tab identifiers for the application detail page
 */
export enum ApplicationDetailTab {
  Overview = 'overview',
  Environments = 'environments',
  Groups = 'groups',
  Danger = 'danger',
}

@Component({
  selector: 'app-application-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DebugPanelComponent,
    GroupsListComponent,
    DangerZoneCardComponent,
    DataGridComponent,
  ],
  templateUrl: './application-detail-page.component.html',
  styleUrls: ['./application-detail-page.component.scss']
})
export class ApplicationDetailPageComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  // Tab state
  readonly ApplicationDetailTab = ApplicationDetailTab;
  activeTab: ApplicationDetailTab = ApplicationDetailTab.Overview;

  // Template references for API keys grid custom cells
  // static: true because templates are now at root level (outside *ngIf)
  @ViewChild('environmentCell', { static: true }) environmentCell!: TemplateRef<unknown>;
  @ViewChild('keyInfoCell', { static: true }) keyInfoCell!: TemplateRef<unknown>;
  @ViewChild('actionsCell', { static: true }) actionsCell!: TemplateRef<unknown>;

  // Template references for Environments DataGrid custom cells
  @ViewChild('envNameCell', { static: true }) envNameCell!: TemplateRef<unknown>;
  @ViewChild('envStatusCell', { static: true }) envStatusCell!: TemplateRef<unknown>;
  @ViewChild('envApiKeyCell', { static: true }) envApiKeyCell!: TemplateRef<unknown>;
  @ViewChild('envRateLimitCell', { static: true }) envRateLimitCell!: TemplateRef<unknown>;
  @ViewChild('envWebhookCell', { static: true }) envWebhookCell!: TemplateRef<unknown>;
  @ViewChild('envLastUpdatedCell', { static: true }) envLastUpdatedCell!: TemplateRef<unknown>;

  // API Keys grid configuration (kept for Security tab if needed later)
  apiKeysColumns: ColumnDefinition<EnvironmentKeyRow>[] = [];
  apiKeysPageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  apiKeysSortState: SortState | null = null;
  apiKeysFilterState: FilterState = {};

  // Environments DataGrid configuration (Overview tab)
  environmentsColumns: ColumnDefinition<EnvironmentRow>[] = [];
  environmentsPageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  environmentsSortState: SortState | null = null;
  environmentsFilterState: FilterState = {};
  environmentRows: EnvironmentRow[] = [];

  // Store selectors - ALL data comes from store
  application$: Observable<IApplications | null>;
  isLoading$: Observable<boolean>;
  isSaving$: Observable<boolean>;
  error$: Observable<string | null>;
  saveError$: Observable<string | null>;
  organizations$: Observable<IOrganizations[]>;
  apiKeys$: Observable<IApplicationApiKeys[]>;
  environmentConfigs$: Observable<IApplicationEnvironmentConfig[]>;
  isGeneratingKey$: Observable<boolean>;
  isRevokingKey$: Observable<boolean>;
  generatedKey$: Observable<GeneratedKeyResult | null>;
  debugMode$: Observable<boolean>;

  // Local state for template binding
  application: IApplications | null = null;
  applicationId: string | null = null;
  loadError: string | null = null;
  apiKeys: IApplicationApiKeys[] = [];
  environmentConfigs: IApplicationEnvironmentConfig[] = [];
  environmentKeyRows: EnvironmentKeyRow[] = [];

  // Mode detection
  isDraft = false;

  // Form data (local UI state - allowed)
  editForm = {
    name: '',
    description: '',
    organizationId: '',
    environments: [] as string[]
  };

  // Validation (local UI state - allowed)
  validationErrors = {
    name: '',
    description: '',
    organizationId: '',
    environments: ''
  };

  // API key validation error (shown when trying to activate without all keys)
  apiKeyValidationError: string | null = null;

  // Generated key display state (shown after key generation)
  generatedKeyDisplay: GeneratedKeyResult | null = null;
  copySuccess = false;

  // Available environments for selection
  readonly availableEnvironments = [
    { value: 'PRODUCTION', label: 'Production', description: 'Live production environment' },
    { value: 'STAGING', label: 'Staging', description: 'Pre-production testing' },
    { value: 'DEVELOPMENT', label: 'Development', description: 'Development and debugging' },
    { value: 'TEST', label: 'Test', description: 'Automated testing' },
    { value: 'PREVIEW', label: 'Preview', description: 'Feature previews and demos' }
  ];

  // Debug
  debugLogs$: Observable<DebugLogEntry[]> = of([]);

  // Current user ID for draft creation
  private currentUserId: string | null = null;

  get debugContext(): DebugContext {
    return {
      page: 'ApplicationDetail',
      additionalSections: [
        {
          title: 'Application',
          data: this.application ? {
            applicationId: this.application.applicationId,
            name: this.application.name,
            organizationId: this.application.organizationId,
            status: this.application.status,
            isDraft: this.isDraft
          } : { status: 'Loading...' }
        },
        {
          title: 'Tab State',
          data: {
            activeTab: this.activeTab
          }
        },
        {
          title: 'Form State',
          data: {
            editForm: this.editForm,
            validationErrors: this.validationErrors
          }
        }
      ]
    };
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store,
    private actions$: Actions
  ) {
    // Initialize store selectors
    this.application$ = this.store.select(fromApplications.selectSelectedApplication);
    this.isLoading$ = this.store.select(fromApplications.selectIsLoading);
    this.isSaving$ = this.store.select(fromApplications.selectIsSaving);
    this.error$ = this.store.select(fromApplications.selectError);
    this.saveError$ = this.store.select(fromApplications.selectSaveError);
    this.organizations$ = this.store.select(fromOrganizations.selectOrganizations);
    this.apiKeys$ = this.store.select(fromApiKeys.selectApiKeys);
    this.environmentConfigs$ = this.store.select(fromEnvironmentConfig.selectConfigs);
    this.isGeneratingKey$ = this.store.select(fromApiKeys.selectIsGenerating);
    this.isRevokingKey$ = this.store.select(fromApiKeys.selectIsRevoking);
    this.generatedKey$ = this.store.select(fromApiKeys.selectGeneratedKey);
    this.debugMode$ = this.store.select(fromUser.selectDebugMode);

    // Subscribe to application changes to sync local state
    this.application$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(app => {
      if (app) {
        this.application = app;
        this.isDraft = app.status === ApplicationStatus.Pending;
        this.loadFormData();
        this.updateEnvironmentKeyRows();
        this.updateEnvironmentRows();
        // Load API keys for all applications (including drafts for validation)
        this.loadApiKeys();
      }
    });

    // Subscribe to API keys changes
    this.apiKeys$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(keys => {
      this.apiKeys = keys;
      this.updateEnvironmentKeyRows();
      this.updateEnvironmentRows();
    });

    // Subscribe to environment configs changes
    this.environmentConfigs$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(configs => {
      this.environmentConfigs = configs;
      this.updateEnvironmentRows();
    });

    // Subscribe to generated key changes (for inline display after generation)
    this.generatedKey$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(generatedKey => {
      if (generatedKey) {
        this.generatedKeyDisplay = generatedKey;
        this.copySuccess = false;
      }
    });

    // Subscribe to error changes
    this.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.loadError = error;
    });

    // Listen for successful operations to navigate
    this.actions$.pipe(
      ofType(
        ApplicationsActions.updateApplicationSuccess,
        ApplicationsActions.deleteApplicationSuccess
      ),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigate(['/customers/applications']);
    });

    // Listen for draft creation success to update URL
    this.actions$.pipe(
      ofType(ApplicationsActions.createDraftApplicationSuccess),
      takeUntil(this.destroy$)
    ).subscribe(action => {
      this.applicationId = action.application.applicationId;
      this.router.navigate(
        ['/customers/applications', action.application.applicationId],
        { replaceUrl: true }
      );
    });
  }

  ngOnInit(): void {
    // Get current user ID for draft creation
    this.store.select(fromUser.selectCurrentUser).pipe(
      take(1),
      filter(user => !!user)
    ).subscribe(user => {
      this.currentUserId = user!.userId;
    });

    // Ensure organizations are loaded
    this.store.dispatch(OrganizationsActions.loadOrganizations());

    // Get application ID from route
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      map(params => params.get('id')),
      filter(id => !!id)
    ).subscribe(id => {
      this.applicationId = id;
      this.loadApplication(id!);
    });
  }

  ngAfterViewInit(): void {
    this.initializeApiKeysColumns();
    this.initializeEnvironmentsColumns();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadApplication(id: string): void {
    // Check if this is a new draft (temp ID pattern)
    if (id.startsWith('new-')) {
      this.createDraftApplication();
      return;
    }

    // Dispatch action to load application - effects handle service call
    this.store.dispatch(ApplicationsActions.loadApplication({ applicationId: id }));
  }

  /**
   * Load API keys and environment configs for the current application
   */
  private loadApiKeys(): void {
    if (this.application) {
      // Load API keys
      this.store.dispatch(ApiKeysActions.setApplicationContext({
        applicationId: this.application.applicationId,
        organizationId: this.application.organizationId
      }));
      this.store.dispatch(ApiKeysActions.loadApiKeys({
        applicationId: this.application.applicationId
      }));

      // Load environment configs
      this.store.dispatch(EnvironmentConfigActions.setApplicationContext({
        applicationId: this.application.applicationId,
        organizationId: this.application.organizationId
      }));
      this.store.dispatch(EnvironmentConfigActions.loadConfigs({
        applicationId: this.application.applicationId
      }));
    }
  }

  private createDraftApplication(): void {
    if (!this.currentUserId) {
      this.loadError = 'You must be signed in to create an application';
      return;
    }

    // Wait for organizations to be available, then dispatch create draft action
    this.organizations$.pipe(
      filter(orgs => orgs.length > 0),
      take(1)
    ).subscribe(organizations => {
      // Auto-select organization if only one
      const orgId = organizations.length === 1 ? organizations[0].organizationId : '';

      // Dispatch action - effects handle service call
      this.store.dispatch(ApplicationsActions.createDraftApplication({
        ownerId: this.currentUserId!,
        organizationId: orgId
      }));
    });
  }

  /**
   * Initialize API keys grid columns with custom cell templates
   */
  private initializeApiKeysColumns(): void {
    this.apiKeysColumns = [
      {
        field: 'environmentLabel',
        header: 'Environment',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'PRODUCTION', label: 'Production' },
          { value: 'STAGING', label: 'Staging' },
          { value: 'DEVELOPMENT', label: 'Development' },
          { value: 'TEST', label: 'Test' },
          { value: 'PREVIEW', label: 'Preview' },
        ],
        cellTemplate: this.environmentCell,
        width: '25%',
      },
      {
        field: 'hasKey',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'true', label: 'Configured' },
          { value: 'false', label: 'Not Configured' },
        ],
        cellTemplate: this.keyInfoCell,
        width: '45%',
      },
      {
        field: 'actions',
        header: 'Actions',
        sortable: false,
        filterable: false,
        cellTemplate: this.actionsCell,
        width: '30%',
        align: 'right',
      },
    ];
  }

  /**
   * Initialize Environments DataGrid columns for Overview tab
   */
  private initializeEnvironmentsColumns(): void {
    this.environmentsColumns = [
      {
        field: 'environmentLabel',
        header: 'Environment',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'Production', label: 'Production' },
          { value: 'Staging', label: 'Staging' },
          { value: 'Development', label: 'Development' },
          { value: 'Test', label: 'Test' },
          { value: 'Preview', label: 'Preview' },
        ],
        cellTemplate: this.envNameCell,
        width: '15%',
      },
      {
        field: 'apiKeyStatus',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'Active', label: 'Active' },
          { value: 'Rotating', label: 'Rotating' },
          { value: 'Revoked', label: 'Revoked' },
          { value: 'Expired', label: 'Expired' },
          { value: 'Not Configured', label: 'Not Configured' },
        ],
        cellTemplate: this.envStatusCell,
        width: '15%',
      },
      {
        field: 'formattedKeyPrefix',
        header: 'API Key',
        sortable: false,
        filterable: false,
        cellTemplate: this.envApiKeyCell,
        width: '25%',
      },
      {
        field: 'rateLimitDisplay',
        header: 'Rate Limits',
        sortable: false,
        filterable: false,
        cellTemplate: this.envRateLimitCell,
        width: '15%',
      },
      {
        field: 'webhookStatus',
        header: 'Webhook',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'Enabled', label: 'Enabled' },
          { value: 'Disabled', label: 'Disabled' },
          { value: 'Not Configured', label: 'Not Configured' },
        ],
        cellTemplate: this.envWebhookCell,
        width: '15%',
      },
      {
        field: 'lastUpdated',
        header: 'Last Updated',
        sortable: true,
        filterable: false,
        cellTemplate: this.envLastUpdatedCell,
        width: '15%',
      },
    ];
  }

  /**
   * Compute environment rows for the Environments tab DataGrid
   */
  private computeEnvironmentRows(): EnvironmentRow[] {
    const environments = this.application?.environments || [];
    const apiKeys = this.apiKeys || [];
    const configs = this.environmentConfigs || [];

    return environments.map(env => {
      const apiKey = apiKeys.find(k => k.environment === env) || null;
      const config = configs.find(c => c.environment === env) || null;
      
      let apiKeyStatus: EnvironmentRow['apiKeyStatus'] = 'Not Configured';
      if (apiKey) {
        switch (apiKey.status) {
          case ApplicationApiKeyStatus.Active:
            apiKeyStatus = 'Active';
            break;
          case ApplicationApiKeyStatus.Rotating:
            apiKeyStatus = 'Rotating';
            break;
          case ApplicationApiKeyStatus.Revoked:
            apiKeyStatus = 'Revoked';
            break;
          case ApplicationApiKeyStatus.Expired:
            apiKeyStatus = 'Expired';
            break;
          default:
            apiKeyStatus = 'Not Configured';
        }
      }

      // Get webhook status from environment config
      let webhookStatus: EnvironmentRow['webhookStatus'] = 'Not Configured';
      if (config) {
        webhookStatus = config.webhookEnabled ? 'Enabled' : 'Disabled';
      }

      // Format rate limits display
      let rateLimitDisplay = 'Not configured';
      if (config) {
        rateLimitDisplay = `${config.rateLimitPerMinute}/min`;
      }

      // Format the key prefix for display (e.g., orb_api_dev_...abc123)
      const formattedKeyPrefix = this.formatKeyPrefixDisplay(apiKey?.keyPrefix || null);

      // Determine last updated from the most recent of apiKey or config
      const apiKeyUpdated = apiKey?.updatedAt ? new Date(typeof apiKey.updatedAt === 'number' ? apiKey.updatedAt * 1000 : apiKey.updatedAt) : null;
      const configUpdated = config?.updatedAt ? new Date(typeof config.updatedAt === 'number' ? (config.updatedAt as number) * 1000 : config.updatedAt) : null;
      
      let lastUpdatedDate: Date | null = null;
      if (apiKeyUpdated && configUpdated) {
        lastUpdatedDate = apiKeyUpdated > configUpdated ? apiKeyUpdated : configUpdated;
      } else {
        lastUpdatedDate = apiKeyUpdated || configUpdated;
      }

      return {
        environment: env,
        environmentLabel: this.getEnvironmentLabel(env),
        apiKeyStatus,
        apiKeyPrefix: apiKey?.keyPrefix || null,
        apiKeyType: apiKey?.keyType || null,
        formattedKeyPrefix,
        rateLimitDisplay,
        webhookStatus,
        lastUpdated: lastUpdatedDate ? this.formatRelativeTime(lastUpdatedDate) : 'Never',
      };
    });
  }

  /**
   * Format the API key prefix for display
   * Transforms stored prefix (e.g., orb_api_dev_****) to display format (e.g., orb_api_dev_...abc1)
   */
  private formatKeyPrefixDisplay(keyPrefix: string | null): string {
    if (!keyPrefix) return '—';
    
    // The keyPrefix is stored as something like "orb_api_dev_abc1" (first 4 chars after prefix)
    // We want to display it as "orb_api_dev_...abc1"
    // Find the last underscore and insert dots before the suffix
    const lastUnderscoreIndex = keyPrefix.lastIndexOf('_');
    if (lastUnderscoreIndex === -1) return keyPrefix;
    
    const prefix = keyPrefix.substring(0, lastUnderscoreIndex + 1);
    const suffix = keyPrefix.substring(lastUnderscoreIndex + 1);
    
    // Replace **** with ... and keep the suffix
    if (suffix === '****' || suffix.includes('*')) {
      return `${prefix}...`;
    }
    
    return `${prefix}...${suffix}`;
  }

  /**
   * Update environment rows for Overview tab DataGrid
   */
  private updateEnvironmentRows(): void {
    this.environmentRows = this.computeEnvironmentRows();
    this.environmentsPageState = {
      ...this.environmentsPageState,
      totalItems: this.environmentRows.length,
      totalPages: Math.ceil(this.environmentRows.length / this.environmentsPageState.pageSize) || 1
    };
  }

  /**
   * Handle environment row click - navigate to Environment Detail Page
   */
  onEnvironmentRowClick(row: EnvironmentRow): void {
    if (this.application) {
      this.router.navigate(['/customers/applications', this.application.applicationId, 'environments', row.environment]);
    }
  }

  // Environments DataGrid event handlers
  onEnvironmentsPageChange(event: PageChangeEvent): void {
    this.environmentsPageState = {
      ...this.environmentsPageState,
      currentPage: event.page,
      pageSize: event.pageSize,
      totalPages: Math.ceil(this.environmentsPageState.totalItems / event.pageSize),
    };
  }

  onEnvironmentsSortChange(event: SortChangeEvent): void {
    if (event.direction) {
      this.environmentsSortState = { field: event.field, direction: event.direction };
    } else {
      this.environmentsSortState = null;
    }
  }

  onEnvironmentsFilterChange(event: FilterChangeEvent): void {
    this.environmentsFilterState = event.filters;
  }

  onEnvironmentsResetGrid(): void {
    this.environmentsPageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.environmentsSortState = null;
    this.environmentsFilterState = {};
  }

  private loadFormData(): void {
    if (this.application) {
      this.editForm = {
        name: this.application.name || '',
        description: this.application.description || '',
        organizationId: this.application.organizationId || '',
        environments: [...(this.application.environments || [])]
      };
    }
  }

  onEnvironmentToggle(env: string): void {
    const index = this.editForm.environments.indexOf(env);
    if (index === -1) {
      this.editForm.environments.push(env);
    } else {
      this.editForm.environments.splice(index, 1);
    }
    // Clear validation error when user makes a selection
    if (this.editForm.environments.length > 0) {
      this.validationErrors.environments = '';
    }
    // Update environment key rows to reflect form changes
    this.updateEnvironmentKeyRows();
  }

  isEnvironmentSelected(env: string): boolean {
    return this.editForm.environments.includes(env);
  }

  private clearValidationErrors(): void {
    this.validationErrors = {
      name: '',
      description: '',
      organizationId: '',
      environments: ''
    };
  }

  private validateForm(): boolean {
    this.clearValidationErrors();
    let isValid = true;

    // Name validation
    if (!this.editForm.name.trim()) {
      this.validationErrors.name = 'Application name is required';
      isValid = false;
    } else if (this.editForm.name.trim().length < 2) {
      this.validationErrors.name = 'Application name must be at least 2 characters';
      isValid = false;
    } else if (this.editForm.name.trim().length > 100) {
      this.validationErrors.name = 'Application name cannot exceed 100 characters';
      isValid = false;
    }

    // Organization validation
    if (!this.editForm.organizationId) {
      this.validationErrors.organizationId = 'Please select an organization';
      isValid = false;
    }

    // Description validation (optional but with length limit)
    if (this.editForm.description && this.editForm.description.length > 500) {
      this.validationErrors.description = 'Description cannot exceed 500 characters';
      isValid = false;
    }

    // Environment validation - at least one required
    if (this.editForm.environments.length === 0) {
      this.validationErrors.environments = 'At least one environment must be selected';
      isValid = false;
    }

    return isValid;
  }

  onSave(): void {
    if (!this.validateForm() || !this.application) {
      return;
    }

    // Clear any previous API key validation error
    this.apiKeyValidationError = null;

    // If activating a draft, validate that all environments have API keys
    if (this.isDraft) {
      const validation = validateApplicationApiKeys(this.application, this.apiKeys);
      if (!validation.isValid) {
        const envList = formatMissingEnvironments(validation.missingEnvironments);
        this.apiKeyValidationError = `Cannot activate: API keys are required for ${envList}. Configure keys in the Security tab before activating.`;
        return;
      }
    }

    const updateData = {
      applicationId: this.application.applicationId,
      name: this.editForm.name.trim(),
      description: this.editForm.description.trim(),
      organizationId: this.editForm.organizationId,
      status: this.isDraft ? ApplicationStatus.Active : this.application.status,
      environments: this.editForm.environments
    };

    // Dispatch action - effects handle service call
    this.store.dispatch(ApplicationsActions.updateApplication({ input: updateData }));
  }

  onCancel(): void {
    // If draft, delete it before navigating away
    if (this.isDraft && this.application) {
      this.store.dispatch(ApplicationsActions.deleteApplication({
        applicationId: this.application.applicationId,
        organizationId: this.application.organizationId
      }));
    } else {
      this.router.navigate(['/customers/applications']);
    }
  }

  onDelete(): void {
    if (!this.application) return;

    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    // Dispatch action - effects handle service call
    this.store.dispatch(ApplicationsActions.deleteApplication({
      applicationId: this.application.applicationId,
      organizationId: this.application.organizationId
    }));
  }

  formatDate(dateValue: string | Date | number | undefined): string {
    if (!dateValue) return 'N/A';
    // Handle Unix timestamp (number)
    const date = typeof dateValue === 'number'
      ? new Date(dateValue * 1000)
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Tab navigation
  setActiveTab(tab: ApplicationDetailTab): void {
    const previousTab = this.activeTab;
    this.activeTab = tab;

    // Clear API key validation error when navigating away from Overview
    if (tab !== ApplicationDetailTab.Overview) {
      this.apiKeyValidationError = null;
    }

    // Clear generated key when switching away from Environments tab (Requirement 3.4)
    if (previousTab === ApplicationDetailTab.Environments && tab !== ApplicationDetailTab.Environments) {
      this.generatedKeyDisplay = null;
      this.copySuccess = false;
      this.store.dispatch(ApiKeysActions.clearGeneratedKey());
    }

    // Reload API keys when switching to Environments tab (Requirement 1.2)
    if (tab === ApplicationDetailTab.Environments && this.application) {
      this.store.dispatch(ApiKeysActions.loadApiKeys({
        applicationId: this.application.applicationId
      }));
    }
  }

  // Groups tab event handlers
  onGroupSelected(group: IApplicationGroups): void {
    // Navigate to group detail page (future implementation)
    console.log('Group selected:', group.applicationGroupId);
  }

  onCreateGroup(): void {
    // Open group creation dialog (future implementation)
    console.log('Create group requested');
  }

  // API Keys tab event handlers (kept for potential future use)
  onApiKeySelected(apiKey: IApplicationApiKeys): void {
    // Handle API key selection (future implementation)
    console.log('API key selected:', apiKey.applicationApiKeyId);
  }

  onGenerateApiKey(environment: Environment): void {
    // Handle API key generation (handled by ApiKeysListComponent)
    console.log('Generate API key for environment:', environment);
  }

  onRotateApiKey(apiKey: IApplicationApiKeys): void {
    // Handle API key rotation (future implementation)
    console.log('Rotate API key:', apiKey.applicationApiKeyId);
  }

  onRevokeApiKey(apiKey: IApplicationApiKeys): void {
    // Handle API key revocation (handled by ApiKeysListComponent)
    console.log('Revoke API key:', apiKey.applicationApiKeyId);
  }

  // Security tab action handlers
  onGenerateKeyForEnvironment(environment: string): void {
    if (!this.application) return;

    this.store.dispatch(ApiKeysActions.generateApiKey({
      applicationId: this.application.applicationId,
      organizationId: this.application.organizationId,
      environment: environment as Environment
    }));
  }

  onRevokeKeyForRow(row: EnvironmentKeyRow): void {
    if (!this.application || !row.apiKey) return;

    if (!confirm(`Are you sure you want to revoke the API key for ${row.environmentLabel}? This action cannot be undone.`)) {
      return;
    }

    this.store.dispatch(ApiKeysActions.revokeApiKey({
      apiKeyId: row.apiKey.applicationApiKeyId,
      applicationId: this.application.applicationId,
      environment: row.environment as Environment
    }));
  }

  onRegenerateKeyForRow(row: EnvironmentKeyRow): void {
    // Regenerate is just generating a new key for the environment
    this.onGenerateKeyForEnvironment(row.environment);
  }

  onRotateKeyForRow(row: EnvironmentKeyRow): void {
    if (!this.application || !row.apiKey) return;

    this.store.dispatch(ApiKeysActions.rotateApiKey({
      apiKeyId: row.apiKey.applicationApiKeyId,
      applicationId: this.application.applicationId,
      environment: row.environment as Environment
    }));
  }

  // API Keys grid event handlers
  onApiKeysPageChange(event: PageChangeEvent): void {
    this.apiKeysPageState = {
      ...this.apiKeysPageState,
      currentPage: event.page,
      pageSize: event.pageSize,
      totalPages: Math.ceil(this.apiKeysPageState.totalItems / event.pageSize),
    };
  }

  onApiKeysSortChange(event: SortChangeEvent): void {
    if (event.direction) {
      this.apiKeysSortState = { field: event.field, direction: event.direction };
    } else {
      this.apiKeysSortState = null;
    }
  }

  onApiKeysFilterChange(event: FilterChangeEvent): void {
    this.apiKeysFilterState = event.filters;
  }

  onApiKeysResetGrid(): void {
    this.apiKeysPageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.apiKeysSortState = null;
    this.apiKeysFilterState = {};
  }

  // Environment Key Row helpers
  private updateEnvironmentKeyRows(): void {
    this.environmentKeyRows = this.computeEnvironmentKeyRows();
    // Update page state with total items count
    this.apiKeysPageState = {
      ...this.apiKeysPageState,
      totalItems: this.environmentKeyRows.length,
      totalPages: Math.ceil(this.environmentKeyRows.length / this.apiKeysPageState.pageSize) || 1
    };
  }

  private computeEnvironmentKeyRows(): EnvironmentKeyRow[] {
    // Get environments from the application (store state)
    // This is the source of truth for which environments need API keys
    const environments = this.application?.environments || [];
    const apiKeys = this.apiKeys || [];

    // For each environment configured on the application, create a row
    // If an API key exists for that environment, show it
    // If no API key exists, show a "Generate" CTA
    return environments.map(env => {
      // Find any key for this environment (including revoked/expired)
      const apiKey = apiKeys.find(k => k.environment === env) || null;
      
      const isRevoked = apiKey?.status === ApplicationApiKeyStatus.Revoked;
      const isExpired = apiKey?.status === ApplicationApiKeyStatus.Expired;
      const isActive = apiKey?.status === ApplicationApiKeyStatus.Active;
      const isRotating = apiKey?.status === ApplicationApiKeyStatus.Rotating;
      const hasActiveKey = !!apiKey && (isActive || isRotating);

      return {
        environment: env,
        environmentLabel: this.getEnvironmentLabel(env),
        apiKey,
        hasKey: hasActiveKey,
        isRevoked,
        isExpired,
        canRevoke: hasActiveKey,
        // canGenerate is true when no key exists OR key is revoked/expired
        canGenerate: !apiKey || isRevoked || isExpired,
        // canRotate is true only for active/rotating keys
        canRotate: hasActiveKey,
      };
    });
  }

  getEnvironmentLabel(env: string): string {
    const found = this.availableEnvironments.find(e => e.value === env);
    return found?.label || env;
  }

  formatRelativeTime(dateValue: string | Date | number | undefined): string {
    if (!dateValue) return 'Never';
    const date = typeof dateValue === 'number'
      ? new Date(dateValue * 1000)
      : dateValue instanceof Date
        ? dateValue
        : new Date(dateValue);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Copy the generated API key to clipboard
   */
  async copyGeneratedKey(): Promise<void> {
    if (!this.generatedKeyDisplay?.fullKey) return;

    try {
      await navigator.clipboard.writeText(this.generatedKeyDisplay.fullKey);
      this.copySuccess = true;
      // Reset success indicator after 2 seconds
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    } catch {
      // Fallback: select the text for manual copy
      console.error('Failed to copy to clipboard');
    }
  }

  /**
   * Dismiss the generated key display
   */
  dismissGeneratedKey(): void {
    this.generatedKeyDisplay = null;
    this.copySuccess = false;
  }

  /**
   * Check if a row has a newly generated key to display
   * Compares the environment string from the row with the Environment enum value
   */
  isNewlyGeneratedKey(row: EnvironmentKeyRow): boolean {
    if (!this.generatedKeyDisplay) return false;
    // Environment enum values match the string values (e.g., Environment.Development === 'DEVELOPMENT')
    return this.generatedKeyDisplay.environment === row.environment;
  }
}
