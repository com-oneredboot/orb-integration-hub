/**
 * Environment Config Tab Component Unit Tests
 *
 * Tests for the EnvironmentConfigTabComponent.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { EnvironmentConfigTabComponent } from './environment-config-tab.component';
import { EnvironmentConfigActions } from '../../store/environment-config/environment-config.actions';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { initialEnvironmentConfigState } from '../../store/environment-config/environment-config.state';

describe('EnvironmentConfigTabComponent', () => {
  let component: EnvironmentConfigTabComponent;
  let fixture: ComponentFixture<EnvironmentConfigTabComponent>;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const createMockConfig = (
    overrides: Partial<IApplicationEnvironmentConfig> = {}
  ): IApplicationEnvironmentConfig => ({
    applicationId: 'app-1',
    environment: Environment.Development,
    organizationId: 'org-1',
    allowedOrigins: ['https://example.com'],
    rateLimitPerMinute: 60,
    rateLimitPerDay: 10000,
    webhookUrl: 'https://webhook.example.com',
    webhookSecret: 'secret123',
    webhookEvents: ['USER_CREATED'],
    webhookEnabled: true,
    webhookMaxRetries: 3,
    webhookRetryDelaySeconds: 60,
    featureFlags: { feature_a: true },
    metadata: {},
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  });

  const initialState = {
    environmentConfig: initialEnvironmentConfigState,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentConfigTabComponent, FormsModule, FontAwesomeModule],
      providers: [provideMockStore({ initialState })],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch').and.callThrough();

    fixture = TestBed.createComponent(EnvironmentConfigTabComponent);
    component = fixture.componentInstance;
    component.applicationId = 'app-1';
    component.organizationId = 'org-1';
    component.environments = ['DEVELOPMENT', 'STAGING', 'PRODUCTION'];
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should dispatch setApplicationContext and loadConfigs on init', () => {
      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.setApplicationContext({
          applicationId: 'app-1',
          organizationId: 'org-1',
        })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.loadConfigs({ applicationId: 'app-1' })
      );
    });

    it('should select first environment when environments change', () => {
      fixture.detectChanges();
      component.ngOnChanges({
        environments: {
          currentValue: ['DEVELOPMENT', 'STAGING'],
          previousValue: [],
          firstChange: true,
          isFirstChange: () => true,
        },
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.loadConfig({
          applicationId: 'app-1',
          environment: 'DEVELOPMENT' as Environment,
        })
      );
    });
  });

  describe('environment selection', () => {
    it('should dispatch loadConfig when environment is selected', () => {
      fixture.detectChanges();
      component.selectEnvironment(Environment.Production);

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.loadConfig({
          applicationId: 'app-1',
          environment: Environment.Production,
        })
      );
    });

    it('should update selectedEnvironment when environment is selected', () => {
      fixture.detectChanges();
      component.selectEnvironment(Environment.Staging);

      expect(component.selectedEnvironment).toBe(Environment.Staging);
    });

    it('should reset editMode when environment is selected', () => {
      fixture.detectChanges();
      component.editMode = true;
      component.selectEnvironment(Environment.Development);

      expect(component.editMode).toBe(false);
    });
  });

  describe('allowed origins management', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedEnvironment = Environment.Development;
    });

    it('should dispatch addAllowedOrigin when adding origin', () => {
      component.newOrigin = 'https://new-origin.com';
      component.addOrigin();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.addAllowedOrigin({
          applicationId: 'app-1',
          environment: Environment.Development,
          origin: 'https://new-origin.com',
        })
      );
    });

    it('should clear newOrigin after adding', () => {
      component.newOrigin = 'https://new-origin.com';
      component.addOrigin();

      expect(component.newOrigin).toBe('');
    });

    it('should not dispatch when newOrigin is empty', () => {
      dispatchSpy.calls.reset();
      component.newOrigin = '';
      component.addOrigin();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Environment Config] Add Allowed Origin' })
      );
    });

    it('should dispatch removeAllowedOrigin when removing origin', () => {
      component.removeOrigin('https://example.com');

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.removeAllowedOrigin({
          applicationId: 'app-1',
          environment: Environment.Development,
          origin: 'https://example.com',
        })
      );
    });
  });

  describe('rate limits management', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedEnvironment = Environment.Development;
    });

    it('should dispatch updateConfig when saving rate limits', () => {
      component.rateLimitForm = { perMinute: 100, perDay: 5000 };
      component.saveRateLimits();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.updateConfig({
          applicationId: 'app-1',
          environment: Environment.Development,
          rateLimitPerMinute: 100,
          rateLimitPerDay: 5000,
        })
      );
    });
  });

  describe('webhook management', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedEnvironment = Environment.Development;
    });

    it('should dispatch updateWebhookConfig when saving webhook config', () => {
      component.webhookForm = {
        url: 'https://webhook.test.com',
        enabled: true,
        maxRetries: 5,
        retryDelaySeconds: 120,
        events: ['USER_CREATED', 'USER_UPDATED'],
      };
      component.saveWebhookConfig();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.updateWebhookConfig({
          applicationId: 'app-1',
          environment: Environment.Development,
          webhookUrl: 'https://webhook.test.com',
          webhookEnabled: true,
          webhookMaxRetries: 5,
          webhookRetryDelaySeconds: 120,
          webhookEvents: ['USER_CREATED', 'USER_UPDATED'],
        })
      );
    });

    it('should toggle webhook event on', () => {
      component.webhookForm.events = [];
      component.toggleWebhookEvent('USER_CREATED');

      expect(component.webhookForm.events).toContain('USER_CREATED');
    });

    it('should toggle webhook event off', () => {
      component.webhookForm.events = ['USER_CREATED'];
      component.toggleWebhookEvent('USER_CREATED');

      expect(component.webhookForm.events).not.toContain('USER_CREATED');
    });

    it('should return true for isWebhookEventSelected when event is selected', () => {
      component.webhookForm.events = ['USER_CREATED'];

      expect(component.isWebhookEventSelected('USER_CREATED')).toBe(true);
    });

    it('should return false for isWebhookEventSelected when event is not selected', () => {
      component.webhookForm.events = [];

      expect(component.isWebhookEventSelected('USER_CREATED')).toBe(false);
    });

    it('should dispatch regenerateWebhookSecret when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.regenerateWebhookSecret();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.regenerateWebhookSecret({
          applicationId: 'app-1',
          environment: Environment.Development,
        })
      );
    });

    it('should not dispatch regenerateWebhookSecret when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      dispatchSpy.calls.reset();
      component.regenerateWebhookSecret();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Environment Config] Regenerate Webhook Secret' })
      );
    });
  });

  describe('feature flags management', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedEnvironment = Environment.Development;
    });

    it('should dispatch setFeatureFlag with boolean value', () => {
      component.newFlagKey = 'new_feature';
      component.newFlagValue = 'true';
      component.newFlagType = 'boolean';
      component.addFeatureFlag();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.setFeatureFlag({
          applicationId: 'app-1',
          environment: Environment.Development,
          key: 'new_feature',
          value: true,
        })
      );
    });

    it('should dispatch setFeatureFlag with number value', () => {
      component.newFlagKey = 'max_items';
      component.newFlagValue = '100';
      component.newFlagType = 'number';
      component.addFeatureFlag();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.setFeatureFlag({
          applicationId: 'app-1',
          environment: Environment.Development,
          key: 'max_items',
          value: 100,
        })
      );
    });

    it('should dispatch setFeatureFlag with string value', () => {
      component.newFlagKey = 'api_version';
      component.newFlagValue = 'v2';
      component.newFlagType = 'string';
      component.addFeatureFlag();

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.setFeatureFlag({
          applicationId: 'app-1',
          environment: Environment.Development,
          key: 'api_version',
          value: 'v2',
        })
      );
    });

    it('should clear form after adding feature flag', () => {
      component.newFlagKey = 'test_flag';
      component.newFlagValue = 'true';
      component.newFlagType = 'boolean';
      component.addFeatureFlag();

      expect(component.newFlagKey).toBe('');
      expect(component.newFlagValue).toBe('');
      expect(component.newFlagType).toBe('boolean');
    });

    it('should not dispatch when newFlagKey is empty', () => {
      dispatchSpy.calls.reset();
      component.newFlagKey = '';
      component.addFeatureFlag();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Environment Config] Set Feature Flag' })
      );
    });

    it('should dispatch deleteFeatureFlag when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.deleteFeatureFlag('feature_a');

      expect(dispatchSpy).toHaveBeenCalledWith(
        EnvironmentConfigActions.deleteFeatureFlag({
          applicationId: 'app-1',
          environment: Environment.Development,
          key: 'feature_a',
        })
      );
    });

    it('should not dispatch deleteFeatureFlag when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      dispatchSpy.calls.reset();
      component.deleteFeatureFlag('feature_a');

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: '[Environment Config] Delete Feature Flag' })
      );
    });
  });

  describe('feature flag utilities', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.selectedConfig = createMockConfig({
        featureFlags: { bool_flag: true, num_flag: 42, str_flag: 'test' },
      });
    });

    it('should return feature flag entries', () => {
      const entries = component.getFeatureFlagEntries();

      expect(entries.length).toBe(3);
      expect(entries).toContain(jasmine.objectContaining({ key: 'bool_flag', value: true }));
      expect(entries).toContain(jasmine.objectContaining({ key: 'num_flag', value: 42 }));
      expect(entries).toContain(jasmine.objectContaining({ key: 'str_flag', value: 'test' }));
    });

    it('should return empty array when no selected config', () => {
      component.selectedConfig = null;
      const entries = component.getFeatureFlagEntries();

      expect(entries).toEqual([]);
    });

    it('should return correct type for boolean flag', () => {
      expect(component.getFeatureFlagType(true)).toBe('boolean');
      expect(component.getFeatureFlagType(false)).toBe('boolean');
    });

    it('should return correct type for number flag', () => {
      expect(component.getFeatureFlagType(42)).toBe('number');
      expect(component.getFeatureFlagType(3.14)).toBe('number');
    });

    it('should return correct type for string flag', () => {
      expect(component.getFeatureFlagType('test')).toBe('string');
    });

    it('should format boolean flag value correctly', () => {
      expect(component.formatFeatureFlagValue(true)).toBe('Enabled');
      expect(component.formatFeatureFlagValue(false)).toBe('Disabled');
    });

    it('should format non-boolean flag value as string', () => {
      expect(component.formatFeatureFlagValue(42)).toBe('42');
      expect(component.formatFeatureFlagValue('test')).toBe('test');
    });
  });

  describe('environment labels', () => {
    it('should return correct label for known environments', () => {
      expect(component.getEnvironmentLabel('PRODUCTION')).toBe('Production');
      expect(component.getEnvironmentLabel('STAGING')).toBe('Staging');
      expect(component.getEnvironmentLabel('DEVELOPMENT')).toBe('Development');
      expect(component.getEnvironmentLabel('TEST')).toBe('Test');
      expect(component.getEnvironmentLabel('PREVIEW')).toBe('Preview');
    });

    it('should return original value for unknown environments', () => {
      expect(component.getEnvironmentLabel('CUSTOM')).toBe('CUSTOM');
    });
  });

  describe('error handling', () => {
    it('should dispatch clearErrors when clearErrors is called', () => {
      fixture.detectChanges();
      component.clearErrors();

      expect(dispatchSpy).toHaveBeenCalledWith(EnvironmentConfigActions.clearErrors());
    });
  });

  describe('cleanup', () => {
    it('should complete destroy$ on ngOnDestroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
