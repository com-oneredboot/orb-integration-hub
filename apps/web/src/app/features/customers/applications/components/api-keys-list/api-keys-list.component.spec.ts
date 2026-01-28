/**
 * Unit tests for ApiKeysListComponent
 *
 * Tests the API keys list component functionality including:
 * - Component initialization and store integration
 * - Environment filtering
 * - Action emissions (generate, rotate, revoke)
 * - Data grid configuration
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 5.1, 9.1_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { ApiKeysListComponent } from './api-keys-list.component';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
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

describe('ApiKeysListComponent', () => {
  let component: ApiKeysListComponent;
  let fixture: ComponentFixture<ApiKeysListComponent>;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const createMockApiKey = (overrides: Partial<IApplicationApiKeys> = {}): IApplicationApiKeys => ({
    applicationApiKeyId: 'key-123',
    applicationId: 'app-456',
    organizationId: 'org-789',
    environment: Environment.Development,
    keyHash: 'hash123',
    keyPrefix: 'dev_abc123',
    status: ApplicationApiKeyStatus.Active,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    ...overrides,
  });

  const createMockApiKeyRow = (apiKey: IApplicationApiKeys): ApiKeyTableRow => ({
    apiKey,
    applicationId: apiKey.applicationId,
    environmentLabel: 'Development',
    statusLabel: 'Active',
    lastActivity: 'Just now',
    isRotating: false,
  });

  const mockApiKey = createMockApiKey();
  const mockApiKeyRows: ApiKeyTableRow[] = [
    createMockApiKeyRow(mockApiKey),
    createMockApiKeyRow(createMockApiKey({
      applicationApiKeyId: 'key-456',
      environment: Environment.Staging,
      keyPrefix: 'stg_def456',
    })),
    createMockApiKeyRow(createMockApiKey({
      applicationApiKeyId: 'key-789',
      environment: Environment.Production,
      keyPrefix: 'prd_ghi789',
      status: ApplicationApiKeyStatus.Revoked,
    })),
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeysListComponent, FontAwesomeModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectFilteredApiKeyRows, value: mockApiKeyRows },
            { selector: selectIsLoading, value: false },
            { selector: selectIsGenerating, value: false },
            { selector: selectIsRotating, value: false },
            { selector: selectIsRevoking, value: false },
            { selector: selectError, value: null },
            { selector: selectGeneratedKey, value: null },
          ],
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch');

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    fixture = TestBed.createComponent(ApiKeysListComponent);
    component = fixture.componentInstance;
    component.applicationId = 'app-456';
    component.organizationId = 'org-789';
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should dispatch setApplicationContext and loadApiKeys on init', () => {
      fixture.detectChanges();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.setApplicationContext({
          applicationId: 'app-456',
          organizationId: 'org-789',
        })
      );
      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.loadApiKeys({ applicationId: 'app-456' })
      );
    });

    it('should not dispatch actions when applicationId is not provided', () => {
      component.applicationId = '';
      fixture.detectChanges();

      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('should have correct store observables initialized', () => {
      expect(component.filteredApiKeyRows$).toBeDefined();
      expect(component.isLoading$).toBeDefined();
      expect(component.isGenerating$).toBeDefined();
      expect(component.isRotating$).toBeDefined();
      expect(component.isRevoking$).toBeDefined();
      expect(component.error$).toBeDefined();
      expect(component.generatedKey$).toBeDefined();
    });
  });

  describe('Environment Options', () => {
    it('should have all environment options', () => {
      expect(component.environments).toContain(Environment.Production);
      expect(component.environments).toContain(Environment.Staging);
      expect(component.environments).toContain(Environment.Development);
      expect(component.environments).toContain(Environment.Test);
      expect(component.environments).toContain(Environment.Preview);
    });

    it('should have correct environment labels', () => {
      expect(component.environmentLabels[Environment.Production]).toBe('Production');
      expect(component.environmentLabels[Environment.Staging]).toBe('Staging');
      expect(component.environmentLabels[Environment.Development]).toBe('Development');
      expect(component.environmentLabels[Environment.Test]).toBe('Test');
      expect(component.environmentLabels[Environment.Preview]).toBe('Preview');
    });
  });

  describe('Event Emissions', () => {
    it('should emit generateKey event on generate', () => {
      const generateSpy = spyOn(component.generateKey, 'emit');
      fixture.detectChanges();

      component.onGenerateKey();

      expect(generateSpy).toHaveBeenCalledWith(Environment.Development);
    });

    it('should emit rotateKey event on rotate', () => {
      const rotateSpy = spyOn(component.rotateKey, 'emit');
      spyOn(window, 'confirm').and.returnValue(true);
      fixture.detectChanges();

      component.onRotateKey(mockApiKeyRows[0]);

      expect(rotateSpy).toHaveBeenCalledWith(mockApiKeyRows[0].apiKey);
    });

    it('should emit revokeKey event on revoke', () => {
      const revokeSpy = spyOn(component.revokeKey, 'emit');
      spyOn(window, 'confirm').and.returnValue(true);
      fixture.detectChanges();

      component.onRevokeKey(mockApiKeyRows[0]);

      expect(revokeSpy).toHaveBeenCalledWith(mockApiKeyRows[0].apiKey);
    });

    it('should emit keySelected event on row click', () => {
      const selectSpy = spyOn(component.keySelected, 'emit');

      component.onRowClick(mockApiKeyRows[0]);

      expect(selectSpy).toHaveBeenCalledWith(mockApiKeyRows[0].apiKey);
    });
  });


  describe('Generate Dialog', () => {
    it('should open generate dialog', () => {
      fixture.detectChanges();

      component.openGenerateDialog();

      expect(component.showGenerateDialog).toBe(true);
      expect(component.selectedEnvironment).toBe(Environment.Development);
    });

    it('should close generate dialog', () => {
      component.showGenerateDialog = true;

      component.closeGenerateDialog();

      expect(component.showGenerateDialog).toBe(false);
    });

    it('should dispatch generateApiKey action on generate', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();
      component.selectedEnvironment = Environment.Production;

      component.onGenerateKey();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.generateApiKey({
          applicationId: 'app-456',
          organizationId: 'org-789',
          environment: Environment.Production,
        })
      );
    });
  });

  describe('Generated Key Dialog', () => {
    it('should show generated key dialog when key is generated', () => {
      const mockGeneratedKey: GeneratedKeyResult = {
        apiKeyId: 'key-new',
        fullKey: 'dev_abc123_secretkey',
        environment: Environment.Development,
        keyPrefix: 'dev_abc123',
      };

      fixture.detectChanges();
      store.overrideSelector(selectGeneratedKey, mockGeneratedKey);
      store.refreshState();

      expect(component.showGeneratedKeyDialog).toBe(true);
      expect(component.showGenerateDialog).toBe(false);
    });

    it('should close generated key dialog and clear state', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();
      component.showGeneratedKeyDialog = true;
      component.keyCopied = true;

      component.closeGeneratedKeyDialog();

      expect(component.showGeneratedKeyDialog).toBe(false);
      expect(component.keyCopied).toBe(false);
      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.clearGeneratedKey());
    });
  });

  describe('Copy to Clipboard', () => {
    beforeEach(() => {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    });

    it('should copy key to clipboard', async () => {
      await component.copyKeyToClipboard('test-key-123');

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-key-123');
    });

    it('should set keyCopied to true after copying', async () => {
      await component.copyKeyToClipboard('test-key-123');

      expect(component.keyCopied).toBe(true);
    });

    it('should reset keyCopied after 3 seconds', fakeAsync(() => {
      component.copyKeyToClipboard('test-key-123');
      tick(0);

      expect(component.keyCopied).toBe(true);

      tick(3000);

      expect(component.keyCopied).toBe(false);
    }));
  });

  describe('Rotate Key', () => {
    it('should dispatch rotateApiKey when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onRotateKey(mockApiKeyRows[0]);

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.rotateApiKey({
          apiKeyId: 'key-123',
          applicationId: 'app-456',
          environment: Environment.Development,
        })
      );
    });

    it('should not dispatch rotateApiKey when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onRotateKey(mockApiKeyRows[0]);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Revoke Key', () => {
    it('should dispatch revokeApiKey when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onRevokeKey(mockApiKeyRows[0]);

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.revokeApiKey({
          apiKeyId: 'key-123',
          applicationId: 'app-456',
          environment: Environment.Development,
        })
      );
    });

    it('should not dispatch revokeApiKey when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onRevokeKey(mockApiKeyRows[0]);

      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });

  describe('Helper Methods', () => {
    it('should return correct status class for active', () => {
      expect(component.getStatusClass(ApplicationApiKeyStatus.Active)).toBe('active');
    });

    it('should return correct status class for rotating', () => {
      expect(component.getStatusClass(ApplicationApiKeyStatus.Rotating)).toBe('rotating');
    });

    it('should return correct status class for revoked', () => {
      expect(component.getStatusClass(ApplicationApiKeyStatus.Revoked)).toBe('revoked');
    });

    it('should return correct status class for expired', () => {
      expect(component.getStatusClass(ApplicationApiKeyStatus.Expired)).toBe('expired');
    });

    it('should return correct environment class for production', () => {
      expect(component.getEnvironmentClass(Environment.Production)).toBe('production');
    });

    it('should return correct environment class for staging', () => {
      expect(component.getEnvironmentClass(Environment.Staging)).toBe('staging');
    });

    it('should return correct environment class for development', () => {
      expect(component.getEnvironmentClass(Environment.Development)).toBe('development');
    });

    it('should allow rotate for active keys', () => {
      const activeRow = createMockApiKeyRow(createMockApiKey({ status: ApplicationApiKeyStatus.Active }));
      expect(component.canRotate(activeRow)).toBe(true);
    });

    it('should allow rotate for rotating keys', () => {
      const rotatingRow = createMockApiKeyRow(createMockApiKey({ status: ApplicationApiKeyStatus.Rotating }));
      expect(component.canRotate(rotatingRow)).toBe(true);
    });

    it('should not allow rotate for revoked keys', () => {
      const revokedRow = createMockApiKeyRow(createMockApiKey({ status: ApplicationApiKeyStatus.Revoked }));
      expect(component.canRotate(revokedRow)).toBe(false);
    });

    it('should allow revoke for active keys', () => {
      const activeRow = createMockApiKeyRow(createMockApiKey({ status: ApplicationApiKeyStatus.Active }));
      expect(component.canRevoke(activeRow)).toBe(true);
    });

    it('should not allow revoke for revoked keys', () => {
      const revokedRow = createMockApiKeyRow(createMockApiKey({ status: ApplicationApiKeyStatus.Revoked }));
      expect(component.canRevoke(revokedRow)).toBe(false);
    });
  });

  describe('Grid Event Handlers', () => {
    it('should update page state on page change', () => {
      component.onPageChange({ page: 2, pageSize: 10 });

      expect(component.pageState.currentPage).toBe(2);
      expect(component.pageState.pageSize).toBe(10);
    });

    it('should update sort state on sort change', () => {
      component.onSortChange({ field: 'keyPrefix', direction: 'asc' });

      expect(component.sortState).toEqual({ field: 'keyPrefix', direction: 'asc' });
    });

    it('should clear sort state when direction is null', () => {
      component.sortState = { field: 'keyPrefix', direction: 'asc' };

      component.onSortChange({ field: 'keyPrefix', direction: null });

      expect(component.sortState).toBeNull();
    });

    it('should dispatch filter actions on filter change', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onFilterChange({
        filters: {
          apiKey: 'test',
          status: 'ACTIVE',
          environment: 'DEVELOPMENT',
        },
      });

      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.setSearchTerm({ searchTerm: 'test' }));
      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.setStatusFilter({ statusFilter: 'ACTIVE' }));
      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.setEnvironmentFilter({ environmentFilter: 'DEVELOPMENT' }));
    });

    it('should reset grid state on reset', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();
      component.sortState = { field: 'keyPrefix', direction: 'asc' };
      component.filterState = { apiKey: 'test' };

      component.onResetGrid();

      expect(component.sortState).toBeNull();
      expect(component.filterState).toEqual({});
      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.setSearchTerm({ searchTerm: '' }));
      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.setStatusFilter({ statusFilter: '' }));
      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.setEnvironmentFilter({ environmentFilter: '' }));
    });
  });

  describe('Cleanup', () => {
    it('should complete destroy$ subject on ngOnDestroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
