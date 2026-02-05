/**
 * Environment Detail Page Component
 *
 * Standalone page for viewing/editing configuration for a single environment.
 * Displays API keys, allowed origins, rate limits, webhooks, and feature flags.
 * Uses NgRx store as single source of truth.
 * Uses tabbed interface for different configuration sections.
 *
 * @see .kiro/specs/environment-detail-page/design.md
 * _Requirements: 3.1, 4.1, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3_
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';

import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../../shared/components';
import { TabNavigationComponent } from '../../../../../shared/components/tab-navigation/tab-navigation.component';
import { TabConfig } from '../../../../../shared/models/tab-config.model';
import { HeroSplitComponent } from '../../../../../shared/components/hero-split/hero-split.component';

// Store imports
import { ApplicationsActions } from '../../store/applications.actions';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import { OrganizationsActions } from '../../../organizations/store/organizations.actions';
import { EnvironmentConfigActions } from '../../store/environment-config/environment-config.actions';
import {
  selectSelectedConfig,
  selectIsLoading,
  selectIsSaving,
  selectLoadError,
  selectSaveError,
} from '../../store/environment-config/environment-config.selectors';
import { EnvironmentsActions } from '../../store/environments/environments.actions';
import * as fromEnvironments from '../../store/environments/environments.selectors';
import { GeneratedKeyResult } from '../../store/environments/environments.state';

/**
 * Tab identifiers for the environment detail page
 */
export enum EnvironmentDetailTab {
  ApiKeys = 'api-keys',
  Origins = 'origins',
  RateLimits = 'rate-limits',
  Webhooks = 'webhooks',
  FeatureFlags = 'feature-flags',
}

