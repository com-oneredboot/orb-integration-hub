/**
 * Environment Config Tab Component
 *
 * Main container for environment configuration management.
 * Displays configuration for a selected environment including:
 * - Allowed origins (CORS)
 * - Rate limits
 * - Webhook settings
 * - Feature flags
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { EnvironmentConfigActions } from '../../store/environment-config/environment-config.actions';
import {
  selectConfigs,
  selectSelectedConfig,
  selectIsLoading,
  selectIsSaving,
  selectLoadError,
  selectSaveError,
} from '../../store/environment-config/environment-config.selectors';

@Component({
  selector: 'app-environment-config-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './environment-config-tab.component.html',
  styleUrls: ['./environment-config-tab.component.scss'],
})
export class EnvironmentConfigTabComponent implements OnInit, OnDestroy, OnChanges {
  @Input() applicationId!: string;
  @Input() organizationId!: string;
  @Input() environments: string[] = [];

  // Store observables
  configs$: Observable<IApplicationEnvironmentConfig[]>;
  selectedConfig$: Observable<IApplicationEnvironmentConfig | null>;
  isLoading$: Observable<boolean>;
  isSaving$: Observable<boolean>;
  loadError$: Observable<string | null>;
  saveError$: Observable<string | null>;

  // Local state
  selectedEnvironment: Environment | null = null;
  selectedConfig: IApplicationEnvironmentConfig | null = null;

  // Form state for editing
  editMode = false;
  newOrigin = '';
  newFlagKey = '';
  newFlagValue = '';
  newFlagType: 'boolean' | 'string' | 'number' = 'boolean';

  // Rate limit form
  rateLimitForm = {
    perMinute: 60,
    perDay: 10000,
  };

  // Webhook form
  webhookForm = {
    url: '',
    enabled: false,
    maxRetries: 3,
    retryDelaySeconds: 60,
    events: [] as string[],
  };

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

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.configs$ = this.store.select(selectConfigs);
    this.selectedConfig$ = this.store.select(selectSelectedConfig);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isSaving$ = this.store.select(selectIsSaving);
    this.loadError$ = this.store.select(selectLoadError);
    this.saveError$ = this.store.select(selectSaveError);

    // Subscribe to selected config changes
    this.selectedConfig$.pipe(takeUntil(this.destroy$)).subscribe((config) => {
      this.selectedConfig = config;
      if (config) {
        this.loadFormData(config);
      }
    });
  }

  ngOnInit(): void {
    this.loadConfigs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['applicationId'] && this.applicationId) {
      this.loadConfigs();
    }
    if (changes['environments'] && this.environments.length > 0 && !this.selectedEnvironment) {
      this.selectEnvironment(this.environments[0] as Environment);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadConfigs(): void {
    if (this.applicationId) {
      this.store.dispatch(
        EnvironmentConfigActions.setApplicationContext({
          applicationId: this.applicationId,
          organizationId: this.organizationId,
        })
      );
      this.store.dispatch(
        EnvironmentConfigActions.loadConfigs({ applicationId: this.applicationId })
      );
    }
  }

  private loadFormData(config: IApplicationEnvironmentConfig): void {
    this.rateLimitForm = {
      perMinute: config.rateLimitPerMinute,
      perDay: config.rateLimitPerDay,
    };
    this.webhookForm = {
      url: config.webhookUrl || '',
      enabled: config.webhookEnabled || false,
      maxRetries: config.webhookMaxRetries || 3,
      retryDelaySeconds: config.webhookRetryDelaySeconds || 60,
      events: config.webhookEvents || [],
    };
  }

  selectEnvironment(environment: Environment | string): void {
    this.selectedEnvironment = environment as Environment;
    this.editMode = false;
    this.store.dispatch(
      EnvironmentConfigActions.loadConfig({
        applicationId: this.applicationId,
        environment: environment as Environment,
      })
    );
  }

  getEnvironmentLabel(env: string): string {
    return this.environmentLabels[env] || env;
  }

  // Allowed Origins Management
  addOrigin(): void {
    if (!this.newOrigin.trim() || !this.selectedEnvironment) return;

    this.store.dispatch(
      EnvironmentConfigActions.addAllowedOrigin({
        applicationId: this.applicationId,
        environment: this.selectedEnvironment,
        origin: this.newOrigin.trim(),
      })
    );
    this.newOrigin = '';
  }

  removeOrigin(origin: string): void {
    if (!this.selectedEnvironment) return;

    this.store.dispatch(
      EnvironmentConfigActions.removeAllowedOrigin({
        applicationId: this.applicationId,
        environment: this.selectedEnvironment,
        origin,
      })
    );
  }

  // Rate Limits Management
  saveRateLimits(): void {
    if (!this.selectedEnvironment) return;

    this.store.dispatch(
      EnvironmentConfigActions.updateConfig({
        applicationId: this.applicationId,
        environment: this.selectedEnvironment,
        rateLimitPerMinute: this.rateLimitForm.perMinute,
        rateLimitPerDay: this.rateLimitForm.perDay,
      })
    );
  }

  // Webhook Management
  saveWebhookConfig(): void {
    if (!this.selectedEnvironment) return;

    this.store.dispatch(
      EnvironmentConfigActions.updateWebhookConfig({
        applicationId: this.applicationId,
        environment: this.selectedEnvironment,
        webhookUrl: this.webhookForm.url,
        webhookEnabled: this.webhookForm.enabled,
        webhookMaxRetries: this.webhookForm.maxRetries,
        webhookRetryDelaySeconds: this.webhookForm.retryDelaySeconds,
        webhookEvents: this.webhookForm.events,
      })
    );
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
    if (!this.selectedEnvironment) return;

    if (confirm('Are you sure you want to regenerate the webhook secret? This will invalidate the current secret.')) {
      this.store.dispatch(
        EnvironmentConfigActions.regenerateWebhookSecret({
          applicationId: this.applicationId,
          environment: this.selectedEnvironment,
        })
      );
    }
  }

  // Feature Flags Management
  addFeatureFlag(): void {
    if (!this.newFlagKey.trim() || !this.selectedEnvironment) return;

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

    this.store.dispatch(
      EnvironmentConfigActions.setFeatureFlag({
        applicationId: this.applicationId,
        environment: this.selectedEnvironment,
        key: this.newFlagKey.trim(),
        value,
      })
    );
    this.newFlagKey = '';
    this.newFlagValue = '';
    this.newFlagType = 'boolean';
  }

  deleteFeatureFlag(key: string): void {
    if (!this.selectedEnvironment) return;

    if (confirm(`Are you sure you want to delete the feature flag "${key}"?`)) {
      this.store.dispatch(
        EnvironmentConfigActions.deleteFeatureFlag({
          applicationId: this.applicationId,
          environment: this.selectedEnvironment,
          key,
        })
      );
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

  // Utility
  clearErrors(): void {
    this.store.dispatch(EnvironmentConfigActions.clearErrors());
  }
}