@Component({
  selector: 'app-environment-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    BreadcrumbComponent,
    TabNavigationComponent,
    HeroSplitComponent,
  ],
  templateUrl: './environment-detail-page.component.html',
  styleUrls: ['./environment-detail-page.component.scss'],
})
export class EnvironmentDetailPageComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Tab configuration for page-layout-standardization
  tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: 'fas fa-info-circle' }
  ];
  activeTab = 'overview';

  // Tab state (legacy - for existing tab implementation)
  readonly EnvironmentDetailTab = EnvironmentDetailTab;
  activeTabLegacy: EnvironmentDetailTab = EnvironmentDetailTab.ApiKeys;

  // Route parameters
  applicationId: string | null = null;
  environment: Environment | null = null;

  // Store selectors
  application$: Observable<IApplications | null>;
  selectedConfig$: Observable<IApplicationEnvironmentConfig | null>;
  isLoading$: Observable<boolean>;
  isSaving$: Observable<boolean>;
  loadError$: Observable<string | null>;
  saveError$: Observable<string | null>;

  // API Keys selectors
  apiKeys$: Observable<IApplicationApiKeys[]>;
  isGeneratingKey$: Observable<boolean>;
  isRevokingKey$: Observable<boolean>;
  generatedKey$: Observable<GeneratedKeyResult | null>;

  // Organizations selector for breadcrumb
  organizations$: Observable<IOrganizations[]>;

  // Local state
  application: IApplications | null = null;
  selectedConfig: IApplicationEnvironmentConfig | null = null;
  environmentApiKey: IApplicationApiKeys | null = null;
  validationError: string | null = null;
  generatedKeyDisplay: GeneratedKeyResult | null = null;
  copySuccess = false;
  isAutoCreating = false;

  // Organization for breadcrumb context
  private organization: IOrganizations | null = null;

  // Form state
  newOrigin = '';
  rateLimitForm = {
    perMinute: 60,
    perDay: 10000,
  };
  webhookForm = {
    url: '',
    enabled: false,
    maxRetries: 3,
    retryDelaySeconds: 60,
    events: [] as string[],
  };
  newFlagKey = '';
  newFlagValue = '';
  newFlagType: 'boolean' | 'string' | 'number' = 'boolean';

  // Available webhook events
  readonly webhookEventTypes = [
    { value: 'USER_CREATED', label: 'User Created' },
    { value: 'USER_UPDATED', label: 'User Updated' },
    { value: 'USER_DELETED', label: 'User Deleted' },
    { value: 'GROUP_CREATED', label: 'Group Created' },
    { value: 'GROUP_UPDATED', label: 'Group Updated' },
    { value: 'GROUP_DELETED', label: 'Group Deleted' },
    { value: 'ROLE_ASSIGNED', label: 'Role Assigned' },
    { value: 'ROLE_REVOKED', label: 'Role Revoked' },
  ];

  // Environment labels
  readonly environmentLabels: Record<string, string> = {
    PRODUCTION: 'Production',
    STAGING: 'Staging',
    DEVELOPMENT: 'Development',
    TEST: 'Test',
    PREVIEW: 'Preview',
  };

  /**
   * Breadcrumb items for navigation
   * Shows: Organizations > "Organization Name" > Applications > "Application Name" > Environments > "Environment Name"
   * _Requirements: 5.1_
   */
  get breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Organizations', route: '/customers/organizations' },
      {
        label: this.organization?.name || 'Loading...',
        route: this.organization ? `/customers/organizations/${this.organization.organizationId}` : null
      },
      { label: 'Applications', route: '/customers/applications' },
      {
        label: this.application?.name || 'Loading...',
        route: this.application ? `/customers/applications/${this.application.applicationId}` : null
      },
      { label: 'Environments', route: null },
      { label: this.environment ? this.getEnvironmentLabel(this.environment) : 'Loading...', route: null }
    ];
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private store: Store
  ) {
    // Initialize store selectors
    this.application$ = this.store.select(fromApplications.selectSelectedApplication);
    this.selectedConfig$ = this.store.select(selectSelectedConfig);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isSaving$ = this.store.select(selectIsSaving);
    this.loadError$ = this.store.select(selectLoadError);
    this.saveError$ = this.store.select(selectSaveError);
    this.apiKeys$ = this.store.select(fromEnvironments.selectApiKeys);
    this.isGeneratingKey$ = this.store.select(fromEnvironments.selectIsGenerating);
    this.isRevokingKey$ = this.store.select(fromEnvironments.selectIsRevoking);
    this.generatedKey$ = this.store.select(fromEnvironments.selectGeneratedKey);
    this.organizations$ = this.store.select(fromOrganizations.selectOrganizations);
  }

  ngOnInit(): void {
    // Ensure organizations are loaded for breadcrumb
    this.store.dispatch(OrganizationsActions.loadOrganizations());

    // Extract route parameters
    this.route.paramMap.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.applicationId = params.get('id');
      const envParam = params.get('env');
      this.environment = envParam as Environment;

      if (this.applicationId) {
        this.loadData();
      }
    });

    // Subscribe to application changes
    this.application$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(app => {
      this.application = app;
      if (app) {
        this.validateEnvironment();
      }
    });

    // Subscribe to application and organizations to update organization for breadcrumb
    combineLatest([this.application$, this.organizations$]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([app, organizations]) => {
      if (app && organizations.length > 0) {
        this.organization = organizations.find(org => org.organizationId === app.organizationId) || null;
      }
    });

    // Subscribe to config changes
    this.selectedConfig$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(config => {
      this.selectedConfig = config;
      if (config) {
        this.isAutoCreating = false; // Reset auto-creating flag when config is loaded
        this.loadFormData(config);
      }
    });

    // Subscribe to API keys changes
    this.apiKeys$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(keys => {
      this.environmentApiKey = keys.find(k => k.environment === this.environment) || null;
    });

    // Subscribe to generated key changes
    this.generatedKey$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(generatedKey => {
      if (generatedKey && generatedKey.environment === this.environment) {
        this.generatedKeyDisplay = generatedKey;
        this.copySuccess = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadData(): void {
    if (!this.applicationId || !this.environment) return;

    // Load application
    this.store.dispatch(ApplicationsActions.loadApplication({ applicationId: this.applicationId }));

    // Wait for application to load, then load config
    this.application$.pipe(
      filter(app => !!app),
      take(1)
    ).subscribe(app => {
      if (app) {
        // Set context and load config
        this.store.dispatch(EnvironmentConfigActions.setApplicationContext({
          applicationId: app.applicationId,
          organizationId: app.organizationId,
        }));
        this.store.dispatch(EnvironmentConfigActions.loadConfig({
          applicationId: app.applicationId,
          environment: this.environment!,
        }));

        // Load API keys via environments store
        this.store.dispatch(EnvironmentsActions.setApplicationContext({
          applicationId: app.applicationId,
          organizationId: app.organizationId,
        }));
        this.store.dispatch(EnvironmentsActions.loadEnvironments({
          applicationId: app.applicationId,
        }));

        // Listen for load failure and create config if not found
        // Use takeUntil to ensure cleanup, and filter for relevant errors
        this.loadError$.pipe(
          takeUntil(this.destroy$),
          filter((error): error is string => !!error),
          take(1)
        ).subscribe(error => {
          // Check if error indicates config not found
          const errorLower = error.toLowerCase();
          const isNotFound = errorLower.includes('not found') ||
                            errorLower.includes('does not exist') ||
                            errorLower.includes('failed to retrieve');
          
          if (isNotFound && this.application && this.environment) {
            // Config doesn't exist, create it
            console.debug('[EnvironmentDetailPage] Config not found, creating new config');
            this.isAutoCreating = true;
            this.store.dispatch(EnvironmentConfigActions.createConfig({
              applicationId: this.application.applicationId,
              organizationId: this.application.organizationId,
              environment: this.environment,
            }));
          }
        });
      }
    });
  }

  private validateEnvironment(): boolean {
    if (!this.application || !this.environment) {
      this.validationError = 'Invalid application or environment';
      return false;
    }

    const validEnvironments = this.application.environments || [];
    if (!validEnvironments.includes(this.environment)) {
      this.validationError = `Environment "${this.getEnvironmentLabel(this.environment)}" is not configured for this application.`;
      return false;
    }

    this.validationError = null;
    return true;
  }

  private loadFormData(config: IApplicationEnvironmentConfig): void {
    this.rateLimitForm = {
      perMinute: config.rateLimitPerMinute || 60,
      perDay: config.rateLimitPerDay || 10000,
    };
    this.webhookForm = {
      url: config.webhookUrl || '',
      enabled: config.webhookEnabled || false,
      maxRetries: config.webhookMaxRetries || 3,
      retryDelaySeconds: config.webhookRetryDelaySeconds || 60,
      events: config.webhookEvents || [],
    };
  }

  getEnvironmentLabel(env: string): string {
    return this.environmentLabels[env] || env;
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/customers/applications', this.applicationId]);
  }

  // API Keys Management
  getApiKeyStatus(): string {
    if (!this.environmentApiKey) return 'Not Configured';
    return this.environmentApiKey.status || 'Unknown';
  }

  getApiKeyPrefix(): string {
    return this.environmentApiKey?.keyPrefix || '';
  }

  getApiKeyType(): string {
    return this.environmentApiKey?.keyType || '';
  }

  isApiKeyActive(): boolean {
    return this.environmentApiKey?.status === ApplicationApiKeyStatus.Active ||
           this.environmentApiKey?.status === ApplicationApiKeyStatus.Rotating;
  }

  canGenerateKey(): boolean {
    return !this.environmentApiKey ||
           this.environmentApiKey.status === ApplicationApiKeyStatus.Revoked ||
           this.environmentApiKey.status === ApplicationApiKeyStatus.Expired;
  }

  onGenerateKey(): void {
    if (!this.application || !this.environment) return;

    this.store.dispatch(EnvironmentsActions.generateApiKey({
      applicationId: this.application.applicationId,
      organizationId: this.application.organizationId,
      environment: this.environment,
    }));
  }

  onRotateKey(): void {
    if (!this.application || !this.environmentApiKey) return;

    this.store.dispatch(EnvironmentsActions.rotateApiKey({
      apiKeyId: this.environmentApiKey.applicationApiKeyId,
      applicationId: this.application.applicationId,
      environment: this.environment!,
    }));
  }

  onRevokeKey(): void {
    if (!this.application || !this.environmentApiKey) return;

    if (!confirm(`Are you sure you want to revoke the API key for ${this.getEnvironmentLabel(this.environment!)}? This action cannot be undone.`)) {
      return;
    }

    this.store.dispatch(EnvironmentsActions.revokeApiKey({
      apiKeyId: this.environmentApiKey.applicationApiKeyId,
      applicationId: this.application.applicationId,
      environment: this.environment!,
    }));
  }

  async copyGeneratedKey(): Promise<void> {
    if (!this.generatedKeyDisplay?.fullKey) return;

    try {
      await navigator.clipboard.writeText(this.generatedKeyDisplay.fullKey);
      this.copySuccess = true;
      setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  }

  dismissGeneratedKey(): void {
    this.generatedKeyDisplay = null;
    this.copySuccess = false;
    this.store.dispatch(EnvironmentsActions.clearGeneratedKey());
  }

  // Allowed Origins Management
  addOrigin(): void {
    if (!this.newOrigin.trim() || !this.applicationId || !this.environment) return;

    this.store.dispatch(EnvironmentConfigActions.addAllowedOrigin({
      applicationId: this.applicationId,
      environment: this.environment,
      origin: this.newOrigin.trim(),
    }));
    this.newOrigin = '';
  }

  removeOrigin(origin: string): void {
    if (!this.applicationId || !this.environment) return;

    this.store.dispatch(EnvironmentConfigActions.removeAllowedOrigin({
      applicationId: this.applicationId,
      environment: this.environment,
      origin,
    }));
  }

  // Rate Limits Management
  saveRateLimits(): void {
    if (!this.applicationId || !this.environment) return;

    this.store.dispatch(EnvironmentConfigActions.updateConfig({
      applicationId: this.applicationId,
      environment: this.environment,
      rateLimitPerMinute: this.rateLimitForm.perMinute,
      rateLimitPerDay: this.rateLimitForm.perDay,
    }));
  }

  // Webhook Management
  saveWebhookConfig(): void {
    if (!this.applicationId || !this.environment) return;

    this.store.dispatch(EnvironmentConfigActions.updateWebhookConfig({
      applicationId: this.applicationId,
      environment: this.environment,
      webhookUrl: this.webhookForm.url,
      webhookEnabled: this.webhookForm.enabled,
      webhookMaxRetries: this.webhookForm.maxRetries,
      webhookRetryDelaySeconds: this.webhookForm.retryDelaySeconds,
      webhookEvents: this.webhookForm.events,
    }));
  }

  toggleWebhookEvent(event: string): void {
    const index = this.webhookForm.events.indexOf(event);
    if (index === -1) {
      this.webhookForm.events.push(event);
    } else {
      this.webhookForm.events.splice(index, 1);
    }
  }

  isWebhookEventSelected(event: string): boolean {
    return this.webhookForm.events.includes(event);
  }

  regenerateWebhookSecret(): void {
    if (!this.applicationId || !this.environment) return;

    if (confirm('Are you sure you want to regenerate the webhook secret? This will invalidate the current secret.')) {
      this.store.dispatch(EnvironmentConfigActions.regenerateWebhookSecret({
        applicationId: this.applicationId,
        environment: this.environment,
      }));
    }
  }

  // Feature Flags Management
  addFeatureFlag(): void {
    if (!this.newFlagKey.trim() || !this.applicationId || !this.environment) return;

    let value: boolean | string | number;
    switch (this.newFlagType) {
      case 'boolean':
        value = this.newFlagValue === 'true';
        break;
      case 'number':
        value = parseFloat(this.newFlagValue) || 0;
        break;
      default:
        value = this.newFlagValue;
    }

    this.store.dispatch(EnvironmentConfigActions.setFeatureFlag({
      applicationId: this.applicationId,
      environment: this.environment,
      key: this.newFlagKey.trim(),
      value,
    }));
    this.newFlagKey = '';
    this.newFlagValue = '';
    this.newFlagType = 'boolean';
  }

  deleteFeatureFlag(key: string): void {
    if (!this.applicationId || !this.environment) return;

    if (confirm(`Are you sure you want to delete the feature flag "${key}"?`)) {
      this.store.dispatch(EnvironmentConfigActions.deleteFeatureFlag({
        applicationId: this.applicationId,
        environment: this.environment,
        key,
      }));
    }
  }

  getFeatureFlagEntries(): { key: string; value: unknown }[] {
    if (!this.selectedConfig?.featureFlags) return [];
    return Object.entries(this.selectedConfig.featureFlags).map(([key, value]) => ({
      key,
      value,
    }));
  }

  getFeatureFlagType(value: unknown): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    return 'string';
  }

  formatFeatureFlagValue(value: unknown): string {
    if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
    return String(value);
  }

  clearErrors(): void {
    this.store.dispatch(EnvironmentConfigActions.clearErrors());
  }

  // Tab configuration for rendering
  readonly legacyTabs: { id: EnvironmentDetailTab; label: string; icon: string }[] = [
    { id: EnvironmentDetailTab.ApiKeys, label: 'API Keys', icon: 'key' },
    { id: EnvironmentDetailTab.Origins, label: 'Origins', icon: 'globe' },
    { id: EnvironmentDetailTab.RateLimits, label: 'Rate Limits', icon: 'tachometer-alt' },
    { id: EnvironmentDetailTab.Webhooks, label: 'Webhooks', icon: 'bolt' },
    { id: EnvironmentDetailTab.FeatureFlags, label: 'Feature Flags', icon: 'flag' },
  ];

  // Tab Navigation
  setActiveTab(tab: EnvironmentDetailTab): void {
    this.activeTabLegacy = tab;
  }

  /**
   * Handle tab change from TabNavigationComponent
   * Empty for single-tab page (Overview only)
   */
  onTabChange(tabId: string): void {
    this.activeTab = tabId;
  }

  /**
   * Handle keyboard navigation for tabs
   * Supports arrow keys for navigation and Enter/Space for activation
   * _Requirements: 6.1_
   */
  onTabKeydown(event: KeyboardEvent, currentTab: EnvironmentDetailTab): void {
    const currentIndex = this.legacyTabs.findIndex(t => t.id === currentTab);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : this.legacyTabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < this.legacyTabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = this.legacyTabs.length - 1;
        break;
      default:
        return;
    }

    if (newIndex !== currentIndex) {
      this.setActiveTab(this.legacyTabs[newIndex].id);
      // Focus the new tab button
      setTimeout(() => {
        const tabButton = document.getElementById(`tab-${this.legacyTabs[newIndex].id}`);
        tabButton?.focus();
      }, 0);
    }
  }

  /**
   * Get the issue count for a specific tab
   * Returns the number of items that need attention
   */
  getTabIssueCount(tab: EnvironmentDetailTab): number {
    switch (tab) {
      case EnvironmentDetailTab.ApiKeys:
        // Issue if no API key is configured or key is revoked/expired
        if (!this.environmentApiKey) return 1;
        if (this.environmentApiKey.status === ApplicationApiKeyStatus.Revoked ||
            this.environmentApiKey.status === ApplicationApiKeyStatus.Expired) return 1;
        return 0;

      case EnvironmentDetailTab.Origins:
        // Issue if no origins configured (required for publishable keys)
        if (!this.selectedConfig?.allowedOrigins?.length) return 1;
        return 0;

      case EnvironmentDetailTab.RateLimits:
        // Issue if rate limits are at default/zero
        if (!this.selectedConfig?.rateLimitPerMinute || this.selectedConfig.rateLimitPerMinute === 0) return 1;
        return 0;

      case EnvironmentDetailTab.Webhooks:
        // No required issues for webhooks (optional feature)
        return 0;

      case EnvironmentDetailTab.FeatureFlags:
        // No required issues for feature flags (optional feature)
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Get total issue count across all tabs
   */
  getTotalIssueCount(): number {
    return Object.values(EnvironmentDetailTab).reduce((total, tab) => {
      return total + this.getTabIssueCount(tab);
    }, 0);
  }

  /**
   * Check if a tab has issues that need attention
   */
  tabHasIssues(tab: EnvironmentDetailTab): boolean {
    return this.getTabIssueCount(tab) > 0;
  }
}
